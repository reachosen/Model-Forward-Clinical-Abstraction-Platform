"""
End-to-End Demo Pipeline Test

Tests the complete demo workflow:
1. POST /api/demo/context - Retrieve case context
2. POST /api/demo/abstract - Generate clinical abstraction
3. POST /api/demo/feedback - Submit user feedback

This test verifies the entire demo pipeline works correctly in APP_MODE=demo.

Requirements:
- APP_MODE=demo (automatically set in test)
- Backend running with mock data
- CLABSI case-001 data available

Run:
    pytest backend/tests/e2e_demo_test.py -v
"""

import os
import pytest
from fastapi.testclient import TestClient

# Set demo mode for tests
os.environ["APP_MODE"] = "demo"
os.environ["CA_FACTORY_PROJECT"] = "clabsi"

# Import after setting env vars
from api.main import app


@pytest.fixture
def client():
    """Create FastAPI test client."""
    return TestClient(app)


class TestDemoPipeline:
    """Test the complete demo pipeline: context → abstract → feedback"""

    def test_step1_context_retrieval(self, client):
        """
        STEP 1: Test context retrieval endpoint

        Verifies:
        - Endpoint returns 200 status
        - Response has correct structure
        - Patient block exists
        - Context fragments array is non-empty
        - Domain ID and case ID are correct
        """
        # Prepare request
        payload = {
            "domain_id": "clabsi",
            "case_id": "case-001"
        }

        # Make request
        response = client.post("/api/demo/context", json=payload)

        # Assert HTTP status
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        # Parse response
        data = response.json()

        # Assert top-level structure
        assert data["success"] is True, "Response should indicate success"
        assert "data" in data, "Response should have 'data' field"
        assert "metadata" in data, "Response should have 'metadata' field"

        # Assert data fields
        response_data = data["data"]
        assert response_data["domain_id"] == "clabsi", "Domain ID should be 'clabsi'"
        assert response_data["case_id"] == "case-001", "Case ID should be 'case-001'"

        # Assert patient block exists
        assert "patient" in response_data, "Response should have 'patient' block"
        patient = response_data["patient"]
        assert "case_id" in patient, "Patient block should have case_id"
        assert "patient_id" in patient, "Patient block should have patient_id"
        assert "mrn" in patient, "Patient block should have MRN"
        assert "age" in patient, "Patient block should have age"
        assert "gender" in patient, "Patient block should have gender"

        # Assert context fragments
        assert "context_fragments" in response_data, "Response should have 'context_fragments'"
        context_fragments = response_data["context_fragments"]
        assert isinstance(context_fragments, list), "Context fragments should be a list"
        assert len(context_fragments) > 0, "Context fragments array should not be empty"

        # Verify fragment structure
        first_fragment = context_fragments[0]
        assert "fragment_id" in first_fragment, "Fragment should have fragment_id"
        assert "type" in first_fragment, "Fragment should have type"
        assert "content" in first_fragment, "Fragment should have content"
        assert "relevance_score" in first_fragment, "Fragment should have relevance_score"

        print("✓ STEP 1: Context retrieval successful")
        print(f"  - Retrieved {len(context_fragments)} context fragments")
        print(f"  - Patient: {patient['patient_id']} (MRN: {patient['mrn']})")

        return context_fragments  # Return for use in next test

    def test_step2_abstraction(self, client):
        """
        STEP 2: Test abstraction generation endpoint

        Verifies:
        - Endpoint returns 200 status
        - Response has correct structure
        - Summary is non-empty
        - Criteria evaluation is present
        - Model metadata is included
        """
        # First get context (needed for abstraction)
        context_response = client.post(
            "/api/demo/context",
            json={"domain_id": "clabsi", "case_id": "case-001"}
        )
        assert context_response.status_code == 200
        context_fragments = context_response.json()["data"]["context_fragments"]

        # Prepare abstraction request
        payload = {
            "domain_id": "clabsi",
            "case_id": "case-001",
            "context_fragments": context_fragments
        }

        # Make request
        response = client.post("/api/demo/abstract", json=payload)

        # Assert HTTP status
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        # Parse response
        data = response.json()

        # Assert top-level structure
        assert data["success"] is True, "Response should indicate success"
        assert "data" in data, "Response should have 'data' field"
        assert "metadata" in data, "Response should have 'metadata' field"

        # Assert data fields
        response_data = data["data"]
        assert response_data["domain_id"] == "clabsi", "Domain ID should be 'clabsi'"
        assert response_data["case_id"] == "case-001", "Case ID should be 'case-001'"

        # Assert summary is present and non-empty
        assert "summary" in response_data, "Response should have 'summary' field"
        summary = response_data["summary"]
        assert isinstance(summary, str), "Summary should be a string"
        assert len(summary) > 0, "Summary should not be empty"
        assert len(summary) > 50, "Summary should be substantial (>50 chars)"

        # Assert criteria evaluation is present
        assert "criteria_evaluation" in response_data, "Response should have 'criteria_evaluation'"
        criteria = response_data["criteria_evaluation"]
        assert "determination" in criteria, "Criteria should have 'determination'"
        assert "confidence" in criteria, "Criteria should have 'confidence'"

        # For CLABSI, check detailed criteria
        if response_data["domain_id"] == "clabsi":
            assert "criteria_met" in criteria, "CLABSI should have detailed 'criteria_met'"
            assert "total_criteria" in criteria, "Should have total_criteria count"
            assert "criteria_met_count" in criteria, "Should have criteria_met_count"

        # Assert model metadata is present
        assert "model_metadata" in response_data, "Response should have 'model_metadata'"
        model_meta = response_data["model_metadata"]
        assert "model" in model_meta, "Model metadata should have 'model' field"
        assert "tokens_used" in model_meta, "Model metadata should have 'tokens_used'"
        assert "latency_ms" in model_meta, "Model metadata should have 'latency_ms'"

        # Verify context fragments were used
        assert "context_fragments_used" in response_data, "Should track fragments used"
        assert response_data["context_fragments_used"] == len(context_fragments)

        print("✓ STEP 2: Abstraction generation successful")
        print(f"  - Summary length: {len(summary)} characters")
        print(f"  - Determination: {criteria['determination']}")
        print(f"  - Confidence: {criteria['confidence']:.2%}")
        print(f"  - Context fragments used: {response_data['context_fragments_used']}")

    def test_step3_feedback_submission(self, client):
        """
        STEP 3: Test feedback submission endpoint

        Verifies:
        - Endpoint returns 200 status
        - Response has correct structure
        - Status is "ok"
        - Feedback ID is generated
        """
        # Prepare feedback request
        payload = {
            "domain_id": "clabsi",
            "case_id": "case-001",
            "feedback_type": "thumbs_up",
            "comment": "Excellent abstraction quality"
        }

        # Make request
        response = client.post("/api/demo/feedback", json=payload)

        # Assert HTTP status
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        # Parse response
        data = response.json()

        # Assert top-level structure
        assert data["success"] is True, "Response should indicate success"
        assert "data" in data, "Response should have 'data' field"

        # Assert data fields
        response_data = data["data"]
        assert "status" in response_data, "Response should have 'status' field"
        assert response_data["status"] == "ok", "Status should be 'ok'"

        # Assert feedback_id is generated
        assert "feedback_id" in response_data, "Response should have 'feedback_id'"
        feedback_id = response_data["feedback_id"]
        assert isinstance(feedback_id, str), "Feedback ID should be a string"
        assert len(feedback_id) > 0, "Feedback ID should not be empty"

        # Verify request data is echoed back
        assert response_data["domain_id"] == "clabsi", "Domain ID should match request"
        assert response_data["case_id"] == "case-001", "Case ID should match request"
        assert response_data["feedback_type"] == "thumbs_up", "Feedback type should match"

        print("✓ STEP 3: Feedback submission successful")
        print(f"  - Feedback ID: {feedback_id}")
        print(f"  - Status: {response_data['status']}")

    def test_complete_pipeline_flow(self, client):
        """
        COMPLETE PIPELINE TEST

        Tests the entire workflow from context → abstract → feedback
        in a single integration test.
        """
        print("\n" + "="*60)
        print("RUNNING COMPLETE DEMO PIPELINE TEST")
        print("="*60)

        # STEP 1: Get context
        print("\n[1/3] Retrieving case context...")
        context_response = client.post(
            "/api/demo/context",
            json={"domain_id": "clabsi", "case_id": "case-001"}
        )
        assert context_response.status_code == 200
        context_data = context_response.json()["data"]
        context_fragments = context_data["context_fragments"]
        print(f"✓ Context retrieved: {len(context_fragments)} fragments")

        # STEP 2: Generate abstraction
        print("\n[2/3] Generating clinical abstraction...")
        abstract_response = client.post(
            "/api/demo/abstract",
            json={
                "domain_id": "clabsi",
                "case_id": "case-001",
                "context_fragments": context_fragments
            }
        )
        assert abstract_response.status_code == 200
        abstract_data = abstract_response.json()["data"]
        print(f"✓ Abstraction generated")
        print(f"  Summary: {abstract_data['summary'][:100]}...")
        print(f"  Determination: {abstract_data['criteria_evaluation']['determination']}")

        # STEP 3: Submit feedback
        print("\n[3/3] Submitting feedback...")
        feedback_response = client.post(
            "/api/demo/feedback",
            json={
                "domain_id": "clabsi",
                "case_id": "case-001",
                "feedback_type": "thumbs_up"
            }
        )
        assert feedback_response.status_code == 200
        feedback_data = feedback_response.json()["data"]
        print(f"✓ Feedback submitted: {feedback_data['feedback_id']}")

        print("\n" + "="*60)
        print("✓ COMPLETE PIPELINE TEST PASSED")
        print("="*60)

    def test_negative_case_handling(self, client):
        """
        Test error handling for invalid case ID
        """
        payload = {
            "domain_id": "clabsi",
            "case_id": "case-999"  # Invalid case
        }

        response = client.post("/api/demo/context", json=payload)

        data = response.json()

        # Should still be a 404 for invalid case
        assert response.status_code == 404, "Should return 404 for invalid case"

        # New structure expectations based on actual API response:
        # {
        #   "success": false,
        #   "error": {
        #     "code": "HTTP_ERROR",
        #     "message": "Case case-999 not found"
        #   },
        #   "metadata": { ... }
        # }

        assert data.get("success") is False, "Error response should set success=False"
        assert "error" in data, "Error response should have 'error' object"
        assert "code" in data["error"], "Error.error.code must exist"
        assert "message" in data["error"], "Error.error.message must exist"

        # Stronger checks on content
        assert data["error"]["code"] == "HTTP_ERROR"
        assert "not found" in data["error"]["message"].lower()

        # Metadata checks
        assert "metadata" in data, "Error response should have metadata"
        assert "request_id" in data["metadata"]
        assert "timestamp" in data["metadata"]

        print("✓ Negative test: Invalid case ID handled correctly")

    def test_feedback_types(self, client):
        """
        Test different feedback types (thumbs_up, thumbs_down)
        """
        feedback_types = ["thumbs_up", "thumbs_down"]

        for feedback_type in feedback_types:
            payload = {
                "domain_id": "clabsi",
                "case_id": "case-001",
                "feedback_type": feedback_type
            }

            response = client.post("/api/demo/feedback", json=payload)
            assert response.status_code == 200

            data = response.json()["data"]
            assert data["feedback_type"] == feedback_type
            assert "feedback_id" in data

        print(f"✓ All feedback types tested: {feedback_types}")


