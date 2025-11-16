/**
 * Rule Evaluation Page
 * Displays NHSN criteria evaluation using RuleEvaluationVisualizer
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { CaseView } from '../types';
import { useDomainConfig } from '../contexts/DomainConfigContext';
import RuleEvaluationVisualizer, { type RuleEvaluationData } from '../components/RuleEvaluationVisualizer';
import './RuleEvaluationPage.css';

const RuleEvaluationPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { config } = useDomainConfig();

  const [caseData, setCaseData] = useState<CaseView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const loadCase = async () => {
    if (!patientId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await api.getCase(patientId);
      setCaseData(data);
    } catch (err) {
      setError('Failed to load case. Please try again.');
      console.error('Error loading case:', err);
    } finally {
      setLoading(false);
    }
  };

  // Transform case data into RuleEvaluationData format
  const getRuleEvaluationData = (): RuleEvaluationData | null => {
    if (!caseData) return null;

    // This is sample data - in a real app, this would come from the backend
    return {
      caseId: caseData.case_info.patient_id,
      infectionType: config.domain_name,
      summary: {
        totalRules: 12,
        passedRules: 8,
        failedRules: 3,
        notEvaluatedRules: 1,
        requiredRulesPassed: 6,
        requiredRulesTotal: 8,
        overallConfidence: 0.82,
        evaluationTimestamp: new Date().toISOString(),
      },
      evaluations: [
        {
          ruleId: 'CLABSI-001',
          ruleName: 'Central line present for >2 calendar days',
          category: 'device' as const,
          status: 'pass' as const,
          isRequired: true,
          description: "",
          confidence: 0.95,
          evaluatedAt: new Date().toISOString(),
          evidence: [
            {
              id: 'E001',
              type: 'SIGNAL',
              content: 'Central line insertion documented on Day 1',
              timestamp: '2024-01-15T08:30:00Z',
              strength: 'strong' as const,
            },
            {
              id: 'E002',
              type: 'EVENT',
              content: 'Line maintenance documented on Day 3',
              timestamp: '2024-01-17T14:20:00Z',
              strength: 'strong' as const,
            },
          ],
        },
        {
          ruleId: 'CLABSI-002',
          ruleName: 'Positive blood culture organism identified',
          category: 'lab' as const,
          status: 'pass' as const,
          isRequired: true,
          description: "",
          confidence: 0.98,
          evaluatedAt: new Date().toISOString(),
          evidence: [
            {
              id: 'E003',
              type: 'LAB',
              content: 'Blood culture positive for Staphylococcus aureus',
              timestamp: '2024-01-18T09:45:00Z',
              strength: 'strong' as const,
            },
          ],
        },
        {
          ruleId: 'CLABSI-003',
          ruleName: 'Symptoms (fever, chills, hypotension) present',
          category: 'clinical' as const,
          status: 'pass' as const,
          isRequired: true,
          description: "",
          confidence: 0.85,
          evaluatedAt: new Date().toISOString(),
          evidence: [
            {
              id: 'E004',
              type: 'NOTE',
              content: 'Temperature 39.2°C documented in nursing notes',
              timestamp: '2024-01-18T06:00:00Z',
              strength: 'strong' as const,
            },
            {
              id: 'E005',
              type: 'EVENT',
              content: 'Rigors observed and documented',
              timestamp: '2024-01-18T06:15:00Z',
              strength: 'moderate' as const,
            },
          ],
        },
        {
          ruleId: 'CLABSI-004',
          ruleName: 'Blood culture collected within infection window period',
          category: 'temporal' as const,
          status: 'pass' as const,
          isRequired: true,
          description: "",
          confidence: 0.92,
          evaluatedAt: new Date().toISOString(),
          evidence: [
            {
              id: 'E006',
              type: 'LAB',
              content: 'Blood culture collection date: Day 3',
              timestamp: '2024-01-18T08:30:00Z',
              strength: 'strong' as const,
            },
          ],
        },
        {
          ruleId: 'CLABSI-005',
          ruleName: 'No alternate source of infection identified',
          category: 'exclusion' as const,
          status: 'fail' as const,
          isRequired: true,
          description: "",
          confidence: 0.65,
          evaluatedAt: new Date().toISOString(),
          evidence: [
            {
              id: 'E007',
              type: 'NOTE',
              content: 'Possible pneumonia mentioned in progress note',
              timestamp: '2024-01-17T15:30:00Z',
              strength: 'moderate' as const,
            },
          ],
        },
        {
          ruleId: 'CLABSI-006',
          ruleName: 'Same organism in blood and catheter tip',
          category: 'lab' as const,
          status: 'pass' as const,
          isRequired: false,
          description: "",
          confidence: 0.88,
          evaluatedAt: new Date().toISOString(),
          evidence: [
            {
              id: 'E008',
              type: 'LAB',
              content: 'Catheter tip culture: Staphylococcus aureus',
              timestamp: '2024-01-19T10:00:00Z',
              strength: 'strong' as const,
            },
          ],
        },
        {
          ruleId: 'CLABSI-007',
          ruleName: 'Antibiotic therapy initiated',
          category: 'clinical' as const,
          status: 'pass' as const,
          isRequired: false,
          description: "",
          confidence: 0.95,
          evaluatedAt: new Date().toISOString(),
          evidence: [
            {
              id: 'E009',
              type: 'EVENT',
              content: 'Vancomycin started 01/18 10:00',
              timestamp: '2024-01-18T10:00:00Z',
              strength: 'strong' as const,
            },
          ],
        },
        {
          ruleId: 'CLABSI-008',
          ruleName: 'Patient not immunocompromised',
          category: 'exclusion' as const,
          status: 'fail' as const,
          isRequired: false,
          description: "",
          confidence: 0.72,
          evaluatedAt: new Date().toISOString(),
          evidence: [
            {
              id: 'E010',
              type: 'NOTE',
              content: 'Patient on immunosuppressants for transplant',
              timestamp: '2024-01-15T09:00:00Z',
              strength: 'weak' as const,
            },
          ],
        },
        {
          ruleId: 'CLABSI-009',
          ruleName: 'Blood culture not a common skin contaminant',
          category: 'lab' as const,
          status: 'pass' as const,
          isRequired: true,
          description: "",
          confidence: 0.99,
          evaluatedAt: new Date().toISOString(),
          evidence: [
            {
              id: 'E011',
              type: 'RULE',
              content: 'Staphylococcus aureus is not a skin contaminant',
              timestamp: '2024-01-18T09:45:00Z',
              strength: 'strong' as const,
            },
          ],
        },
        {
          ruleId: 'CLABSI-010',
          ruleName: 'Central line removed or replaced',
          category: 'device' as const,
          status: 'pass' as const,
          isRequired: false,
          description: "",
          confidence: 0.87,
          evaluatedAt: new Date().toISOString(),
          evidence: [
            {
              id: 'E012',
              type: 'EVENT',
              content: 'Central line removed on Day 4',
              timestamp: '2024-01-19T11:30:00Z',
              strength: 'strong' as const,
            },
          ],
        },
        {
          ruleId: 'CLABSI-011',
          ruleName: 'Patient admitted for >48 hours',
          category: 'temporal' as const,
          status: 'pass' as const,
          isRequired: true,
          description: "",
          confidence: 0.98,
          evaluatedAt: new Date().toISOString(),
          evidence: [
            {
              id: 'E013',
              type: 'EVENT',
              content: 'Admission date: 3 days before infection',
              timestamp: '2024-01-15T14:00:00Z',
              strength: 'strong' as const,
            },
          ],
        },
        {
          ruleId: 'CLABSI-012',
          ruleName: 'No pre-existing bacteremia documented',
          category: 'exclusion' as const,
          status: 'not_evaluated' as const,
          isRequired: false,
          description: "",
          confidence: 0.0,
          evaluatedAt: new Date().toISOString(),
          evidence: [],
        },
      ],
    };
  };

  if (loading) {
    return (
      <div className="rule-evaluation-page">
        <div className="loading">Loading rule evaluation...</div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="rule-evaluation-page">
        <div className="error">
          {error || 'Case not found'}
          <button onClick={() => navigate('/')}>Back to Cases</button>
        </div>
      </div>
    );
  }

  const ruleData = getRuleEvaluationData();

  if (!ruleData) {
    return (
      <div className="rule-evaluation-page">
        <div className="error">
          Rule evaluation data not available
          <button onClick={() => navigate(`/case/${patientId}`)}>Back to Case</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rule-evaluation-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate(`/case/${patientId}`)}>
          ← Back to Case
        </button>
        <div className="header-content">
          <h1>{config.domain_name} Rule Evaluation</h1>
          <p className="patient-info">
            Patient: {caseData.case_info.name} ({caseData.case_info.patient_id})
          </p>
        </div>
      </div>

      <div className="rule-evaluation-content">
        <RuleEvaluationVisualizer data={ruleData} />
      </div>
    </div>
  );
};

export default RuleEvaluationPage;
