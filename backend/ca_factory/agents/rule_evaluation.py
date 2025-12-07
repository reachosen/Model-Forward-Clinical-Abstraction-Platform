"""
Rule Evaluation Agent

Specialized agent for evaluating NHSN criteria and clinical decision rules
against patient data.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import json

from ca_factory.agents.base import BaseAgent, AgentValidationError
from ca_factory.core.prompt_builder import build_metric_framed_prompt, EXAMPLE_RULE_EVALUATION_SCHEMA

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
        Evaluate a single rule using LLM.

        Args:
            rule: Rule definition
            patient_data: Patient clinical data
            include_evidence: Include detailed evidence

        Returns:
            Rule evaluation result (JSON from LLM)
        """
        rule_id = rule["ruleId"]
        logger.debug(f"Evaluating rule: {rule_id}")

        # Construct metric context from rule details
        metric_context_str = (
            f"Rule ID: {rule_id}\n"
            f"Rule Name: {rule['ruleName']}\n"
            f"Description: {rule['description']}"
        )

        core_body = f"""
Evaluate the following clinical rule against the provided patient data.
Your response MUST be in JSON format, adhering to the following schema:

{json.dumps(EXAMPLE_RULE_EVALUATION_SCHEMA, indent=2)}

Clinical Rule to Evaluate:
{json.dumps(rule, indent=2)}

Patient Data:
{json.dumps(patient_data, indent=2)}

Strictly adhere to the rule's description.
If patient data is insufficient to make a determination, use "unclear" status.
Do NOT invent information.
"""
        full_prompt = build_metric_framed_prompt(
            role_name="Clinical Rule Evaluator",
            core_body=core_body,
            metric_context=metric_context_str
        )

        # --- MOCK LLM CALL ---
        # In production, this would involve a real LLM API call:
        # llm_response = await self.call_llm(full_prompt, json_mode=True)
        # parsed_response = json.loads(llm_response.text)
        # ---------------------
        
        # Call the adapted mock to get a JSON-like response
        llm_output = self._mock_rule_evaluation_llm(rule=rule, patient_data=patient_data)

        # The LLM output is expected to conform to EXAMPLE_RULE_EVALUATION_SCHEMA
        evaluation = {
            "ruleId": llm_output.get("rule_id", rule_id),
            "ruleName": rule["ruleName"],
            "category": rule["category"], # Retain from original rule def
            "status": llm_output.get("status", "unclear"),
            "isRequired": rule["isRequired"], # Retain from original rule def
            "description": rule["description"], # Retain from original rule def
            "rationale": llm_output.get("rationale", "No rationale provided by LLM mock."),
            "confidence": llm_output.get("confidence", 0.7), # LLM might provide confidence
            "evaluatedAt": datetime.utcnow().isoformat()
        }

        if include_evidence and llm_output.get("evidence"):
            evaluation["evidence"] = llm_output["evidence"]

        return evaluation

    def _mock_rule_evaluation_llm(
        self,
        rule: Dict[str, Any],
        patient_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Mock LLM rule evaluation logic, returning JSON matching EXAMPLE_RULE_EVALUATION_SCHEMA.
        """
        rule_id = rule["ruleId"]
        
        # Default response
        response = {
            "rule_id": rule_id,
            "status": "unclear",
            "rationale": f"Mock rationale for rule {rule_id}: could not determine from patient data.",
            "evidence": []
        }

        # Simple mock logic based on patient_data
        if rule_id == "CLABSI-001": # Central line present for >2 calendar days
            if patient_data.get("central_line_days", 0) > 2:
                response["status"] = "pass"
                response["rationale"] = f"Central line present for {patient_data['central_line_days']} days."
                response["evidence"].append({"evidence_id": "MOCK-EV-001", "content": f"Central line inserted on Day {patient_data.get('line_insertion_day', 1)}"})
            else:
                response["status"] = "fail"
                response["rationale"] = "Central line present for <= 2 days."

        elif rule_id == "CLABSI-002": # Positive blood culture
            if patient_data.get("blood_culture_positive", False):
                response["status"] = "pass"
                response["rationale"] = f"Positive blood culture for {patient_data.get('organism', 'unknown')}."
                response["evidence"].append({"evidence_id": "MOCK-EV-002", "content": f"Blood culture positive for {patient_data.get('organism', 'unknown')}"})
            else:
                response["status"] = "fail"
                response["rationale"] = "No positive blood culture."

        elif rule_id == "CLABSI-003": # Clinical symptoms present
            if patient_data.get("fever_present", False):
                response["status"] = "pass"
                response["rationale"] = f"Fever documented ({patient_data.get('temp_celsius', 0)}°C)."
                response["evidence"].append({"evidence_id": "MOCK-EV-003", "content": f"Temperature: {patient_data.get('temp_celsius', 0)}°C"})
            else:
                response["status"] = "fail"
                response["rationale"] = "No clinical symptoms documented."
        
        # ... add more rule logic if necessary for other CLABSI rules
        # For simplicity, other rules will default to "unclear" for this mock

        response["confidence"] = 0.8 # Mock confidence
        return response

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
        not_evaluated = sum(1 for e in evaluations if e["status"] == "not_evaluated" or e["status"] == "unclear")

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
