"""Case Adapter

Transforms legacy flat case JSON to structured 4-section model:
- patient (raw context)
- enrichment (task output + metadata)
- abstraction (task output + metadata)
- qa (future)
"""

from datetime import datetime
from typing import Dict, List, Any, Optional
from collections import defaultdict


class CaseAdapter:
    """Adapter to transform legacy case JSON to structured format."""

    @staticmethod
    def to_new_structure(legacy_case: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform legacy flat JSON to 4-section model.

        Args:
            legacy_case: Flat case JSON with mixed raw + computed data

        Returns:
            Structured case with patient, enrichment, abstraction, qa sections
        """
        concern_id = legacy_case.get("case_metadata", {}).get("infection_type", "unknown").lower()
        case_id = legacy_case.get("case_metadata", {}).get("case_id", "unknown")

        return {
            "case_id": case_id,
            "concern_id": concern_id,

            "patient": CaseAdapter._extract_patient_section(legacy_case),
            "enrichment": CaseAdapter._extract_enrichment_section(legacy_case, concern_id),
            "abstraction": CaseAdapter._extract_abstraction_section(legacy_case, concern_id),
            "qa": None  # Future
        }

    @staticmethod
    def _extract_patient_section(legacy_case: Dict[str, Any]) -> Dict[str, Any]:
        """Extract raw patient context from legacy case."""
        return {
            "case_metadata": legacy_case.get("case_metadata", {}),
            "demographics": legacy_case.get("patient_demographics", {}),
            "devices": legacy_case.get("devices", {}),
            "lab_results": legacy_case.get("lab_results", []),
            "clinical_notes": legacy_case.get("clinical_notes", []),
            "clinical_events": legacy_case.get("clinical_events", [])
        }

    @staticmethod
    def _extract_enrichment_section(
        legacy_case: Dict[str, Any],
        concern_id: str
    ) -> Dict[str, Any]:
        """
        Extract enrichment section from legacy case.

        Enrichment includes:
        - task_metadata
        - summary (generated from signals/timeline)
        - signal_groups (grouped by type)
        - timeline_phases
        - evidence_assessment
        """
        signals = legacy_case.get("clinical_signals", [])
        timeline_phases = legacy_case.get("timeline_phases", [])
        created_date = legacy_case.get("case_metadata", {}).get("created_date")

        # Generate task metadata
        task_metadata = {
            "task_id": f"{concern_id}.enrichment",
            "task_type": "enrichment",
            "prompt_version": "v1.0",  # Default version
            "mode": "batch",  # Demo cases are pre-computed in batch
            "executed_at": created_date or datetime.utcnow().isoformat(),
            "executed_by": "system",
            "status": "completed"
        }

        # Group signals by type
        signal_groups = CaseAdapter._group_signals(signals)

        # Generate enrichment summary
        summary = CaseAdapter._generate_enrichment_summary(signals, signal_groups, timeline_phases)

        # Evidence assessment (placeholder)
        evidence_assessment = {
            "completeness": 0.90,
            "quality": "high",
            "missing_elements": []
        }

        return {
            "task_metadata": task_metadata,
            "summary": summary,
            "signal_groups": signal_groups,
            "timeline_phases": timeline_phases,
            "evidence_assessment": evidence_assessment
        }

    @staticmethod
    def _extract_abstraction_section(
        legacy_case: Dict[str, Any],
        concern_id: str
    ) -> Dict[str, Any]:
        """
        Extract abstraction section from legacy case.

        Abstraction includes:
        - task_metadata
        - narrative (generated from case data)
        - criteria_evaluation (from nhsn_evaluation)
        - qa_history (empty for pre-computed cases)
        - exclusion_analysis
        """
        created_date = legacy_case.get("case_metadata", {}).get("created_date")
        nhsn_eval = legacy_case.get("nhsn_evaluation", {})

        # Generate task metadata
        task_metadata = {
            "task_id": f"{concern_id}.abstraction",
            "task_type": "abstraction",
            "prompt_version": "v1.0",
            "mode": "batch",  # Pre-computed for demo
            "executed_at": created_date or datetime.utcnow().isoformat(),
            "executed_by": "system",
            "status": "completed"
        }

        # Generate clinical narrative
        narrative = CaseAdapter._generate_narrative(legacy_case, nhsn_eval)

        # Map nhsn_evaluation to criteria_evaluation
        criteria_evaluation = CaseAdapter._map_criteria_evaluation(nhsn_eval)

        # QA history (empty for pre-computed cases)
        qa_history = []

        # Exclusion analysis
        exclusion_analysis = legacy_case.get("exclusion_criteria_evaluated", [])

        return {
            "task_metadata": task_metadata,
            "narrative": narrative,
            "criteria_evaluation": criteria_evaluation,
            "qa_history": qa_history,
            "exclusion_analysis": exclusion_analysis
        }

    @staticmethod
    def _group_signals(signals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Group signals by signal_type.

        Args:
            signals: Flat list of signals

        Returns:
            List of signal groups with group_type, signals, group_confidence
        """
        if not signals:
            return []

        # Group by signal_type
        groups = defaultdict(list)
        for signal in signals:
            signal_type = signal.get("signal_type", "UNKNOWN")
            groups[signal_type].append(signal)

        # Create signal group objects
        signal_groups = []
        for group_type, group_signals in groups.items():
            # Calculate group confidence (average of individual confidences if available)
            confidences = [
                s.get("confidence", 0.90)
                for s in group_signals
                if "confidence" in s
            ]
            group_confidence = sum(confidences) / len(confidences) if confidences else 0.90

            signal_groups.append({
                "group_type": group_type,
                "signals": group_signals,
                "group_confidence": round(group_confidence, 2)
            })

        # Sort by group type for consistency
        signal_groups.sort(key=lambda g: g["group_type"])

        return signal_groups

    @staticmethod
    def _generate_enrichment_summary(
        signals: List[Dict[str, Any]],
        signal_groups: List[Dict[str, Any]],
        timeline_phases: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate enrichment summary from signals and timeline.

        Args:
            signals: List of all signals
            signal_groups: Grouped signals
            timeline_phases: Timeline phases

        Returns:
            Enrichment summary with key statistics
        """
        # Count signals
        signals_identified = len(signals)
        signal_groups_count = len(signal_groups)
        timeline_phases_identified = len(timeline_phases)

        # Extract key findings (signals marked as abnormal or high severity)
        key_findings = []
        for signal in signals:
            if signal.get("abnormal") or signal.get("severity") in ["CRITICAL", "WARNING"]:
                signal_name = signal.get("signal_name", "Unknown signal")
                value = signal.get("value")
                if value:
                    key_findings.append(f"{signal_name}: {value}")
                else:
                    key_findings.append(signal_name)

        # Limit key findings to top 5
        key_findings = key_findings[:5]

        # Calculate overall confidence (average across signal groups)
        confidences = [g["group_confidence"] for g in signal_groups]
        overall_confidence = sum(confidences) / len(confidences) if confidences else 0.90

        return {
            "signals_identified": signals_identified,
            "signal_groups_count": signal_groups_count,
            "timeline_phases_identified": timeline_phases_identified,
            "key_findings": key_findings,
            "confidence": round(overall_confidence, 2)
        }

    @staticmethod
    def _generate_narrative(
        legacy_case: Dict[str, Any],
        nhsn_eval: Dict[str, Any]
    ) -> str:
        """
        Generate clinical narrative from case data.

        Args:
            legacy_case: Full legacy case data
            nhsn_eval: NHSN evaluation data

        Returns:
            Clinical narrative string
        """
        # Extract key data points
        demographics = legacy_case.get("patient_demographics", {})
        age = demographics.get("age", "unknown age")
        gender = demographics.get("gender", "unknown gender")

        devices = legacy_case.get("devices", {})
        central_line = devices.get("central_line", {})
        line_type = central_line.get("line_type", "central line")
        device_days = central_line.get("device_days_at_event", "unknown")

        # Get positive blood culture info
        lab_results = legacy_case.get("lab_results", [])
        organism = None
        for lab in lab_results:
            if lab.get("test_type") == "blood_culture" and lab.get("growth") == "Positive":
                organism = lab.get("organism", "unknown organism")
                break

        # Get determination
        determination = nhsn_eval.get("nhsn_determination", "Under review")

        # Build narrative
        narrative_parts = [
            f"Patient is a {age}-year-old {gender} with a {line_type} in place."
        ]

        if device_days != "unknown":
            narrative_parts.append(
                f"The central line was in place for {device_days} days at the time of the event."
            )

        if organism:
            narrative_parts.append(
                f"Blood culture was positive for {organism}."
            )

        # Add determination
        if "CONFIRMED" in determination:
            narrative_parts.append("Meets NHSN criteria for CLABSI.")
        elif "RULED_OUT" in determination:
            narrative_parts.append("Does not meet NHSN criteria for CLABSI.")
        else:
            narrative_parts.append("NHSN criteria evaluation pending.")

        return " ".join(narrative_parts)

    @staticmethod
    def _map_criteria_evaluation(nhsn_eval: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map legacy nhsn_evaluation to criteria_evaluation structure.

        Args:
            nhsn_eval: Legacy NHSN evaluation object

        Returns:
            Structured criteria evaluation
        """
        if not nhsn_eval:
            return {
                "determination": "UNKNOWN",
                "confidence": 0.0,
                "criteria_met": {},
                "criteria_total": 0,
                "criteria_met_count": 0
            }

        criteria_met = nhsn_eval.get("criteria_met", {})

        # Transform flat boolean criteria to structured format
        structured_criteria = {}
        for criterion_key, is_met in criteria_met.items():
            structured_criteria[criterion_key] = {
                "met": is_met,
                "evidence": f"See case data for {criterion_key}",
                "confidence": 0.90  # Default confidence
            }

        # Count criteria
        criteria_total = len(criteria_met)
        criteria_met_count = sum(1 for v in criteria_met.values() if v)

        return {
            "determination": nhsn_eval.get("nhsn_determination", "UNKNOWN"),
            "confidence": nhsn_eval.get("confidence", 0.80),
            "criteria_met": structured_criteria,
            "criteria_total": criteria_total,
            "criteria_met_count": criteria_met_count,
            "date_of_event": nhsn_eval.get("date_of_event"),
            "infection_window_start": nhsn_eval.get("infection_window_start"),
            "infection_window_end": nhsn_eval.get("infection_window_end"),
            "device_days_at_event": nhsn_eval.get("device_days_at_event")
        }

    @staticmethod
    def from_new_structure(structured_case: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform structured case back to legacy format (for backward compatibility).

        Args:
            structured_case: Case with patient, enrichment, abstraction, qa sections

        Returns:
            Legacy flat case structure
        """
        # Extract sections
        patient = structured_case.get("patient", {})
        enrichment = structured_case.get("enrichment", {})
        abstraction = structured_case.get("abstraction", {})

        # Flatten signal groups back to signals
        signal_groups = enrichment.get("signal_groups", [])
        flat_signals = []
        for group in signal_groups:
            flat_signals.extend(group.get("signals", []))

        # Reverse map criteria_evaluation to nhsn_evaluation
        criteria_eval = abstraction.get("criteria_evaluation", {})
        criteria_met_flat = {}
        for key, value in criteria_eval.get("criteria_met", {}).items():
            criteria_met_flat[key] = value.get("met", False)

        nhsn_evaluation = {
            "nhsn_determination": criteria_eval.get("determination"),
            "confidence": criteria_eval.get("confidence"),
            "criteria_met": criteria_met_flat,
            "date_of_event": criteria_eval.get("date_of_event"),
            "infection_window_start": criteria_eval.get("infection_window_start"),
            "infection_window_end": criteria_eval.get("infection_window_end"),
            "device_days_at_event": criteria_eval.get("device_days_at_event")
        }

        # Reconstruct flat structure
        return {
            "case_metadata": patient.get("case_metadata", {}),
            "patient_demographics": patient.get("demographics", {}),
            "devices": patient.get("devices", {}),
            "lab_results": patient.get("lab_results", []),
            "clinical_notes": patient.get("clinical_notes", []),
            "clinical_events": patient.get("clinical_events", []),
            "clinical_signals": flat_signals,
            "timeline_phases": enrichment.get("timeline_phases", []),
            "nhsn_evaluation": nhsn_evaluation,
            "exclusion_criteria_evaluated": abstraction.get("exclusion_analysis", [])
        }
