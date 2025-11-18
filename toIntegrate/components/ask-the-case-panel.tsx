"use client";

import { useState } from "react";
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { QAHistoryItem } from "@/types/case";

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>Ask the Case</CardTitle>
          </div>
          {qaHistoryCount > 0 && (
            <Badge variant="secondary">
              {qaHistoryCount} previous Q&A
            </Badge>
          )}
        </div>
        <CardDescription>
          Ask questions about criteria, signals, timeline, or overall case assessment
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Question Mode</label>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Target</label>
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Your Question</label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Why was the patient determined to meet CLABSI criteria?"
              className="min-h-[150px]"
              disabled={isSubmitting}
            />
          </div>

          <Button type="submit" className="w-full" disabled={!question.trim() || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Question
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
