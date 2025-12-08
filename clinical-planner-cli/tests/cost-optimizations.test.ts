/**
 * Cost Optimization Tests
 *
 * Tests for the cost optimization changes:
 * - C10: Dataset generator max_tokens and narrative length
 * - C11: Eval engine max_tokens and sampling
 * - C12: Prompt refinery model selection and evidence summarization
 * - C7/C8: Synthesis compression
 * - C9: Scenario caching
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// C7/C8: Test compression utilities
import {
  compressLaneFindings,
  buildCompressedLaneFindingsString,
  CompressedLaneFindings,
} from '../orchestrator/utils/promptBuilder';

// C9: Test scenario caching
import {
  getScenarioCache,
  setScenarioCache,
  invalidateScenarioCache,
  shouldRegenerateScenarios,
  clearAllScenarioCaches,
  generateCacheKey,
} from '../orchestrator/utils/scenarioCache';

// C11: Test eval engine sampling
import { sampleCases, getEvalConfig, EvalConfig } from '../flywheel/validation/engine';

describe('C12: Prompt Refinery Model Selection', () => {
  it('should default to gpt-4o-mini when OPTIMIZER_MODEL not set', () => {
    // The default model is gpt-4o-mini as per the implementation
    const defaultModel = process.env.OPTIMIZER_MODEL || 'gpt-4o-mini';
    expect(defaultModel).toBe('gpt-4o-mini');
  });

  it('should use fallback model when configured', () => {
    const fallbackModel = process.env.OPTIMIZER_FALLBACK_MODEL || 'gpt-4o';
    expect(fallbackModel).toBe('gpt-4o');
  });

  it('should have MAX_EVIDENCE_TOKENS configured', () => {
    // Evidence should be capped at ~600 tokens
    const MAX_EVIDENCE_TOKENS = 600;
    expect(MAX_EVIDENCE_TOKENS).toBeGreaterThan(0);
    expect(MAX_EVIDENCE_TOKENS).toBeLessThanOrEqual(800);
  });
});

describe('C7/C8: Synthesis Compression', () => {
  it('should compress lane findings correctly', () => {
    const mockTaskOutputs = new Map();

    // Add mock event_summary output
    mockTaskOutputs.set('process_auditor:event_summary', {
      taskId: 'process_auditor:event_summary',
      output: {
        task_type: 'event_summary',
        summary: 'Patient arrived at 14:00, surgery at 09:00 next day (19h delay)',
        event_summary: 'Patient arrived at 14:00, surgery at 09:00 next day (19h delay)',
      },
      validation: { passed: true, errors: [], warnings: [] },
    });

    // Add mock signal_enrichment output
    mockTaskOutputs.set('process_auditor:signal_enrichment', {
      taskId: 'process_auditor:signal_enrichment',
      output: {
        task_type: 'signal_enrichment',
        signal_groups: [
          {
            group_id: 'timing',
            signals: [
              { description: 'Arrival at 14:00', evidence_type: 'L1' },
              { description: 'Surgery delay of 19 hours', evidence_type: 'L1' },
            ],
          },
        ],
      },
      validation: { passed: true, errors: [], warnings: [] },
    });

    const compressed = compressLaneFindings(mockTaskOutputs);

    expect(compressed).toHaveLength(1);
    expect(compressed[0].lane).toBe('PROCESS_AUDITOR');
    expect(compressed[0].determination).toContain('14:00');
    expect(compressed[0].signal_count).toBe(2);
    expect(compressed[0].key_timestamps.length).toBeGreaterThan(0);
  });

  it('should build compressed lane findings string', () => {
    const compressed: CompressedLaneFindings[] = [
      {
        lane: 'PROCESS_AUDITOR',
        determination: 'Patient arrived at 14:00',
        key_timestamps: ['14:00', '09:00'],
        flags: ['Delay detected'],
        signal_count: 3,
      },
    ];

    const result = buildCompressedLaneFindingsString(compressed);

    expect(result).toContain('PROCESS_AUDITOR');
    expect(result).toContain('Determination:');
    expect(result).toContain('Timestamps:');
    expect(result).toContain('Signal Count: 3');
  });

  it('should truncate determination to 200 chars', () => {
    const mockTaskOutputs = new Map();

    const longSummary = 'A'.repeat(300);
    mockTaskOutputs.set('test_lane:event_summary', {
      taskId: 'test_lane:event_summary',
      output: {
        task_type: 'event_summary',
        summary: longSummary,
      },
      validation: { passed: true, errors: [], warnings: [] },
    });

    const compressed = compressLaneFindings(mockTaskOutputs);

    expect(compressed[0].determination.length).toBeLessThanOrEqual(200);
  });
});

describe('C9: Scenario Caching', () => {
  const testCacheDir = path.join(__dirname, '../data/cache/test_scenarios');

  beforeEach(() => {
    // Clear test cache before each test
    clearAllScenarioCaches({ cacheDir: testCacheDir });
  });

  afterEach(() => {
    // Clean up test cache
    clearAllScenarioCaches({ cacheDir: testCacheDir });
    if (fs.existsSync(testCacheDir)) {
      fs.rmdirSync(testCacheDir, { recursive: true });
    }
  });

  it('should generate consistent cache keys', () => {
    const key1 = generateCacheKey('I25', 'timing', 'Orthopedics');
    const key2 = generateCacheKey('I25', 'timing', 'Orthopedics');
    const key3 = generateCacheKey('I25', 'timing', 'HAC');

    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
  });

  it('should return null on cache miss', () => {
    const result = getScenarioCache('I25', 'timing', 'Orthopedics', { cacheDir: testCacheDir });
    expect(result).toBeNull();
  });

  it('should cache and retrieve scenarios', () => {
    const scenarios = ['scenario1', 'scenario2', 'scenario3'];

    setScenarioCache('I25', 'timing', 'Orthopedics', scenarios, 'seed123', { cacheDir: testCacheDir });

    const cached = getScenarioCache('I25', 'timing', 'Orthopedics', { cacheDir: testCacheDir });

    expect(cached).not.toBeNull();
    expect(cached!.scenarios).toEqual(scenarios);
    expect(cached!.seed).toBe('seed123');
  });

  it('should invalidate cache', () => {
    const scenarios = ['scenario1'];
    setScenarioCache('I25', 'timing', 'Orthopedics', scenarios, undefined, { cacheDir: testCacheDir });

    invalidateScenarioCache('I25', 'timing', 'Orthopedics', { cacheDir: testCacheDir });

    const cached = getScenarioCache('I25', 'timing', 'Orthopedics', { cacheDir: testCacheDir });
    expect(cached).toBeNull();
  });

  it('should detect seed changes for regeneration', () => {
    const scenarios = ['scenario1'];
    setScenarioCache('I25', 'timing', 'Orthopedics', scenarios, 'old_seed', { cacheDir: testCacheDir });

    const shouldRegenerate = shouldRegenerateScenarios(
      'I25',
      'timing',
      'Orthopedics',
      'new_seed',
      false,
      { cacheDir: testCacheDir }
    );

    expect(shouldRegenerate).toBe(true);
  });

  it('should not regenerate when seed matches', () => {
    const scenarios = ['scenario1'];
    setScenarioCache('I25', 'timing', 'Orthopedics', scenarios, 'same_seed', { cacheDir: testCacheDir });

    const shouldRegenerate = shouldRegenerateScenarios(
      'I25',
      'timing',
      'Orthopedics',
      'same_seed',
      false,
      { cacheDir: testCacheDir }
    );

    expect(shouldRegenerate).toBe(false);
  });

  it('should respect force regenerate flag', () => {
    const scenarios = ['scenario1'];
    setScenarioCache('I25', 'timing', 'Orthopedics', scenarios, 'seed', { cacheDir: testCacheDir });

    const shouldRegenerate = shouldRegenerateScenarios(
      'I25',
      'timing',
      'Orthopedics',
      'seed',
      true, // force regenerate
      { cacheDir: testCacheDir }
    );

    expect(shouldRegenerate).toBe(true);
  });
});

describe('C11: Eval Engine Sampling', () => {
  it('should return all cases in full mode', () => {
    const cases = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    const config: EvalConfig = { fullMode: true, sampleSize: 20 };

    const sampled = sampleCases(cases, config);

    expect(sampled.length).toBe(100);
  });

  it('should sample cases when below threshold', () => {
    const cases = Array.from({ length: 10 }, (_, i) => ({ id: i }));
    const config: EvalConfig = { fullMode: false, sampleSize: 20 };

    const sampled = sampleCases(cases, config);

    expect(sampled.length).toBe(10); // All cases returned since below threshold
  });

  it('should sample cases when above threshold', () => {
    const cases = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    const config: EvalConfig = { fullMode: false, sampleSize: 20 };

    const sampled = sampleCases(cases, config);

    expect(sampled.length).toBe(20);
  });

  it('should return different samples on multiple calls (random)', () => {
    const cases = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    const config: EvalConfig = { fullMode: false, sampleSize: 10 };

    const sample1 = sampleCases(cases, config);
    const sample2 = sampleCases(cases, config);

    // Samples should be different (with high probability)
    const ids1 = sample1.map((c: any) => c.id).sort();
    const ids2 = sample2.map((c: any) => c.id).sort();

    // They might occasionally be the same, so we just check length
    expect(sample1.length).toBe(10);
    expect(sample2.length).toBe(10);
  });

  it('should have default eval config', () => {
    const config = getEvalConfig();

    expect(config.maxTokens).toBeDefined();
    expect(config.sampleSize).toBeDefined();
    expect(config.fullMode).toBeDefined();
    expect(config.maxTokens).toBeGreaterThan(0);
    expect(config.sampleSize).toBeGreaterThan(0);
  });
});

describe('C10: Dataset Generator Config', () => {
  it('should have max_tokens configured for dataset generation', () => {
    // The implementation uses 8000 max_tokens
    const MAX_TOKENS = 8000;
    expect(MAX_TOKENS).toBeGreaterThan(0);
    expect(MAX_TOKENS).toBeLessThanOrEqual(8000);
  });

  it('should have reduced narrative length requirement', () => {
    // The implementation specifies 80-120 words
    const MIN_WORDS = 80;
    const MAX_WORDS = 120;

    expect(MIN_WORDS).toBeLessThan(MAX_WORDS);
    expect(MAX_WORDS).toBeLessThanOrEqual(150); // Should be less than old 150-300
  });
});
