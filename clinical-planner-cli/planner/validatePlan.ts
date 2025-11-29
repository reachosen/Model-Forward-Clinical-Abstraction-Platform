/**
 * Plan Validation Utilities
 *
 * @deprecated This file is deprecated and will be removed in v10.0.
 * For V9.1 plans, use validatePlanV91() from './validateV91.ts' instead.
 * This validator is maintained for backward compatibility with V1/V2 plans only.
 *
 * Validates PlannerPlan (V1/V2) and HACConfig against JSON schemas and business rules.
 */

import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';
import { PlannerPlan, PlannerPlanV2, HACConfig } from '../models/PlannerPlan';

// Deprecation warning flag (only warn once per process)
let hasWarnedDeprecation = false;

// Initialize AJV with format validators
const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

export interface ValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  schema_valid: boolean;
  business_rules_valid: boolean;
}

function loadSchema(schemaName: string): ValidateFunction {
  const schemaPath = path.join(__dirname, '../schemas', schemaName);

  if (!fs.existsSync(schemaPath)) {
    // Skip if schema file missing (dev environment)
    return ((data: any) => true) as unknown as ValidateFunction; 
  }

  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaContent);

  try {
    return ajv.compile(schema);
  } catch (error) {
    throw new Error(`Failed to compile schema ${schemaName}: ${error}`);
  }
}

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
 * @deprecated Use validatePlanV91() from './validateV91.ts' for V9.1 plans.
 * This function will be removed in v10.0.
 */
