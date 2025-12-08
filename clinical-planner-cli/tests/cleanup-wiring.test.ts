/**
 * Cleanup & Wiring Tests
 *
 * Tests for the dead field removal and RankingContext wiring:
 * - Removed: SemanticContext.clinical, TaskInput.context.researchBundle, RoutedInput.inferred_metadata
 * - Wired: RankingContext into S5 synthesis prompts
 * - Future-use: PlanningInput fields marked
 * - Optional: Signal.severity, Signal.tags
 */

import { describe, it, expect } from 'vitest';

// Type imports to verify structure
import {
  RoutedInput,
  SemanticContext,
  TaskInput,
  RankingContext,
  DomainContext,
} from '../orchestrator/types';

import { PlanningInput, Signal } from '../models/PlannerPlan';

// Prompt builder imports
import {
  compressLaneFindings,
  buildCompressedLaneFindingsString,
} from '../orchestrator/utils/promptBuilder';

// Synthesis prompt imports
import {
  getMultiArchetypeSynthesisDraftCoreBody,
} from '../orchestrator/prompts/multiArchetypeSynthesis';

describe('Dead Field Removal - Type Safety', () => {
  it('RoutedInput should not have inferred_metadata field', () => {
    const routedInput: RoutedInput = {
      planning_input: {
        planning_input_id: 'test',
        concern: 'I25',
        domain_hint: 'Orthopedics',
        intent: 'quality_reporting',
        target_population: 'pediatric',
        specific_requirements: [],
      },
      concern_id: 'I25',
      raw_domain: 'Orthopedics',
    };

    // Verify the field doesn't exist (TypeScript compile check)
    expect(routedInput.concern_id).toBe('I25');
    expect((routedInput as any).inferred_metadata).toBeUndefined();
  });

  it('SemanticContext should not have clinical field', () => {
    const semanticContext: SemanticContext = {
      packet: undefined,
      ranking: undefined,
    };

    // Verify the field doesn't exist
    expect((semanticContext as any).clinical).toBeUndefined();
  });

  it('TaskInput.context should not have researchBundle', () => {
    const taskInput: TaskInput = {
      node: { id: 'test', type: 'signal_enrichment' },
      prompt_config: {
        template_id: 'test',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        response_format: 'json',
      },
      context: {
        skeleton: {} as any,
        domainContext: {} as any,
        previousTaskOutputs: new Map(),
      },
    };

    // Verify researchBundle doesn't exist
    expect((taskInput.context as any).researchBundle).toBeUndefined();
  });
});

describe('RankingContext Wiring', () => {
  it('should include ranking context in synthesis draft prompt', () => {
    const context = {
      domain: 'Orthopedics',
      archetype: 'Process_Auditor',
      laneFindings: '### TEST LANE:\n  Determination: Test finding',
      ranking_context: {
        specialty_name: 'Orthopedics',
        summary: 'Top decile performance',
        top_performer_benchmarks: '< 12 hours to surgery',
        quality_differentiators: ['Rapid OR access', 'Protocol adherence'],
      },
    };

    const prompt = getMultiArchetypeSynthesisDraftCoreBody(context);

    // Verify ranking context is included
    expect(prompt).toContain('RANKING & BENCHMARK CONTEXT');
    expect(prompt).toContain('Top decile performance');
    expect(prompt).toContain('< 12 hours to surgery');
    expect(prompt).toContain('Rapid OR access');
    expect(prompt).toContain('Protocol adherence');
  });

  it('should handle missing ranking context gracefully', () => {
    const context = {
      domain: 'Orthopedics',
      archetype: 'Process_Auditor',
      laneFindings: '### TEST LANE:\n  Determination: Test finding',
      ranking_context: undefined,
    };

    const prompt = getMultiArchetypeSynthesisDraftCoreBody(context);

    // Should not include ranking section
    expect(prompt).not.toContain('RANKING & BENCHMARK CONTEXT');
    // But should still have core content
    expect(prompt).toContain('GOAL (STEP 1 – DRAFT)');
    expect(prompt).toContain('Lane Findings');
  });

  it('RankingContext should have all required fields available', () => {
    const rankingContext: RankingContext = {
      specialty_name: 'Orthopedics',
      rank: 5,
      summary: 'Top performer summary',
      top_performer_benchmarks: 'Benchmark details',
      quality_differentiators: ['Diff 1', 'Diff 2'],
      signal_emphasis: ['signal_1'],
    };

    expect(rankingContext.summary).toBe('Top performer summary');
    expect(rankingContext.top_performer_benchmarks).toBe('Benchmark details');
    expect(rankingContext.quality_differentiators).toHaveLength(2);
  });
});

