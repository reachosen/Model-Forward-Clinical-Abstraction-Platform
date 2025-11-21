/**
 * HAC Planner Agent - Simplified Version
 *
 * Core planning function that takes PlanningInput and generates a PlannerPlan.
 */

import { PlanningInput } from '../models/PlanningInput';
import { PlannerPlan, HACConfig } from '../models/PlannerPlan';

export interface PlannerConfig {
  apiKey?: string;
  model?: string;
  useMock?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export async function planHAC(
  input: PlanningInput,
  config: PlannerConfig = {}
): Promise<PlannerPlan> {
  console.log(`\n🧠 HAC Planner Agent`);
  console.log(`   Concern: ${input.concern_id}`);
  console.log(`   Archetype: ${input.archetype}`);
  console.log(`   Mode: MOCK`);
  console.log(``);

  const timestamp = new Date().toISOString();
  const planId = `plan-${input.concern_id.toLowerCase()}-${Date.now()}`;

  const hacConfig: HACConfig = {
    config_metadata: {
      config_id: `config-${input.concern_id.toLowerCase()}-v1`,
      name: `${input.concern_id} Detection Configuration`,
      concern_id: input.concern_id,
      version: '1.0.0',
      archetype: input.archetype,
      created_at: timestamp,
      status: 'draft'
    },
    domain: {
      name: input.domain.name,
      display_name: `${input.concern_id} Surveillance`,
      description: input.clinical_context.objective
    },
    surveillance: {
      objective: input.clinical_context.objective,
      population: input.clinical_context.population || 'All at-risk patients',
      detection_window: {
        lookback_days: 7,
        lookahead_days: 2
      },
      reporting: {
        frequency: 'monthly',
        frameworks: input.clinical_context.regulatory_frameworks || ['NHSN']
      }
    },
    signals: {
      signal_groups: [{
        group_id: 'device_signals',
        display_name: 'Device Signals',
        description: 'Device-related signals',
        signal_types: ['device_insertion', 'device_maintenance', 'device_removal']
      }, {
        group_id: 'laboratory_signals',
        display_name: 'Laboratory Signals',
        description: 'Laboratory test results',
        signal_types: ['blood_culture', 'inflammatory_markers']
      }],
      thresholds: {
        min_confidence: input.preferences?.min_confidence || 0.7,
        max_findings_per_category: input.preferences?.max_findings_per_category || 10
      }
    },
    timeline: {
      phases: [{
        phase_id: 'baseline',
        display_name: 'Baseline Period',
        description: 'Clinical status before event',
        timing: 'pre_event',
        duration: { typical_days: 2 }
      }, {
        phase_id: 'event',
        display_name: 'Event Period',
        description: 'Period of clinical significance',
        timing: 'peri_event',
        duration: { typical_days: 3 }
      }, {
        phase_id: 'surveillance',
        display_name: 'Surveillance Period',
        description: 'Ongoing monitoring period',
        timing: 'surveillance',
        duration: { typical_days: 7 }
      }]
    },
    prompts: {
      system_prompt: `You are a ${input.concern_id} surveillance agent for ${input.domain.facility.type} facilities.`,
      task_prompts: {
        enrichment: 'Extract and structure relevant clinical signals.',
        abstraction: `Evaluate against ${input.clinical_context.regulatory_frameworks?.join(' and ') || 'clinical'} criteria and generate determination.`
      }
    },
    criteria: {
      rules: [{
        rule_id: `${input.concern_id.toLowerCase()}_criterion_1`,
        name: 'Primary Inclusion Criterion',
        description: `Primary diagnostic criterion for ${input.concern_id}`,
        framework: input.clinical_context.regulatory_frameworks?.[0] || 'Internal',
        logic: 'TBD - Define based on regulatory requirements'
      }]
    },
    questions: {
      followup_questions: [{
        question_id: 'q1',
        question_text: 'Are there alternative explanations for the clinical findings?',
        category: 'clinical',
        required: true,
        answer_type: 'text'
      }]
    },
    summary_config: {
      key_fields: ['risk_level', 'determination', 'confidence', 'critical_signals']
    }
  };

  const plan: PlannerPlan = {
    plan_metadata: {
      plan_id: planId,
      planning_input_id: input.planning_id,
      generated_at: timestamp,
      planner_version: '1.0.0',
      model_used: 'mock-planner-v1',
      confidence: 0.75,
      requires_review: true,
      status: 'draft'
    },
    rationale: {
      summary: `This is a mock-generated HAC configuration for ${input.concern_id}. The configuration includes standard signal groups, timeline phases, and regulatory-aligned criteria. This configuration should be reviewed by clinical subject matter experts before deployment.`,
      key_decisions: [{
        aspect: 'signal_grouping',
        decision: 'Organized signals into device and laboratory groups',
        reasoning: 'Standard grouping for device-associated infections',
        confidence: 0.8
      }, {
        aspect: 'timeline_phases',
        decision: 'Defined 3 temporal phases',
        reasoning: 'Covers baseline, event, and surveillance periods',
        confidence: 0.75
      }]
    },
    hac_config: hacConfig,
    validation: {
      is_valid: true,
      errors: [],
      warnings: ['Mock-generated configuration requires clinical validation'],
      schema_valid: true,
      business_rules_valid: true
    }
  };

  console.log(`✅ Plan generated successfully`);
  return plan;
}
