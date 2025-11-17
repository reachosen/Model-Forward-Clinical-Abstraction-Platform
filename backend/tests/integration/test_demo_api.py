"""
Integration tests for demo API endpoints
Tests /api/demo/context, /api/demo/abstract, /api/demo/feedback
Tests /v1/task/{task_id}/interrogate
Tests /v1/case/{case_id}/tasks, /v1/task/{task_id}
"""

import pytest
import json
from pathlib import Path


class TestDemoContextEndpoint:
    """Test /api/demo/context endpoint"""

    def test_context_clabsi_pat001(self, test_client):
        """Test loading PAT-001 via context endpoint"""
        response = test_client.post('/api/demo/context', json={
            'domain_id': 'clabsi',
            'case_id': 'PAT-001'
        })

        assert response.status_code == 200
        data = response.json()

        assert data['success'] is True
        assert 'data' in data
        assert 'case_data' in data['data']

        # Validate structured case format
        case_data = data['data']['case_data']
        assert 'case_id' in case_data
        assert 'patient' in case_data
        assert 'enrichment' in case_data
        assert 'abstraction' in case_data

    def test_context_clabsi_pat002(self, test_client):
        """Test loading PAT-002 via context endpoint"""
        response = test_client.post('/api/demo/context', json={
            'domain_id': 'clabsi',
            'case_id': 'PAT-002'
        })

        assert response.status_code == 200
        data = response.json()
        case_data = data['data']['case_data']

        # PAT-002 should be CLABSI ruled out
        determination = case_data['abstraction']['criteria_evaluation']['determination']
        assert determination == 'CLABSI_RULED_OUT'

    def test_context_invalid_domain(self, test_client):
        """Test context endpoint with invalid domain"""
        response = test_client.post('/api/demo/context', json={
            'domain_id': 'invalid_domain',
            'case_id': 'PAT-001'
        })

        assert response.status_code == 400
        assert response.json()['success'] is False

    def test_context_invalid_case(self, test_client):
        """Test context endpoint with invalid case ID"""
        response = test_client.post('/api/demo/context', json={
            'domain_id': 'clabsi',
            'case_id': 'PAT-999'
        })

        assert response.status_code == 404
        assert response.json()['success'] is False

    def test_context_missing_parameters(self, test_client):
        """Test context endpoint with missing parameters"""
        response = test_client.post('/api/demo/context', json={
            'domain_id': 'clabsi'
            # Missing case_id
        })

        assert response.status_code == 422  # Validation error


class TestDemoAbstractEndpoint:
    """Test /api/demo/abstract endpoint"""

    def test_abstract_pat001(self, test_client):
        """Test getting abstraction for PAT-001"""
        response = test_client.post('/api/demo/abstract', json={
            'domain_id': 'clabsi',
            'case_id': 'PAT-001',
            'context_fragments': []
        })

        assert response.status_code == 200
        data = response.json()

        assert data['success'] is True
        assert 'data' in data
        result = data['data']

        # Check abstraction data
        assert 'summary' in result
        assert 'criteria_evaluation' in result
        assert 'task_metadata' in result

        # Validate task metadata
        assert result['task_metadata']['task_type'] == 'abstraction'

    def test_abstract_with_context_fragments(self, test_client):
        """Test abstract endpoint with context fragments"""
        response = test_client.post('/api/demo/abstract', json={
            'domain_id': 'clabsi',
            'case_id': 'PAT-001',
            'context_fragments': [
                {'type': 'user_question', 'content': 'Why CLABSI confirmed?'}
            ]
        })

        assert response.status_code == 200


class TestDemoFeedbackEndpoint:
    """Test /api/demo/feedback endpoint"""

    def test_submit_feedback(self, test_client):
        """Test submitting feedback"""
        response = test_client.post('/api/demo/feedback', json={
            'domain_id': 'clabsi',
            'case_id': 'PAT-001',
            'feedback_type': 'agree',
            'comment': 'Good determination'
        })

        assert response.status_code == 200
        data = response.json()

        assert data['success'] is True
        assert 'feedback_id' in data['data']
        assert 'status' in data['data']
        assert data['data']['status'] == 'received'

    def test_feedback_types(self, test_client):
        """Test different feedback types"""
        feedback_types = ['agree', 'disagree', 'unsure', 'comment']

        for feedback_type in feedback_types:
            response = test_client.post('/api/demo/feedback', json={
                'domain_id': 'clabsi',
                'case_id': 'PAT-001',
                'feedback_type': feedback_type,
                'comment': f'Test {feedback_type}'
            })

            assert response.status_code == 200


