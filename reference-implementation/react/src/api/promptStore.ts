/**
 * Prompt Store API - Mock data for Phase 1 (Read-Only)
 * Provides mock data for concerns, tasks, and prompt versions
 */

import { ConcernDefinition, TaskDefinition, PromptVersion } from '../types';

// Mock prompt versions for CLABSI Enrichment
const clabsiEnrichmentVersions: PromptVersion[] = [
  {
    version_id: 'v1.0',
    status: 'stable',
    created_at: '2024-01-15T00:00:00Z',
    is_active: true,
    system_prompt: `You are a clinical abstraction expert specializing in CLABSI (Central Line-Associated Bloodstream Infection) surveillance.

Your role is to analyze patient clinical data and identify signals relevant to CLABSI determination according to NHSN criteria.

Focus on:
- Central line device information (insertion date, type, site)
- Blood culture results and organisms
- Clinical signs of infection (fever, hypotension, etc.)
- Temporal relationships between events
- Alternative sources of infection`,
    task_specific_additions: `Enrichment-specific instructions:
1. Extract all device-related events
2. Identify laboratory results (blood cultures, WBC counts)
3. Map clinical signs and symptoms to timeline
4. Group signals by type (DEVICE, LAB, VITAL, CLINICAL)
5. Assign confidence scores to each signal`,
    changelog: 'Initial CLABSI enrichment prompt with NHSN criteria focus',
    cases_run: 247,
    last_used_at: '2025-01-17T14:30:00Z',
    performance_metrics: {
      avg_confidence: 0.89,
      avg_latency_ms: 4200,
      avg_tokens: 3500,
      success_rate: 0.96
    }
  },
  {
    version_id: 'v1.1',
    status: 'experimental',
    created_at: '2025-01-10T00:00:00Z',
    is_active: false,
    system_prompt: `You are a clinical abstraction expert specializing in CLABSI (Central Line-Associated Bloodstream Infection) surveillance with enhanced temporal reasoning capabilities.

Your role is to analyze patient clinical data and identify signals relevant to CLABSI determination according to NHSN criteria, with particular attention to temporal relationships and infection timelines.

Focus on:
- Central line device information (insertion date, type, site)
- Blood culture results and organisms
- Clinical signs of infection (fever, hypotension, etc.)
- **Temporal relationships and infection windows**
- **Timeline phase identification (pre-infection, symptom onset, confirmation)**
- Alternative sources of infection`,
    task_specific_additions: `Enrichment-specific instructions:
1. Extract all device-related events with precise timestamps
2. Identify laboratory results (blood cultures, WBC counts) with collection times
3. Map clinical signs and symptoms to timeline with temporal context
4. Group signals by type AND temporal phase
5. Identify infection windows and critical periods
6. Assign confidence scores considering temporal alignment`,
    changelog: 'Added temporal reasoning enhancements and infection window detection. Improved timeline phase identification.',
    cases_run: 32,
    last_used_at: '2025-01-18T09:15:00Z',
    performance_metrics: {
      avg_confidence: 0.92,
      avg_latency_ms: 5100,
      avg_tokens: 4200,
      success_rate: 0.94
    }
  }
];

