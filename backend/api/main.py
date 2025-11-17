"""
FastAPI Application - CA Factory Backend

Main application entry point for the CA Factory REST API server.
"""

import logging
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn

from ca_factory.core.factory import CAFactory
from ca_factory.config.loader import ConfigLoader
from ca_factory.adapters import CaseAdapter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="CA Factory API",
    description="Context Architect Factory for Clinical Abstraction",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global factory instance
factory: Optional[CAFactory] = None


# Pydantic models for request/response validation
class AskQuestionRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    encounter_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class EvidenceRetrievalRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    encounter_id: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None
    top_k: Optional[int] = Field(10, ge=1, le=100)


class APIResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize CA Factory on application startup."""
    global factory

    try:
        import os

        # Check APP_MODE (demo or production)
        app_mode = os.getenv("APP_MODE", "demo").lower()

        if app_mode not in ["demo", "production"]:
            raise ValueError(f"Invalid APP_MODE: {app_mode}. Must be 'demo' or 'production'")

        logger.info(f"Starting CA Factory API in {app_mode.upper()} mode")

        # Production mode check
        if app_mode == "production":
            # Production mode requires Snowflake connection
            snowflake_account = os.getenv("SNOWFLAKE_ACCOUNT")
            snowflake_user = os.getenv("SNOWFLAKE_USER")
            snowflake_database = os.getenv("SNOWFLAKE_DATABASE")

            if not all([snowflake_account, snowflake_user, snowflake_database]):
                raise RuntimeError(
                    "PRODUCTION MODE NOT YET IMPLEMENTED\n"
                    "===========================================\n"
                    "Production mode requires Snowflake integration which is not yet available.\n\n"
                    "Missing required environment variables:\n"
                    f"  - SNOWFLAKE_ACCOUNT: {'✓ set' if snowflake_account else '✗ not set'}\n"
                    f"  - SNOWFLAKE_USER: {'✓ set' if snowflake_user else '✗ not set'}\n"
                    f"  - SNOWFLAKE_DATABASE: {'✓ set' if snowflake_database else '✗ not set'}\n\n"
                    "To use CA Factory now, please set APP_MODE=demo\n"
                    "See docs/QUICKSTART.md for demo mode setup instructions.\n"
                    "===========================================\n"
                )

        # Determine project to load (from environment variable or default to CLABSI)
        project_id = os.getenv("CA_FACTORY_PROJECT", "clabsi")

        # Load project configuration using ConfigLoader
        config_root = Path(__file__).parent.parent / "configs"
        loader = ConfigLoader(config_root)

        logger.info(f"Loading project configuration: {project_id}")

        config = loader.load_project(project_id, validate=True)

        # Add app_mode to config
        config["app_mode"] = app_mode

        # Initialize CA Factory
        factory = CAFactory(config=config)

        logger.info(f"CA Factory initialized successfully for project: {project_id} in {app_mode} mode")

    except Exception as e:
        logger.error(f"Failed to initialize CA Factory: {str(e)}")
        raise


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    import os

    if factory is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    health = await factory.health_check()

    # Add app_mode to health data
    app_mode = os.getenv("APP_MODE", "demo").lower()
    health["app_mode"] = app_mode

    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "data": health,
            "metadata": {
                "request_id": "health",
                "timestamp": datetime.utcnow().isoformat(),
                "version": "1.0.0"
            }
        }
    )


# 1. Ask the Case (Q&A)
@app.post("/v1/case/{patient_id}/ask")
async def ask_question(
    patient_id: str,
    request: AskQuestionRequest
):
    """
    Ask a natural language question about a specific case.

    Args:
        patient_id: Patient identifier
        request: Question request body

    Returns:
        Q&A response with answer and evidence citations
    """
    if factory is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    start_time = datetime.utcnow()

    try:
        logger.info(f"Processing Q&A request for patient {patient_id}")

        # Execute Q&A task
        result = await factory.ask_question(
            patient_id=patient_id,
            question=request.question,
            encounter_id=request.encounter_id,
            context=request.context or {}
        )

        latency_ms = (datetime.utcnow() - start_time).total_seconds() * 1000

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": result,
                "metadata": {
                    "request_id": f"qa_{patient_id}_{int(datetime.utcnow().timestamp())}",
                    "timestamp": datetime.utcnow().isoformat(),
                    "version": "1.0.0",
                    "latency_ms": round(latency_ms, 2)
                }
            }
        )

    except Exception as e:
        logger.error(f"Q&A request failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "code": "AGENT_ERROR",
                "message": str(e)
            }
        )


# 2. Rule Evaluation
@app.get("/v1/case/{patient_id}/rules")
async def get_rule_evaluation(
    patient_id: str,
    encounter_id: Optional[str] = None,
    domain: Optional[str] = "CLABSI",
    include_evidence: bool = True
):
    """
    Get NHSN criteria evaluation for a specific case.

    Args:
        patient_id: Patient identifier
        encounter_id: Optional encounter identifier
        domain: Domain (CLABSI, CAUTI, etc.)
        include_evidence: Include detailed evidence

    Returns:
        Rule evaluation results
    """
    if factory is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    start_time = datetime.utcnow()

    try:
        logger.info(f"Processing rule evaluation for patient {patient_id}, domain {domain}")

        # Execute rule evaluation
        result = await factory.evaluate_rules(
            patient_id=patient_id,
            encounter_id=encounter_id,
            domain=domain,
            include_evidence=include_evidence
        )

        latency_ms = (datetime.utcnow() - start_time).total_seconds() * 1000

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": result,
                "metadata": {
                    "request_id": f"rules_{patient_id}_{int(datetime.utcnow().timestamp())}",
                    "timestamp": datetime.utcnow().isoformat(),
                    "version": "1.0.0",
                    "latency_ms": round(latency_ms, 2)
                }
            }
        )

    except Exception as e:
        logger.error(f"Rule evaluation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "code": "AGENT_ERROR",
                "message": str(e)
            }
        )


# 3. Evidence Retrieval
@app.post("/v1/case/{patient_id}/evidence")
async def retrieve_evidence(
    patient_id: str,
    request: EvidenceRetrievalRequest
):
    """
    Retrieve relevant clinical evidence for a specific query.

    Args:
        patient_id: Patient identifier
        request: Evidence retrieval request

    Returns:
        Evidence retrieval results
    """
    if factory is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    start_time = datetime.utcnow()

    try:
        logger.info(f"Processing evidence retrieval for patient {patient_id}")

        # Execute evidence retrieval
        result = await factory.retrieve_evidence(
            patient_id=patient_id,
            query=request.query,
            encounter_id=request.encounter_id,
            filters=request.filters or {},
            top_k=request.top_k or 10
        )

        latency_ms = (datetime.utcnow() - start_time).total_seconds() * 1000

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": result,
                "metadata": {
                    "request_id": f"evidence_{patient_id}_{int(datetime.utcnow().timestamp())}",
                    "timestamp": datetime.utcnow().isoformat(),
                    "version": "1.0.0",
                    "latency_ms": round(latency_ms, 2)
                }
            }
        )

    except Exception as e:
        logger.error(f"Evidence retrieval failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "code": "AGENT_ERROR",
                "message": str(e)
            }
        )


# 4. Quality Metrics (Admin)
@app.get("/v1/admin/quality-metrics")
async def get_quality_metrics(
    agent_id: Optional[str] = None,
    domain: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Get quality metrics for CA Factory agents (admin only).

    Args:
        agent_id: Optional agent ID filter
        domain: Optional domain filter
        start_date: Optional start date
        end_date: Optional end date

    Returns:
        Quality metrics
    """
    if factory is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    try:
        logger.info("Fetching quality metrics")

        # Get metrics from factory
        metrics = await factory.get_metrics()

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": metrics,
                "metadata": {
                    "request_id": f"metrics_{int(datetime.utcnow().timestamp())}",
                    "timestamp": datetime.utcnow().isoformat(),
                    "version": "1.0.0"
                }
            }
        )

    except Exception as e:
        logger.error(f"Quality metrics request failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": str(e)
            }
        )


