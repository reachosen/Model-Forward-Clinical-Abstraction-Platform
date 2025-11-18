"use client";

import { Sparkles, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { SignalGroup, TimelinePhase } from "@/types/case";

interface SignalsPanelProps {
  signalGroups: SignalGroup[];
  timelinePhases?: TimelinePhase[];
}

export function SignalsPanel({ signalGroups, timelinePhases }: SignalsPanelProps) {
  return (
    <div className="space-y-4">
      {signalGroups.map((group, index) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">{group.signal_type}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  Confidence: {(group.group_confidence * 100).toFixed(0)}%
                </Badge>
                <Badge variant="secondary">
                  {group.signals.length} signals
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-3">
              {group.signals.map((signal) => {
                const phase = timelinePhases?.find(p => {
                  const signalDate = new Date(signal.timestamp);
                  return signalDate >= new Date(p.start_date) && signalDate <= new Date(p.end_date);
                });

                return (
                  <div
                    key={signal.signal_id}
                    className="rounded-md border bg-card p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{signal.signal_name}</span>
                          {phase && (
                            <Badge variant="outline" className="text-xs">
                              {phase.phase_name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {typeof signal.value === 'object'
                            ? JSON.stringify(signal.value)
                            : String(signal.value)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">
                          {new Date(signal.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Progress value={signal.confidence * 100} className="h-1 flex-1" />
                      <span className="text-xs text-muted-foreground">
                        {(signal.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
