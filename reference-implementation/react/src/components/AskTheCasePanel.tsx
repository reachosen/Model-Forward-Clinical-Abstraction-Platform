/**
 * AskTheCasePanel - Latest from Vercel (Nov 18 00:07)
 * Interactive panel for asking questions about the case
 */

import React, { useState } from 'react';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import './AskTheCasePanel.css';

interface AskTheCasePanelProps {
  caseId: string;
  qaHistoryCount: number;
  onQuestionSubmit: (question: string, mode: string, targetType: string) => Promise<void>;
}

export function AskTheCasePanel({ caseId, qaHistoryCount, onQuestionSubmit }: AskTheCasePanelProps) {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<"explain" | "summarize" | "validate">("explain");
  const [targetType, setTargetType] = useState<"criterion" | "signal" | "event" | "overall">("overall");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onQuestionSubmit(question, mode, targetType);
      setQuestion("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="ask-panel-card">
      <div className="ask-panel-header">
        <div className="ask-header-row">
          <div className="ask-header-left">
            <MessageSquare className="ask-icon" />
            <h3 className="ask-title">Ask the Case</h3>
          </div>
          {qaHistoryCount > 0 && (
            <Badge variant="secondary">
              {qaHistoryCount} previous Q&A
            </Badge>
          )}
        </div>
        <p className="ask-description">
          Ask questions about criteria, signals, timeline, or overall case assessment
        </p>
      </div>

      <div className="ask-panel-body">
        <form onSubmit={handleSubmit} className="ask-form">
          <div className="ask-controls-grid">
            <div className="ask-control">
              <label className="ask-label">Question Mode</label>
              <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="explain">Explain</SelectItem>
                  <SelectItem value="summarize">Summarize</SelectItem>
                  <SelectItem value="validate">Validate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="ask-control">
              <label className="ask-label">Target</label>
              <Select value={targetType} onValueChange={(v: any) => setTargetType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overall">Overall Case</SelectItem>
                  <SelectItem value="criterion">Specific Criterion</SelectItem>
                  <SelectItem value="signal">Specific Signal</SelectItem>
                  <SelectItem value="event">Specific Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="ask-question-section">
            <label className="ask-label">Your Question</label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Why was the patient determined to meet CLABSI criteria?"
              className="ask-textarea"
              disabled={isSubmitting}
            />
          </div>

          <Button type="submit" className="ask-submit-button" disabled={!question.trim() || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="submit-icon submit-icon-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="submit-icon" />
                Submit Question
              </>
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}
