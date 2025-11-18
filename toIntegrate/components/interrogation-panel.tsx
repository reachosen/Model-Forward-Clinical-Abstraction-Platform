"use client";

import { MessageCircle, Lightbulb, CheckCircle, FileQuestion } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import type { QAHistoryItem } from "@/types/case";

interface InterrogationPanelProps {
  qaHistory: QAHistoryItem[];
}

export function InterrogationPanel({ qaHistory }: InterrogationPanelProps) {
  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'explain':
        return <Lightbulb className="h-4 w-4" />;
      case 'validate':
        return <CheckCircle className="h-4 w-4" />;
      case 'summarize':
        return <FileQuestion className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (qaHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Q&A History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No questions asked yet. Use "Ask the Case" to start.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Q&A History</CardTitle>
          <Badge variant="secondary">{qaHistory.length} interactions</Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {qaHistory.map((qa, index) => (
            <div key={qa.qa_id}>
              <div className="space-y-3">
                {/* Question */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getModeIcon(qa.interrogation_context.mode)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm">{qa.question}</p>
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {qa.interrogation_context.mode}
                      </Badge>
                    </div>
                    
                    {qa.interrogation_context.target_type !== 'overall' && (
                      <Badge variant="secondary" className="text-xs">
                        Target: {qa.interrogation_context.target_type} - {qa.interrogation_context.target_id}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Answer */}
                <div className="ml-7 rounded-md bg-muted/50 p-3 space-y-2">
                  <p className="text-sm leading-relaxed text-foreground">{qa.answer}</p>
                  
                  {qa.citations && qa.citations.length > 0 && (
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      <span className="font-medium">Citations:</span> {qa.citations.length} sources
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span>{formatTimestamp(qa.timestamp)}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={qa.confidence * 100} className="h-1 w-16" />
                      <span>{(qa.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {index < qaHistory.length - 1 && <Separator className="my-4" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
