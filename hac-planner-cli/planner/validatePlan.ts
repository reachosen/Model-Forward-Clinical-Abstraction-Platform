/**
 * Plan Validation Utilities
 *
 * Validates PlannerPlan and HACConfig against JSON schemas and business rules.
 */

import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';
import { PlannerPlan, HACConfig } from '../models/PlannerPlan';

// Initialize AJV with format validators
const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

/**
 * Validation result
 */
export interface ValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  schema_valid: boolean;
  business_rules_valid: boolean;
}

/**
 * Load and compile JSON schema
 */
function loadSchema(schemaName: string): ValidateFunction {
  const schemaPath = path.join(__dirname, '../schemas', schemaName);

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaContent);

  try {
    return ajv.compile(schema);
  } catch (error) {
    throw new Error(`Failed to compile schema ${schemaName}: ${error}`);
  }
}

// Load schemas
let plannerPlanValidator: ValidateFunction;
let hacConfigValidator: ValidateFunction;

try {
  hacConfigValidator = loadSchema('hac-config.schema.json');
  plannerPlanValidator = loadSchema('planner-plan.schema.json');
} catch (error) {
  console.warn(`Warning: Could not load schemas: ${error}`);
}

/**
 * Validate PlannerPlan against schema and business rules
 *
 * @param plan - PlannerPlan to validate
 * @returns ValidationResult
 */
export function validatePlan(plan: PlannerPlan): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Schema validation
  let schemaValid = true;
  if (plannerPlanValidator) {
    const valid = plannerPlanValidator(plan);
    if (!valid && plannerPlanValidator.errors) {
      schemaValid = false;
      plannerPlanValidator.errors.forEach((error) => {
        errors.push(`Schema error at ${error.instancePath}: ${error.message}`);
      });
    }
  } else {
    warnings.push('Schema validation skipped (schema not loaded)');
  }

  // Validate nested HAC config
  const hacConfigResult = validateHACConfig(plan.hac_config);
  errors.push(...hacConfigResult.errors);
  warnings.push(...hacConfigResult.warnings);

  // Business rules validation
  const businessRulesResult = validateBusinessRules(plan);
  errors.push(...businessRulesResult.errors);
  warnings.push(...businessRulesResult.warnings);

  const businessRulesValid = businessRulesResult.errors.length === 0;
  const isValid = schemaValid && hacConfigResult.is_valid && businessRulesValid;

  return {
    is_valid: isValid,
    errors,
    warnings,
    schema_valid: schemaValid && hacConfigResult.schema_valid,
    business_rules_valid: businessRulesValid
  };
}

/**
 * Validate HACConfig against schema and business rules
 *
 * @param config - HACConfig to validate
 * @returns ValidationResult
 */
export function validateHACConfig(config: HACConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Schema validation
  let schemaValid = true;
  if (hacConfigValidator) {
    const valid = hacConfigValidator(config);
    if (!valid && hacConfigValidator.errors) {
      schemaValid = false;
      hacConfigValidator.errors.forEach((error) => {
        errors.push(`Config schema error at ${error.instancePath}: ${error.message}`);
      });
    }
  } else {
    warnings.push('HAC config schema validation skipped (schema not loaded)');
  }

  // Business rules validation for HAC config
  const businessRulesResult = validateHACConfigBusinessRules(config);
  errors.push(...businessRulesResult.errors);
  warnings.push(...businessRulesResult.warnings);

  const businessRulesValid = businessRulesResult.errors.length === 0;
  const isValid = schemaValid && businessRulesValid;

  return {
    is_valid: isValid,
    errors,
    warnings,
    schema_valid: schemaValid,
    business_rules_valid: businessRulesValid
  };
}

/**
 * Validate business rules for PlannerPlan
 */
function validateBusinessRules(plan: PlannerPlan): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: Confidence must be between 0 and 1
  if (plan.plan_metadata.confidence < 0 || plan.plan_metadata.confidence > 1) {
    errors.push(`Confidence must be between 0 and 1, got ${plan.plan_metadata.confidence}`);
  }

  // Rule 2: Low confidence should require review
  if (plan.plan_metadata.confidence < 0.7 && !plan.plan_metadata.requires_review) {
    warnings.push(`Low confidence (${plan.plan_metadata.confidence}) should require review`);
  }

  // Rule 3: Plan should have at least one key decision
  if (!plan.rationale.key_decisions || plan.rationale.key_decisions.length === 0) {
    warnings.push('Plan should include at least one key decision in rationale');
  }

  // Rule 4: Rationale summary should be substantial
  if (plan.rationale.summary.length < 100) {
    warnings.push('Rationale summary is very short (< 100 characters)');
  }

  // Rule 5: Plan ID and planning input ID should match pattern
  if (!plan.plan_metadata.plan_id || plan.plan_metadata.plan_id.trim() === '') {
    errors.push('Plan ID is required');
  }

  if (!plan.plan_metadata.planning_input_id || plan.plan_metadata.planning_input_id.trim() === '') {
    errors.push('Planning input ID is required');
  }

  return { errors, warnings };
}

/**
 * Validate business rules for HACConfig
 */
