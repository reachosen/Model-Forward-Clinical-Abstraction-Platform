export type MissionGroup =
  | 'Full-Stack Development'
  | 'Single Plan Generation'
  | 'RPI  Research + Plan + Implement'
  | 'Fast Draft Generation'
  | 'Batch Metrics & Pipelines'
  | 'Learning Loop & Plan Revision'
  | 'Prompt Flywheel Optimization'
  | 'Testing, QA, and End-to-End Validation'
  | 'Utilities & Maintenance'
  | 'Other';

export interface Mission {
  id: string;
  title: string;
  group: MissionGroup;
  purpose: string;
  description?: string[];
  command: string;
  args: string[];
  recommended?: boolean;
  stale?: boolean;
  lastVerified?: string;
  notes?: string;
  samples?: MissionSample[];
}

export interface MissionSample {
  id: string;
  title: string;
  args: string[];
}

export const GROUP_DESCRIPTIONS: Record<MissionGroup, string> = {
  'Full-Stack Development': 'Run backend and frontend together for active dev.',
  'Single Plan Generation': 'Generate or validate a single HAC/USNWR plan.',
  'RPI  Research + Plan + Implement': 'High-fidelity, provenance-rich planning pipeline.',
  'Fast Draft Generation': 'Quick plans without heavy research; good for prototyping.',
  'Batch Metrics & Pipelines': 'Run many metrics or plans in one go for regression or bulk processing.',
  'Learning Loop & Plan Revision': 'Improve rejected configs and revise existing plans.',
  'Prompt Flywheel Optimization': 'Optimize prompts against Golden Sets and evaluation suites.',
  'Testing, QA, and End-to-End Validation': 'Health checks: unit, integration, and full E2E pipelines.',
  'Utilities & Maintenance': 'Cleanups, diagnostics, utilities not part of main flows.',
  Other: 'Missions that do not fit other groups yet.',
};

