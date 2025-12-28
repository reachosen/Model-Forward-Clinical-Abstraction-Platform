/**
 * External V7.1 Compliance Validator
 *
 * This validator performs strict enumerated checklist validation
 * independent of the LLM's self-reported validation status.
 *
 * DO NOT trust plan.validation.is_valid - always run this validator.
 */

import type { PlannerPlan, HACReviewGroup, USNWRSignalGroupId } from '../../models/PlannerPlan';

export interface ValidationChecklist {
  root_object_check: {
    question: string;
    result: 'YES' | 'NO';
    details: string;
  };
  required_sections: {
    question: string;
    result: 'YES' | 'NO';
    missing_sections: string[];
    present_sections: string[];
  };
  signal_grouping: {
    question: string;
    result: 'YES' | 'NO';
    expected_groups: string[];
    actual_groups: string[];
    count: number;
    expected_count: number;
  };
  provenance_signals: {
    question: string;
    result: 'YES' | 'NO';
    total_signals: number;
    signals_with_provenance: number;
    signals_missing_provenance: string[];
  };
  provenance_criteria: {
    question: string;
    result: 'YES' | 'NO';
    total_rules: number;
    rules_with_provenance: number;
    rules_missing_provenance: string[];
  };
  no_placeholders: {
    question: string;
    result: 'YES' | 'NO';
    placeholder_violations: string[];
  };
  signal_schema_completeness: {
    question: string;
    result: 'YES' | 'NO';
    incomplete_signals: string[];
  };
  questions_schema: {
    question: string;
    result: 'YES' | 'NO';
    found_structure: string;
  };
  version_number: {
    question: string;
    result: 'YES' | 'NO';
    actual_version: string;
  };
  rationale_completeness: {
    question: string;
    result: 'YES' | 'NO';
    concerns_count: number;
    recommendations_count: number;
  };
}

export interface ExternalValidationResult {
  validation_checklist: ValidationChecklist;
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  schema_valid: boolean;
  business_rules_valid: boolean;
  adherence_score: number;
}

const REQUIRED_SECTIONS = [
  'config_metadata',
  'domain',
  'surveillance',
  'signals',
  'timeline',
  'criteria',
  'questions',
  'summary_config',
  'definition',
  'config2080',
  'fieldMappings',
  'clinical_tools',
  'prompts'
];

const HAC_REVIEW_GROUPS: HACReviewGroup[] = [
  'rule_in',
  'rule_out',
  'delay_drivers',
  'documentation_gaps',
  'bundle_gaps'
];

const USNWR_SIGNAL_GROUPS: USNWRSignalGroupId[] = [
  'core_criteria',
  'delay_drivers',
  'documentation',
  'rule_outs',
  'overrides'
];