# ========================================
# DEMO PIPELINE ENDPOINTS
# ========================================

class DemoContextRequest(BaseModel):
    """Request for demo context retrieval."""
    domain_id: str = Field(..., description="Domain ID (e.g., 'clabsi', 'cauti')")
    case_id: str = Field(..., description="Case ID (e.g., 'case-001')")


class DemoAbstractRequest(BaseModel):
    """Request for demo abstraction."""
    domain_id: str = Field(..., description="Domain ID")
    case_id: str = Field(..., description="Case ID")
    context_fragments: list = Field(..., description="Context fragments from context endpoint")


class DemoFeedbackRequest(BaseModel):
    """Request for demo feedback submission."""
    domain_id: str = Field(..., description="Domain ID")
    case_id: str = Field(..., description="Case ID")
    feedback_type: str = Field(..., description="Feedback type: 'thumbs_up' or 'thumbs_down'")
    comment: Optional[str] = Field(None, description="Optional feedback comment")


class InterrogationRequest(BaseModel):
    """Request for task interrogation (Ask Panel support)."""
    question: str = Field(..., description="User's question", min_length=1, max_length=500)
    interrogation_context: Dict[str, Any] = Field(
        ...,
        description="Context for interrogation: mode, target_type, target_id, etc."
    )


@app.post("/api/demo/context")
async def demo_context(request: DemoContextRequest):
    """
    DEMO PIPELINE STEP 1: Retrieve context for a case.

    This endpoint loads the patient case data and returns relevant context fragments.

    Args:
        request: Context request with domain_id and case_id

    Returns:
        Context fragments and patient data
    """
    import os
    from pathlib import Path

    try:
        logger.info(f"Demo context request: domain={request.domain_id}, case={request.case_id}")

        # Load case data from mock data directory
        data_dir = Path(__file__).parent.parent / "data" / "mock" / "cases"

        # Map case-001 to actual file
        case_file_map = {
            "case-001": "PAT-001-clabsi-positive.json",
            "case-002": "PAT-002-clabsi-negative.json"
        }

        case_filename = case_file_map.get(request.case_id)
        if not case_filename:
            raise HTTPException(status_code=404, detail=f"Case {request.case_id} not found")

        case_file = data_dir / case_filename

        if not case_file.exists():
            raise HTTPException(status_code=404, detail=f"Case file not found: {case_file}")

        # Load structured case data (files are now in structured format)
        with open(case_file, 'r') as f:
            case_data = json.load(f)

        # Extract patient info from structured format
        patient_section = case_data.get("patient", {})
        case_metadata = patient_section.get("case_metadata", {})
        demographics = patient_section.get("demographics", {})
        clinical_notes = patient_section.get("clinical_notes", [])
        lab_results = patient_section.get("lab_results", [])

        patient_info = {
            "case_id": request.case_id,
            "patient_id": case_metadata.get("patient_id", "PAT-001"),
            "mrn": "MRN-" + case_metadata.get("patient_id", "001")[-3:],
            "age": demographics.get("age", 58),
            "gender": demographics.get("gender", "M")
        }

        # Create context fragments from clinical notes and lab results
        context_fragments = []

        # Add clinical notes as context
        for note in clinical_notes[:3]:
            context_fragments.append({
                "fragment_id": note.get("note_id", "note-unknown"),
                "type": "clinical_note",
                "content": note.get("content", ""),
                "timestamp": note.get("timestamp", ""),
                "author": note.get("author", "Unknown"),
                "relevance_score": 0.92
            })

        # Add lab results as context
        for lab in lab_results[:2]:
            context_fragments.append({
                "fragment_id": lab.get("test_id", "lab-unknown"),
                "type": "lab_result",
                "content": f"{lab.get('test_type', 'Unknown test')}: {lab.get('organism', 'N/A')}",
                "timestamp": lab.get("collection_date", ""),
                "relevance_score": 0.88
            })

        # Build response data with full structured case
        response_data = {
            "domain_id": request.domain_id,
            "case_id": request.case_id,
            "patient": patient_info,
            "context_fragments": context_fragments,
            "case_data": case_data,  # Full structured case (4-section model)
            "format": "structured"
        }

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": response_data,
                "metadata": {
                    "request_id": f"context_{request.case_id}_{int(datetime.utcnow().timestamp())}",
                    "timestamp": datetime.utcnow().isoformat(),
                    "version": "1.0.0"
                }
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Demo context request failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "code": "CONTEXT_ERROR",
                "message": str(e)
            }
        )