// Mock prompt versions for CLABSI Abstraction
const clabsiAbstractionVersions: PromptVersion[] = [
  {
    version_id: 'v1.0',
    status: 'stable',
    created_at: '2024-01-15T00:00:00Z',
    is_active: true,
    system_prompt: `You are a clinical abstraction expert specializing in CLABSI determination according to NHSN criteria.

Your role is to review enriched clinical signals and make a final determination about whether a case meets CLABSI criteria.

Apply NHSN criteria systematically:
1. Central line present for >2 calendar days before event
2. Recognized pathogen identified in blood culture
3. No alternative source of bloodstream infection
4. Clinical signs of infection present
5. Matching organisms in central and peripheral cultures (if applicable)`,
    task_specific_additions: `Abstraction-specific instructions:
1. Review enrichment signals and timeline
2. Evaluate each NHSN criterion systematically
3. Provide evidence for each criterion determination
4. Generate clinical narrative summarizing key findings
5. Assign overall confidence score
6. Support interactive Q&A for criterion validation`,
    changelog: 'Initial CLABSI abstraction prompt with systematic NHSN evaluation',
    cases_run: 198,
    last_used_at: '2025-01-17T16:45:00Z',
    performance_metrics: {
      avg_confidence: 0.92,
      avg_latency_ms: 6800,
      avg_tokens: 5200,
      success_rate: 0.98
    }
  },
  {
    version_id: 'v1.2',
    status: 'experimental',
    created_at: '2025-01-12T00:00:00Z',
    is_active: false,
    system_prompt: `You are a clinical abstraction expert specializing in CLABSI determination according to NHSN criteria with enhanced evidence tracing.

Your role is to review enriched clinical signals and make a final determination about whether a case meets CLABSI criteria, with detailed evidence chains for each decision.

Apply NHSN criteria systematically with evidence attribution:
1. Central line present for >2 calendar days before event
2. Recognized pathogen identified in blood culture
3. No alternative source of bloodstream infection
4. Clinical signs of infection present
5. Matching organisms in central and peripheral cultures (if applicable)

For each criterion, provide:
- Clear met/not met determination
- Specific evidence from enrichment layer
- Signal IDs supporting the determination
- Confidence level per criterion`,
    task_specific_additions: `Abstraction-specific instructions:
1. Review enrichment signals and timeline with signal ID tracking
2. Evaluate each NHSN criterion with evidence attribution
3. Link each criterion determination to specific signal IDs
4. Generate clinical narrative with evidence references
5. Provide per-criterion and overall confidence scores
6. Support interactive Q&A with signal-level citations
7. Identify gaps or ambiguities in evidence`,
    changelog: 'Enhanced evidence tracing and per-criterion confidence scoring. Added signal ID attribution.',
    cases_run: 18,
    last_used_at: '2025-01-18T11:20:00Z',
    performance_metrics: {
      avg_confidence: 0.94,
      avg_latency_ms: 7500,
      avg_tokens: 6100,
      success_rate: 0.97
    }
  }
];

// Mock prompt versions for CAUTI
const cautiEnrichmentVersions: PromptVersion[] = [
  {
    version_id: 'v1.0',
    status: 'stable',
    created_at: '2024-02-01T00:00:00Z',
    is_active: true,
    system_prompt: `You are a clinical abstraction expert specializing in CAUTI (Catheter-Associated Urinary Tract Infection) surveillance.

Your role is to analyze patient clinical data and identify signals relevant to CAUTI determination according to NHSN criteria.

Focus on:
- Urinary catheter device information (insertion date, type)
- Urine culture results and organisms
- Clinical signs of UTI (fever, dysuria, suprapubic tenderness)
- Catheter days at time of infection
- Alternative sources of infection`,
    changelog: 'Initial CAUTI enrichment prompt',
    cases_run: 89,
    last_used_at: '2025-01-16T10:30:00Z',
    performance_metrics: {
      avg_confidence: 0.87,
      avg_latency_ms: 3800,
      avg_tokens: 3200,
      success_rate: 0.95
    }
  }
];

const cautiAbstractionVersions: PromptVersion[] = [
  {
    version_id: 'v1.0',
    status: 'stable',
    created_at: '2024-02-01T00:00:00Z',
    is_active: true,
    system_prompt: `You are a clinical abstraction expert specializing in CAUTI determination according to NHSN criteria.

Apply NHSN CAUTI criteria:
1. Catheter in place for >2 calendar days before positive culture
2. Uropathogen identified with >100,000 CFU/mL OR <100,000 CFU with pyuria
3. Clinical signs present (fever, suprapubic tenderness, CVA tenderness, dysuria, urgency)
4. No alternative source of UTI`,
    changelog: 'Initial CAUTI abstraction prompt',
    cases_run: 67,
    last_used_at: '2025-01-15T14:20:00Z',
    performance_metrics: {
      avg_confidence: 0.88,
      avg_latency_ms: 5900,
      avg_tokens: 4800,
      success_rate: 0.96
    }
  }
];