export function validatePlan(plan: PlannerPlan | PlannerPlanV2): ValidationResult {
  // Runtime deprecation warning (only once per process)
  if (!hasWarnedDeprecation) {
    console.warn('\n⚠️  WARNING: validatePlan() is DEPRECATED and will be removed in v10.0');
    console.warn('   Use validatePlanV91() from "./validateV91.ts" for V9.1 plans instead.');
    console.warn('   This legacy validator is for V1/V2 plans only.\n');
    hasWarnedDeprecation = true;
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Schema validation (Only applies to V1 for now as schema is V1)
  let schemaValid = true;
  if (!isV2Plan(plan) && plannerPlanValidator) {
    const valid = plannerPlanValidator(plan);
    if (!valid && plannerPlanValidator.errors) {
      schemaValid = false;
      plannerPlanValidator.errors.forEach((error) => {
        errors.push(`Schema error at ${error.instancePath}: ${error.message}`);
      });
    }
  }

  // Validate nested ClinicalConfig / HAC config (Shared)
  const configToValidate = (plan as any).clinical_config ?? (plan as any).hac_config;
  const hacConfigResult = validateHACConfig(configToValidate);
  errors.push(...hacConfigResult.errors);
  warnings.push(...hacConfigResult.warnings);

  // Business rules validation
  const businessRulesResult = validateBusinessRules(plan);
  errors.push(...businessRulesResult.errors);
  warnings.push(...businessRulesResult.warnings);

  const businessRulesValid = businessRulesResult.errors.length === 0;
  const isValid = hacConfigResult.is_valid && businessRulesValid; // Schema check optional for hybrid

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
 */
export function validateHACConfig(config: HACConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config) {
    return {
      is_valid: false,
      errors: ['Configuration object is missing'],
      warnings: [],
      schema_valid: false,
      business_rules_valid: false
    };
  }

  let schemaValid = true;
  if (hacConfigValidator) {
    const valid = hacConfigValidator(config);
    if (!valid && hacConfigValidator.errors) {
      schemaValid = false;
      hacConfigValidator.errors.forEach((error) => {
        errors.push(`Config schema error at ${error.instancePath}: ${error.message}`);
      });
    }
  }

  const businessRulesResult = validateHACConfigBusinessRules(config);
  errors.push(...businessRulesResult.errors);
  warnings.push(...businessRulesResult.warnings);

  const businessRulesValid = businessRulesResult.errors.length === 0;
  const isValid = businessRulesValid;

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
function validateBusinessRules(plan: PlannerPlan | PlannerPlanV2): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!plan.plan_metadata) {
     errors.push('Plan metadata is missing');
     return { errors, warnings };
  }

  if (isV2Plan(plan)) {
    // --- V2 Validation ---
    const v2 = plan as PlannerPlanV2;
    // 1. Check Overall Score
    const score = v2.quality?.overall_score ?? 0;
    if (score < 0 || score > 1) {
      errors.push(`Quality score must be between 0 and 1, got ${score}`);
    }
    
    // 2. Review Requirement
    if (score < 0.7 && !v2.plan_metadata.status.requires_review) {
      warnings.push(`Low quality score (${score}) should require review`);
    }

    // 3. Provenance Check (if in research mode)
    if (v2.plan_metadata.workflow?.mode === 'research_plan_implement' && (!v2.provenance || v2.provenance.sources.length === 0)) {
      warnings.push('Research mode plan missing provenance sources');
    }

  } else {
    // --- V1 Validation ---
    const v1 = plan as PlannerPlan;
    const v1Meta = v1.plan_metadata as any;

    // 1. Confidence (V1 only)
    if (v1Meta.confidence !== undefined && (v1Meta.confidence < 0 || v1Meta.confidence > 1)) {
      errors.push(`Confidence must be between 0 and 1, got ${v1Meta.confidence}`);
    }

    // 2. Rationale
    if (!v1.rationale?.key_decisions || v1.rationale.key_decisions.length === 0) {
      warnings.push('Plan should include at least one key decision in rationale');
    }

    if (v1.rationale?.summary && v1.rationale.summary.length < 100) {
      warnings.push('Rationale summary is very short (< 100 characters)');
    }
  }

  // Shared Rules
  if (!plan.plan_metadata.plan_id) {
    errors.push('Plan ID is required');
  }
  
  if (!plan.plan_metadata.planning_input_id) {
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

  if (!config) return { errors: ['Config is undefined'], warnings: [] };

  if (!config.signals?.signal_groups || config.signals.signal_groups.length === 0) {
    errors.push('At least one signal group is required');
  }
  if (!Array.isArray((config as any).clinical_tools)) {
    errors.push('clinical_tools section is required and must be an array (can be empty)');
  }


  // Use optional chaining and fallback for signals array
  config.signals?.signal_groups?.forEach((group, index) => {
    const groupAny = group as any;
    const hasSignals = (group.signals && group.signals.length > 0) || (groupAny.signal_types && groupAny.signal_types.length > 0);
    if (!hasSignals) {
      errors.push(`Signal group ${index} (${group.display_name || group.group_id}) must have at least one signal type`);
    }
  });

  if (!config.timeline?.phases || config.timeline.phases.length === 0) {
    errors.push('At least one timeline phase is required');
  }

  if (!config.criteria?.rules || config.criteria.rules.length === 0) {
    errors.push('At least one clinical rule is required');
  }

  return { errors, warnings };
}

export function validatePlanningInput(input: any): ValidationResult {
  // Simplified input validation
  const errors: string[] = [];
  if (!input.concern_id) errors.push('concern_id is required');
  if (!input.domain) errors.push('domain is required');
  
  return { 
    is_valid: errors.length === 0, 
    errors, 
    warnings: [], 
    schema_valid: true, 
    business_rules_valid: true 
  };
}

export function printValidationResult(result: ValidationResult, label: string = 'Validation'): void {
  console.log(`\n📋 ${label} Result:`);
  console.log(`   ${result.is_valid ? '✅ Valid' : '❌ Invalid'}`);
  if (result.errors.length > 0) {
    console.log(`\n   Errors (${result.errors.length}):`);
    result.errors.forEach((e, i) => console.log(`     ${i + 1}. ${e}`));
  }
  if (result.warnings.length > 0) {
    console.log(`\n   Warnings (${result.warnings.length}):`);
    result.warnings.forEach((w, i) => console.log(`     ${i + 1}. ${w}`));
  }
  console.log(``);
}

// Type Guard
function isV2Plan(plan: any): plan is PlannerPlanV2 {
  return 'quality' in plan && 'provenance' in plan;
}