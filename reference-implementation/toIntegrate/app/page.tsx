'use client';

import { AskTheCasePanel } from '@/components/ask-case-panel';
import {
  sampleSuggestedQuestions,
  mockAskQuestion,
} from '@/lib/sample-data';

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Ask the Case Panel Demo
          </h1>
          <p className="text-muted-foreground">
            Interactive Q&A interface for interrogating AI reasoning in CLABSI
            detection. Try asking questions or click the suggested questions
            below.
          </p>
        </div>

        <AskTheCasePanel
          patientId="PAT001"
          encounterId="ENC001"
          suggestedQuestions={sampleSuggestedQuestions}
          onAskQuestion={mockAskQuestion}
        />

        <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
          <h3 className="text-sm font-semibold mb-2 text-foreground">
            Demo Features:
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Natural language question input with character counter</li>
            <li>
              Suggested questions to get started (appear when no conversation)
            </li>
            <li>Conversation history with timestamps</li>
            <li>Evidence citations with relevance scores (expandable)</li>
            <li>Confidence indicators with visual progress bars</li>
            <li>Follow-up question suggestions</li>
            <li>
              Persistent conversation storage (saved to localStorage)
            </li>
            <li>Clear All functionality to reset conversation</li>
            <li>Responsive design for mobile, tablet, and desktop</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
