'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { ConfidenceIndicator } from './confidence-indicator';
import { CitationCard } from './citation-card';
import {
  AskTheCasePanelProps,
  ConversationEntry,
  QuestionResponse,
} from '@/types/ask-case';

export function AskTheCasePanel({
  patientId,
  encounterId,
  suggestedQuestions,
  onAskQuestion,
}: AskTheCasePanelProps) {
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
        console.error('[v0] Failed to parse saved conversation:', e);
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
      console.error('[v0] Failed to get response:', error);
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
    if (
      confirm('Are you sure? This will clear all Q&A history.')
    ) {
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
    console.log('[v0] View source:', citationId);
    // In a real app, this would navigate or highlight the source
  };

  return (
    <Card className="flex flex-col h-full max-h-[calc(100vh-200px)] border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold text-foreground">
          Ask the Case
        </h2>
        {conversation.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {/* Input Area */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💬</span>
            <span className="text-sm font-medium text-foreground">
              What would you like to know?
            </span>
          </div>
          <div className="flex gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your question here..."
              className="flex-1"
              maxLength={500}
              disabled={isLoading}
            />
            <Button
              onClick={handleSendQuestion}
              disabled={!question.trim() || isLoading}
              className="px-4"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Send
                </>
              )}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground text-right mt-1">
            {question.length}/500
          </div>
        </div>

        {/* Suggested Questions */}
        {conversation.length === 0 && suggestedQuestions.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📌</span>
              <span className="text-sm font-medium text-foreground">
                Suggested Questions
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((sq, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedQuestion(sq)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 border border-border rounded-full text-sm transition-colors"
                >
                  {sq}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation History */}
        {conversation.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💬</span>
              <span className="text-sm font-medium text-foreground">
                Conversation History
              </span>
            </div>

            <div className="space-y-4">
              {conversation.map((entry) => {
                const citationsExpanded = expandedCitations.has(entry.id);
                const citationCount = entry.response.evidence_citations.length;

                return (
                  <div key={entry.id} className="space-y-2">
                    {/* Question */}
                    <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-l-blue-500 p-3 rounded">
                      <div className="font-medium text-foreground">
                        Q: {entry.question}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </div>
                    </div>

                    {/* Answer */}
                    <div className="bg-card border border-border rounded-lg p-4">
                      <div className="text-foreground whitespace-pre-wrap leading-relaxed mb-4">
                        {entry.response.answer}
                      </div>

                      {/* Evidence Citations */}
                      {citationCount > 0 && (
                        <div className="mb-4">
                          <button
                            onClick={() => toggleCitations(entry.id)}
                            className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                          >
                            <span>📎</span>
                            <span>Evidence ({citationCount})</span>
                            {citationsExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>

                          {citationsExpanded && (
                            <div className="mt-3 space-y-2">
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
                      <div className="mb-4 pb-4 border-b border-border">
                        <ConfidenceIndicator
                          confidence={entry.response.confidence}
                        />
                      </div>

                      {/* Follow-up Suggestions */}
                      {entry.response.follow_up_suggestions.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-foreground">
                              🔍 Follow-up:
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {entry.response.follow_up_suggestions.map(
                              (followUp, idx) => (
                                <button
                                  key={idx}
                                  onClick={() =>
                                    handleFollowUpQuestion(followUp)
                                  }
                                  className="text-xs px-3 py-1.5 bg-accent hover:bg-accent/80 text-accent-foreground rounded-full border border-border transition-colors"
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
      </ScrollArea>
    </Card>
  );
}