@app.post("/api/demo/abstract")
async def demo_abstract(request: DemoAbstractRequest):
    """
    DEMO PIPELINE STEP 2: Generate clinical abstraction.

    This endpoint returns the clinical abstraction from the structured case,
    including narrative, criteria evaluation, and NHSN determination.

    Args:
        request: Abstraction request with context fragments

    Returns:
        Clinical abstraction with criteria evaluation from structured case
    """
    from pathlib import Path

    try:
        logger.info(f"Demo abstract request: domain={request.domain_id}, case={request.case_id}")

        # Load structured case data
        data_dir = Path(__file__).parent.parent / "data" / "mock" / "cases"

        case_file_map = {
            "case-001": "PAT-001-clabsi-positive.json",
            "case-002": "PAT-002-clabsi-negative.json"
        }

        case_filename = case_file_map.get(request.case_id)
        if not case_filename:
            raise HTTPException(status_code=404, detail=f"Case {request.case_id} not found")

        case_file = data_dir / case_filename

        if not case_file.exists():
            raise HTTPException(status_code=404, detail=f"Case file not found: {case_file}")

        # Load structured case
        with open(case_file, 'r') as f:
            case_data = json.load(f)

        # Extract abstraction data from structured case
        abstraction = case_data.get("abstraction", {})

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": {
                    "domain_id": request.domain_id,
                    "case_id": request.case_id,
                    "summary": abstraction.get("narrative", ""),
                    "criteria_evaluation": abstraction.get("criteria_evaluation", {}),
                    "exclusion_analysis": abstraction.get("exclusion_analysis", []),
                    "task_metadata": abstraction.get("task_metadata", {}),
                    "context_fragments_used": len(request.context_fragments),
                    "model_metadata": {
                        "model": "structured-case-precomputed",
                        "prompt_version": abstraction.get("task_metadata", {}).get("prompt_version", "v1.0"),
                        "executed_at": abstraction.get("task_metadata", {}).get("executed_at")
                    }
                },
                "metadata": {
                    "request_id": f"abstract_{request.case_id}_{int(datetime.utcnow().timestamp())}",
                    "timestamp": datetime.utcnow().isoformat(),
                    "version": "1.0.0"
                }
            }
        )

    except Exception as e:
        logger.error(f"Demo abstract request failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "code": "ABSTRACT_ERROR",
                "message": str(e)
            }
        )


