import { RuleEvaluationVisualizer } from '@/components/rule-evaluation-visualizer';
import { sampleRuleEvaluationData } from '@/lib/sample-data';

export default function Page() {
  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            NHSN Rule Evaluation Dashboard
          </h1>
          <p className="text-pretty text-muted-foreground md:text-lg">
            Review automated rule evaluations for healthcare-associated infection surveillance
          </p>
        </div>

        <RuleEvaluationVisualizer data={sampleRuleEvaluationData} />
      </div>
    </main>
  );
}
