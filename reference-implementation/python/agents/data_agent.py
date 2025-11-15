"""
Data Agent - Model-Forward Data Layer

The Data Agent is responsible for:
1. Planning which tools to use based on the task
2. Fetching structured data (signals, timelines, metrics)
3. Executing rules and validators
4. Searching vector store for relevant context
5. Detecting contradictions and data quality issues

Mode: TEST or PROD
- TEST: Uses only test patients, writes to test ledger
- PROD: Uses prod flag, writes to prod ledger
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import json


class ExecutionMode(Enum):
    """Execution environment"""
    TEST = "TEST"
    PROD = "PROD"


@dataclass
class ToolResult:
    """Result from a tool execution"""
    tool_name: str
    success: bool
    data: Any
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class DataAgentOutput:
    """Final output from Data Agent"""
    patient_id: str
    encounter_id: str
    episode_id: str
    mode: str

    signals: List[Dict[str, Any]]
    timeline: List[Dict[str, Any]]
    rule_evaluations: Dict[str, Any]
    vector_chunks: List[Dict[str, Any]]
    contradictions: List[Dict[str, Any]]
    validation_results: Dict[str, Any]

    tool_execution_log: List[ToolResult]
    status: str  # SUCCESS, PARTIAL, FAILED


class DataAgentTools:
    """
    Collection of tools available to the Data Agent

    In production, these would connect to Snowflake and other data sources
    """

    def __init__(self, mode: ExecutionMode = ExecutionMode.TEST):
        self.mode = mode

    def fetch_signals(
        self, patient_id: str, encounter_id: str, episode_id: Optional[str] = None
    ) -> ToolResult:
        """
        Fetch clinical signals from GOLD_AI payload

        In production: Query GOLD_AI.CLABSI_LLM_PAYLOADS
        """
        # Stub implementation
        signals = [
            {
                "signal_id": "SIG001",
                "signal_name": "POSITIVE_BLOOD_CULTURE",
                "signal_type": "LAB",
                "value": "Staphylococcus aureus",
                "severity": "CRITICAL",
                "rationale": "Recognized pathogen in blood culture from central line",
                "timestamp": "2024-01-15T14:00:00",
                "confidence": 0.95
            },
            {
                "signal_id": "SIG002",
                "signal_name": "FEVER_SPIKE",
                "signal_type": "VITAL",
                "value": "103.1 F",
                "severity": "WARNING",
                "rationale": "Temperature elevation coinciding with culture",
                "timestamp": "2024-01-15T18:00:00",
                "confidence": 0.88
            },
            {
                "signal_id": "SIG003",
                "signal_name": "CENTRAL_LINE_PRESENT",
                "signal_type": "DEVICE",
                "value": "5 days",
                "severity": "INFO",
                "rationale": "Central line in place for 5 days at time of culture",
                "timestamp": "2024-01-15T08:30:00",
                "confidence": 1.0
            }
        ]

        return ToolResult(
            tool_name="fetch_signals",
            success=True,
            data=signals,
            metadata={"count": len(signals)}
        )

    def fetch_timeline(
        self, patient_id: str, encounter_id: str, episode_id: Optional[str] = None
    ) -> ToolResult:
        """
        Fetch clinical timeline from GOLD layer

        In production: Query GOLD.CLINICAL_TIMELINE
        """
        timeline = [
            {
                "event_id": "TL001",
                "event_datetime": "2024-01-10T16:00:00",
                "event_type": "LINE_INSERTION",
                "description": "Right subclavian triple-lumen central line placed",
                "phase": "LINE_PLACEMENT",
                "severity": "INFO"
            },
            {
                "event_id": "TL002",
                "event_datetime": "2024-01-15T08:30:00",
                "event_type": "CULTURE_DRAWN",
                "description": "Blood culture drawn from central line due to fever",
                "phase": "CULTURE",
                "severity": "WARNING"
            },
            {
                "event_id": "TL003",
                "event_datetime": "2024-01-15T10:00:00",
                "event_type": "ANTIBIOTIC_STARTED",
                "description": "Empiric vancomycin and cefepime initiated",
                "phase": "POST_CULTURE",
                "severity": "INFO"
            },
            {
                "event_id": "TL004",
                "event_datetime": "2024-01-16T14:00:00",
                "event_type": "CULTURE_POSITIVE",
                "description": "Blood culture positive for S. aureus",
                "phase": "POST_CULTURE",
                "severity": "CRITICAL"
            },
            {
                "event_id": "TL005",
                "event_datetime": "2024-01-20T10:00:00",
                "event_type": "LINE_REMOVAL",
                "description": "Central line removed due to suspected infection",
                "phase": "POST_CULTURE",
                "severity": "INFO"
            }
        ]

        return ToolResult(
            tool_name="fetch_timeline",
            success=True,
            data=timeline,
            metadata={"event_count": len(timeline)}
        )

    def evaluate_rules(
        self, patient_id: str, encounter_id: str, episode_id: Optional[str] = None
    ) -> ToolResult:
        """
        Evaluate CLABSI determination rules

        Based on NHSN CLABSI criteria:
        1. Patient has central line
        2. Line present for >2 days
        3. Positive blood culture with recognized pathogen
        4. No other source of infection identified
        """
        rule_results = {
            "has_central_line": {
                "result": True,
                "evidence": "Triple-lumen central line placed 2024-01-10",
                "confidence": 1.0
            },
            "line_present_gt_2days": {
                "result": True,
                "evidence": "Line in place for 5 days at culture time",
                "confidence": 1.0
            },
            "positive_blood_culture": {
                "result": True,
                "evidence": "S. aureus grown from blood culture",
                "confidence": 0.95
            },
            "recognized_pathogen": {
                "result": True,
                "evidence": "S. aureus is a recognized pathogen per NHSN",
                "confidence": 1.0
            },
            "no_other_infection_source": {
                "result": True,
                "evidence": "No pneumonia, UTI, or surgical site infection documented",
                "confidence": 0.80
            },
            "meets_nhsn_criteria": {
                "result": True,
                "evidence": "All CLABSI criteria met",
                "confidence": 0.88
            }
        }

        return ToolResult(
            tool_name="evaluate_rules",
            success=True,
            data=rule_results,
            metadata={"total_rules": len(rule_results), "passed": 6, "failed": 0}
        )

    def vector_search(
        self, patient_id: str, encounter_id: str, query: str, top_k: int = 5
    ) -> ToolResult:
        """
        Search vector store for relevant chunks

        In production: Use Snowflake vector search or dedicated vector DB
        """
        # Stub implementation
        chunks = [
            {
                "chunk_id": "CHUNK_001",
                "chunk_type": "SIGNALS_CRITICAL",
                "chunk_text": "Critical Signal: Positive blood culture with S. aureus",
                "similarity_score": 0.92,
                "metadata": {"phase": "CULTURE"}
            },
            {
                "chunk_id": "CHUNK_002",
                "chunk_type": "TIMELINE_PHASE",
                "chunk_text": "Culture drawn on day 5 of central line placement",
                "similarity_score": 0.85,
                "metadata": {"phase": "CULTURE"}
            }
        ]

        return ToolResult(
            tool_name="vector_search",
            success=True,
            data=chunks,
            metadata={"query": query, "results_count": len(chunks)}
        )

    def summarize_by_phase(
        self, payload: Dict[str, Any], phase: str
    ) -> ToolResult:
        """
        Summarize events and signals for a specific clinical phase
        """
        summary = {
            "phase": phase,
            "event_count": 0,
            "signal_count": 0,
            "key_findings": [],
            "concerns": []
        }

        # Stub implementation based on phase
        if phase == "LINE_PLACEMENT":
            summary.update({
                "event_count": 1,
                "key_findings": ["Triple-lumen central line placed in right subclavian vein"],
                "concerns": []
            })
        elif phase == "CULTURE":
            summary.update({
                "event_count": 2,
                "signal_count": 2,
                "key_findings": [
                    "Blood culture drawn from central line",
                    "Culture positive for S. aureus (recognized pathogen)"
                ],
                "concerns": ["High fever coinciding with culture collection"]
            })

        return ToolResult(
            tool_name="summarize_by_phase",
            success=True,
            data=summary
        )

    def detect_contradictions(
        self, payload: Dict[str, Any]
    ) -> ToolResult:
        """
        Detect logical contradictions in the data

        Examples:
        - Line removed before culture drawn
        - Antibiotics before line placement
        - Multiple conflicting organisms
        """
        contradictions = []

        # Stub implementation - in production would analyze timeline
        # Example: Check for temporal inconsistencies
        # No contradictions found in this example

        return ToolResult(
            tool_name="detect_contradictions",
            success=True,
            data=contradictions,
            metadata={"contradictions_found": len(contradictions)}
        )

    def validate_fidelity(
        self, payload: Dict[str, Any]
    ) -> ToolResult:
        """
        Validate data completeness and quality

        Checks:
        - Required fields present
        - Timestamps logical
        - Values within expected ranges
        - Critical data not missing
        """
        validation_results = {
            "overall_status": "PASS",
            "completeness_score": 0.95,
            "quality_score": 0.92,
            "issues": []
        }

        # Check for required metadata
        metadata = payload.get('metadata', {})
        required_fields = ['patient_id', 'encounter_id', 'admission_date']
        missing_fields = [f for f in required_fields if not metadata.get(f)]

        if missing_fields:
            validation_results["issues"].append({
                "type": "MISSING_DATA",
                "severity": "HIGH",
                "description": f"Missing required fields: {', '.join(missing_fields)}"
            })
            validation_results["overall_status"] = "WARN"

        # Check for critical signals
        signals = payload.get('signals', [])
        if not signals:
            validation_results["issues"].append({
                "type": "MISSING_DATA",
                "severity": "MEDIUM",
                "description": "No clinical signals found"
            })

        return ToolResult(
            tool_name="validate_fidelity",
            success=True,
            data=validation_results
        )


class DataAgentPlanner:
    """
    Planner that decides which tools to use and in what order
    """

    def __init__(self, tools: DataAgentTools):
        self.tools = tools

    def plan_abstraction_case(
        self, patient_id: str, encounter_id: str, episode_id: Optional[str] = None
    ) -> List[str]:
        """
        Create execution plan for building an abstraction case

        Standard sequence:
        1. Fetch signals
        2. Fetch timeline
        3. Evaluate rules
        4. Vector search for context
        5. Detect contradictions
        6. Validate fidelity
        """
        return [
            "fetch_signals",
            "fetch_timeline",
            "evaluate_rules",
            "vector_search",
            "detect_contradictions",
            "validate_fidelity"
        ]

    def execute_plan(
        self, plan: List[str], patient_id: str, encounter_id: str,
        episode_id: Optional[str] = None
    ) -> List[ToolResult]:
        """Execute the planned sequence of tool calls"""
        results = []

        # Build context from previous results
        context = {}

        for tool_name in plan:
            if tool_name == "fetch_signals":
                result = self.tools.fetch_signals(patient_id, encounter_id, episode_id)
            elif tool_name == "fetch_timeline":
                result = self.tools.fetch_timeline(patient_id, encounter_id, episode_id)
            elif tool_name == "evaluate_rules":
                result = self.tools.evaluate_rules(patient_id, encounter_id, episode_id)
            elif tool_name == "vector_search":
                result = self.tools.vector_search(
                    patient_id, encounter_id, "CLABSI relevant events", top_k=5
                )
            elif tool_name == "detect_contradictions":
                result = self.tools.detect_contradictions(context)
            elif tool_name == "validate_fidelity":
                result = self.tools.validate_fidelity(context)
            else:
                result = ToolResult(
                    tool_name=tool_name,
                    success=False,
                    data=None,
                    error=f"Unknown tool: {tool_name}"
                )

            results.append(result)

            # Update context with result data
            if result.success:
                context[tool_name] = result.data

        return results


class DataAgent:
    """
    Main Data Agent orchestrator
    """

    def __init__(self, mode: ExecutionMode = ExecutionMode.TEST):
        self.mode = mode
        self.tools = DataAgentTools(mode)
        self.planner = DataAgentPlanner(self.tools)

    def process_case(
        self, patient_id: str, encounter_id: str, episode_id: Optional[str] = None
    ) -> DataAgentOutput:
        """
        Main entry point: Process a CLABSI case

        Returns structured output for the Abstraction Agent
        """
        # Create execution plan
        plan = self.planner.plan_abstraction_case(patient_id, encounter_id, episode_id)

        # Execute plan
        tool_results = self.planner.execute_plan(plan, patient_id, encounter_id, episode_id)

        # Extract data from tool results
        signals = []
        timeline = []
        rule_evaluations = {}
        vector_chunks = []
        contradictions = []
        validation_results = {}

        for result in tool_results:
            if result.tool_name == "fetch_signals" and result.success:
                signals = result.data
            elif result.tool_name == "fetch_timeline" and result.success:
                timeline = result.data
            elif result.tool_name == "evaluate_rules" and result.success:
                rule_evaluations = result.data
            elif result.tool_name == "vector_search" and result.success:
                vector_chunks = result.data
            elif result.tool_name == "detect_contradictions" and result.success:
                contradictions = result.data
            elif result.tool_name == "validate_fidelity" and result.success:
                validation_results = result.data

        # Determine overall status
        failed_tools = [r for r in tool_results if not r.success]
        if failed_tools:
            status = "PARTIAL" if signals else "FAILED"
        else:
            status = "SUCCESS"

        return DataAgentOutput(
            patient_id=patient_id,
            encounter_id=encounter_id,
            episode_id=episode_id or f"EP_{encounter_id}",
            mode=self.mode.value,
            signals=signals,
            timeline=timeline,
            rule_evaluations=rule_evaluations,
            vector_chunks=vector_chunks,
            contradictions=contradictions,
            validation_results=validation_results,
            tool_execution_log=tool_results,
            status=status
        )


# Example usage
if __name__ == "__main__":
    # Initialize Data Agent in TEST mode
    agent = DataAgent(mode=ExecutionMode.TEST)

    # Process a case
    output = agent.process_case(
        patient_id="PAT001",
        encounter_id="ENC001",
        episode_id="EP001"
    )

    print(f"Data Agent Output (Status: {output.status})")
    print(f"Mode: {output.mode}")
    print(f"\nSignals: {len(output.signals)}")
    for signal in output.signals:
        print(f"  - {signal['signal_name']}: {signal['value']} ({signal['severity']})")

    print(f"\nTimeline Events: {len(output.timeline)}")
    for event in output.timeline[:3]:
        print(f"  - {event['event_datetime']}: {event['event_type']}")

    print(f"\nRule Evaluations:")
    for rule, result in output.rule_evaluations.items():
        print(f"  - {rule}: {result['result']} (confidence: {result['confidence']})")

    print(f"\nValidation: {output.validation_results.get('overall_status')}")
    print(f"Contradictions found: {len(output.contradictions)}")