@app.post("/api/demo/feedback")
async def demo_feedback(request: DemoFeedbackRequest):
    """
    DEMO PIPELINE STEP 3: Submit user feedback.

    This endpoint records user feedback on the abstraction quality.

    Args:
        request: Feedback request

    Returns:
        Feedback confirmation
    """
    import uuid

    try:
        logger.info(
            f"Demo feedback: domain={request.domain_id}, case={request.case_id}, "
            f"type={request.feedback_type}"
        )

        # Generate feedback ID
        feedback_id = str(uuid.uuid4())

        # In demo mode, we just log and return success
        # In production, this would save to database

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": {
                    "status": "ok",
                    "feedback_id": feedback_id,
                    "domain_id": request.domain_id,
                    "case_id": request.case_id,
                    "feedback_type": request.feedback_type,
                    "message": "Feedback recorded successfully"
                },
                "metadata": {
                    "request_id": f"feedback_{feedback_id}",
                    "timestamp": datetime.utcnow().isoformat(),
                    "version": "1.0.0"
                }
            }
        )

    except Exception as e:
        logger.error(f"Demo feedback request failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "code": "FEEDBACK_ERROR",
                "message": str(e)
            }
        )


# ========================================
# TASK TRACKING ENDPOINTS
# ========================================

@app.get("/v1/case/{case_id}/tasks")
async def get_case_tasks(case_id: str):
    """
    Get all tasks for a specific case.

    This endpoint returns task metadata for all enrichment, abstraction,
    and interrogation tasks associated with a case.

    Args:
        case_id: Case identifier (e.g., 'CASE-CLABSI-001')

    Returns:
        List of tasks with metadata
    """
    from pathlib import Path

    try:
        logger.info(f"Fetching tasks for case: {case_id}")

        # Load case data
        data_dir = Path(__file__).parent.parent / "data" / "mock" / "cases"

        # Map case IDs to files
        case_file_map = {
            "CASE-CLABSI-001": "PAT-001-clabsi-positive.json",
            "CASE-CLABSI-002": "PAT-002-clabsi-negative.json"
        }

        case_filename = case_file_map.get(case_id)
        if not case_filename:
            raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

        case_file = data_dir / case_filename

        if not case_file.exists():
            raise HTTPException(status_code=404, detail=f"Case file not found: {case_file}")

        # Load structured case
        with open(case_file, 'r') as f:
            case_data = json.load(f)

        # Extract tasks from enrichment, abstraction, and qa sections
        tasks = []

        # Enrichment task
        if "enrichment" in case_data and "task_metadata" in case_data["enrichment"]:
            enrichment_task = case_data["enrichment"]["task_metadata"].copy()
            enrichment_task["section"] = "enrichment"
            enrichment_task["summary"] = case_data["enrichment"].get("summary", {})
            tasks.append(enrichment_task)

        # Abstraction task
        if "abstraction" in case_data and "task_metadata" in case_data["abstraction"]:
            abstraction_task = case_data["abstraction"]["task_metadata"].copy()
            abstraction_task["section"] = "abstraction"
            abstraction_task["determination"] = case_data["abstraction"]["criteria_evaluation"].get("determination")
            abstraction_task["confidence"] = case_data["abstraction"]["criteria_evaluation"].get("confidence")
            tasks.append(abstraction_task)

        # QA tasks (interrogations)
        if case_data.get("qa") and case_data["qa"].get("qa_history"):
            for qa_entry in case_data["qa"]["qa_history"]:
                qa_task = qa_entry["task_metadata"].copy()
                qa_task["section"] = "qa"
                qa_task["question"] = qa_entry["question"]
                qa_task["interrogation_mode"] = qa_entry["interrogation_context"]["mode"]
                tasks.append(qa_task)

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": {
                    "case_id": case_id,
                    "task_count": len(tasks),
                    "tasks": tasks
                },
                "metadata": {
                    "request_id": f"tasks_{case_id}_{int(datetime.utcnow().timestamp())}",
                    "timestamp": datetime.utcnow().isoformat(),
                    "version": "1.0.0"
                }
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch tasks for case {case_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "code": "TASK_FETCH_ERROR",
                "message": str(e)
            }
        )