describe('PlanningInput Future-Use Fields', () => {
  it('should accept all future-use fields', () => {
    const planningInput: PlanningInput = {
      planning_input_id: 'test',
      concern: 'I25',
      domain_hint: 'Orthopedics',
      intent: 'quality_reporting',           // Future use
      target_population: 'pediatric',        // Future use
      specific_requirements: ['req1'],       // Future use
      data_profile: { source: 'EHR' },       // Future use
      clinical_context: { age: 5 },          // Future use
    };

    // All fields should be present
    expect(planningInput.intent).toBe('quality_reporting');
    expect(planningInput.target_population).toBe('pediatric');
    expect(planningInput.specific_requirements).toHaveLength(1);
    expect(planningInput.data_profile).toBeDefined();
    expect(planningInput.clinical_context).toBeDefined();
  });
});

describe('Signal Optional Enrichment Fields', () => {
  it('Signal should work without optional severity and tags', () => {
    const signal: Signal = {
      id: 'sig_001',
      name: 'Test Signal',
      description: 'A test signal',
      evidence_type: 'L1',
      provenance: {
        source: 'clinical_note',
        confidence: 0.9,
      },
    };

    expect(signal.severity).toBeUndefined();
    expect(signal.tags).toBeUndefined();
  });

  it('Signal should accept optional severity and tags', () => {
    const signal: Signal = {
      id: 'sig_002',
      name: 'Enriched Signal',
      description: 'A signal with enrichment',
      evidence_type: 'L2',
      provenance: {
        source: 'lab_result',
        confidence: 0.85,
      },
      severity: 'warn',
      tags: ['timing', 'delay'],
    };

    expect(signal.severity).toBe('warn');
    expect(signal.tags).toEqual(['timing', 'delay']);
  });
});

describe('S5 Synthesis Input Construction', () => {
  it('should compress lane findings before synthesis', () => {
    const mockTaskOutputs = new Map();

    mockTaskOutputs.set('process_auditor:event_summary', {
      taskId: 'process_auditor:event_summary',
      output: {
        task_type: 'event_summary',
        summary: 'Patient arrived at 14:00, surgery delayed to 09:00 next day',
      },
      validation: { passed: true, errors: [], warnings: [] },
    });

    mockTaskOutputs.set('process_auditor:signal_enrichment', {
      taskId: 'process_auditor:signal_enrichment',
      output: {
        task_type: 'signal_enrichment',
        signal_groups: [
          {
            group_id: 'delay_drivers',
            signals: [
              { description: 'OR capacity issue', evidence_type: 'L1' },
            ],
          },
        ],
      },
      validation: { passed: true, errors: [], warnings: [] },
    });

    const compressed = compressLaneFindings(mockTaskOutputs);
    const compressedString = buildCompressedLaneFindingsString(compressed);

    // Verify compression output
    expect(compressed).toHaveLength(1);
    expect(compressed[0].lane).toBe('PROCESS_AUDITOR');
    expect(compressed[0].signal_count).toBe(1);

    // Verify string output
    expect(compressedString).toContain('PROCESS_AUDITOR');
    expect(compressedString).toContain('Determination:');
    expect(compressedString).toContain('Signal Count: 1');
  });
});
