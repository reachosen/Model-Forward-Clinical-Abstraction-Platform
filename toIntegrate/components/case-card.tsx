import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, Circle } from 'lucide-react';
import type { CaseSummary } from "@/types/case";

interface CaseCardProps {
  caseSummary: CaseSummary;
}

function getTaskStateDisplay(stage: string, status: string, version: string) {
  const icons = {
    completed: <CheckCircle className="h-4 w-4" />,
    in_progress: <Clock className="h-4 w-4" />,
    failed: <XCircle className="h-4 w-4" />,
    pending: <Circle className="h-4 w-4" />
  };

  const variants = {
    completed: "default" as const,
    in_progress: "secondary" as const,
    failed: "destructive" as const,
    pending: "outline" as const
  };

  const labels = {
    context: "Context Ready",
    enrichment: `Enriched ${version}`,
    abstraction: `Reviewed ${version}`,
    feedback: "Feedback Complete"
  };

  return (
    <Badge variant={variants[status as keyof typeof variants] || "outline"} className="flex items-center gap-1">
      {icons[status as keyof typeof icons]}
      <span>{labels[stage as keyof typeof labels] || stage}</span>
    </Badge>
  );
}

function getRiskBadge(risk?: string) {
  if (!risk) return null;
  
  const variants = {
    high: "destructive" as const,
    medium: "secondary" as const,
    low: "outline" as const
  };
  
  return (
    <Badge variant={variants[risk as keyof typeof variants]}>
      {risk.toUpperCase()} RISK
    </Badge>
  );
}

export function CaseCard({ caseSummary }: CaseCardProps) {
  return (
    <Link href={`/case/${caseSummary.case_id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-lg mb-1">
                Case {caseSummary.case_id}
              </CardTitle>
              <CardDescription className="text-sm">
                {caseSummary.patient_summary}
              </CardDescription>
            </div>
            {getRiskBadge(caseSummary.risk_level)}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {getTaskStateDisplay(
              caseSummary.latest_task_state.stage,
              caseSummary.latest_task_state.status,
              caseSummary.latest_task_state.version
            )}
            
            {caseSummary.flags && caseSummary.flags.map((flag) => (
              <Badge key={flag} variant="outline" className="text-xs">
                {flag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
