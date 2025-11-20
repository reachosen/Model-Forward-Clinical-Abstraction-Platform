/**
 * Ask the Case Panel Component
 * Interactive Q&A with AI reasoning transparency
 * Adapted from Vercel v0.dev generation
 */

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Send, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import ConfidenceIndicator from './ConfidenceIndicator';
import CitationCard from './CitationCard';
import './AskTheCasePanel.css';

// TypeScript interfaces
export interface AskTheCasePanelProps {
  patientId: string;
  encounterId: string;
  suggestedQuestions: string[];
  onAskQuestion: (question: string) => Promise<QuestionResponse>;
}

export interface QuestionResponse {
  question: string;
  answer: string;
  evidence_citations: EvidenceCitation[];
  confidence: number; // 0-1
  follow_up_suggestions: string[];
  timestamp: string; // ISO format
}

export interface EvidenceCitation {
  citation_id: string;
  source_type: 'SIGNAL' | 'EVENT' | 'LAB' | 'NOTE' | 'RULE';
  source_id: string;
  excerpt: string;
  relevance_score: number; // 0-1
  timestamp?: string;
}

export interface ConversationEntry {
  id: string;
  question: string;
  response: QuestionResponse;
  timestamp: string;
}

const AskTheCasePanel: React.FC<AskTheCasePanelProps> = ({
  patientId,
  encounterId,
  suggestedQuestions,
  onAskQuestion,
}) => {
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(
    new Set()
  );
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  // Load conversation from localStorage
  useEffect(() => {
    const storageKey = `conversation_${patientId}_${encounterId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setConversation(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved conversation:', e);
      }
    }
  }, [patientId, encounterId]);

  // Save conversation to localStorage
  useEffect(() => {
    if (conversation.length > 0) {
      const storageKey = `conversation_${patientId}_${encounterId}`;
      localStorage.setItem(storageKey, JSON.stringify(conversation));
    }
  }, [conversation, patientId, encounterId]);

  // Scroll to bottom when new message added
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const handleSendQuestion = async () => {
    if (!question.trim() || isLoading) return;

    const trimmedQuestion = question.trim();
    setIsLoading(true);

    try {
      const response = await onAskQuestion(trimmedQuestion);

      const newEntry: ConversationEntry = {
        id: `conv_${Date.now()}`,
        question: trimmedQuestion,
        response,
        timestamp: new Date().toISOString(),
      };

      setConversation((prev) => [...prev, newEntry]);
      setQuestion('');
    } catch (error) {
      console.error('Failed to get response:', error);
      // You could add error handling UI here
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuestion();
    }
  };

  const handleSuggestedQuestion = (suggestedQ: string) => {
    setQuestion(suggestedQ);
  };

  const handleFollowUpQuestion = (followUp: string) => {
    setQuestion(followUp);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure? This will clear all Q&A history.')) {
      setConversation([]);
      const storageKey = `conversation_${patientId}_${encounterId}`;
      localStorage.removeItem(storageKey);
    }
  };

  const toggleCitations = (entryId: string) => {
    setExpandedCitations((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const handleViewSource = (citationId: string) => {
    console.log('View source:', citationId);
    // In a real app, this would navigate or highlight the source
  };

  return (
    <div className="ask-case-panel">
      {/* Header */}
      <div className="panel-header">
        <h2 className="panel-title">Ask the Case</h2>
        {conversation.length > 0 && (
          <button className="clear-button" onClick={handleClearAll}>
            <Trash2 className="icon" />
            Clear All
          </button>
        )}
      </div>

      <div className="panel-content" ref={scrollAreaRef}>
        {/* Input Area */}
        <div className="input-section">
          <div className="input-header">
            <span className="emoji">💬</span>
            <span className="input-label">What would you like to know?</span>
          </div>
          <div className="input-container">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your question here..."
              className="question-input"
              data-testid="llm-question-input"
              maxLength={500}
              disabled={isLoading}
            />
            <button
              onClick={handleSendQuestion}
              disabled={!question.trim() || isLoading}
              className="send-button"
              data-testid="llm-submit-button"
            >
              {isLoading ? (
                <Loader2 className="icon spinning" />
              ) : (
                <>
                  <Send className="icon" />
                  Send
                </>
              )}
            </button>
          </div>
          <div className="char-counter">
            {question.length}/500
          </div>
        </div>

        {/* Suggested Questions */}
        {conversation.length === 0 && suggestedQuestions.length > 0 && (
          <div className="suggested-section">
            <div className="section-header">
              <span className="emoji">📌</span>
              <span className="section-label">Suggested Questions</span>
            </div>
            <div className="suggested-questions">
              {suggestedQuestions.map((sq, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedQuestion(sq)}
                  className="suggested-question-pill"
                >
                  {sq}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation History */}
        {conversation.length > 0 && (
          <div className="conversation-section">
            <div className="section-header">
              <span className="emoji">💬</span>
              <span className="section-label">Conversation History</span>
            </div>

            <div className="conversation-list">
              {conversation.map((entry) => {
                const citationsExpanded = expandedCitations.has(entry.id);
                const citationCount = entry.response.evidence_citations.length;

                return (
                  <div key={entry.id} className="conversation-entry">
                    {/* Question */}
                    <div className="question-box">
                      <div className="question-text">Q: {entry.question}</div>
                      <div className="question-time">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </div>
                    </div>

                    {/* Answer */}
                    <div className="answer-box" data-testid="llm-response">
                      <div className="answer-text">{entry.response.answer}</div>

                      {/* Evidence Citations */}
                      {citationCount > 0 && (
                        <div className="citations-section">
                          <button
                            onClick={() => toggleCitations(entry.id)}
                            className="citations-toggle"
                          >
                            <span>📎</span>
                            <span>Evidence ({citationCount})</span>
                            {citationsExpanded ? (
                              <ChevronUp className="chevron-icon" />
                            ) : (
                              <ChevronDown className="chevron-icon" />
                            )}
                          </button>

                          {citationsExpanded && (
                            <div className="citations-list">
                              {entry.response.evidence_citations.map(
                                (citation) => (
                                  <CitationCard
                                    key={citation.citation_id}
                                    citation={citation}
                                    onViewSource={handleViewSource}
                                  />
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Confidence Indicator */}
                      <div className="confidence-section">
                        <ConfidenceIndicator
                          confidence={entry.response.confidence}
                        />
                      </div>

                      {/* Follow-up Suggestions */}
                      {entry.response.follow_up_suggestions.length > 0 && (
                        <div className="followup-section">
                          <div className="followup-header">
                            <span className="followup-label">🔍 Follow-up:</span>
                          </div>
                          <div className="followup-pills">
                            {entry.response.follow_up_suggestions.map(
                              (followUp, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleFollowUpQuestion(followUp)}
                                  className="followup-pill"
                                >
                                  {followUp}
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div ref={conversationEndRef} />
      </div>
    </div>
  );
};

export { AskTheCasePanel };