export const MISSIONS: Mission[] = [
  {
    id: 'app:start',
    title: 'Run Full Stack (Backend + Frontend)',
    group: 'Full-Stack Development',
    purpose: 'Start backend (uvicorn) and React frontend together for active development.',
    description: [
      'Runs root npm start which launches backend and frontend via concurrently.',
      'Backend served at http://localhost:8000 with reload.',
      'Frontend served at http://localhost:3000.',
      'Works from clinical-planner-cli via --prefix to root.',
    ],
    command: 'npm',
    args: ['--prefix', '..', 'start'],
    recommended: true,
    lastVerified: '2025-12-07',
    notes: 'Runs root-level script; ensure Python venv and frontend deps are installed.',
  },
  {
    id: 'app:full-e2e',
    title: 'Run Full E2E (Backend + Frontend Tests)',
    group: 'Testing, QA, and End-to-End Validation',
    purpose: 'Start backend/frontend, run pytest and Playwright, then clean up.',
    description: [
      'Starts backend in demo mode and waits for health.',
      'Starts React dev server and waits for readiness.',
      'Runs backend pytest e2e_demo_test and Playwright tests.',
      'Cleans up background processes and ports 8000/3000.',
    ],
    command: 'bash',
    args: ['../scripts/run_full_e2e.sh'],
    recommended: true,
    lastVerified: '2025-12-07',
    notes: 'Requires bash and curl; intended for Unix-like environments.',
  },
  {
    id: 'planner:rpi',
    title: 'Generate an RPI Plan (Full Provenance)',
    group: 'RPI  Research + Plan + Implement',
    purpose: 'Run the Research-Plan-Implement pipeline with research, planning, and quality.',
    description: [
      'Fetches research (cache-aware) and generates plan with provenance.',
      'Requires concern and domain inputs; outputs artifacts to a directory.',
      'Uses OpenAI if API key provided, otherwise mock mode.',
    ],
    command: 'npm',
    args: ['run', 'planner', '--', 'rpi', '--concern', 'CLABSI', '--domain', 'picu', '--output-dir', './output/clabsi-picu'],
    recommended: true,
    lastVerified: '2025-12-07',
  },
  {
    id: 'plan:cli',
    title: 'Single Plan Generator / Validator',
    group: 'Single Plan Generation',
    purpose: 'Generate or validate a single HAC/USNWR plan from JSON input.',
    description: [
      'Supports mock mode if no API key is present.',
      'Use --validate-only for schema/business rule validation without generation.',
      'Supports custom output directory.',
    ],
    command: 'npx',
    args: ['ts-node', 'bin/planner.ts', 'generate', '--concern', 'CLABSI', '--domain', 'picu', '--output', './output/plan_clabsi.json'],
    recommended: true,
    lastVerified: '2025-12-07',
    notes: 'Requires OPENAI_API_KEY; pipeline does not support mock mode on S5.',
    samples: [
      {
        id: 'clabsi',
        title: 'HAC - CLABSI (PICU)',
        args: ['ts-node', 'bin/planner.ts', 'generate', '--concern', 'CLABSI', '--domain', 'picu', '--output', './output/plan_clabsi.json'],
      },
      {
        id: 'vap',
        title: 'HAC - VAP (PICU)',
        args: ['ts-node', 'bin/planner.ts', 'generate', '--concern', 'VAP', '--domain', 'picu', '--output', './output/plan_vap.json'],
      },
      {
        id: 'usnwr-i25',
        title: 'USNWR - I25 (Ortho)',
        args: ['ts-node', 'bin/planner.ts', 'generate', '--concern', 'I25', '--domain', 'orthopedics', '--output', './output/plan_i25.json'],
      },
    ],
  },
  {
    id: 'batch:interactive',
    title: 'Interactive Batch Runner (S0-S6)',
    group: 'Batch Metrics & Pipelines',
    purpose: 'Run multiple metrics through the CPPO pipeline via an interactive menu.',
    description: [
      'Supports single metric, batch metrics, or all metrics in a domain.',
      'Shows stage-by-stage progress and saves outputs to batch-runs.',
    ],
    command: 'npm',
    args: ['run', 'batch'],
    recommended: true,
    lastVerified: '2025-12-07',
  },
  {
    id: 'flywheel:loop',
    title: 'Prompt Optimization Loop',
    group: 'Prompt Flywheel Optimization',
    purpose: 'Resume prompt optimization against the Golden Set.',
    description: [
      'Optimizes I25 prompt variants and logs scores.',
      'Reads/writes flywheel datasets and reports.',
    ],
    command: 'npx',
    args: ['ts-node', 'flywheel/optimizer/loop.ts'],
    recommended: true,
    lastVerified: '2025-12-07',
  },
  {
    id: 'learning:run',
    title: 'Process Learning Queue',
    group: 'Learning Loop & Plan Revision',
    purpose: 'Process learning queue items to propose patches (mock today).',
    command: 'npm',
    args: ['run', 'learn'],
    lastVerified: '2025-12-07',
    notes: 'LLM mode planned; mock mode currently active per docs.',
  },
  {
    id: 'revise',
    title: 'Revise Existing Plan',
    group: 'Learning Loop & Plan Revision',
    purpose: 'Revise sections of an existing plan with revision agent.',
    description: [
      'Supports signals, questions, rules, phases, prompt, or full modes.',
      'Outputs revised plan JSON alongside original.',
    ],
    command: 'npm',
    args: ['run', 'revise', '--', '<plan_file>', '--type', '<type>', '--remark', '"<text>"'],
    lastVerified: '2025-12-07',
  },
  {
    id: 'tests:combo',
    title: 'Planner Integration Suite',
    group: 'Testing, QA, and End-to-End Validation',
    purpose: 'Run RPI workflow integration and S6 sufficiency tests.',
    command: 'npm',
    args: ['run', 'test'],
    lastVerified: '2025-12-07',
  },
  {
    id: 'test:gates',
    title: 'Gate Tests (S0-S4)',
    group: 'Testing, QA, and End-to-End Validation',
    purpose: 'Run pipeline gate checks without LLM (faster structural validation).',
    command: 'npm',
    args: ['run', 'test:gates'],
    lastVerified: '2025-12-08',
    samples: [
      { id: 'default', title: 'Default gate suite', args: ['run', 'test:gates'] },
    ],
  },
  {
    id: 'test:full',
    title: 'Full Pipeline Test (S0-S6)',
    group: 'Testing, QA, and End-to-End Validation',
    purpose: 'Run the full S0-S6 pipeline including LLM calls.',
    command: 'npm',
    args: ['run', 'test:full'],
    lastVerified: '2025-12-08',
    samples: [
      { id: 'default', title: 'Complete S0-S6 test suite', args: ['run', 'test:full'] },
    ],
  },
  {
    id: 'test:semantic',
    title: 'Config-Driven Semantic Contracts',
    group: 'Testing, QA, and End-to-End Validation',
    purpose: 'Validate per-archetype, cross-archetype, and metric-level contracts from config.',
    command: 'npm',
    args: ['run', 'test:semantic'],
    lastVerified: '2025-12-08',
  },
  {
    id: 'app:test-backend',
    title: 'Backend Tests',
    group: 'Testing, QA, and End-to-End Validation',
    purpose: 'Run backend pytest suite from repo root.',
    command: 'npm',
    args: ['--prefix', '..', 'run', 'test:backend'],
    lastVerified: '2025-12-07',
  },
  {
    id: 'app:test-frontend',
    title: 'Frontend Tests',
    group: 'Testing, QA, and End-to-End Validation',
    purpose: 'Run React test suite from repo root.',
    command: 'npm',
    args: ['--prefix', '..', 'run', 'test:frontend'],
    lastVerified: '2025-12-07',
  },
];
