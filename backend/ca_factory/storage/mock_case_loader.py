"""
Mock Case Loader

Loads patient cases from JSON files for demo/testing without database.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class MockCaseLoader:
    """
    Mock case loader for demo/testing.

    Loads patient case data from JSON files in data/mock/cases/
    """

    def __init__(self, data_dir: Optional[Path] = None):
        """
        Initialize mock case loader.

        Args:
            data_dir: Directory containing mock case JSON files
        """
        if data_dir is None:
            # Default to backend/data/mock/cases
            data_dir = Path(__file__).parent.parent.parent / "data" / "mock" / "cases"

        self.data_dir = Path(data_dir)
        self._cases_cache: Dict[str, Dict[str, Any]] = {}

        # Load all cases on init
        self._load_all_cases()

        logger.info(f"Mock case loader initialized with {len(self._cases_cache)} cases")

    def _load_all_cases(self) -> None:
        """Load all JSON case files into memory."""
        if not self.data_dir.exists():
            logger.warning(f"Mock data directory not found: {self.data_dir}")
            return

        for file_path in self.data_dir.glob("*.json"):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    case_data = json.load(f)

                patient_id = case_data.get("case_metadata", {}).get("patient_id")

                if patient_id:
                    self._cases_cache[patient_id] = case_data
                    logger.debug(f"Loaded case: {patient_id} from {file_path.name}")
                else:
                    logger.warning(f"Case file missing patient_id: {file_path.name}")

            except Exception as e:
                logger.error(f"Failed to load case file {file_path.name}: {str(e)}")

    def get_case(self, patient_id: str) -> Optional[Dict[str, Any]]:
        """
        Get case data for a patient.

        Args:
            patient_id: Patient identifier

        Returns:
            Case data dictionary or None if not found
        """
        return self._cases_cache.get(patient_id)

    def list_cases(self) -> List[Dict[str, Any]]:
        """
        List all available cases.

        Returns:
            List of case summaries
        """
        summaries = []

        for patient_id, case_data in self._cases_cache.items():
            metadata = case_data.get("case_metadata", {})
            demographics = case_data.get("patient_demographics", {})
            nhsn_eval = case_data.get("nhsn_evaluation", {})

            summaries.append({
                "patient_id": patient_id,
                "case_id": metadata.get("case_id"),
                "encounter_id": metadata.get("encounter_id"),
                "infection_type": metadata.get("infection_type"),
                "created_date": metadata.get("created_date"),
                "age": demographics.get("age"),
                "gender": demographics.get("gender"),
                "nhsn_determination": nhsn_eval.get("nhsn_determination"),
                "confidence": nhsn_eval.get("confidence")
            })

        return summaries

    def get_lab_results(self, patient_id: str) -> List[Dict[str, Any]]:
        """Get lab results for a patient."""
        case = self.get_case(patient_id)
        if not case:
            return []
        return case.get("lab_results", [])

    def get_clinical_signals(self, patient_id: str) -> List[Dict[str, Any]]:
        """Get clinical signals for a patient."""
        case = self.get_case(patient_id)
        if not case:
            return []
        return case.get("clinical_signals", [])

    def get_clinical_events(self, patient_id: str) -> List[Dict[str, Any]]:
        """Get clinical events for a patient."""
        case = self.get_case(patient_id)
        if not case:
            return []
        return case.get("clinical_events", [])

    def get_clinical_notes(self, patient_id: str) -> List[Dict[str, Any]]:
        """Get clinical notes for a patient."""
        case = self.get_case(patient_id)
        if not case:
            return []
        return case.get("clinical_notes", [])

    def get_timeline(self, patient_id: str) -> List[Dict[str, Any]]:
        """Get timeline phases for a patient."""
        case = self.get_case(patient_id)
        if not case:
            return []
        return case.get("timeline_phases", [])

    def get_device_info(self, patient_id: str) -> Optional[Dict[str, Any]]:
        """Get device information for a patient."""
        case = self.get_case(patient_id)
        if not case:
            return None
        return case.get("devices", {})

    def search_content(
        self,
        patient_id: str,
        query: str,
        content_types: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search case content for query terms (simple text search).

        Args:
            patient_id: Patient identifier
            query: Search query
            content_types: Types to search (notes, events, signals, labs)

        Returns:
            Matching content items with relevance scores
        """
        case = self.get_case(patient_id)
        if not case:
            return []

        query_lower = query.lower()
        results = []

        if content_types is None:
            content_types = ["notes", "events", "signals", "labs"]

        # Search clinical notes
        if "notes" in content_types:
            for note in case.get("clinical_notes", []):
                content = note.get("content", "").lower()
                if query_lower in content:
                    # Calculate simple relevance score (count of query term occurrences)
                    relevance = content.count(query_lower) / len(content.split())
                    results.append({
                        "type": "NOTE",
                        "source_id": note.get("note_id"),
                        "content": note.get("content"),
                        "timestamp": note.get("timestamp"),
                        "author": note.get("author"),
                        "relevance_score": min(1.0, relevance * 100)  # Normalize to 0-1
                    })

        # Search events
        if "events" in content_types:
            for event in case.get("clinical_events", []):
                event_name = event.get("event_name", "").lower()
                details = str(event.get("details", "")).lower()

                if query_lower in event_name or query_lower in details:
                    combined = event_name + " " + details
                    relevance = combined.count(query_lower) / len(combined.split())
                    results.append({
                        "type": "EVENT",
                        "source_id": event.get("event_id"),
                        "content": f"{event.get('event_name')}: {event.get('details', {})}",
                        "timestamp": event.get("timestamp"),
                        "relevance_score": min(1.0, relevance * 100)
                    })

        # Search signals
        if "signals" in content_types:
            for signal in case.get("clinical_signals", []):
                signal_name = signal.get("signal_name", "").lower()

                if query_lower in signal_name:
                    results.append({
                        "type": "SIGNAL",
                        "source_id": signal.get("signal_id"),
                        "content": f"{signal.get('signal_name')}: {signal.get('value')} {signal.get('unit', '')}",
                        "timestamp": signal.get("timestamp"),
                        "relevance_score": 0.8
                    })

        # Search labs
        if "labs" in content_types:
            for lab in case.get("lab_results", []):
                test_type = lab.get("test_type", "").lower()
                organism = str(lab.get("organism", "")).lower()

                if query_lower in test_type or query_lower in organism:
                    results.append({
                        "type": "LAB",
                        "source_id": lab.get("test_id"),
                        "content": f"{lab.get('test_type')}: {lab.get('organism', 'N/A')}",
                        "timestamp": lab.get("collection_date"),
                        "relevance_score": 0.9
                    })

        # Sort by relevance score
        results.sort(key=lambda x: x["relevance_score"], reverse=True)

        return results

    def reload(self) -> None:
        """Reload all cases from disk."""
        self._cases_cache.clear()
        self._load_all_cases()
        logger.info(f"Reloaded {len(self._cases_cache)} cases")