// Mock prompt versions for SSI
const ssiEnrichmentVersions: PromptVersion[] = [
  {
    version_id: 'v1.0',
    status: 'stable',
    created_at: '2024-03-01T00:00:00Z',
    is_active: true,
    system_prompt: `You are a clinical abstraction expert specializing in SSI (Surgical Site Infection) surveillance.

Your role is to analyze patient clinical data and identify signals relevant to SSI determination according to NHSN criteria.

Focus on:
- Surgical procedure information (date, type, duration)
- Wound assessments and drainage characteristics
- Culture results from surgical site
- Clinical signs of infection (erythema, warmth, pain)
- Time relationship to surgery (within 30 days for superficial, 90 days for deep)`,
    changelog: 'Initial SSI enrichment prompt',
    cases_run: 54,
    last_used_at: '2025-01-14T09:45:00Z',
    performance_metrics: {
      avg_confidence: 0.85,
      avg_latency_ms: 4100,
      avg_tokens: 3400,
      success_rate: 0.93
    }
  }
];

const ssiAbstractionVersions: PromptVersion[] = [
  {
    version_id: 'v1.0',
    status: 'stable',
    created_at: '2024-03-01T00:00:00Z',
    is_active: true,
    system_prompt: `You are a clinical abstraction expert specializing in SSI determination according to NHSN criteria.

Apply NHSN SSI criteria:
1. Infection occurs within appropriate timeframe (30 days for superficial, 90 days for deep/organ-space)
2. Involves incision or organ/space manipulated during surgery
3. Meets specific criteria for superficial, deep, or organ-space SSI
4. Evidence of infection: purulent drainage, organism identification, signs/symptoms`,
    changelog: 'Initial SSI abstraction prompt',
    cases_run: 42,
    last_used_at: '2025-01-13T13:10:00Z',
    performance_metrics: {
      avg_confidence: 0.86,
      avg_latency_ms: 6200,
      avg_tokens: 5100,
      success_rate: 0.94
    }
  }
];

// Mock task definitions
const clabsiTasks: TaskDefinition[] = [
  {
    task_id: 'clabsi.enrichment',
    task_type: 'enrichment',
    concern_id: 'clabsi',
    description: 'Extract and structure clinical signals from raw CLABSI case data',
    execution_modes: ['batch', 'on_demand'],
    default_mode: 'batch',
    prompt_versions: clabsiEnrichmentVersions,
    active_version: 'v1.0',
    expected_inputs: ['patient_context', 'clinical_notes', 'lab_results', 'device_info'],
    expected_outputs: ['signal_groups', 'enrichment_summary', 'timeline_phases']
  },
  {
    task_id: 'clabsi.abstraction',
    task_type: 'abstraction',
    concern_id: 'clabsi',
    description: 'Evaluate NHSN CLABSI criteria and generate clinical determination',
    execution_modes: ['interactive', 'batch'],
    default_mode: 'interactive',
    prompt_versions: clabsiAbstractionVersions,
    active_version: 'v1.0',
    expected_inputs: ['enrichment_output', 'patient_context'],
    expected_outputs: ['clinical_narrative', 'criteria_evaluation', 'determination']
  }
];

const cautiTasks: TaskDefinition[] = [
  {
    task_id: 'cauti.enrichment',
    task_type: 'enrichment',
    concern_id: 'cauti',
    description: 'Extract and structure clinical signals from raw CAUTI case data',
    execution_modes: ['batch', 'on_demand'],
    default_mode: 'batch',
    prompt_versions: cautiEnrichmentVersions,
    active_version: 'v1.0',
    expected_inputs: ['patient_context', 'clinical_notes', 'urine_cultures', 'catheter_info'],
    expected_outputs: ['signal_groups', 'enrichment_summary', 'timeline_phases']
  },
  {
    task_id: 'cauti.abstraction',
    task_type: 'abstraction',
    concern_id: 'cauti',
    description: 'Evaluate NHSN CAUTI criteria and generate clinical determination',
    execution_modes: ['interactive', 'batch'],
    default_mode: 'interactive',
    prompt_versions: cautiAbstractionVersions,
    active_version: 'v1.0',
    expected_inputs: ['enrichment_output', 'patient_context'],
    expected_outputs: ['clinical_narrative', 'criteria_evaluation', 'determination']
  }
];

