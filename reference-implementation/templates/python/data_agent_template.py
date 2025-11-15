"""
{DOMAIN} Data Agent Template

INSTRUCTIONS:
1. Copy this file to python/agents/{domain}_data_agent.py
2. Replace all {DOMAIN} with your domain name (e.g., NAKI)
3. Replace all {domain} with lowercase (e.g., naki)
4. Fill in all TODO sections
5. Test each tool function individually
6. Update the planner to use domain-specific tool sequences
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import sys
from pathlib import Path

# Import base Data Agent components
sys.path.append(str(Path(__file__).parent))
from data_agent import ToolResult, ExecutionMode, DataAgentPlanner


@dataclass
class {DOMAIN}DataAgentOutput:
    """
    Output structure for {DOMAIN} Data Agent

    TODO: Customize fields based on your domain
    """
    patient_id: str
    encounter_id: str
    episode_id: str
    mode: str

    # Domain-specific data
    signals: List[Dict[str, Any]]
    timeline: List[Dict[str, Any]]
    rule_evaluations: Dict[str, Any]
    vector_chunks: List[Dict[str, Any]]

    # TODO: Add domain-specific output fields
    # Example for NAKI:
    # neuro_assessments: List[Dict[str, Any]]
    # imaging_results: List[Dict[str, Any]]

    # Standard fields
    contradictions: List[Dict[str, Any]]
    validation_results: Dict[str, Any]
    tool_execution_log: List[ToolResult]
    status: str


class {DOMAIN}DataAgentTools:
    """
    Collection of tools for {DOMAIN} domain

    TODO: Implement each tool based on your domain requirements
    """

    def __init__(self, mode: ExecutionMode = ExecutionMode.TEST):
        self.mode = mode

    def fetch_signals(
        self, patient_id: str, encounter_id: str, episode_id: Optional[str] = None
    ) -> ToolResult:
        """
        Fetch {domain}-specific clinical signals

        TODO: Define what signals are relevant for your domain
        Examples for different domains:
        - NAKI: GCS declines, pupil changes, imaging findings
        - UE: Extubation timing, reintubation, sedation levels
        - Falls: Mobility scores, prior falls, injury findings

        In production: Query GOLD_AI.{DOMAIN}_LLM_PAYLOADS
        """
        # TODO: Replace with domain-specific signals
        signals = [
            {
                "signal_id": "SIG001",
                "signal_name": "TODO_SIGNAL_NAME",  # TODO: Replace
                "signal_type": "TODO_TYPE",  # DEVICE|LAB|VITAL|MEDICATION|PROCEDURE|ASSESSMENT
                "value": "TODO_VALUE",
                "severity": "CRITICAL",  # INFO|WARNING|CRITICAL
                "rationale": "TODO: Why this is significant",
                "timestamp": "2024-01-15T14:00:00",
                "confidence": 0.95
            },
            # TODO: Add more domain-specific signals
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
        Fetch clinical timeline for {domain}

        TODO: Define timeline phases for your domain
        Examples:
        - NAKI: BASELINE, INJURY_EVENT, IMMEDIATE_POST, TREATMENT, RECOVERY
        - UE: INTUBATION, VENTILATION, EXTUBATION, POST_EXTUBATION
        - CLABSI: PRE_LINE, LINE_PLACEMENT, MONITORING, CULTURE, POST_CULTURE

        In production: Query GOLD.CLINICAL_TIMELINE filtered for {domain}
        """
        # TODO: Replace with domain-specific timeline events
        timeline = [
            {
                "event_id": "TL001",
                "event_datetime": "2024-01-10T16:00:00",
                "event_type": "TODO_EVENT_TYPE",  # TODO: Replace
                "description": "TODO: Event description",
                "phase": "TODO_PHASE",  # TODO: Use your timeline phases
                "severity": "INFO"
            },
            # TODO: Add more timeline events
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
        Evaluate {domain} determination rules

        TODO: Implement your domain's determination criteria
        Based on your config.json determination_rules section

        Example rules structure:
        - Each rule has: result (bool), evidence (str), confidence (float)
        - Final rule combines all: meets_{domain}_criteria
        """
        # TODO: Replace with domain-specific rules
        rule_results = {
            "TODO_rule_1": {
                "result": True,
                "evidence": "TODO: Evidence supporting this rule",
                "confidence": 1.0
            },
            "TODO_rule_2": {
                "result": True,
                "evidence": "TODO: Evidence supporting this rule",
                "confidence": 0.85
            },
            # TODO: Add all rules from your config.json

            "meets_{domain}_criteria": {
                "result": True,  # TODO: Combine all rules
                "evidence": "TODO: Summary of determination",
                "confidence": 0.88
            }
        }

        return ToolResult(
            tool_name="evaluate_rules",
            success=True,
            data=rule_results,
            metadata={
                "total_rules": len(rule_results),
                "passed": sum(1 for r in rule_results.values() if r['result']),
                "failed": sum(1 for r in rule_results.values() if not r['result'])
            }
        )

    # TODO: Add domain-specific tool methods
    # Example for NAKI:
    def fetch_neuro_assessments(
        self, patient_id: str, encounter_id: str
    ) -> ToolResult:
        """
        Fetch neurologic assessments (NAKI-specific)
        """
        pass

    # Example for UE:
    def fetch_ventilator_settings(
        self, patient_id: str, encounter_id: str
    ) -> ToolResult:
        """
        Fetch ventilator settings and parameters (UE-specific)
        """
        pass

    # Keep these standard tools (minor customization may be needed)
    def vector_search(
        self, patient_id: str, encounter_id: str, query: str, top_k: int = 5
    ) -> ToolResult:
        """Search vector store for relevant chunks"""
        # Usually doesn't need domain-specific changes
        chunks = []  # Stub
        return ToolResult("vector_search", True, chunks)

    def detect_contradictions(self, payload: Dict[str, Any]) -> ToolResult:
        """Detect logical contradictions in the data"""
        # May need domain-specific contradiction checks
        contradictions = []  # TODO: Add domain-specific checks
        return ToolResult("detect_contradictions", True, contradictions)

    def validate_fidelity(self, payload: Dict[str, Any]) -> ToolResult:
        """Validate data completeness and quality"""
        # TODO: Add domain-specific validation
        validation_results = {
            "overall_status": "PASS",
            "completeness_score": 0.95,
            "quality_score": 0.92,
            "issues": []
        }
        return ToolResult("validate_fidelity", True, validation_results)


class {DOMAIN}DataAgentPlanner:
    """
    Planner for {domain} domain

    TODO: Customize tool execution sequence for your domain
    """

    def __init__(self, tools: {DOMAIN}DataAgentTools):
        self.tools = tools

    def plan_abstraction_case(
        self, patient_id: str, encounter_id: str, episode_id: Optional[str] = None
    ) -> List[str]:
        """
        Create execution plan for {domain} abstraction

        TODO: Customize this sequence based on your domain needs
        Standard sequence:
        1. Fetch signals
        2. Fetch timeline
        3. Evaluate rules
        4. Domain-specific tools
        5. Vector search
        6. Contradiction detection
        7. Validation
        """
        plan = [
            "fetch_signals",
            "fetch_timeline",
            "evaluate_rules",
            # TODO: Add domain-specific tools
            # "fetch_neuro_assessments",  # Example for NAKI
            # "fetch_ventilator_settings",  # Example for UE
            "vector_search",
            "detect_contradictions",
            "validate_fidelity"
        ]
        return plan

    def execute_plan(
        self, plan: List[str], patient_id: str, encounter_id: str,
        episode_id: Optional[str] = None
    ) -> List[ToolResult]:
        """Execute the planned tool sequence"""
        results = []
        context = {}

        for tool_name in plan:
            # Execute standard tools
            if tool_name == "fetch_signals":
                result = self.tools.fetch_signals(patient_id, encounter_id, episode_id)
            elif tool_name == "fetch_timeline":
                result = self.tools.fetch_timeline(patient_id, encounter_id, episode_id)
            elif tool_name == "evaluate_rules":
                result = self.tools.evaluate_rules(patient_id, encounter_id, episode_id)

            # TODO: Add domain-specific tool execution
            # elif tool_name == "fetch_neuro_assessments":
            #     result = self.tools.fetch_neuro_assessments(patient_id, encounter_id)

            # Standard tools (usually don't change)
            elif tool_name == "vector_search":
                result = self.tools.vector_search(
                    patient_id, encounter_id, "{domain} relevant events"
                )
            elif tool_name == "detect_contradictions":
                result = self.tools.detect_contradictions(context)
            elif tool_name == "validate_fidelity":
                result = self.tools.validate_fidelity(context)
            else:
                result = ToolResult(tool_name, False, None, f"Unknown tool: {tool_name}")

            results.append(result)
            if result.success:
                context[tool_name] = result.data

        return results


class {DOMAIN}DataAgent:
    """
    Main {DOMAIN} Data Agent

    TODO: Usually this class doesn't need changes, just uses the tools above
    """

    def __init__(self, mode: ExecutionMode = ExecutionMode.TEST):
        self.mode = mode
        self.tools = {DOMAIN}DataAgentTools(mode)
        self.planner = {DOMAIN}DataAgentPlanner(self.tools)

    def process_case(
        self, patient_id: str, encounter_id: str, episode_id: Optional[str] = None
    ) -> {DOMAIN}DataAgentOutput:
        """Process a {domain} case"""

        # Create and execute plan
        plan = self.planner.plan_abstraction_case(patient_id, encounter_id, episode_id)
        tool_results = self.planner.execute_plan(plan, patient_id, encounter_id, episode_id)

        # Extract data from results
        signals = []
        timeline = []
        rule_evaluations = {}
        vector_chunks = []
        contradictions = []
        validation_results = {}

        # TODO: Extract domain-specific data
        # neuro_assessments = []  # Example for NAKI

        for result in tool_results:
            if result.tool_name == "fetch_signals" and result.success:
                signals = result.data
            elif result.tool_name == "fetch_timeline" and result.success:
                timeline = result.data
            elif result.tool_name == "evaluate_rules" and result.success:
                rule_evaluations = result.data
            # TODO: Extract domain-specific results
            # elif result.tool_name == "fetch_neuro_assessments" and result.success:
            #     neuro_assessments = result.data
            elif result.tool_name == "vector_search" and result.success:
                vector_chunks = result.data
            elif result.tool_name == "detect_contradictions" and result.success:
                contradictions = result.data
            elif result.tool_name == "validate_fidelity" and result.success:
                validation_results = result.data

        # Determine status
        failed_tools = [r for r in tool_results if not r.success]
        status = "PARTIAL" if failed_tools and signals else "FAILED" if failed_tools else "SUCCESS"

        return {DOMAIN}DataAgentOutput(
            patient_id=patient_id,
            encounter_id=encounter_id,
            episode_id=episode_id or f"EP_{encounter_id}",
            mode=self.mode.value,
            signals=signals,
            timeline=timeline,
            rule_evaluations=rule_evaluations,
            vector_chunks=vector_chunks,
            # TODO: Add domain-specific data
            # neuro_assessments=neuro_assessments,
            contradictions=contradictions,
            validation_results=validation_results,
            tool_execution_log=tool_results,
            status=status
        )


# Test code
if __name__ == "__main__":
    print(f"Testing {DOMAIN} Data Agent...")

    agent = {DOMAIN}DataAgent(mode=ExecutionMode.TEST)
    output = agent.process_case(
        patient_id="TEST001",
        encounter_id="ENC001",
        episode_id="EP001"
    )

    print(f"\nStatus: {output.status}")
    print(f"Signals: {len(output.signals)}")
    print(f"Timeline events: {len(output.timeline)}")
    print(f"Rules evaluated: {len(output.rule_evaluations)}")

    # TODO: Print domain-specific data

    print("\nTest complete!")
