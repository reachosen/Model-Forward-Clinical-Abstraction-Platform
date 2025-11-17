"""Unit tests for CaseAdapter

Tests the transformation of legacy flat case JSON to structured 4-section model.
"""

import pytest
from datetime import datetime
from ca_factory.adapters import CaseAdapter


@pytest.fixture
def legacy_case_clabsi():
    """Sample legacy CLABSI case (flat structure)."""
    return {
        "case_metadata": {
            "case_id": "CASE-CLABSI-001",
            "patient_id": "PAT-001",
            "encounter_id": "ENC-001",
            "created_date": "2024-01-15T08:00:00Z",
            "infection_type": "CLABSI",
            "facility_id": "HOSP-001",
            "unit": "ICU-A"
        },
        "patient_demographics": {
            "age": 68,
            "gender": "M",
            "mrn": "MRN-12345678"
        },
        "devices": {
            "central_line": {
                "insertion_date": "2024-01-15",
                "line_type": "PICC",
                "insertion_site": "Right basilic vein",
                "device_days_at_event": 5
            }
        },
        "lab_results": [
            {
                "test_id": "LAB-001",
                "test_type": "blood_culture",
                "collection_date": "2024-01-19",
                "organism": "Staphylococcus aureus",
                "organism_type": "recognized_pathogen",
                "growth": "Positive"
            }
        ],
        "clinical_signals": [
            {
                "signal_id": "SIG-001",
                "signal_type": "vital_sign",
                "signal_name": "temperature",
                "timestamp": "2024-01-19T06:00:00Z",
                "value": 39.2,
                "unit": "°C",
                "abnormal": True
            },
            {
                "signal_id": "SIG-002",
                "signal_type": "vital_sign",
                "signal_name": "heart_rate",
                "timestamp": "2024-01-19T06:00:00Z",
                "value": 112,
                "unit": "bpm",
                "abnormal": True
            },
            {
                "signal_id": "SIG-003",
                "signal_type": "symptom",
                "signal_name": "chills",
                "timestamp": "2024-01-19T05:30:00Z",
                "value": True,
                "severity": "CRITICAL"
            }
        ],
        "clinical_events": [
            {
                "event_id": "EVT-001",
                "event_type": "device_insertion",
                "event_name": "PICC line insertion",
                "timestamp": "2024-01-15T10:30:00Z"
            }
        ],
        "clinical_notes": [
            {
                "note_id": "NOTE-001",
                "note_type": "nursing_assessment",
                "timestamp": "2024-01-19T06:00:00Z",
                "author": "RN J. Smith",
                "content": "Patient reports feeling unwell with chills..."
            }
        ],
        "timeline_phases": [
            {
                "phase_name": "Device Placement",
                "start_date": "2024-01-15",
                "end_date": "2024-01-15",
                "day_number": 1
            },
            {
                "phase_name": "Symptom Onset",
                "start_date": "2024-01-19",
                "end_date": "2024-01-19",
                "day_number": 5
            }
        ],
        "nhsn_evaluation": {
            "date_of_event": "2024-01-19",
            "infection_window_start": "2024-01-16",
            "infection_window_end": "2024-01-22",
            "device_days_at_event": 5,
            "criteria_met": {
                "central_line_present_gt_2_days": True,
                "positive_blood_culture": True,
                "recognized_pathogen": True,
                "clinical_signs": True,
                "no_alternate_source": True
            },
            "nhsn_determination": "CLABSI_CONFIRMED",
            "confidence": 0.95
        },
        "exclusion_criteria_evaluated": [
            {
                "criterion": "Organism related to other infection site",
                "met": False,
                "rationale": "No other infection sources identified"
            }
        ]
    }