@app.get("/v1/task/{task_id}")
async def get_task(task_id: str):
    """
    Get details for a specific task.

    Args:
        task_id: Task identifier (e.g., 'clabsi.enrichment', 'clabsi.abstraction')

    Returns:
        Task metadata and related data
    """
    from pathlib import Path

    try:
        logger.info(f"Fetching task: {task_id}")

        # Parse task_id to extract case and section
        # Format: {concern}.{section} or interrogation.{qa_id}
        parts = task_id.split(".")

        if parts[0] == "interrogation":
            # This is a QA task - would need to search through cases
            # For demo, return mock data
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "data": {
                        "task_id": task_id,
                        "task_type": "interrogation",
                        "status": "completed",
                        "message": "Interrogation task details would be retrieved from QA history"
                    },
                    "metadata": {
                        "request_id": f"task_{task_id}_{int(datetime.utcnow().timestamp())}",
                        "timestamp": datetime.utcnow().isoformat(),
                        "version": "1.0.0"
                    }
                }
            )

        # Load all cases and search for task
        data_dir = Path(__file__).parent.parent / "data" / "mock" / "cases"

        for case_file in data_dir.glob("*.json"):
            with open(case_file, 'r') as f:
                case_data = json.load(f)

            # Check enrichment task
            if "enrichment" in case_data:
                enrich_meta = case_data["enrichment"].get("task_metadata", {})
                if enrich_meta.get("task_id") == task_id:
                    return JSONResponse(
                        status_code=200,
                        content={
                            "success": True,
                            "data": {
                                "task_metadata": enrich_meta,
                                "section": "enrichment",
                                "case_id": case_data.get("case_id"),
                                "summary": case_data["enrichment"].get("summary"),
                                "signal_groups": case_data["enrichment"].get("signal_groups"),
                                "timeline_phases": case_data["enrichment"].get("timeline_phases")
                            },
                            "metadata": {
                                "request_id": f"task_{task_id}_{int(datetime.utcnow().timestamp())}",
                                "timestamp": datetime.utcnow().isoformat(),
                                "version": "1.0.0"
                            }
                        }
                    )

            # Check abstraction task
            if "abstraction" in case_data:
                abstract_meta = case_data["abstraction"].get("task_metadata", {})
                if abstract_meta.get("task_id") == task_id:
                    return JSONResponse(
                        status_code=200,
                        content={
                            "success": True,
                            "data": {
                                "task_metadata": abstract_meta,
                                "section": "abstraction",
                                "case_id": case_data.get("case_id"),
                                "narrative": case_data["abstraction"].get("narrative"),
                                "criteria_evaluation": case_data["abstraction"].get("criteria_evaluation"),
                                "exclusion_analysis": case_data["abstraction"].get("exclusion_analysis")
                            },
                            "metadata": {
                                "request_id": f"task_{task_id}_{int(datetime.utcnow().timestamp())}",
                                "timestamp": datetime.utcnow().isoformat(),
                                "version": "1.0.0"
                            }
                        }
                    )

        # Task not found
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch task {task_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "code": "TASK_FETCH_ERROR",
                "message": str(e)
            }
        )


