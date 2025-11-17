"""Integration tests for demo endpoints with CaseAdapter

Tests the /api/demo/context endpoint with USE_STRUCTURED_CASES feature flag.
"""

import pytest
import json
import os
from pathlib import Path
from fastapi.testclient import TestClient
from unittest.mock import patch


@pytest.fixture
def test_client():
    """Create FastAPI test client."""
    # Import here to avoid circular dependencies
    import sys
    backend_path = Path(__file__).parent.parent.parent
    sys.path.insert(0, str(backend_path))

    from api.main import app
    return TestClient(app)


@pytest.fixture
def mock_case_data():
    """Sample legacy case data for testing."""
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
        "exclusion_criteria_evaluated": []
    }


class TestDemoContextEndpoint:
    """Test suite for /api/demo/context endpoint"""

    @patch.dict(os.environ, {"USE_STRUCTURED_CASES": "false"})
    def test_context_endpoint_flat_format(self, test_client, mock_case_data, tmp_path):
        """Test that endpoint returns flat format when feature flag is false"""
        # Create mock data file
        data_dir = tmp_path / "data" / "mock" / "cases"
        data_dir.mkdir(parents=True, exist_ok=True)

        case_file = data_dir / "PAT-001-clabsi-positive.json"
        with open(case_file, 'w') as f:
            json.dump(mock_case_data, f)

        # Mock the data directory path
        with patch('api.main.Path') as mock_path:
            mock_path.return_value.parent.parent = tmp_path

            response = test_client.post(
                "/api/demo/context",
                json={"domain_id": "clabsi", "case_id": "case-001"}
            )

        assert response.status_code == 200
        data = response.json()["data"]

        # Should indicate flat format
        assert data["format"] == "flat"

        # Should have patient info
        assert "patient" in data
        assert data["patient"]["patient_id"] == "PAT-001"

        # Should have context fragments
        assert "context_fragments" in data

        # Should NOT have full case_data
        assert "case_data" not in data

    @patch.dict(os.environ, {"USE_STRUCTURED_CASES": "true"})
    def test_context_endpoint_structured_format(self, test_client, mock_case_data, tmp_path):
        """Test that endpoint returns structured format when feature flag is true"""
        # Create mock data file
        data_dir = tmp_path / "data" / "mock" / "cases"
        data_dir.mkdir(parents=True, exist_ok=True)

        case_file = data_dir / "PAT-001-clabsi-positive.json"
        with open(case_file, 'w') as f:
            json.dump(mock_case_data, f)

        # Mock the data directory path
        with patch('api.main.Path') as mock_path:
            mock_path.return_value.parent.parent = tmp_path

            response = test_client.post(
                "/api/demo/context",
                json={"domain_id": "clabsi", "case_id": "case-001"}
            )

        assert response.status_code == 200
        data = response.json()["data"]

        # Should indicate structured format
        assert data["format"] == "structured"

        # Should have patient info
        assert "patient" in data

        # Should have full case_data with 4-section structure
        assert "case_data" in data
        case_data = data["case_data"]

        # Verify 4-section structure
        assert "case_id" in case_data
        assert "concern_id" in case_data
        assert "patient" in case_data
        assert "enrichment" in case_data
        assert "abstraction" in case_data
        assert "qa" in case_data

        # Verify patient section
        patient_section = case_data["patient"]
        assert "case_metadata" in patient_section
        assert "demographics" in patient_section
        assert "devices" in patient_section

        # Verify enrichment section
        enrichment = case_data["enrichment"]
        assert "task_metadata" in enrichment
        assert "signal_groups" in enrichment
        assert "summary" in enrichment

        # Verify abstraction section
        abstraction = case_data["abstraction"]
        assert "task_metadata" in abstraction
        assert "narrative" in abstraction
        assert "criteria_evaluation" in abstraction

    def test_context_endpoint_with_invalid_case_id(self, test_client):
        """Test that endpoint returns 404 for invalid case ID"""
        response = test_client.post(
            "/api/demo/context",
            json={"domain_id": "clabsi", "case_id": "invalid-case"}
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestFeatureFlagBehavior:
    """Test feature flag behavior"""

    @patch.dict(os.environ, {"USE_STRUCTURED_CASES": "false"})
    def test_feature_flag_false(self):
        """Test that feature flag correctly evaluates to False"""
        use_structured = os.getenv("USE_STRUCTURED_CASES", "false").lower() == "true"
        assert use_structured is False

    @patch.dict(os.environ, {"USE_STRUCTURED_CASES": "true"})
    def test_feature_flag_true(self):
        """Test that feature flag correctly evaluates to True"""
        use_structured = os.getenv("USE_STRUCTURED_CASES", "false").lower() == "true"
        assert use_structured is True

    @patch.dict(os.environ, {}, clear=True)
    def test_feature_flag_default(self):
        """Test that feature flag defaults to False when not set"""
        use_structured = os.getenv("USE_STRUCTURED_CASES", "false").lower() == "true"
        assert use_structured is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
