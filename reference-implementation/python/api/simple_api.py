"""
Simple REST API for CLABSI Abstraction Application

Provides endpoints for:
- Listing available cases
- Retrieving case details
- Submitting clinician feedback
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from dataclasses import asdict
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from agents.abstraction_agent import AbstractionAgent, ExecutionMode

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Initialize agent
agent = AbstractionAgent(mode=ExecutionMode.TEST)


# Sample test cases
TEST_CASES = [
    {
        "patient_id": "PAT001",
        "encounter_id": "ENC001",
        "episode_id": "EP001",
        "mrn": "MRN100001",
        "name": "John Doe",
        "scenario": "Clear Positive CLABSI"
    },
    {
        "patient_id": "PAT002",
        "encounter_id": "ENC002",
        "episode_id": "EP002",
        "mrn": "MRN100002",
        "name": "Jane Smith",
        "scenario": "Clear Negative"
    },
    {
        "patient_id": "PAT003",
        "encounter_id": "ENC003",
        "episode_id": "EP003",
        "mrn": "MRN100003",
        "name": "Robert Johnson",
        "scenario": "Borderline Case"
    },
    {
        "patient_id": "PAT004",
        "encounter_id": "ENC004",
        "episode_id": "EP004",
        "mrn": "MRN100004",
        "name": "Maria Garcia",
        "scenario": "Missing Data"
    },
    {
        "patient_id": "PAT005",
        "encounter_id": "ENC005",
        "episode_id": "EP005",
        "mrn": "MRN100005",
        "name": "David Wilson",
        "scenario": "Contamination vs Infection"
    },
    {
        "patient_id": "PAT006",
        "encounter_id": "ENC006",
        "episode_id": "EP006",
        "mrn": "MRN100006",
        "name": "Sarah Martinez",
        "scenario": "Complex Multi-Organism"
    }
]


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "CLABSI Abstraction API"})


@app.route('/api/cases', methods=['GET'])
def list_cases():
    """List all available test cases"""
    return jsonify({
        "cases": TEST_CASES,
        "total": len(TEST_CASES)
    })


@app.route('/api/cases/<patient_id>', methods=['GET'])
def get_case(patient_id):
    """Get detailed case view for a specific patient"""
    try:
        # Find the case
        case = next((c for c in TEST_CASES if c['patient_id'] == patient_id), None)
        if not case:
            return jsonify({"error": "Case not found"}), 404

        # Generate case view using Abstraction Agent
        case_view = agent.generate_case_view(
            patient_id=case['patient_id'],
            encounter_id=case['encounter_id'],
            episode_id=case.get('episode_id')
        )

        # Convert to dict for JSON serialization
        response = {
            "summary": asdict(case_view.summary),
            "qa_result": asdict(case_view.qa_result),
            "signals": case_view.signals,
            "timeline": case_view.timeline,
            "rule_evaluations": case_view.rule_evaluations,
            "status": case_view.status,
            "generated_at": case_view.generated_at,
            "mode": case_view.mode,
            "case_info": case
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/feedback', methods=['POST'])
def submit_feedback():
    """Submit clinician feedback on a case"""
    try:
        data = request.get_json()

        # Validate required fields
        required = ['patient_id', 'encounter_id', 'feedback_type']
        if not all(field in data for field in required):
            return jsonify({"error": "Missing required fields"}), 400

        # In production, this would write to LEDGER.CLINICIAN_FEEDBACK
        feedback_record = {
            "feedback_id": f"FB_{data['patient_id']}_{data['encounter_id']}",
            "patient_id": data['patient_id'],
            "encounter_id": data['encounter_id'],
            "feedback_type": data['feedback_type'],
            "rating": data.get('rating'),
            "comments": data.get('comments'),
            "final_decision": data.get('final_decision'),
            "clinician_id": data.get('clinician_id', 'UNKNOWN'),
            "submitted_at": "2024-01-01T00:00:00"  # Would use current timestamp
        }

        return jsonify({
            "success": True,
            "message": "Feedback submitted successfully",
            "feedback": feedback_record
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/mode', methods=['GET', 'POST'])
def mode():
    """Get or set execution mode (TEST/PROD)"""
    global agent

    if request.method == 'POST':
        data = request.get_json()
        new_mode = data.get('mode', 'TEST')

        if new_mode not in ['TEST', 'PROD']:
            return jsonify({"error": "Invalid mode"}), 400

        # Reinitialize agent with new mode
        mode_enum = ExecutionMode.PROD if new_mode == 'PROD' else ExecutionMode.TEST
        agent = AbstractionAgent(mode=mode_enum)

        return jsonify({
            "success": True,
            "mode": new_mode
        })

    return jsonify({"mode": agent.mode.value})


if __name__ == '__main__':
    print("Starting CLABSI Abstraction API...")
    print("Available endpoints:")
    print("  GET  /api/health")
    print("  GET  /api/cases")
    print("  GET  /api/cases/<patient_id>")
    print("  POST /api/feedback")
    print("  GET/POST /api/mode")
    print("\nRunning on http://localhost:5000")

    app.run(debug=True, host='0.0.0.0', port=5000)