# ========================================
# TASK INTERROGATION ENDPOINTS
# ========================================

@app.post("/v1/task/{task_id}/interrogate")
async def interrogate_task(
    task_id: str,
    request: InterrogationRequest
):
    """
    Interrogate a task (Ask Panel support).

    This endpoint allows users to ask questions about specific aspects of a case
    with full interrogation context (explain, summarize, validate).

    Args:
        task_id: Task identifier (e.g., 'clabsi.abstraction', 'CASE-CLABSI-001')
        request: Interrogation request with question and context

    Returns:
        QA history entry with answer, citations, and metadata
    """
    import uuid

    try:
        logger.info(
            f"Interrogation request: task={task_id}, "
            f"mode={request.interrogation_context.get('mode')}, "
            f"target={request.interrogation_context.get('target_type')}"
        )

        # Extract interrogation context
        context = request.interrogation_context
        mode = context.get("mode", "explain")
        target_type = context.get("target_type", "overall")
        target_id = context.get("target_id", "")

        # Load the case to get context for answering
        # In demo mode, we'll use mock data
        # In production, this would query the actual task/case

        # Generate mock answer based on interrogation mode
        if mode == "explain":
            answer = _generate_explanation(task_id, target_type, target_id, request.question)
        elif mode == "summarize":
            answer = _generate_summary(task_id, target_type, target_id, request.question)
        elif mode == "validate":
            answer = _generate_validation(task_id, target_type, target_id, request.question)
        else:
            answer = "I can help explain, summarize, or validate aspects of this case. Please specify your interrogation mode."

        # Create QA history entry
        qa_id = str(uuid.uuid4())
        qa_entry = {
            "qa_id": qa_id,
            "question": request.question,
            "answer": answer,
            "interrogation_context": request.interrogation_context,
            "task_metadata": {
                "task_id": f"interrogation.{qa_id}",
                "task_type": "interrogation",
                "prompt_version": "v1.0",
                "mode": "interactive",
                "executed_at": datetime.utcnow().isoformat(),
                "executed_by": "user",
                "status": "completed"
            },
            "citations": _get_relevant_citations(task_id, target_type, target_id),
            "confidence": 0.85
        }

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": qa_entry,
                "metadata": {
                    "request_id": f"interrogate_{qa_id}",
                    "timestamp": datetime.utcnow().isoformat(),
                    "version": "1.0.0"
                }
            }
        )

    except Exception as e:
        logger.error(f"Interrogation request failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERROGATION_ERROR",
                "message": str(e)
            }
        )


