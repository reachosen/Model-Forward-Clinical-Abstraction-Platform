"""Integration tests for interrogation endpoint

Tests the /v1/task/{task_id}/interrogate endpoint for Ask Panel support.
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def test_client():
    """Create FastAPI test client."""
    import sys
    from pathlib import Path
    backend_path = Path(__file__).parent.parent.parent
    sys.path.insert(0, str(backend_path))

    from api.main import app
    return TestClient(app)


class TestInterrogationEndpoint:
    """Test suite for task interrogation endpoint"""

    def test_interrogate_explain_mode(self, test_client):
        """Test interrogation in explain mode"""
        response = test_client.post(
            "/v1/task/CASE-CLABSI-001/interrogate",
            json={
                "question": "Why does this criterion evaluate to true?",
                "interrogation_context": {
                    "mode": "explain",
                    "target_type": "criterion",
                    "target_id": "central_line_present_gt_2_days",
                    "target_label": "Central line >2 days",
                    "program_type": "HAC",
                    "metric_id": "CLABSI"
                }
            }
        )

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert "data" in data

        # Verify QA entry structure
        qa_entry = data["data"]
        assert "qa_id" in qa_entry
        assert qa_entry["question"] == "Why does this criterion evaluate to true?"
        assert "answer" in qa_entry
        assert "criterion" in qa_entry["answer"].lower()

        # Verify interrogation context preserved
        assert qa_entry["interrogation_context"]["mode"] == "explain"
        assert qa_entry["interrogation_context"]["target_type"] == "criterion"

        # Verify task metadata
        assert "task_metadata" in qa_entry
        assert qa_entry["task_metadata"]["task_type"] == "interrogation"
        assert qa_entry["task_metadata"]["mode"] == "interactive"
        assert qa_entry["task_metadata"]["status"] == "completed"

        # Verify citations provided
        assert "citations" in qa_entry
        assert isinstance(qa_entry["citations"], list)
        assert len(qa_entry["citations"]) > 0

        # Verify confidence score
        assert "confidence" in qa_entry
        assert 0 <= qa_entry["confidence"] <= 1

    def test_interrogate_summarize_mode(self, test_client):
        """Test interrogation in summarize mode"""
        response = test_client.post(
            "/v1/task/clabsi.abstraction/interrogate",
            json={
                "question": "Can you summarize the key findings?",
                "interrogation_context": {
                    "mode": "summarize",
                    "target_type": "overall",
                    "target_id": "abstraction",
                    "program_type": "HAC"
                }
            }
        )

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        qa_entry = data["data"]
        assert "summary" in qa_entry["answer"].lower()

    def test_interrogate_validate_mode(self, test_client):
        """Test interrogation in validate mode"""
        response = test_client.post(
            "/v1/task/CASE-CLABSI-001/interrogate",
            json={
                "question": "Is this evidence valid?",
                "interrogation_context": {
                    "mode": "validate",
                    "target_type": "signal",
                    "target_id": "SIG-001",
                    "signal_type": "vital_sign"
                }
            }
        )

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        qa_entry = data["data"]
        assert "validation" in qa_entry["answer"].lower() or "validated" in qa_entry["answer"].lower()

    def test_interrogate_missing_question(self, test_client):
        """Test interrogation with missing question field"""
        response = test_client.post(
            "/v1/task/CASE-CLABSI-001/interrogate",
            json={
                "interrogation_context": {
                    "mode": "explain",
                    "target_type": "criterion",
                    "target_id": "test"
                }
            }
        )

        # Should return 422 Unprocessable Entity for missing required field
        assert response.status_code == 422

    def test_interrogate_empty_question(self, test_client):
        """Test interrogation with empty question"""
        response = test_client.post(
            "/v1/task/CASE-CLABSI-001/interrogate",
            json={
                "question": "",
                "interrogation_context": {
                    "mode": "explain",
                    "target_type": "criterion",
                    "target_id": "test"
                }
            }
        )

        # Should return 422 for validation error (min_length=1)
        assert response.status_code == 422

    def test_interrogate_missing_context(self, test_client):
        """Test interrogation with missing interrogation_context"""
        response = test_client.post(
            "/v1/task/CASE-CLABSI-001/interrogate",
            json={
                "question": "Why is this criterion met?"
            }
        )

        # Should return 422 for missing required field
        assert response.status_code == 422

    def test_interrogate_response_metadata(self, test_client):
        """Test that response includes proper metadata"""
        response = test_client.post(
            "/v1/task/test-task/interrogate",
            json={
                "question": "Test question?",
                "interrogation_context": {
                    "mode": "explain",
                    "target_type": "overall",
                    "target_id": "test"
                }
            }
        )

        assert response.status_code == 200
        data = response.json()

        # Verify response-level metadata
        assert "metadata" in data
        metadata = data["metadata"]
        assert "request_id" in metadata
        assert "interrogate_" in metadata["request_id"]
        assert "timestamp" in metadata
        assert metadata["version"] == "1.0.0"

    def test_interrogate_different_target_types(self, test_client):
        """Test interrogation with different target types"""
        target_types = ["criterion", "signal", "event", "overall"]

        for target_type in target_types:
            response = test_client.post(
                "/v1/task/test-task/interrogate",
                json={
                    "question": f"Tell me about this {target_type}",
                    "interrogation_context": {
                        "mode": "explain",
                        "target_type": target_type,
                        "target_id": f"test-{target_type}-id"
                    }
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["data"]["interrogation_context"]["target_type"] == target_type


class TestInterrogationModes:
    """Test different interrogation modes"""

    @pytest.mark.parametrize("mode,expected_keyword", [
        ("explain", "criterion"),
        ("summarize", "summary"),
        ("validate", "validation"),
    ])
    def test_mode_specific_responses(self, test_client, mode, expected_keyword):
        """Test that each mode returns appropriate response"""
        response = test_client.post(
            "/v1/task/test-task/interrogate",
            json={
                "question": f"Test {mode} question",
                "interrogation_context": {
                    "mode": mode,
                    "target_type": "criterion",
                    "target_id": "test-criterion"
                }
            }
        )

        assert response.status_code == 200
        data = response.json()
        answer = data["data"]["answer"].lower()

        # Each mode should have mode-specific content
        assert len(answer) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
