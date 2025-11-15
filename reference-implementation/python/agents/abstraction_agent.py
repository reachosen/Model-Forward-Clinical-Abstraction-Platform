"""
Abstraction Agent - Clinician-Facing Layer

The Abstraction Agent is responsible for:
1. Generating structured clinical abstraction summaries
2. Applying QA rules and guardrails
3. Detecting missing data, contradictions, and ambiguities
4. Creating clinician-friendly case views
5. Orchestrating Data Agent + LLM (stub) + QA workflow
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict, field
from enum import Enum
from datetime import datetime

# Import Data Agent
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))
from data_agent import DataAgent, DataAgentOutput, ExecutionMode


class QAStatus(Enum):
    """QA validation status"""
    PASS = "PASS"
    WARN = "WARN"
    FAIL = "FAIL"


@dataclass
class AbstractionSummary:
    """Structured abstraction summary for clinician review"""

    # Header
    patient_id: str
    encounter_id: str
    episode_id: str
    mrn: str
    age: int
    gender: str

    # Case metadata
    abstraction_datetime: str
    abstraction_version: str = "v1.0"
    mode: str = "TEST"

    # Key findings
    key_findings: List[str] = field(default_factory=list)

    # Risk assessment
    risk_level: str = "UNKNOWN"  # LOW, MODERATE, HIGH, CRITICAL
    risk_score: float = 0.0  # 0-100
    risk_factors: List[str] = field(default_factory=list)

    # Timeline highlights
    timeline_summary: Dict[str, List[str]] = field(default_factory=dict)

    # Clinical decision
    likely_clabsi: bool = False
    confidence: float = 0.0
    meets_nhsn_criteria: bool = False

    # Supporting evidence
    positive_findings: List[str] = field(default_factory=list)
    negative_findings: List[str] = field(default_factory=list)

    # Unresolved questions
    unresolved_questions: List[Dict[str, str]] = field(default_factory=list)

    # Recommendations
    recommended_actions: List[str] = field(default_factory=list)


@dataclass
class QAResult:
    """QA validation results"""
    qa_status: str  # PASS, WARN, FAIL
    qa_score: float  # 0-100

    # Rule results
    rules_evaluated: int
    rules_passed: int
    rules_warnings: int
    rules_failed: int

    # Detailed issues
    missing_data_fields: List[str] = field(default_factory=list)
    contradictions: List[str] = field(default_factory=list)
    validation_errors: List[str] = field(default_factory=list)

    # Recommendations
    recommended_actions: List[str] = field(default_factory=list)

    # Rule details
    rule_details: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class CaseView:
    """Complete case view for UI consumption"""
    summary: AbstractionSummary
    qa_result: QAResult
    signals: List[Dict[str, Any]]
    timeline: List[Dict[str, Any]]
    rule_evaluations: Dict[str, Any]

    # Metadata
    status: str  # SUCCESS, PARTIAL, FAILED
    generated_at: str
    mode: str


class AbstractionSummaryGenerator:
    """
    Generates clinical abstraction summaries from Data Agent output

    In production, this would invoke an LLM to generate narratives
    """

    def generate(self, data_output: DataAgentOutput) -> AbstractionSummary:
        """Generate abstraction summary from data agent output"""

        # Extract key information
        signals = data_output.signals
        timeline = data_output.timeline
        rules = data_output.rule_evaluations

        # Build key findings from signals
        key_findings = []
        positive_findings = []
        negative_findings = []

        for signal in signals:
            if signal['severity'] == 'CRITICAL':
                finding = f"{signal['signal_name']}: {signal['value']}"
                key_findings.append(finding)
                positive_findings.append(f"{finding} ({signal['rationale']})")

        # Assess risk
        risk_level, risk_score = self._assess_risk(signals, rules)

        # Build timeline summary by phase
        timeline_summary = self._summarize_timeline(timeline)

        # Determine CLABSI likelihood
        likely_clabsi = rules.get('meets_nhsn_criteria', {}).get('result', False)
        confidence = rules.get('meets_nhsn_criteria', {}).get('confidence', 0.0)

        # Identify unresolved questions
        unresolved_questions = self._identify_questions(data_output)

        # Generate recommendations
        recommendations = self._generate_recommendations(
            likely_clabsi, signals, rules, unresolved_questions
        )

        return AbstractionSummary(
            patient_id=data_output.patient_id,
            encounter_id=data_output.encounter_id,
            episode_id=data_output.episode_id,
            mrn=f"MRN{data_output.patient_id}",  # Placeholder
            age=59,  # Would come from metadata
            gender="Unknown",  # Would come from metadata
            abstraction_datetime=datetime.now().isoformat(),
            mode=data_output.mode,
            key_findings=key_findings,
            risk_level=risk_level,
            risk_score=risk_score,
            risk_factors=[],  # Would extract from data
            timeline_summary=timeline_summary,
            likely_clabsi=likely_clabsi,
            confidence=confidence,
            meets_nhsn_criteria=likely_clabsi,
            positive_findings=positive_findings,
            negative_findings=negative_findings,
            unresolved_questions=unresolved_questions,
            recommended_actions=recommendations
        )

    def _assess_risk(
        self, signals: List[Dict], rules: Dict
    ) -> tuple[str, float]:
        """Assess overall CLABSI risk level"""
        critical_signals = [s for s in signals if s['severity'] == 'CRITICAL']
        warning_signals = [s for s in signals if s['severity'] == 'WARNING']

        # Simple scoring algorithm
        score = 0.0
        score += len(critical_signals) * 30
        score += len(warning_signals) * 15

        if rules.get('meets_nhsn_criteria', {}).get('result'):
            score += 25

        score = min(score, 100.0)

        if score >= 75:
            level = "CRITICAL"
        elif score >= 50:
            level = "HIGH"
        elif score >= 25:
            level = "MODERATE"
        else:
            level = "LOW"

        return level, score

    def _summarize_timeline(self, timeline: List[Dict]) -> Dict[str, List[str]]:
        """Summarize timeline by phase"""
        summary = {
            "LINE_PLACEMENT": [],
            "MONITORING": [],
            "CULTURE": [],
            "POST_CULTURE": []
        }

        for event in timeline:
            phase = event.get('phase', 'MONITORING')
            summary.setdefault(phase, []).append(
                f"{event['event_type']}: {event['description']}"
            )

        return summary

    def _identify_questions(self, data_output: DataAgentOutput) -> List[Dict[str, str]]:
        """Identify unresolved clinical questions"""
        questions = []

        # Check for missing data
        validation = data_output.validation_results
        if validation.get('issues'):
            for issue in validation['issues']:
                questions.append({
                    "question": f"Missing data: {issue['description']}",
                    "priority": issue['severity'],
                    "type": "MISSING_DATA"
                })

        # Check for contradictions
        if data_output.contradictions:
            for contradiction in data_output.contradictions:
                questions.append({
                    "question": f"Conflicting data: {contradiction.get('description')}",
                    "priority": "HIGH",
                    "type": "CONTRADICTION"
                })

        # Check for low confidence rules
        for rule_name, rule_result in data_output.rule_evaluations.items():
            if rule_result.get('confidence', 1.0) < 0.85:
                questions.append({
                    "question": f"Low confidence in {rule_name}: {rule_result.get('evidence')}",
                    "priority": "MEDIUM",
                    "type": "AMBIGUOUS"
                })

        return questions

    def _generate_recommendations(
        self, likely_clabsi: bool, signals: List[Dict],
        rules: Dict, questions: List[Dict]
    ) -> List[str]:
        """Generate recommended actions for clinician"""
        recommendations = []

        if likely_clabsi:
            recommendations.append("Review case for CLABSI confirmation")
            recommendations.append("Consider infectious disease consultation")
            recommendations.append("Verify no alternative infection source")

        if questions:
            recommendations.append(f"Resolve {len(questions)} outstanding data questions")

        # Check for specific rule failures
        if not rules.get('no_other_infection_source', {}).get('result'):
            recommendations.append("Document alternative infection source investigation")

        return recommendations


class QAEngine:
    """
    Automated QA and guardrails for abstractions

    Applies rules to detect:
    - Missing critical data
    - Internal contradictions
    - Violations of CLABSI criteria
    - Data quality issues
    """

    def validate(
        self, summary: AbstractionSummary,
        data_output: DataAgentOutput
    ) -> QAResult:
        """Run QA validation on abstraction summary"""

        rule_results = []
        missing_data = []
        contradictions = []
        validation_errors = []

        # Rule 1: Required fields present
        rule_results.append(self._check_required_fields(summary, missing_data))

        # Rule 2: Timeline consistency
        rule_results.append(self._check_timeline_consistency(data_output, contradictions))

        # Rule 3: Signal-rule alignment
        rule_results.append(self._check_signal_rule_alignment(
            data_output, validation_errors
        ))

        # Rule 4: Confidence thresholds
        rule_results.append(self._check_confidence_thresholds(summary, validation_errors))

        # Rule 5: Critical data completeness
        rule_results.append(self._check_critical_data(data_output, missing_data))

        # Calculate overall QA status
        rules_passed = sum(1 for r in rule_results if r['status'] == 'PASS')
        rules_warnings = sum(1 for r in rule_results if r['status'] == 'WARN')
        rules_failed = sum(1 for r in rule_results if r['status'] == 'FAIL')

        if rules_failed > 0:
            qa_status = QAStatus.FAIL
        elif rules_warnings > 0:
            qa_status = QAStatus.WARN
        else:
            qa_status = QAStatus.PASS

        # Calculate QA score
        qa_score = (rules_passed / len(rule_results)) * 100

        # Generate recommendations
        recommendations = self._generate_qa_recommendations(
            missing_data, contradictions, validation_errors
        )

        return QAResult(
            qa_status=qa_status.value,
            qa_score=qa_score,
            rules_evaluated=len(rule_results),
            rules_passed=rules_passed,
            rules_warnings=rules_warnings,
            rules_failed=rules_failed,
            missing_data_fields=missing_data,
            contradictions=contradictions,
            validation_errors=validation_errors,
            recommended_actions=recommendations,
            rule_details=rule_results
        )

    def _check_required_fields(
        self, summary: AbstractionSummary, missing_data: List[str]
    ) -> Dict[str, Any]:
        """Check that required fields are present and valid"""
        required = ['patient_id', 'encounter_id', 'risk_level', 'likely_clabsi']
        missing = []

        for field in required:
            value = getattr(summary, field, None)
            if value is None or value == "UNKNOWN":
                missing.append(field)

        if missing:
            missing_data.extend(missing)
            return {
                "rule_name": "required_fields",
                "status": "FAIL",
                "message": f"Missing required fields: {', '.join(missing)}"
            }

        return {
            "rule_name": "required_fields",
            "status": "PASS",
            "message": "All required fields present"
        }

    def _check_timeline_consistency(
        self, data_output: DataAgentOutput, contradictions: List[str]
    ) -> Dict[str, Any]:
        """Check timeline for temporal consistency"""
        timeline = data_output.timeline

        # Simple check: ensure events are in chronological order
        # In production, would do more sophisticated checks

        if not timeline:
            return {
                "rule_name": "timeline_consistency",
                "status": "WARN",
                "message": "No timeline data available"
            }

        return {
            "rule_name": "timeline_consistency",
            "status": "PASS",
            "message": "Timeline appears consistent"
        }

    def _check_signal_rule_alignment(
        self, data_output: DataAgentOutput, validation_errors: List[str]
    ) -> Dict[str, Any]:
        """Verify signals align with rule evaluations"""
        signals = data_output.signals
        rules = data_output.rule_evaluations

        # Example: If "positive_blood_culture" rule is true, should have corresponding signal
        if rules.get('positive_blood_culture', {}).get('result'):
            has_culture_signal = any(
                'CULTURE' in s.get('signal_name', '') for s in signals
            )
            if not has_culture_signal:
                validation_errors.append(
                    "Rule indicates positive culture but no culture signal found"
                )
                return {
                    "rule_name": "signal_rule_alignment",
                    "status": "WARN",
                    "message": "Possible signal-rule mismatch"
                }

        return {
            "rule_name": "signal_rule_alignment",
            "status": "PASS",
            "message": "Signals align with rules"
        }

    def _check_confidence_thresholds(
        self, summary: AbstractionSummary, validation_errors: List[str]
    ) -> Dict[str, Any]:
        """Check that confidence levels meet thresholds for final decision"""
        if summary.likely_clabsi and summary.confidence < 0.70:
            validation_errors.append(
                f"CLABSI determination has low confidence ({summary.confidence:.2f})"
            )
            return {
                "rule_name": "confidence_thresholds",
                "status": "WARN",
                "message": "Confidence below recommended threshold for positive determination"
            }

        return {
            "rule_name": "confidence_thresholds",
            "status": "PASS",
            "message": "Confidence levels acceptable"
        }

    def _check_critical_data(
        self, data_output: DataAgentOutput, missing_data: List[str]
    ) -> Dict[str, Any]:
        """Check for critical CLABSI data elements"""
        critical_elements = {
            'central_line': False,
            'blood_culture': False,
            'timeline': False
        }

        # Check for line-related signals/data
        if any('LINE' in s.get('signal_name', '') for s in data_output.signals):
            critical_elements['central_line'] = True

        # Check for culture data
        if any('CULTURE' in s.get('signal_name', '') for s in data_output.signals):
            critical_elements['blood_culture'] = True

        # Check for timeline
        if data_output.timeline:
            critical_elements['timeline'] = True

        missing = [k for k, v in critical_elements.items() if not v]
        if missing:
            missing_data.extend(missing)
            return {
                "rule_name": "critical_data",
                "status": "FAIL",
                "message": f"Missing critical data: {', '.join(missing)}"
            }

        return {
            "rule_name": "critical_data",
            "status": "PASS",
            "message": "All critical data elements present"
        }

    def _generate_qa_recommendations(
        self, missing_data: List[str],
        contradictions: List[str],
        validation_errors: List[str]
    ) -> List[str]:
        """Generate recommendations based on QA findings"""
        recommendations = []

        if missing_data:
            recommendations.append(f"Obtain missing data: {', '.join(set(missing_data))}")

        if contradictions:
            recommendations.append("Resolve data contradictions before finalizing")

        if validation_errors:
            recommendations.append("Review validation errors and confirm accuracy")

        return recommendations


class AbstractionAgent:
    """
    Main Abstraction Agent orchestrator

    Combines Data Agent + Summary Generation + QA
    """

    def __init__(self, mode: ExecutionMode = ExecutionMode.TEST):
        self.mode = mode
        self.data_agent = DataAgent(mode)
        self.summary_generator = AbstractionSummaryGenerator()
        self.qa_engine = QAEngine()

    def generate_case_view(
        self, patient_id: str, encounter_id: str,
        episode_id: Optional[str] = None
    ) -> CaseView:
        """
        Main API: Generate complete case view for UI

        This orchestrates the full workflow:
        1. Data Agent fetches and processes data
        2. Summary Generator creates abstraction
        3. QA Engine validates the abstraction
        4. Return complete case view
        """

        # Step 1: Run Data Agent
        data_output = self.data_agent.process_case(patient_id, encounter_id, episode_id)

        # Step 2: Generate abstraction summary
        summary = self.summary_generator.generate(data_output)

        # Step 3: Run QA validation
        qa_result = self.qa_engine.validate(summary, data_output)

        # Step 4: Build case view
        case_view = CaseView(
            summary=summary,
            qa_result=qa_result,
            signals=data_output.signals,
            timeline=data_output.timeline,
            rule_evaluations=data_output.rule_evaluations,
            status=data_output.status,
            generated_at=datetime.now().isoformat(),
            mode=self.mode.value
        )

        return case_view


# Example usage
if __name__ == "__main__":
    import json

    # Initialize Abstraction Agent
    agent = AbstractionAgent(mode=ExecutionMode.TEST)

    # Generate case view
    case_view = agent.generate_case_view(
        patient_id="PAT001",
        encounter_id="ENC001",
        episode_id="EP001"
    )

    print("=" * 80)
    print("CLABSI ABSTRACTION CASE VIEW")
    print("=" * 80)

    print(f"\nPatient: {case_view.summary.mrn}")
    print(f"Risk Level: {case_view.summary.risk_level} (Score: {case_view.summary.risk_score:.1f})")
    print(f"Likely CLABSI: {case_view.summary.likely_clabsi} (Confidence: {case_view.summary.confidence:.0%})")
    print(f"Meets NHSN Criteria: {case_view.summary.meets_nhsn_criteria}")

    print(f"\nKey Findings:")
    for finding in case_view.summary.key_findings:
        print(f"  • {finding}")

    print(f"\nTimeline Summary:")
    for phase, events in case_view.summary.timeline_summary.items():
        if events:
            print(f"  {phase}:")
            for event in events:
                print(f"    - {event}")

    print(f"\nQA Status: {case_view.qa_result.qa_status} (Score: {case_view.qa_result.qa_score:.1f})")
    print(f"Rules: {case_view.qa_result.rules_passed}/{case_view.qa_result.rules_evaluated} passed")

    if case_view.qa_result.validation_errors:
        print(f"\nValidation Errors:")
        for error in case_view.qa_result.validation_errors:
            print(f"  ⚠ {error}")

    print(f"\nRecommended Actions:")
    for action in case_view.summary.recommended_actions:
        print(f"  → {action}")

    print("\n" + "=" * 80)

    # Export as JSON for UI
    case_view_dict = {
        "summary": asdict(case_view.summary),
        "qa_result": asdict(case_view.qa_result),
        "signals": case_view.signals,
        "timeline": case_view.timeline,
        "rule_evaluations": case_view.rule_evaluations,
        "status": case_view.status,
        "generated_at": case_view.generated_at,
        "mode": case_view.mode
    }

    print("\nJSON Export (sample):")
    print(json.dumps(case_view_dict, indent=2)[:500] + "...")
