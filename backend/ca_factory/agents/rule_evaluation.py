"""
Rule Evaluation Agent

Specialized agent for evaluating NHSN criteria and clinical decision rules
against patient data.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from ca_factory.agents.base import BaseAgent, AgentValidationError

logger = logging.getLogger(__name__)


class RuleEvaluationAgent(BaseAgent):
    """
    Rule Evaluation Agent for NHSN criteria evaluation.

    Responsibilities:
    - Load domain-specific rules (CLABSI, CAUTI, etc.)
    - Evaluate each rule against patient data
    - Collect supporting/contradicting evidence
    - Generate evaluation summary
    - Provide confidence scores
    """

    def __init__(
        self,
        agent_id: str,
        config: Dict[str, Any],
        domain: str = "CLABSI"
    ):
        """
        Initialize Rule Evaluation Agent.

        Args:
            agent_id: Unique agent identifier
            config: Agent configuration
            domain: Clinical domain (CLABSI, CAUTI, etc.)
        """
        super().__init__(
            agent_id=agent_id,
            agent_type="evaluation",
            config=config
        )

        self.domain = domain
        self.rules = self._load_domain_rules(domain)

    def _load_domain_rules(self, domain: str) -> List[Dict[str, Any]]:
        """
        Load domain-specific rules.

        Args:
            domain: Clinical domain

        Returns:
            List of rule definitions
        """
        # Mock rule definitions for CLABSI
        # In production, these would be loaded from configuration
        if domain == "CLABSI":
            return [
                {
                    "ruleId": "CLABSI-001",
                    "ruleName": "Central line present for >2 calendar days",
                    "category": "device",
                    "isRequired": True,
                    "description": "Verifies that a central line was present for more than 2 calendar days before the positive blood culture."
                },
                {
                    "ruleId": "CLABSI-002",
                    "ruleName": "Positive blood culture",
                    "category": "lab",
                    "isRequired": True,
                    "description": "Patient has at least one positive blood culture result."
                },
                {
                    "ruleId": "CLABSI-003",
                    "ruleName": "Clinical symptoms present",
                    "category": "clinical",
                    "isRequired": True,
                    "description": "Patient exhibits clinical signs/symptoms (fever, chills, hypotension)."
                },
                {
                    "ruleId": "CLABSI-004",
                    "ruleName": "No alternate infection source",
                    "category": "exclusion",
                    "isRequired": True,
                    "description": "No other identified source of infection."
                },
                {
                    "ruleId": "CLABSI-005",
                    "ruleName": "Temporal relationship",
                    "category": "temporal",
                    "isRequired": True,
                    "description": "Positive culture within infection window period (Day 3-7 of line placement)."
                },
                {
                    "ruleId": "CLABSI-006",
                    "ruleName": "Appropriate organism",
                    "category": "lab",
                    "isRequired": False,
                    "description": "Organism is commonly associated with CLABSI."
                },
            ]
        else:
            return []

    async def execute(
        self,
        inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute rule evaluation task.

        Args:
            inputs: Task inputs containing:
                - patient_id: Patient identifier
                - encounter_id: Optional encounter identifier
                - domain: Domain (CLABSI, CAUTI, etc.)
                - include_evidence: Include detailed evidence

        Returns:
            Rule evaluation results
        """
        start_time = datetime.utcnow()

        # Validate inputs
        validation = self.validate_inputs(inputs)
        if not validation["valid"]:
            raise AgentValidationError(
                agent_id=self.agent_id,
                validation_type="input",
                errors=validation["errors"]
            )

        patient_id = inputs["patient_id"]
        encounter_id = inputs.get("encounter_id")
        domain = inputs.get("domain", self.domain)
        include_evidence = inputs.get("include_evidence", True)

        logger.info(
            f"Evaluating {domain} rules for patient {patient_id}"
        )

        # Load patient data (mock)
        patient_data = await self._load_patient_data(patient_id, encounter_id)

        # Evaluate each rule
        evaluations = []
        for rule in self.rules:
            evaluation = await self._evaluate_rule(
                rule=rule,
                patient_data=patient_data,
                include_evidence=include_evidence
            )
            evaluations.append(evaluation)

        # Generate summary
        summary = self._generate_evaluation_summary(evaluations)

        # Build output
        output = {
            "case_id": patient_id,
            "infection_type": domain,
            "summary": summary,
            "evaluations": evaluations,
            "agent_info": {
                "agent_id": self.agent_id,
                "execution_time_ms": (datetime.utcnow() - start_time).total_seconds() * 1000,
                "tokens_used": 5000  # Mock
            }
        }

        # Validate output
        output_validation = self.validate_output(output)
        if not output_validation["valid"]:
            logger.warning(f"Output validation issues: {output_validation['warnings']}")

        # Log execution
        execution_time_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
        self.log_execution(inputs, output, execution_time_ms)

        return output

    def validate_inputs(
        self,
        inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate input parameters.

        Args:
            inputs: Input parameters

        Returns:
            Validation result
        """
        errors = []

        # Required fields
        if "patient_id" not in inputs:
            errors.append("Missing required field: patient_id")

        # Domain validation
        if "domain" in inputs:
            domain = inputs["domain"]
            valid_domains = ["CLABSI", "CAUTI", "SSI", "VAP"]
            if domain not in valid_domains:
                errors.append(f"Invalid domain: {domain}. Must be one of {valid_domains}")

        return {
            "valid": len(errors) == 0,
            "errors": errors
        }

    def validate_output(
        self,
        output: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate output before returning.

        Args:
            output: Agent output

        Returns:
            Validation result
        """
        warnings = []

        summary = output.get("summary", {})

        # Check if any rules were evaluated
        total_rules = summary.get("totalRules", 0)
        if total_rules == 0:
            warnings.append("No rules evaluated")

        # Check required rules
        required_passed = summary.get("requiredRulesPassed", 0)
        required_total = summary.get("requiredRulesTotal", 0)

        if required_total > 0 and required_passed < required_total:
            warnings.append(
                f"Not all required rules passed: {required_passed}/{required_total}"
            )

        # Check confidence
        confidence = summary.get("overallConfidence", 0)
        if confidence < self.min_confidence_threshold:
            warnings.append(
                f"Overall confidence {confidence} below threshold {self.min_confidence_threshold}"
            )

        return {
            "valid": True,
            "warnings": warnings
        }

    async def _load_patient_data(
        self,
        patient_id: str,
        encounter_id: Optional[str]
    ) -> Dict[str, Any]:
        """
        Load patient clinical data (mock implementation).

        Args:
            patient_id: Patient identifier
            encounter_id: Optional encounter identifier

        Returns:
            Patient data
        """
        # Mock patient data
        # In production, this would load from database/vector store
        return {
            "patient_id": patient_id,
            "encounter_id": encounter_id,
            "central_line_present": True,
            "central_line_days": 5,
            "blood_culture_positive": True,
            "organism": "Staphylococcus aureus",
            "fever_present": True,
            "temp_celsius": 39.2,
            "alternate_source": False,
            "line_insertion_day": 1,
            "positive_culture_day": 4
        }

    async def _evaluate_rule(
        self,
        rule: Dict[str, Any],
        patient_data: Dict[str, Any],
        include_evidence: bool
    ) -> Dict[str, Any]:
        """
        Evaluate a single rule.

        Args:
            rule: Rule definition
            patient_data: Patient clinical data
            include_evidence: Include detailed evidence

        Returns:
            Rule evaluation result
        """
        rule_id = rule["ruleId"]

        logger.debug(f"Evaluating rule: {rule_id}")

        # Mock rule evaluation logic
        # In production, this would use LLM to evaluate rule against evidence
        status, confidence, rationale, evidence = self._mock_rule_evaluation(
            rule=rule,
            patient_data=patient_data
        )

        evaluation = {
            "ruleId": rule_id,
            "ruleName": rule["ruleName"],
            "category": rule["category"],
            "status": status,
            "isRequired": rule["isRequired"],
            "description": rule["description"],
            "rationale": rationale,
            "confidence": confidence,
            "evaluatedAt": datetime.utcnow().isoformat()
        }

        if include_evidence:
            evaluation["evidence"] = evidence

        return evaluation

    def _mock_rule_evaluation(
        self,
        rule: Dict[str, Any],
        patient_data: Dict[str, Any]
    ) -> tuple:
        """
        Mock rule evaluation logic.

        Args:
            rule: Rule definition
            patient_data: Patient data

        Returns:
            Tuple of (status, confidence, rationale, evidence)
        """
        rule_id = rule["ruleId"]

        # Simple mock logic for demonstration
        if rule_id == "CLABSI-001":
            if patient_data.get("central_line_days", 0) > 2:
                return (
                    "pass",
                    0.95,
                    f"Central line present for {patient_data['central_line_days']} days",
                    [
                        {
                            "id": "E001",
                            "type": "SIGNAL",
                            "content": f"Central line inserted on Day {patient_data.get('line_insertion_day', 1)}",
                            "timestamp": datetime.utcnow().isoformat(),
                            "strength": "strong"
                        }
                    ]
                )
            else:
                return ("fail", 0.90, "Central line present for <2 days", [])

        elif rule_id == "CLABSI-002":
            if patient_data.get("blood_culture_positive", False):
                return (
                    "pass",
                    0.98,
                    f"Positive blood culture for {patient_data.get('organism', 'unknown')}",
                    [
                        {
                            "id": "E002",
                            "type": "LAB",
                            "content": f"Blood culture positive for {patient_data.get('organism', 'unknown')}",
                            "timestamp": datetime.utcnow().isoformat(),
                            "strength": "strong"
                        }
                    ]
                )
            else:
                return ("fail", 0.95, "No positive blood culture", [])

        elif rule_id == "CLABSI-003":
            if patient_data.get("fever_present", False):
                return (
                    "pass",
                    0.88,
                    f"Fever documented ({patient_data.get('temp_celsius', 0)}°C)",
                    [
                        {
                            "id": "E003",
                            "type": "SIGNAL",
                            "content": f"Temperature: {patient_data.get('temp_celsius', 0)}°C",
                            "timestamp": datetime.utcnow().isoformat(),
                            "strength": "strong"
                        }
                    ]
                )
            else:
                return ("fail", 0.80, "No clinical symptoms documented", [])

        elif rule_id == "CLABSI-004":
            if not patient_data.get("alternate_source", False):
                return (
                    "pass",
                    0.75,
                    "No alternate infection source identified",
                    [
                        {
                            "id": "E004",
                            "type": "NOTE",
                            "content": "Clinical assessment: no other infection source identified",
                            "timestamp": datetime.utcnow().isoformat(),
                            "strength": "moderate"
                        }
                    ]
                )
            else:
                return ("fail", 0.85, "Alternate infection source present", [])

        elif rule_id == "CLABSI-005":
            insertion_day = patient_data.get("line_insertion_day", 1)
            culture_day = patient_data.get("positive_culture_day", 1)
            days_diff = culture_day - insertion_day

            if 3 <= days_diff <= 7:
                return (
                    "pass",
                    0.92,
                    f"Positive culture on Day {culture_day}, within infection window",
                    [
                        {
                            "id": "E005",
                            "type": "EVENT",
                            "content": f"Infection window: Day {insertion_day} to Day {insertion_day + 7}",
                            "timestamp": datetime.utcnow().isoformat(),
                            "strength": "strong"
                        }
                    ]
                )
            else:
                return ("fail", 0.88, "Outside infection window", [])

        else:
            # Default for unmocked rules
            return ("not_evaluated", 0.5, "Rule not evaluated in mock", [])

    def _generate_evaluation_summary(
        self,
        evaluations: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate evaluation summary.

        Args:
            evaluations: List of rule evaluations

        Returns:
            Summary statistics
        """
        total_rules = len(evaluations)
        passed_rules = sum(1 for e in evaluations if e["status"] == "pass")
        failed_rules = sum(1 for e in evaluations if e["status"] == "fail")
        not_evaluated = sum(1 for e in evaluations if e["status"] == "not_evaluated")

        required_rules = [e for e in evaluations if e["isRequired"]]
        required_total = len(required_rules)
        required_passed = sum(1 for e in required_rules if e["status"] == "pass")

        # Calculate overall confidence (average of all confidences)
        if evaluations:
            overall_confidence = sum(e["confidence"] for e in evaluations) / len(evaluations)
        else:
            overall_confidence = 0.0

        return {
            "totalRules": total_rules,
            "passedRules": passed_rules,
            "failedRules": failed_rules,
            "notEvaluatedRules": not_evaluated,
            "requiredRulesPassed": required_passed,
            "requiredRulesTotal": required_total,
            "overallConfidence": round(overall_confidence, 2),
            "evaluationTimestamp": datetime.utcnow().isoformat()
        }
