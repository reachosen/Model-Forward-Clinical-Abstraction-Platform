"use client";

import { Sparkles, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { EnrichmentSummary } from "@/types/case";

interface EnrichmentSummaryPanelProps {
  summary: EnrichmentSummary;
}

export function EnrichmentSummaryPanel({ summary }: EnrichmentSummaryPanelProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>Enrichment Summary</CardTitle>
        </div>
        <CardDescription>
          What enrichment identified from the clinical data
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary statistics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Signals Identified</p>
            <p className="text-2xl font-bold">{summary.signals_identified}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Signal Groups</p>
            <p className="text-2xl font-bold">{summary.signal_groups_count}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Timeline Phases</p>
            <p className="text-2xl font-bold">{summary.timeline_phases_identified}</p>
          </div>
        </div>

        {/* Confidence indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Confidence</span>
            <span className="text-sm text-muted-foreground">
              {(summary.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <Progress value={summary.confidence * 100} className="h-2" />
        </div>

        {/* Key findings */}
        {summary.key_findings.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Key Findings</span>
            </div>
            
            <ul className="space-y-2">
              {summary.key_findings.map((finding, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Badge variant="outline" className="mt-0.5 flex-shrink-0">
                    {index + 1}
                  </Badge>
                  <span className="text-foreground">{finding}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