class TestCaseAdapterTransformation:
    """Test suite for CaseAdapter.to_new_structure()"""

    def test_transforms_flat_to_structured(self, legacy_case_clabsi):
        """Test basic transformation from flat to 4-section structure."""
        structured = CaseAdapter.to_new_structure(legacy_case_clabsi)

        # Verify top-level structure
        assert "case_id" in structured
        assert "concern_id" in structured
        assert "patient" in structured
        assert "enrichment" in structured
        assert "abstraction" in structured
        assert "qa" in structured

        # Verify case_id and concern_id
        assert structured["case_id"] == "CASE-CLABSI-001"
        assert structured["concern_id"] == "clabsi"

        # Verify qa is null (future)
        assert structured["qa"] is None

    def test_preserves_all_patient_data(self, legacy_case_clabsi):
        """Test that all patient/raw data is preserved."""
        structured = CaseAdapter.to_new_structure(legacy_case_clabsi)
        patient = structured["patient"]

        # Verify all patient sections exist
        assert "case_metadata" in patient
        assert "demographics" in patient
        assert "devices" in patient
        assert "lab_results" in patient
        assert "clinical_notes" in patient
        assert "clinical_events" in patient

        # Verify data integrity
        assert patient["case_metadata"]["case_id"] == "CASE-CLABSI-001"
        assert patient["demographics"]["age"] == 68
        assert patient["devices"]["central_line"]["line_type"] == "PICC"
        assert len(patient["lab_results"]) == 1
        assert len(patient["clinical_notes"]) == 1
        assert len(patient["clinical_events"]) == 1

    def test_generates_enrichment_task_metadata(self, legacy_case_clabsi):
        """Test that enrichment section has proper task metadata."""
        structured = CaseAdapter.to_new_structure(legacy_case_clabsi)
        enrichment = structured["enrichment"]

        # Verify task_metadata exists
        assert "task_metadata" in enrichment
        task_meta = enrichment["task_metadata"]

        # Verify required fields
        assert task_meta["task_id"] == "clabsi.enrichment"
        assert task_meta["task_type"] == "enrichment"
        assert task_meta["prompt_version"] == "v1.0"
        assert task_meta["mode"] == "batch"
        assert task_meta["executed_by"] == "system"
        assert task_meta["status"] == "completed"
        assert "executed_at" in task_meta

    def test_groups_signals_by_type(self, legacy_case_clabsi):
        """Test that signals are grouped by signal_type."""
        structured = CaseAdapter.to_new_structure(legacy_case_clabsi)
        signal_groups = structured["enrichment"]["signal_groups"]

        # Should have 2 groups: vital_sign and symptom
        assert len(signal_groups) == 2

        # Find groups by type
        vital_group = next((g for g in signal_groups if g["group_type"] == "vital_sign"), None)
        symptom_group = next((g for g in signal_groups if g["group_type"] == "symptom"), None)

        assert vital_group is not None
        assert symptom_group is not None

        # Verify vital_sign group has 2 signals
        assert len(vital_group["signals"]) == 2
        assert vital_group["group_confidence"] > 0

        # Verify symptom group has 1 signal
        assert len(symptom_group["signals"]) == 1
        assert symptom_group["group_confidence"] > 0

    def test_generates_enrichment_summary(self, legacy_case_clabsi):
        """Test that enrichment summary is generated correctly."""
        structured = CaseAdapter.to_new_structure(legacy_case_clabsi)
        summary = structured["enrichment"]["summary"]

        # Verify summary fields
        assert "signals_identified" in summary
        assert "signal_groups_count" in summary
        assert "timeline_phases_identified" in summary
        assert "key_findings" in summary
        assert "confidence" in summary

        # Verify counts
        assert summary["signals_identified"] == 3  # 3 signals in fixture
        assert summary["signal_groups_count"] == 2  # vital_sign + symptom
        assert summary["timeline_phases_identified"] == 2

        # Verify key findings includes abnormal signals
        assert len(summary["key_findings"]) > 0
        assert summary["confidence"] > 0

    def test_generates_abstraction_task_metadata(self, legacy_case_clabsi):
        """Test that abstraction section has proper task metadata."""
        structured = CaseAdapter.to_new_structure(legacy_case_clabsi)
        abstraction = structured["abstraction"]

        # Verify task_metadata exists
        assert "task_metadata" in abstraction
        task_meta = abstraction["task_metadata"]

        # Verify required fields
        assert task_meta["task_id"] == "clabsi.abstraction"
        assert task_meta["task_type"] == "abstraction"
        assert task_meta["prompt_version"] == "v1.0"
        assert task_meta["mode"] == "batch"
        assert task_meta["executed_by"] == "system"
        assert task_meta["status"] == "completed"

    def test_generates_clinical_narrative(self, legacy_case_clabsi):
        """Test that clinical narrative is generated."""
        structured = CaseAdapter.to_new_structure(legacy_case_clabsi)
        narrative = structured["abstraction"]["narrative"]

        # Verify narrative is a non-empty string
        assert isinstance(narrative, str)
        assert len(narrative) > 0

        # Verify narrative contains key information
        assert "68" in narrative  # age
        assert "M" in narrative or "male" in narrative.lower()  # gender
        assert "PICC" in narrative  # device type
        assert "Staphylococcus aureus" in narrative  # organism

    def test_maps_criteria_evaluation(self, legacy_case_clabsi):
        """Test that nhsn_evaluation is properly mapped to criteria_evaluation."""
        structured = CaseAdapter.to_new_structure(legacy_case_clabsi)
        criteria_eval = structured["abstraction"]["criteria_evaluation"]

        # Verify required fields
        assert "determination" in criteria_eval
        assert "confidence" in criteria_eval
        assert "criteria_met" in criteria_eval
        assert "criteria_total" in criteria_eval
        assert "criteria_met_count" in criteria_eval

        # Verify values
        assert criteria_eval["determination"] == "CLABSI_CONFIRMED"
        assert criteria_eval["confidence"] == 0.95
        assert criteria_eval["criteria_total"] == 5
        assert criteria_eval["criteria_met_count"] == 5  # All True in fixture

        # Verify criteria are structured
        criteria_met = criteria_eval["criteria_met"]
        assert "central_line_present_gt_2_days" in criteria_met

        criterion = criteria_met["central_line_present_gt_2_days"]
        assert "met" in criterion
        assert "evidence" in criterion
        assert "confidence" in criterion
        assert criterion["met"] is True

    def test_qa_history_empty_for_precomputed(self, legacy_case_clabsi):
        """Test that qa_history is empty for pre-computed cases."""
        structured = CaseAdapter.to_new_structure(legacy_case_clabsi)
        qa_history = structured["abstraction"]["qa_history"]

        assert isinstance(qa_history, list)
        assert len(qa_history) == 0

    def test_preserves_exclusion_analysis(self, legacy_case_clabsi):
        """Test that exclusion criteria are preserved."""
        structured = CaseAdapter.to_new_structure(legacy_case_clabsi)
        exclusion = structured["abstraction"]["exclusion_analysis"]

        assert isinstance(exclusion, list)
        assert len(exclusion) == 1
        assert exclusion[0]["criterion"] == "Organism related to other infection site"

    def test_handles_missing_optional_fields(self):
        """Test that adapter handles missing optional fields gracefully."""
        minimal_case = {
            "case_metadata": {
                "case_id": "CASE-001",
                "infection_type": "CLABSI"
            }
        }

        structured = CaseAdapter.to_new_structure(minimal_case)

        # Should not crash and should return valid structure
        assert "patient" in structured
        assert "enrichment" in structured
        assert "abstraction" in structured

        # Empty lists for missing data
        assert structured["enrichment"]["signal_groups"] == []
        assert structured["patient"]["lab_results"] == []