def _generate_explanation(task_id: str, target_type: str, target_id: str, question: str) -> str:
    """Generate explanation for interrogation."""
    if target_type == "criterion":
        return (
            f"This criterion evaluates whether the patient meets the specific NHSN requirement "
            f"for {target_id}. The evidence shows that this criterion is met based on "
            f"clinical documentation including vital signs, lab results, and device placement timeline."
        )
    elif target_type == "signal":
        return (
            f"This signal ({target_id}) represents a clinically significant finding that "
            f"contributes to the overall case determination. It was detected through automated "
            f"analysis of clinical data and validated against established criteria."
        )
    else:
        return (
            f"This case involves comprehensive analysis of patient data including demographics, "
            f"device information, lab results, and clinical notes. The determination is based on "
            f"NHSN criteria evaluation with supporting evidence from multiple data sources."
        )


def _generate_summary(task_id: str, target_type: str, target_id: str, question: str) -> str:
    """Generate summary for interrogation."""
    return (
        f"Summary: The {target_type} shows key clinical findings including positive cultures, "
        f"device presence >2 days, and compatible clinical signs. Overall confidence: 95%."
    )


def _generate_validation(task_id: str, target_type: str, target_id: str, question: str) -> str:
    """Generate validation for interrogation."""
    return (
        f"Validation: This {target_type} has been validated against NHSN criteria. "
        f"All required evidence is present and documented. No contradictions or missing data detected."
    )


def _get_relevant_citations(task_id: str, target_type: str, target_id: str) -> list:
    """Get relevant citations for interrogation response."""
    return [
        "NOTE-001: Patient reports feeling unwell with chills...",
        "LAB-001: Blood culture positive for S. aureus",
        "EVT-001: PICC line insertion on Day 1"
    ]


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": "HTTP_ERROR",
                "message": str(exc.detail)
            },
            "metadata": {
                "request_id": f"error_{int(datetime.utcnow().timestamp())}",
                "timestamp": datetime.utcnow().isoformat(),
                "version": "1.0.0"
            }
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {str(exc)}")

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An internal error occurred"
            },
            "metadata": {
                "request_id": f"error_{int(datetime.utcnow().timestamp())}",
                "timestamp": datetime.utcnow().isoformat(),
                "version": "1.0.0"
            }
        }
    )


# Development server
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