class TestDemoEndpointsStructure:
    """Test that demo endpoints meet specification requirements"""

    def test_context_response_structure(self, client):
        """Verify context endpoint returns all required fields"""
        response = client.post(
            "/api/demo/context",
            json={"domain_id": "clabsi", "case_id": "case-001"}
        )

        assert response.status_code == 200
        data = response.json()["data"]

        # Required top-level fields
        required_fields = ["domain_id", "case_id", "patient", "context_fragments"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"

        # Patient block required fields
        patient_fields = ["case_id", "patient_id", "mrn", "age", "gender"]
        for field in patient_fields:
            assert field in data["patient"], f"Patient missing field: {field}"

        print("✓ Context response structure validated")

    def test_abstract_response_structure(self, client):
        """Verify abstract endpoint returns all required fields"""
        # Get context first
        context_resp = client.post(
            "/api/demo/context",
            json={"domain_id": "clabsi", "case_id": "case-001"}
        )
        fragments = context_resp.json()["data"]["context_fragments"]

        # Generate abstraction
        response = client.post(
            "/api/demo/abstract",
            json={
                "domain_id": "clabsi",
                "case_id": "case-001",
                "context_fragments": fragments
            }
        )

        assert response.status_code == 200
        data = response.json()["data"]

        # Required fields
        required_fields = [
            "domain_id",
            "case_id",
            "summary",
            "criteria_evaluation",
            "model_metadata"
        ]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"

        # Criteria evaluation fields
        assert "determination" in data["criteria_evaluation"]
        assert "confidence" in data["criteria_evaluation"]

        # Model metadata fields
        assert "model" in data["model_metadata"]
        assert "tokens_used" in data["model_metadata"]
        assert "latency_ms" in data["model_metadata"]

        print("✓ Abstract response structure validated")

    def test_feedback_response_structure(self, client):
        """Verify feedback endpoint returns all required fields"""
        response = client.post(
            "/api/demo/feedback",
            json={
                "domain_id": "clabsi",
                "case_id": "case-001",
                "feedback_type": "thumbs_up"
            }
        )

        assert response.status_code == 200
        data = response.json()["data"]

        # Required fields
        required_fields = ["status", "feedback_id", "domain_id", "case_id"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"

        # Verify status is "ok"
        assert data["status"] == "ok"

        # Verify feedback_id is a non-empty string
        assert isinstance(data["feedback_id"], str)
        assert len(data["feedback_id"]) > 0

        print("✓ Feedback response structure validated")


# Test summary
if __name__ == "__main__":
    print("""
    ==========================================
    CA Factory E2E Demo Pipeline Test Suite
    ==========================================

    Tests:
    1. Context retrieval (GET case data)
    2. Abstraction generation (LLM processing)
    3. Feedback submission (User input)
    4. Complete pipeline integration
    5. Error handling
    6. Response structure validation

    Run with:
        pytest backend/tests/e2e_demo_test.py -v

    Requirements:
        - APP_MODE=demo (auto-set)
        - CA_FACTORY_PROJECT=clabsi (auto-set)
    ==========================================
    """)