class TestCaseAdapterReverseTransformation:
    """Test suite for CaseAdapter.from_new_structure()"""

    def test_reverse_transformation(self, legacy_case_clabsi):
        """Test that structured case can be transformed back to legacy format."""
        # Transform to new structure
        structured = CaseAdapter.to_new_structure(legacy_case_clabsi)

        # Transform back to legacy
        legacy_reconstructed = CaseAdapter.from_new_structure(structured)

        # Verify key fields are present
        assert "case_metadata" in legacy_reconstructed
        assert "patient_demographics" in legacy_reconstructed
        assert "clinical_signals" in legacy_reconstructed
        assert "nhsn_evaluation" in legacy_reconstructed

        # Verify data integrity
        assert legacy_reconstructed["case_metadata"]["case_id"] == "CASE-CLABSI-001"
        assert legacy_reconstructed["patient_demographics"]["age"] == 68

        # Verify signals are flattened
        assert len(legacy_reconstructed["clinical_signals"]) == 3

        # Verify nhsn_evaluation is reconstructed
        nhsn_eval = legacy_reconstructed["nhsn_evaluation"]
        assert nhsn_eval["nhsn_determination"] == "CLABSI_CONFIRMED"
        assert "criteria_met" in nhsn_eval
        assert nhsn_eval["criteria_met"]["central_line_present_gt_2_days"] is True

    def test_round_trip_preserves_data(self, legacy_case_clabsi):
        """Test that forward + reverse transformation preserves core data."""
        # Forward transformation
        structured = CaseAdapter.to_new_structure(legacy_case_clabsi)

        # Reverse transformation
        legacy_reconstructed = CaseAdapter.from_new_structure(structured)

        # Key fields should match
        assert (
            legacy_reconstructed["case_metadata"]["case_id"]
            == legacy_case_clabsi["case_metadata"]["case_id"]
        )
        assert (
            legacy_reconstructed["patient_demographics"]["age"]
            == legacy_case_clabsi["patient_demographics"]["age"]
        )
        assert (
            len(legacy_reconstructed["clinical_signals"])
            == len(legacy_case_clabsi["clinical_signals"])
        )
        assert (
            legacy_reconstructed["nhsn_evaluation"]["nhsn_determination"]
            == legacy_case_clabsi["nhsn_evaluation"]["nhsn_determination"]
        )