function validateHACConfigBusinessRules(config: HACConfig): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: At least one signal group required
  if (!config.signals.signal_groups || config.signals.signal_groups.length === 0) {
    errors.push('At least one signal group is required');
  }

  // Rule 2: Each signal group must have signal types
  config.signals.signal_groups?.forEach((group, index) => {
    if (!group.signal_types || group.signal_types.length === 0) {
      errors.push(`Signal group ${index} (${group.group_id}) must have at least one signal type`);
    }
  });

  // Rule 3: At least one timeline phase required
  if (!config.timeline.phases || config.timeline.phases.length === 0) {
    errors.push('At least one timeline phase is required');
  }

  // Rule 4: At least one clinical rule required
  if (!config.criteria.rules || config.criteria.rules.length === 0) {
    errors.push('At least one clinical rule is required');
  }

  // Rule 5: System prompt should not be empty
  if (!config.prompts.system_prompt || config.prompts.system_prompt.trim() === '') {
    errors.push('System prompt is required');
  }

  // Rule 6: At least enrichment or abstraction prompt should be defined
  const hasEnrichment = config.prompts.task_prompts.enrichment && config.prompts.task_prompts.enrichment.trim() !== '';
  const hasAbstraction = config.prompts.task_prompts.abstraction && config.prompts.task_prompts.abstraction.trim() !== '';

  if (!hasEnrichment && !hasAbstraction) {
    errors.push('At least one of enrichment or abstraction task prompt is required');
  }

  // Rule 7: Confidence thresholds should be reasonable
  if (config.signals.thresholds?.min_confidence !== undefined) {
    if (config.signals.thresholds.min_confidence < 0 || config.signals.thresholds.min_confidence > 1) {
      errors.push(`Signal confidence threshold must be between 0 and 1, got ${config.signals.thresholds.min_confidence}`);
    }
    if (config.signals.thresholds.min_confidence < 0.5) {
      warnings.push(`Signal confidence threshold is low (${config.signals.thresholds.min_confidence}). Consider raising to 0.7+`);
    }
  }

  // Rule 8: Max findings should be reasonable
  if (config.signals.thresholds?.max_findings_per_category !== undefined) {
    if (config.signals.thresholds.max_findings_per_category < 1) {
      errors.push(`Max findings per category must be at least 1, got ${config.signals.thresholds.max_findings_per_category}`);
    }
    if (config.signals.thresholds.max_findings_per_category > 50) {
      warnings.push(`Max findings per category is very high (${config.signals.thresholds.max_findings_per_category}). This may overwhelm clinicians.`);
    }
  }

  // Rule 9: Version should follow semver
  const versionRegex = /^\d+\.\d+\.\d+$/;
  if (!versionRegex.test(config.config_metadata.version)) {
    warnings.push(`Version should follow semantic versioning (e.g., 1.0.0), got ${config.config_metadata.version}`);
  }

  // Rule 10: Concern ID should be uppercase
  if (config.config_metadata.concern_id !== config.config_metadata.concern_id.toUpperCase()) {
    warnings.push(`Concern ID should be uppercase, got ${config.config_metadata.concern_id}`);
  }

  // Rule 11: Detection window should be reasonable
  if (config.surveillance.detection_window) {
    const { lookback_days, lookahead_days } = config.surveillance.detection_window;
    if (lookback_days !== undefined && lookback_days > 90) {
      warnings.push(`Lookback window is very long (${lookback_days} days). Consider if this is necessary.`);
    }
    if (lookahead_days !== undefined && lookahead_days > 30) {
      warnings.push(`Lookahead window is very long (${lookahead_days} days). Consider if this is necessary.`);
    }
  }

  // Rule 12: Follow-up questions should have diverse categories
  if (config.questions?.followup_questions) {
    const categories = new Set(config.questions.followup_questions.map(q => q.category));
    if (categories.size === 1 && config.questions.followup_questions.length > 3) {
      warnings.push('All follow-up questions have the same category. Consider diversifying question types.');
    }
  }

  // Rule 13: Required questions should exist
  const requiredQuestions = config.questions?.followup_questions?.filter(q => q.required) || [];
  if (requiredQuestions.length === 0) {
    warnings.push('No required follow-up questions defined. Consider making critical questions required.');
  }

  // Rule 14: Timeline phases should have reasonable durations
  config.timeline.phases?.forEach((phase, index) => {
    if (phase.duration?.typical_days !== undefined && phase.duration.typical_days > 365) {
      warnings.push(`Phase ${index} (${phase.phase_id}) has a very long typical duration (${phase.duration.typical_days} days)`);
    }
  });

  return { errors, warnings };
}

/**
 * Validate planning input against schema
 *
 * @param input - PlanningInput to validate
 * @returns ValidationResult
 */
export function validatePlanningInput(input: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const validator = loadSchema('planning-input.schema.json');
    const valid = validator(input);

    if (!valid && validator.errors) {
      validator.errors.forEach((error) => {
        errors.push(`Input validation error at ${error.instancePath}: ${error.message}`);
      });
    }

    return {
      is_valid: valid,
      errors,
      warnings,
      schema_valid: valid,
      business_rules_valid: true
    };
  } catch (error) {
    return {
      is_valid: false,
      errors: [`Failed to validate input: ${error}`],
      warnings: [],
      schema_valid: false,
      business_rules_valid: false
    };
  }
}

/**
 * Pretty print validation result
 */
export function printValidationResult(result: ValidationResult, label: string = 'Validation'): void {
  console.log(`\n📋 ${label} Result:`);

  if (result.is_valid) {
    console.log(`   ✅ Valid`);
  } else {
    console.log(`   ❌ Invalid`);
  }

  console.log(`   Schema Valid: ${result.schema_valid ? '✅' : '❌'}`);
  console.log(`   Business Rules Valid: ${result.business_rules_valid ? '✅' : '❌'}`);

  if (result.errors.length > 0) {
    console.log(`\n   Errors (${result.errors.length}):`);
    result.errors.forEach((error, i) => {
      console.log(`     ${i + 1}. ${error}`);
    });
  }

  if (result.warnings.length > 0) {
    console.log(`\n   Warnings (${result.warnings.length}):`);
    result.warnings.forEach((warning, i) => {
      console.log(`     ${i + 1}. ${warning}`);
    });
  }

  console.log(``);
}
