/**
 * Case View Page
 * Main page for viewing and abstracting a CLABSI case
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { CaseView, StructuredCase } from '../types';
import { useDomainConfig } from '../contexts/DomainConfigContext';

import CaseOverview from '../components/CaseOverview';
import CaseSummaryStrip from '../components/CaseSummaryStrip';
import EnhancedTimeline from '../components/EnhancedTimeline';
import SignalsPanel from '../components/SignalsPanel';
import QAPanel from '../components/QAPanel';
import AskTheCasePanel from '../components/AskTheCasePanel';
import FeedbackPanel from '../components/FeedbackPanel';
import InterrogationPanel from '../components/InterrogationPanel';

import './CaseViewPage.css';

const CaseViewPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { config } = useDomainConfig();

  const [caseData, setCaseData] = useState<CaseView | null>(null);
  const [structuredCase, setStructuredCase] = useState<StructuredCase | null>(null);
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
      // Load structured case first
      const structured = await api.getStructuredCase('clabsi', patientId);
      setStructuredCase(structured);

      // Convert to CaseView for backward compatibility with existing components
      const data = api.convertStructuredToCaseView(structured);
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
            <SignalsPanel
              signals={caseData.signals}
              signalGroups={structuredCase?.enrichment?.signal_groups}
            />
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
            <InterrogationPanel qaSection={structuredCase?.qa} />
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
                // Call the real interrogation API
                try {
                  const taskId = structuredCase?.abstraction?.task_metadata?.task_id || 'clabsi.abstraction';
                  const qaEntry = await api.interrogateTask(
                    taskId,
                    question,
                    {
                      mode: 'explain',
                      target_type: 'overall',
                      target_id: 'case',
                      program_type: 'CLABSI',
                      metric_id: 'CLABSI',
                    }
                  );

                  // Convert QAHistoryEntry to AskResponse format
                  return {
                    question: qaEntry.question,
                    answer: qaEntry.answer,
                    evidence_citations: (qaEntry.citations || []).map((citation, idx) => ({
                      citation_id: `C${idx + 1}`,
                      source_type: 'NOTE' as const,
                      source_id: `${idx}`,
                      excerpt: citation,
                      timestamp: new Date().toISOString(),
                      relevance_score: 0.9,
                    })),
                    confidence: qaEntry.confidence || 0.85,
                    follow_up_suggestions: [],
                    timestamp: qaEntry.task_metadata?.executed_at || new Date().toISOString(),
                  };
                } catch (err) {
                  console.error('Error asking question:', err);
                  throw err;
                }
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
