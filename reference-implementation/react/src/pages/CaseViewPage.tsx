/**
 * Case View Page
 * Main page for viewing and abstracting a CLABSI case
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { CaseView } from '../types';
import { useDomainConfig } from '../contexts/DomainConfigContext';

import CaseOverview from '../components/CaseOverview';
import CaseSummaryStrip from '../components/CaseSummaryStrip';
import EnhancedTimeline from '../components/EnhancedTimeline';
import SignalsPanel from '../components/SignalsPanel';
import QAPanel from '../components/QAPanel';
import AskTheCasePanel from '../components/AskTheCasePanel';
import FeedbackPanel from '../components/FeedbackPanel';

import './CaseViewPage.css';

const CaseViewPage: React.FC = () => {
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

  if (loading) {
    return (
      <div className="case-view-page">
        <div className="loading">Loading case...</div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="case-view-page">
        <div className="error">
          {error || 'Case not found'}
          <button onClick={() => navigate('/')}>Back to Cases</button>
        </div>
      </div>
    );
  }

  return (
    <div className="case-view-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Cases
        </button>
        <h1>{config.episode_label} - {caseData.case_info.name}</h1>
        <div className="mode-badge">{caseData.mode} Mode</div>
      </div>

      {/* 80/20 Summary Strip */}
      <CaseSummaryStrip
        summary={caseData.summary}
        signals={caseData.signals}
        qaAnswered={caseData.summary.unresolved_questions.filter(q => q.type === 'ANSWERED').length}
        qaTotal={caseData.summary.unresolved_questions.length}
      />

      <div className="case-grid">
        {/* Left column */}
        <div className="left-column">
          <div id="overview">
            <CaseOverview summary={caseData.summary} caseInfo={caseData.case_info} />
          </div>
          <div id="timeline">
            <EnhancedTimeline
              timeline={caseData.timeline}
              phaseConfig={config.timeline_phases}
            />
          </div>
        </div>

        {/* Middle column */}
        <div className="middle-column">
          <div id="signals">
            <SignalsPanel signals={caseData.signals} />
          </div>
          <div className="summary-panel panel">
            <h2>Generated Summary</h2>
            <div className="summary-sections">
              {caseData.summary.positive_findings.length > 0 && (
                <div className="summary-section">
                  <h3>Positive Findings</h3>
                  <ul>
                    {caseData.summary.positive_findings.map((finding, idx) => (
                      <li key={idx}>{finding}</li>
                    ))}
                  </ul>
                </div>
              )}

              {caseData.summary.recommended_actions.length > 0 && (
                <div className="summary-section">
                  <h3>Recommended Actions</h3>
                  <ul>
                    {caseData.summary.recommended_actions.map((action, idx) => (
                      <li key={idx}>→ {action}</li>
                    ))}
                  </ul>
                </div>
              )}

              {caseData.summary.unresolved_questions.length > 0 && (
                <div className="summary-section">
                  <h3>Unresolved Questions</h3>
                  <ul>
                    {caseData.summary.unresolved_questions.map((q, idx) => (
                      <li key={idx}>
                        <span className={`priority-${q.priority.toLowerCase()}`}>
                          [{q.priority}]
                        </span>{' '}
                        {q.question}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="right-column">
          <div id="qa">
            <QAPanel qaResult={caseData.qa_result} />
            <AskTheCasePanel
              patientId={caseData.summary.patient_id}
              encounterId={caseData.summary.encounter_id}
              suggestedQuestions={[
                'What evidence supports the CLABSI diagnosis?',
                'Are there any exclusion criteria present?',
                'When was the central line inserted?',
                'What organism was identified in blood culture?',
              ]}
              onAskQuestion={async (question) => {
                // In a real app, this would call the backend API
                console.log('Question asked:', question);
                return {
                  question,
                  answer: 'This is a sample answer. In a production system, this would be generated by the AI backend based on the case data and evidence.',
                  evidence_citations: [
                    {
                      citation_id: 'C001',
                      source_type: 'LAB' as const,
                      source_id: 'LAB-2024-001',
                      excerpt: 'Blood culture positive for Staphylococcus aureus',
                      timestamp: '2024-01-18T09:45:00Z',
                      relevance_score: 0.95,
                    },
                  ],
                  confidence: 0.85,
                  follow_up_suggestions: [
                    'What was the timeline of symptom onset?',
                    'Were there any complications?',
                  ],
                  timestamp: new Date().toISOString(),
                };
              }}
            />
          </div>
          <div id="feedback">
            <FeedbackPanel
              patientId={caseData.summary.patient_id}
              encounterId={caseData.summary.encounter_id}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseViewPage;