const PLACEHOLDER_PATTERNS = [
  /\bTBD\b/i,
  /\bAuto-generated\b/i,
  /\bPlaceholder\b/i,
  /\bGeneric\b/i,
  /\bDefault\b(?!.*rule)/i, // "Default" but not "Default rule"
  /trigger_expr.*:\s*["']true["']/,
  /trigger_expr.*:\s*["']false["']/
];

/**
 * Main validation function - performs all V7.1 checklist validations
 */
export function validatePlanV71(plan: PlannerPlan): ExternalValidationResult {
  const checklist: ValidationChecklist = {
    root_object_check: checkRootObject(plan),
    required_sections: checkRequiredSections(plan),
    signal_grouping: checkSignalGrouping(plan),
    provenance_signals: checkProvenanceSignals(plan),
    provenance_criteria: checkProvenanceCriteria(plan),
    no_placeholders: checkNoPlaceholders(plan),
    signal_schema_completeness: checkSignalSchemaCompleteness(plan),
    questions_schema: checkQuestionsSchema(plan),
    version_number: checkVersionNumber(plan),
    rationale_completeness: checkRationaleCompleteness(plan)
  };

  const errors = generateErrorsFromChecklist(checklist);
  const warnings = generateWarnings(plan, checklist);

  const schema_valid =
    checklist.required_sections.result === 'YES' &&
    checklist.signal_schema_completeness.result === 'YES' &&
    checklist.questions_schema.result === 'YES';

  const business_rules_valid =
    checklist.provenance_signals.result === 'YES' &&
    checklist.provenance_criteria.result === 'YES' &&
    checklist.no_placeholders.result === 'YES' &&
    checklist.signal_grouping.result === 'YES';

  const is_valid = errors.length === 0;

  const adherence_score = calculateAdherenceScore(checklist);

  return {
    validation_checklist: checklist,
    is_valid,
    errors,
    warnings,
    schema_valid,
    business_rules_valid,
    adherence_score
  };
}

/**
 * Check 1: Root object naming
 */
function checkRootObject(plan: PlannerPlan): ValidationChecklist['root_object_check'] {
  const hasClinic_config = 'clinical_config' in plan;
  const hasHac_config = 'hac_config' in plan;

  let details: string;
  if (hasClinic_config) {
    details = "Found: 'clinical_config' ✓";
  } else if (hasHac_config) {
    details = "Found: 'hac_config' (OBSOLETE V4 naming)";
  } else {
    details = "Found: neither 'clinical_config' nor 'hac_config'";
  }

  return {
    question: "Is the config object named 'clinical_config' (NOT 'hac_config')?",
    result: hasClinic_config ? 'YES' : 'NO',
    details
  };
}

/**
 * Check 2: Required sections
 */
function checkRequiredSections(plan: PlannerPlan): ValidationChecklist['required_sections'] {
  const config: any = (plan as any).clinical_config || (plan as any).hac_config || {};
  const presentSections = REQUIRED_SECTIONS.filter(section => section in config);
  const missingSections = REQUIRED_SECTIONS.filter(section => !(section in config));

  return {
    question: "Are all 13 required sections present in clinical_config?",
    result: missingSections.length === 0 ? 'YES' : 'NO',
    missing_sections: missingSections,
    present_sections: presentSections
  };
}

/**
 * Check 3: Signal grouping
 */
function checkSignalGrouping(plan: PlannerPlan): ValidationChecklist['signal_grouping'] {
  const config: any = (plan as any).clinical_config || (plan as any).hac_config || {};
  const signalGroups = config.signals?.signal_groups || [];

  // Determine if this is HAC or USNWR based on archetype
  const archetype = config.config_metadata?.archetype || '';
  const isUSNWR = archetype.includes('USNWR');
  const expectedGroups = isUSNWR ? USNWR_SIGNAL_GROUPS : HAC_REVIEW_GROUPS;

  const actualGroups = signalGroups.map((g: any) => g.group_id);

  // Check if all actual groups are in the expected set
  const allValid = actualGroups.every((id: string) => expectedGroups.includes(id as any));
  const correctCount = actualGroups.length === expectedGroups.length;

  return {
    question: "Do signal groups use correct group_id values for the domain type?",
    result: (allValid && correctCount) ? 'YES' : 'NO',
    expected_groups: [...expectedGroups],
    actual_groups: actualGroups,
    count: actualGroups.length,
    expected_count: expectedGroups.length
  };
}

/**
 * Check 4: Provenance on signals
 */
function checkProvenanceSignals(plan: PlannerPlan): ValidationChecklist['provenance_signals'] {
  const config: any = (plan as any).clinical_config || (plan as any).hac_config || {};
  const signalGroups = config.signals?.signal_groups || [];

  let totalSignals = 0;
  let signalsWithProvenance = 0;
  const missingProvenance: string[] = [];

  signalGroups.forEach((group: any) => {
    (group.signals || []).forEach((signal: any) => {
      totalSignals++;
      if (signal.provenance && signal.provenance.source) {
        signalsWithProvenance++;
      } else {
        missingProvenance.push(signal.id || signal.name || 'unknown');
      }
    });
  });

  return {
    question: "Do ALL signals have a provenance object?",
    result: missingProvenance.length === 0 ? 'YES' : 'NO',
    total_signals: totalSignals,
    signals_with_provenance: signalsWithProvenance,
    signals_missing_provenance: missingProvenance
  };
}

/**
 * Check 5: Provenance on criteria
 */
function checkProvenanceCriteria(plan: PlannerPlan): ValidationChecklist['provenance_criteria'] {
  const config: any = (plan as any).clinical_config || (plan as any).hac_config || {};
  const rules = config.criteria?.rules || [];

  let totalRules = rules.length;
  let rulesWithProvenance = 0;
  const missingProvenance: string[] = [];

  rules.forEach((rule: any) => {
    if (rule.provenance && rule.provenance.source) {
      rulesWithProvenance++;
    } else {
      missingProvenance.push(rule.rule_id || rule.name || 'unknown');
    }
  });

  return {
    question: "Do ALL criteria rules have a provenance object?",
    result: missingProvenance.length === 0 ? 'YES' : 'NO',
    total_rules: totalRules,
    rules_with_provenance: rulesWithProvenance,
    rules_missing_provenance: missingProvenance
  };
}

/**
 * Check 6: No placeholders
 */
function checkNoPlaceholders(plan: PlannerPlan): ValidationChecklist['no_placeholders'] {
  const violations: string[] = [];
  const planStr = JSON.stringify(plan, null, 2);

  PLACEHOLDER_PATTERNS.forEach(pattern => {
    const matches = planStr.match(new RegExp(pattern, 'g'));
    if (matches) {
      matches.forEach(match => {
        violations.push(`Placeholder pattern found: "${match}"`);
      });
    }
  });

  return {
    question: "Is the output free of placeholder text (TBD, Auto-generated, Placeholder)?",
    result: violations.length === 0 ? 'YES' : 'NO',
    placeholder_violations: violations
  };
}

/**
 * Check 7: Signal schema completeness
 */
function checkSignalSchemaCompleteness(plan: PlannerPlan): ValidationChecklist['signal_schema_completeness'] {
  const config: any = (plan as any).clinical_config || (plan as any).hac_config || {};
  const signalGroups = config.signals?.signal_groups || [];
  const incompleteSignals: string[] = [];

  const requiredFields = ['id', 'name', 'description', 'trigger_expr', 'severity', 'provenance'];

  signalGroups.forEach((group: any) => {
    (group.signals || []).forEach((signal: any) => {
      const missingFields = requiredFields.filter(field => !(field in signal));
      if (missingFields.length > 0) {
        incompleteSignals.push(`${signal.id || signal.name}: missing [${missingFields.join(', ')}]`);
      }
    });
  });

  return {
    question: "Do all signals have required fields (id, name, description, trigger_expr, severity, provenance)?",
    result: incompleteSignals.length === 0 ? 'YES' : 'NO',
    incomplete_signals: incompleteSignals
  };
}

/**
 * Check 8: Questions schema
 */
function checkQuestionsSchema(plan: PlannerPlan): ValidationChecklist['questions_schema'] {
  const config: any = (plan as any).clinical_config || (plan as any).hac_config || {};
  const questions = config.questions || {};

  const hasMetricQuestions = 'metric_questions' in questions;
  const hasFollowupQuestions = 'followup_questions' in questions;

  let foundStructure: string;
  if (hasMetricQuestions) {
    foundStructure = "'metric_questions' ✓";
  } else if (hasFollowupQuestions) {
    foundStructure = "'followup_questions' (WRONG - should be 'metric_questions')";
  } else {
    foundStructure = "No recognized questions structure";
  }

  return {
    question: "Does questions section have 'metric_questions' array (NOT 'followup_questions')?",
    result: hasMetricQuestions ? 'YES' : 'NO',
    found_structure: foundStructure
  };
}

/**
 * Check 9: Version number
 */
function checkVersionNumber(plan: PlannerPlan): ValidationChecklist['version_number'] {
  const actualVersion = plan.plan_metadata?.planner_version || 'unknown';
  const expectedVersion = '7.1.1';

  return {
    question: `Is planner_version set to '${expectedVersion}'?`,
    result: actualVersion === expectedVersion ? 'YES' : 'NO',
    actual_version: actualVersion
  };
}

/**
 * Check 10: Rationale completeness
 */
function checkRationaleCompleteness(plan: PlannerPlan): ValidationChecklist['rationale_completeness'] {
  const rationale = plan.rationale || {};
  const concernsCount = (rationale.concerns || []).length;
  const recommendationsCount = (rationale.recommendations || []).length;

  return {
    question: "Does rationale have ≥3 concerns and ≥3 recommendations?",
    result: (concernsCount >= 3 && recommendationsCount >= 3) ? 'YES' : 'NO',
    concerns_count: concernsCount,
    recommendations_count: recommendationsCount
  };
}

/**
 * Generate errors from checklist
 */
function generateErrorsFromChecklist(checklist: ValidationChecklist): string[] {
  const errors: string[] = [];

  // Check 1: Root object
  if (checklist.root_object_check.result === 'NO') {
    errors.push(`Root object naming violation: ${checklist.root_object_check.details}`);
  }

  // Check 2: Required sections
  if (checklist.required_sections.result === 'NO') {
    checklist.required_sections.missing_sections.forEach(section => {
      errors.push(`Missing required section: ${section}`);
    });
  }

  // Check 3: Signal grouping
  if (checklist.signal_grouping.result === 'NO') {
    if (checklist.signal_grouping.count !== checklist.signal_grouping.expected_count) {
      errors.push(`Signal group count mismatch: found ${checklist.signal_grouping.count}, expected ${checklist.signal_grouping.expected_count}`);
    }
    checklist.signal_grouping.actual_groups.forEach(groupId => {
      if (!checklist.signal_grouping.expected_groups.includes(groupId)) {
        errors.push(`Invalid signal group_id: '${groupId}' (expected one of: ${checklist.signal_grouping.expected_groups.join(', ')})`);
      }
    });
  }

  // Check 4: Provenance on signals
  if (checklist.provenance_signals.result === 'NO') {
    checklist.provenance_signals.signals_missing_provenance.forEach(signalId => {
      errors.push(`Signal '${signalId}' missing provenance`);
    });
  }

  // Check 5: Provenance on criteria
  if (checklist.provenance_criteria.result === 'NO') {
    checklist.provenance_criteria.rules_missing_provenance.forEach(ruleId => {
      errors.push(`Criterion '${ruleId}' missing provenance`);
    });
  }

  // Check 6: No placeholders
  if (checklist.no_placeholders.result === 'NO') {
    checklist.no_placeholders.placeholder_violations.slice(0, 5).forEach(violation => {
      errors.push(`Placeholder violation: ${violation}`);
    });
    if (checklist.no_placeholders.placeholder_violations.length > 5) {
      errors.push(`... and ${checklist.no_placeholders.placeholder_violations.length - 5} more placeholder violations`);
    }
  }

  // Check 7: Signal schema completeness
  if (checklist.signal_schema_completeness.result === 'NO') {
    checklist.signal_schema_completeness.incomplete_signals.slice(0, 5).forEach(signal => {
      errors.push(`Incomplete signal: ${signal}`);
    });
    if (checklist.signal_schema_completeness.incomplete_signals.length > 5) {
      errors.push(`... and ${checklist.signal_schema_completeness.incomplete_signals.length - 5} more incomplete signals`);
    }
  }

  // Check 8: Questions schema
  if (checklist.questions_schema.result === 'NO') {
    errors.push(`Questions schema violation: ${checklist.questions_schema.found_structure}`);
  }

  // Check 9: Version number
  if (checklist.version_number.result === 'NO') {
    errors.push(`Version mismatch: planner_version is '${checklist.version_number.actual_version}' but should be '7.1.1'`);
  }

  // Check 10: Rationale completeness
  if (checklist.rationale_completeness.result === 'NO') {
    if (checklist.rationale_completeness.concerns_count < 3) {
      errors.push(`Rationale has only ${checklist.rationale_completeness.concerns_count} concerns (need 3)`);
    }
    if (checklist.rationale_completeness.recommendations_count < 3) {
      errors.push(`Rationale has only ${checklist.rationale_completeness.recommendations_count} recommendations (need 3)`);
    }
  }

  return errors;
}

/**
 * Generate warnings
 */
function generateWarnings(plan: PlannerPlan, checklist: ValidationChecklist): string[] {
  const warnings: string[] = [];

  // Check for low confidence (V1 plans only)
  const confidence = (plan.plan_metadata as any)?.confidence;
  if (confidence !== undefined && confidence < 0.8) {
    warnings.push(`Overall confidence score below 0.8: ${confidence}`);
  }

  // Check for non-pediatric domain
  const config: any = (plan as any).clinical_config || (plan as any).hac_config || {};
  const domainName = config.domain?.name || '';
  if (!domainName.toLowerCase().includes('pediatric') &&
      !domainName.toLowerCase().includes('picu') &&
      !domainName.toLowerCase().includes('nicu')) {
    warnings.push(`Domain name '${domainName}' does not specify pediatric context`);
  }

  return warnings;
}

/**
 * Calculate adherence score
 */
function calculateAdherenceScore(checklist: ValidationChecklist): number {
  const weights = {
    root_object_check: 10,
    signal_grouping: 20,
    required_sections: 25,
    no_placeholders: 15,
    provenance_signals: 7.5,
    provenance_criteria: 7.5,
    signal_schema_completeness: 10,
    questions_schema: 3,
    version_number: 1,
    rationale_completeness: 1
  };

  let totalScore = 0;
  let totalWeight = 0;

  Object.entries(checklist).forEach(([key, value]) => {
    const weight = weights[key as keyof typeof weights] || 0;
    totalWeight += weight;
    if (value.result === 'YES') {
      totalScore += weight;
    }
  });

  return Math.round((totalScore / totalWeight) * 100);
}

/**
 * Pretty print validation results
 */
export function printValidationResults(result: ExternalValidationResult): void {
  console.log('\n' + '='.repeat(80));
  console.log('📋 V7.1 EXTERNAL VALIDATION RESULTS');
  console.log('='.repeat(80));

  console.log(`\n✅ Overall Status: ${result.is_valid ? '✓ VALID' : '✗ INVALID'}`);
  console.log(`📊 Adherence Score: ${result.adherence_score}%`);
  console.log(`🔍 Schema Valid: ${result.schema_valid ? '✓' : '✗'}`);
  console.log(`📋 Business Rules Valid: ${result.business_rules_valid ? '✓' : '✗'}`);

  console.log('\n' + '-'.repeat(80));
  console.log('VALIDATION CHECKLIST');
  console.log('-'.repeat(80));

  Object.entries(result.validation_checklist).forEach(([key, value]) => {
    const icon = value.result === 'YES' ? '✅' : '❌';
    console.log(`${icon} ${value.question}`);
    console.log(`   Result: ${value.result}`);
    if ('details' in value) {
      console.log(`   Details: ${value.details}`);
    }
  });

  if (result.errors.length > 0) {
    console.log('\n' + '-'.repeat(80));
    console.log(`❌ ERRORS (${result.errors.length})`);
    console.log('-'.repeat(80));
    result.errors.forEach((error, i) => {
      console.log(`${i + 1}. ${error}`);
    });
  }

  if (result.warnings.length > 0) {
    console.log('\n' + '-'.repeat(80));
    console.log(`⚠️  WARNINGS (${result.warnings.length})`);
    console.log('-'.repeat(80));
    result.warnings.forEach((warning, i) => {
      console.log(`${i + 1}. ${warning}`);
    });
  }

  console.log('\n' + '='.repeat(80) + '\n');
}