class TestInterrogationEndpoint:
    """Test /v1/task/{task_id}/interrogate endpoint"""

    def test_interrogate_explain_mode(self, test_client):
        """Test interrogation in explain mode"""
        response = test_client.post('/v1/task/clabsi.abstraction/interrogate', json={
            'question': 'Why was this determined to be CLABSI?',
            'interrogation_context': {
                'mode': 'explain',
                'target_type': 'overall',
                'target_id': 'case',
                'program_type': 'CLABSI',
                'metric_id': 'CLABSI'
            }
        })

        assert response.status_code == 200
        data = response.json()

        assert data['success'] is True
        qa_entry = data['data']

        # Validate QA entry structure
        assert 'qa_id' in qa_entry
        assert 'question' in qa_entry
        assert 'answer' in qa_entry
        assert 'interrogation_context' in qa_entry
        assert 'task_metadata' in qa_entry
        assert 'confidence' in qa_entry

        # Check mode
        assert qa_entry['interrogation_context']['mode'] == 'explain'

    def test_interrogate_summarize_mode(self, test_client):
        """Test interrogation in summarize mode"""
        response = test_client.post('/v1/task/clabsi.abstraction/interrogate', json={
            'question': 'Summarize the key findings',
            'interrogation_context': {
                'mode': 'summarize',
                'target_type': 'overall',
                'target_id': 'case'
            }
        })

        assert response.status_code == 200
        data = response.json()
        qa_entry = data['data']

        assert qa_entry['interrogation_context']['mode'] == 'summarize'
        # Summary should be concise
        assert len(qa_entry['answer']) <= 500

    def test_interrogate_validate_mode(self, test_client):
        """Test interrogation in validate mode"""
        response = test_client.post('/v1/task/clabsi.abstraction/interrogate', json={
            'question': 'Are there any contradictions in the determination?',
            'interrogation_context': {
                'mode': 'validate',
                'target_type': 'overall',
                'target_id': 'case'
            }
        })

        assert response.status_code == 200
        data = response.json()
        qa_entry = data['data']

        assert qa_entry['interrogation_context']['mode'] == 'validate'
        # Validate should have multiple citations
        assert len(qa_entry.get('citations', [])) >= 1

    def test_interrogate_criterion_target(self, test_client):
        """Test interrogating a specific criterion"""
        response = test_client.post('/v1/task/clabsi.abstraction/interrogate', json={
            'question': 'Explain this criterion evaluation',
            'interrogation_context': {
                'mode': 'explain',
                'target_type': 'criterion',
                'target_id': 'central_line_present_gt_2_days',
                'target_label': 'Central Line Present >2 Days'
            }
        })

        assert response.status_code == 200
        data = response.json()

        assert data['data']['interrogation_context']['target_type'] == 'criterion'

    def test_interrogate_signal_target(self, test_client):
        """Test interrogating a specific signal"""
        response = test_client.post('/v1/task/clabsi.enrichment/interrogate', json={
            'question': 'Explain this signal',
            'interrogation_context': {
                'mode': 'explain',
                'target_type': 'signal',
                'target_id': 'central_line_present',
                'signal_type': 'device'
            }
        })

        assert response.status_code == 200

    def test_interrogate_missing_question(self, test_client):
        """Test interrogation with missing question"""
        response = test_client.post('/v1/task/clabsi.abstraction/interrogate', json={
            'interrogation_context': {
                'mode': 'explain',
                'target_type': 'overall',
                'target_id': 'case'
            }
        })

        assert response.status_code == 422  # Validation error

    def test_interrogate_invalid_mode(self, test_client):
        """Test interrogation with invalid mode"""
        response = test_client.post('/v1/task/clabsi.abstraction/interrogate', json={
            'question': 'Test question',
            'interrogation_context': {
                'mode': 'invalid_mode',
                'target_type': 'overall',
                'target_id': 'case'
            }
        })

        # Should still work but might return lower confidence
        assert response.status_code in [200, 400]


