"""
Q&A Response Agent

Specialized agent for answering natural language questions about clinical cases
with evidence citations and confidence scoring.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import json

from ca_factory.agents.base import BaseAgent, AgentValidationError
from ca_factory.agents.evidence_retrieval import EvidenceRetrievalAgent
from ca_factory.core.prompt_builder import build_metric_framed_prompt, EXAMPLE_QA_RESPONSE_SCHEMA

logger = logging.getLogger(__name__)


class QAResponseAgent(BaseAgent):
    """
    Q&A Response Agent for natural language question answering.

    Responsibilities:
    - Parse natural language questions
    - Retrieve relevant evidence
    - Generate comprehensive answers
    - Provide evidence citations
    - Calculate confidence scores
    - Suggest follow-up questions
    """

    def __init__(
        self,
        agent_id: str,
        config: Dict[str, Any]
    ):
        """
        Initialize Q&A Response Agent.

        Args:
            agent_id: Unique agent identifier
            config: Agent configuration
        """
        super().__init__(
            agent_id=agent_id,
            agent_type="qa",
            config=config
        )

        # Initialize evidence retrieval agent
        self.evidence_agent = None  # Will be injected or created

    async def execute(
        self,
        inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute Q&A task.

        Args:
            inputs: Task inputs containing:
                - patient_id: Patient identifier
                - question: Natural language question
                - encounter_id: Optional encounter identifier
                - context: Additional context

        Returns:
            Q&A response with answer and citations
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
        question = inputs["question"]
        encounter_id = inputs.get("encounter_id")
        context = inputs.get("context", {})

        logger.info(
            f"Answering question for patient {patient_id}: '{question}'"
        )

        # Step 1: Retrieve relevant evidence
        evidence_results = await self._retrieve_evidence(
            patient_id=patient_id,
            question=question,
            encounter_id=encounter_id
        )

        # Step 2: Generate answer using LLM
        answer_result = await self._generate_answer(
            question=question,
            evidence=evidence_results["results"],
            context=context
        )

        # Step 3: Create evidence citations
        citations = self._create_citations(
            evidence_results["results"],
            answer_result.get("used_evidence_ids", [])
        )

        # Step 4: Calculate confidence
        confidence = self._calculate_confidence(
            answer_result=answer_result,
            evidence_quality=evidence_results["retrieval_stats"]["avg_relevance_score"]
        )

        # Step 5: Generate follow-up suggestions
        follow_ups = self._generate_follow_ups(
            question=question,
            answer=answer_result["answer"],
            evidence=evidence_results["results"]
        )

        # Build output
        output = {
            "question": question,
            "answer": answer_result["answer"],
            "evidence_citations": citations,
            "confidence": confidence,
            "follow_up_suggestions": follow_ups,
            "timestamp": datetime.utcnow().isoformat(),
            "agent_info": {
                "agent_id": self.agent_id,
                "execution_time_ms": (datetime.utcnow() - start_time).total_seconds() * 1000,
                "tokens_used": answer_result.get("tokens_used", 0),
                "retrieval_stats": evidence_results.get("retrieval_stats")
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

        if "question" not in inputs:
            errors.append("Missing required field: question")

        # Question validation
        if "question" in inputs:
            question = inputs["question"]
            if not question or len(question.strip()) == 0:
                errors.append("Question cannot be empty")
            elif len(question) > 500:
                errors.append("Question too long (max 500 characters)")

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

        # Check if answer is present and not empty
        answer = output.get("answer", "")
        if not answer or len(answer.strip()) == 0:
            warnings.append("Answer is empty")

        # Check confidence
        confidence = output.get("confidence", 0)
        if confidence < self.min_confidence_threshold:
            warnings.append(
                f"Confidence {confidence} below threshold {self.min_confidence_threshold}"
            )

        # Check evidence citations if required
        if self.require_evidence:
            citations = output.get("evidence_citations", [])
            if len(citations) == 0:
                warnings.append("No evidence citations provided")

        return {
            "valid": True,
            "warnings": warnings
        }

    async def _retrieve_evidence(
        self,
        patient_id: str,
        question: str,
        encounter_id: Optional[str]
    ) -> Dict[str, Any]:
        """
        Retrieve relevant evidence for the question.

        Args:
            patient_id: Patient identifier
            question: Question text
            encounter_id: Optional encounter identifier

        Returns:
            Evidence retrieval results
        """
        # Mock evidence retrieval
        # In production, this would use EvidenceRetrievalAgent
        logger.debug(f"Retrieving evidence for question: '{question}'")

        # Generate mock evidence
        mock_evidence = [
            {
                "evidence_id": "EV-001",
                "source_type": "LAB",
                "source_id": "LAB-5678",
                "content": "Blood culture positive for Staphylococcus aureus on Day 4",
                "relevance_score": 0.95,
                "timestamp": datetime.utcnow().isoformat(),
                "metadata": {}
            },
            {
                "evidence_id": "EV-002",
                "source_type": "EVENT",
                "source_id": "EVT-1234",
                "content": "Central line insertion documented on Day 1",
                "relevance_score": 0.92,
                "timestamp": datetime.utcnow().isoformat(),
                "metadata": {}
            },
            {
                "evidence_id": "EV-003",
                "source_type": "SIGNAL",
                "source_id": "SIG-9876",
                "content": "Temperature spike to 39.2°C on Day 3",
                "relevance_score": 0.88,
                "timestamp": datetime.utcnow().isoformat(),
                "metadata": {}
            }
        ]

        return {
            "query": question,
            "results": mock_evidence,
            "retrieval_stats": {
                "documents_retrieved": 10,
                "documents_used": 3,
                "avg_relevance_score": 0.92
            }
        }

    async def _generate_answer(
        self,
        question: str,
        evidence: List[Dict[str, Any]],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate answer using LLM.

        Args:
            question: Question text
            evidence: Retrieved evidence
            context: Additional context (may contain metric_context)

        Returns:
            Answer with metadata
        """
        logger.debug("Generating answer with LLM")

        # Extract metric context from provided context, if available
        metric_context_str = context.get("metric_context", "")
        
        # Format evidence for the prompt
        formatted_evidence = "\n".join([
            f"- {e['evidence_id']}: {e['content']}" for e in evidence
        ])

        core_body = f"""
Given the question and the following pieces of evidence, provide a concise answer.
If the evidence does not contain the answer, state that.
Your response MUST be in JSON format, adhering to the following schema:

{json.dumps(EXAMPLE_QA_RESPONSE_SCHEMA, indent=2)}

Question: {question}

Evidence:
{formatted_evidence}

Ensure all evidence citations are based on the provided evidence IDs.
"""

        full_prompt = build_metric_framed_prompt(
            role_name="Clinical Q&A Expert",
            core_body=core_body,
            metric_context=metric_context_str
        )

        # --- MOCK LLM CALL ---
        # In production, this would involve a real LLM API call:
        # llm_response = await self.call_llm(full_prompt, json_mode=True)
        # parsed_response = json.loads(llm_response.text)
        # ---------------------

        # Generate mock answer based on question keywords for current mock structure
        if "CLABSI" in question or "diagnosis" in question or "evidence" in question:
            answer_content = (
                "The CLABSI diagnosis is supported by multiple key pieces of evidence: "
                "1) Central line present for >2 days (inserted on Day 1), "
                "2) Positive blood culture for Staphylococcus aureus on Day 4, "
                "3) Clinical symptoms including fever (39.2°C) and rigors, and "
                "4) No alternate infection source identified. "
                "The temporal relationship between line insertion and positive culture "
                "falls within the NHSN infection window."
            )
            citations = [
                {"citation_id": "EV-001", "excerpt": evidence[0]['content']},
                {"citation_id": "EV-002", "excerpt": evidence[1]['content']},
                {"citation_id": "EV-003", "excerpt": evidence[2]['content']}
            ]
            confidence = 0.95
            follow_ups = ["What was the timeline of symptom onset?"]
            used_evidence_ids = ["EV-001", "EV-002", "EV-003"] # For _create_citations compatibility

        elif "timeline" in question or "when" in question:
            answer_content = (
                "The timeline shows: Day 1 - Central line inserted, "
                "Day 3 - Fever onset (39.2°C), "
                "Day 4 - Blood culture collected and positive for Staph aureus. "
                "This timeline is consistent with CLABSI criteria."
            )
            citations = [
                {"citation_id": "EV-001", "excerpt": evidence[0]['content']},
                {"citation_id": "EV-002", "excerpt": evidence[1]['content']},
                {"citation_id": "EV-003", "excerpt": evidence[2]['content']}
            ]
            confidence = 0.92
            follow_ups = ["What was the outcome of treatment?"]
            used_evidence_ids = ["EV-001", "EV-002", "EV-003"]

        else:
            answer_content = (
                "Based on the available clinical data, I can provide information "
                "about the patient's condition. Please note that specific evidence "
                "should be reviewed for a comprehensive assessment."
            )
            citations = []
            confidence = 0.70
            follow_ups = ["What evidence supports the diagnosis?"]
            used_evidence_ids = []

        # Return structured like EXAMPLE_QA_RESPONSE_SCHEMA
        mock_llm_response = {
            "answer": answer_content,
            "evidence_citations": citations,
            "confidence": confidence,
            "follow_up_suggestions": follow_ups
        }
        
        # This is what a real LLM would return
        # The execute method expects 'answer' and 'used_evidence_ids' directly.
        # So we adapt the mock LLM response to fit the current execute method.
        # In a real refactor, execute() would directly consume mock_llm_response.
        return {
            "answer": mock_llm_response["answer"],
            "used_evidence_ids": used_evidence_ids, # Still needed for _create_citations
            "tokens_used": len(answer_content) // 4 + 200 # Mock, increased due to prompt size
        }


    def _create_citations(
        self,
        evidence: List[Dict[str, Any]],
        used_evidence_ids: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Create evidence citations from used evidence.
        (This method might become redundant if LLM returns full citations directly)

        Args:
            evidence: All retrieved evidence
            used_evidence_ids: IDs of evidence actually used in answer

        Returns:
            Citation list
        """
        citations = []
        for ev in evidence:
            if ev["evidence_id"] in used_evidence_ids:
                citations.append({
                    "citation_id": ev["evidence_id"],
                    "source_type": ev["source_type"],
                    "source_id": ev["source_id"],
                    "excerpt": ev["content"],
                    "relevance_score": ev["relevance_score"],
                    "timestamp": ev.get("timestamp")
                })
        return citations

    def _calculate_confidence(
        self,
        answer_result: Dict[str, Any],
        evidence_quality: float
    ) -> float:
        """
        Calculate confidence score for the answer.
        (This method might become redundant if LLM returns confidence directly)

        Args:
            answer_result: Generated answer
            evidence_quality: Average evidence relevance score

        Returns:
            Confidence score (0-1)
        """
        # If LLM provides confidence, use it. Otherwise, use heuristic.
        if "confidence" in answer_result:
            return answer_result["confidence"]
        
        confidence = evidence_quality
        num_citations = len(answer_result.get("used_evidence_ids", []))
        if num_citations >= 3:
            confidence = min(1.0, confidence + 0.05)
        elif num_citations == 0:
            confidence = max(0.0, confidence - 0.2)

        return round(confidence, 2)

    async def _generate_follow_ups(
        self,
        question: str,
        answer: str,
        evidence: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Generate follow-up question suggestions using LLM.

        Args:
            question: Original question
            answer: Generated answer
            evidence: Retrieved evidence

        Returns:
            List of follow-up suggestions
        """
        logger.debug("Generating follow-up suggestions with LLM")

        metric_context_str = "" # Assume no metric context for follow-ups by default, or pass from execute context
        
        core_body = f"""
Given the original question, the generated answer, and the provided evidence,
generate a list of 3 concise follow-up questions that would help clarify or expand on the case.
Your response MUST be in JSON format: {{\"follow_up_suggestions\": [\"Q1?\", \"Q2?\", \"Q3?\"]}}

Original Question: {question}
Answer: {answer}
Evidence: {[e['content'] for e in evidence]}
"""
        full_prompt = build_metric_framed_prompt(
            role_name="Clinical Q&A Follow-up Assistant",
            core_body=core_body,
            metric_context=metric_context_str
        )

        # --- MOCK LLM CALL ---
        # In production, this would involve a real LLM API call:
        # llm_response = await self.call_llm(full_prompt, json_mode=True)
        # parsed_response = json.loads(llm_response.text)
        # return parsed_response.get("follow_up_suggestions", [])
        # ---------------------

        # Generate mock suggestions
        if "evidence" in question.lower() or "diagnosis" in question.lower():
            suggestions = [
                "What was the timeline of symptom onset?",
                "Were there any complications documented?",
                "What treatments were initiated?"
            ]
        elif "timeline" in question.lower():
            suggestions = [
                "What was the outcome of treatment?",
                "Were any contraindications to therapy?",
                "How long did symptoms persist?"
            ]
        else:
            suggestions = [
                "What evidence supports the diagnosis?",
                "What is the complete clinical timeline?",
                "Were all NHSN criteria met?"
            ]

        mock_llm_response = {"follow_up_suggestions": suggestions[:3]}
        return mock_llm_response["follow_up_suggestions"]