const ssiTasks: TaskDefinition[] = [
  {
    task_id: 'ssi.enrichment',
    task_type: 'enrichment',
    concern_id: 'ssi',
    description: 'Extract and structure clinical signals from raw SSI case data',
    execution_modes: ['batch', 'on_demand'],
    default_mode: 'batch',
    prompt_versions: ssiEnrichmentVersions,
    active_version: 'v1.0',
    expected_inputs: ['patient_context', 'surgical_info', 'wound_assessments', 'cultures'],
    expected_outputs: ['signal_groups', 'enrichment_summary', 'timeline_phases']
  },
  {
    task_id: 'ssi.abstraction',
    task_type: 'abstraction',
    concern_id: 'ssi',
    description: 'Evaluate NHSN SSI criteria and generate clinical determination',
    execution_modes: ['interactive', 'batch'],
    default_mode: 'interactive',
    prompt_versions: ssiAbstractionVersions,
    active_version: 'v1.0',
    expected_inputs: ['enrichment_output', 'patient_context'],
    expected_outputs: ['clinical_narrative', 'criteria_evaluation', 'determination']
  }
];

// Mock concern definitions
const mockConcerns: ConcernDefinition[] = [
  {
    concern_id: 'clabsi',
    display_name: 'CLABSI',
    description: 'Central Line-Associated Bloodstream Infection surveillance and abstraction',
    system_prompt: 'Base CLABSI system prompt defining NHSN criteria and infection control standards',
    tasks: clabsiTasks,
    total_versions: clabsiEnrichmentVersions.length + clabsiAbstractionVersions.length,
    total_cases_run: 445
  },
  {
    concern_id: 'cauti',
    display_name: 'CAUTI',
    description: 'Catheter-Associated Urinary Tract Infection surveillance',
    system_prompt: 'Base CAUTI system prompt defining NHSN criteria and catheter-related infection standards',
    tasks: cautiTasks,
    total_versions: cautiEnrichmentVersions.length + cautiAbstractionVersions.length,
    total_cases_run: 156
  },
  {
    concern_id: 'ssi',
    display_name: 'SSI',
    description: 'Surgical Site Infection surveillance and tracking',
    system_prompt: 'Base SSI system prompt defining NHSN criteria and surgical infection standards',
    tasks: ssiTasks,
    total_versions: ssiEnrichmentVersions.length + ssiAbstractionVersions.length,
    total_cases_run: 96
  }
];

// API functions
export const promptStoreAPI = {
  /**
   * Get all concerns with their tasks
   */
  async getConcerns(): Promise<ConcernDefinition[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockConcerns;
  },

  /**
   * Get a specific concern by ID
   */
  async getConcern(concernId: string): Promise<ConcernDefinition | null> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return mockConcerns.find(c => c.concern_id === concernId) || null;
  },

  /**
   * Get a specific task by ID
   */
  async getTask(taskId: string): Promise<TaskDefinition | null> {
    await new Promise(resolve => setTimeout(resolve, 50));
    for (const concern of mockConcerns) {
      const task = concern.tasks.find(t => t.task_id === taskId);
      if (task) return task;
    }
    return null;
  },

  /**
   * Get a specific prompt version
   */
  async getPromptVersion(taskId: string, versionId: string): Promise<PromptVersion | null> {
    await new Promise(resolve => setTimeout(resolve, 50));
    const task = await this.getTask(taskId);
    if (!task) return null;
    return task.prompt_versions.find(v => v.version_id === versionId) || null;
  }
};