class TestCaseAdapterEdgeCases:
    """Test edge cases and error handling"""

    def test_handles_empty_signals_list(self):
        """Test that adapter handles empty signals list."""
        case = {
            "case_metadata": {"case_id": "CASE-001", "infection_type": "CLABSI"},
            "clinical_signals": []
        }

        structured = CaseAdapter.to_new_structure(case)

        # Should not crash
        assert structured["enrichment"]["signal_groups"] == []
        assert structured["enrichment"]["summary"]["signals_identified"] == 0

    def test_handles_missing_nhsn_evaluation(self):
        """Test that adapter handles missing NHSN evaluation."""
        case = {
            "case_metadata": {"case_id": "CASE-001", "infection_type": "CLABSI"}
        }

        structured = CaseAdapter.to_new_structure(case)

        # Should create default criteria_evaluation
        criteria_eval = structured["abstraction"]["criteria_evaluation"]
        assert criteria_eval["determination"] == "UNKNOWN"
        assert criteria_eval["confidence"] == 0.0

    def test_handles_different_concern_types(self):
        """Test that adapter works for different concern types (CAUTI, SSI)."""
        cauti_case = {
            "case_metadata": {
                "case_id": "CASE-CAUTI-001",
                "infection_type": "CAUTI"
            }
        }

        structured = CaseAdapter.to_new_structure(cauti_case)

        # Verify concern_id is correctly extracted
        assert structured["concern_id"] == "cauti"
        assert structured["enrichment"]["task_metadata"]["task_id"] == "cauti.enrichment"
        assert structured["abstraction"]["task_metadata"]["task_id"] == "cauti.abstraction"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
