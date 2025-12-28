export interface CampaignManifest {
  id: string;
  title: string;
  context: {
    definitions: string; // Path to metrics.json
    signals: string;     // Path to signals.json
  };
  scope: CampaignItem[];
  config?: {
    batchSize?: number;
    stopOnFailure?: boolean;
    scoringPolicy?: string; // Path to policy.json
  };
}

export interface CampaignItem {
  metricId: string;
  track: string; // e.g., "flywheel:standard"
  label?: string;
  // Overrides specific to this item
  config?: Record<string, any>;
}

export interface TrackDefinition {
  id: string;
  description: string;
  steps: TrackStep[];
}

export interface TrackStep {
  id: string;
  missionId: string; // Maps to tools/missions.ts
  name: string;
  // Arguments to inject into the mission command
  // Supports variable expansion: {{metricId}}, {{runDir}}, {{input_plan}}
  args: Record<string, string>;
  // Dependency: Where to look for the input artifact
  inputArtifact?: string; 
  // Output: What this step produces
  outputArtifact?: string;
  // Gate: If set, checks condition before proceeding
  gate?: {
    condition: 'PASS' | 'SCORE_GT';
    value?: number;
  };
}

export interface FlightContext {
  runId: string;
  campaignId: string;
  metricId: string;
  status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  currentStepIndex: number;
  
  // Paths to artifacts generated so far
  artifacts: {
    plan?: string;
    strategy?: string;
    testCases?: string;
    evalReport?: string;
    certified?: string;
    [key: string]: string | undefined;
  };

  // Step history
  history: {
    stepId: string;
    timestamp: string;
    status: 'SUCCESS' | 'FAILURE';
    output: string; // Path to output or console log snippet
  }[];
}