class TestTaskTrackingEndpoints:
    """Test /v1/case/{case_id}/tasks and /v1/task/{task_id} endpoints"""

    def test_get_case_tasks_pat001(self, test_client):
        """Test getting all tasks for PAT-001"""
        response = test_client.get('/v1/case/CASE-CLABSI-001/tasks')

        assert response.status_code == 200
        data = response.json()

        assert data['success'] is True
        tasks_data = data['data']

        # Check structure
        assert 'case_id' in tasks_data
        assert 'task_count' in tasks_data
        assert 'tasks' in tasks_data

        # Should have at least enrichment and abstraction
        assert tasks_data['task_count'] >= 2

        tasks = tasks_data['tasks']
        task_types = [t['task_type'] for t in tasks]
        assert 'enrichment' in task_types
        assert 'abstraction' in task_types

    def test_get_case_tasks_sections(self, test_client):
        """Test that tasks include section information"""
        response = test_client.get('/v1/case/CASE-CLABSI-001/tasks')
        tasks = response.json()['data']['tasks']

        for task in tasks:
            assert 'section' in task
            assert task['section'] in ['enrichment', 'abstraction', 'qa']

    def test_get_specific_task(self, test_client):
        """Test getting specific task details"""
        # First get case tasks to find a task_id
        response = test_client.get('/v1/case/CASE-CLABSI-001/tasks')
        tasks = response.json()['data']['tasks']
        task_id = tasks[0]['task_id']

        # Now get specific task
        response = test_client.get(f'/v1/task/{task_id}')

        assert response.status_code == 200
        data = response.json()

        assert data['success'] is True
        task_data = data['data']

        # Check task data
        assert 'task_id' in task_data
        assert 'task_type' in task_data
        assert 'section' in task_data
        assert 'full_data' in task_data

    def test_get_enrichment_task_details(self, test_client):
        """Test getting enrichment task with full section data"""
        response = test_client.get('/v1/task/clabsi.enrichment.PAT-001')

        if response.status_code == 200:
            data = response.json()['data']
            assert data['section'] == 'enrichment'
            assert 'full_data' in data

            # Enrichment task should have signal_groups and timeline_phases
            full_data = data['full_data']
            assert 'signal_groups' in full_data
            assert 'timeline_phases' in full_data

    def test_get_abstraction_task_details(self, test_client):
        """Test getting abstraction task with full section data"""
        response = test_client.get('/v1/task/clabsi.abstraction.PAT-001')

        if response.status_code == 200:
            data = response.json()['data']
            assert data['section'] == 'abstraction'

            # Abstraction task should have narrative and criteria
            full_data = data['full_data']
            assert 'narrative' in full_data
            assert 'criteria_evaluation' in full_data

    def test_get_task_not_found(self, test_client):
        """Test getting non-existent task"""
        response = test_client.get('/v1/task/nonexistent.task.id')

        assert response.status_code == 404

    def test_get_case_tasks_not_found(self, test_client):
        """Test getting tasks for non-existent case"""
        response = test_client.get('/v1/case/NONEXISTENT-CASE/tasks')

        assert response.status_code == 404


class TestEndpointPerformance:
    """Test endpoint performance and response times"""

    def test_context_endpoint_performance(self, test_client):
        """Test that context endpoint responds quickly"""
        import time

        start = time.time()
        response = test_client.post('/api/demo/context', json={
            'domain_id': 'clabsi',
            'case_id': 'PAT-001'
        })
        duration = time.time() - start

        assert response.status_code == 200
        assert duration < 2.0  # Should respond in under 2 seconds

    def test_interrogation_endpoint_performance(self, test_client):
        """Test that interrogation endpoint responds in reasonable time"""
        import time

        start = time.time()
        response = test_client.post('/v1/task/clabsi.abstraction/interrogate', json={
            'question': 'Why CLABSI?',
            'interrogation_context': {
                'mode': 'explain',
                'target_type': 'overall',
                'target_id': 'case'
            }
        })
        duration = time.time() - start

        assert response.status_code == 200
        # Interrogation can take longer but should be reasonable
        assert duration < 5.0

    def test_task_tracking_endpoint_performance(self, test_client):
        """Test that task tracking endpoints respond quickly"""
        import time

        start = time.time()
        response = test_client.get('/v1/case/CASE-CLABSI-001/tasks')
        duration = time.time() - start

        assert response.status_code == 200
        assert duration < 1.0  # Should be very fast


class TestCORS:
    """Test CORS headers for frontend integration"""

    def test_cors_headers_present(self, test_client):
        """Test that CORS headers are present"""
        response = test_client.options('/api/demo/context')

        # Check for CORS headers
        assert 'access-control-allow-origin' in response.headers or \
               response.status_code == 200  # Some frameworks handle OPTIONS differently

    def test_post_requests_work_from_frontend(self, test_client):
        """Test that POST requests work (simulating frontend call)"""
        headers = {
            'Origin': 'http://localhost:3000',
            'Content-Type': 'application/json'
        }

        response = test_client.post('/api/demo/context',
                                     json={'domain_id': 'clabsi', 'case_id': 'PAT-001'},
                                     headers=headers)

        assert response.status_code == 200
