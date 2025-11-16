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
        # Load CLABSI configuration
        config_path = Path(__file__).parent.parent / "configs" / "clabsi.json"

        logger.info(f"Loading configuration from: {config_path}")

        with open(config_path, "r") as f:
            config = json.load(f)

        # Initialize CA Factory
        factory = CAFactory(config=config)

        logger.info("CA Factory initialized successfully")

    except Exception as e:
        logger.error(f"Failed to initialize CA Factory: {str(e)}")
        raise


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    if factory is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    health = await factory.health_check()

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
