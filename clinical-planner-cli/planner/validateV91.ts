/**
 * V9.1 Plan Validation
 *
 * Primary validator implementing 3-Tier Quality Model:
 * - Tier 1: Structural correctness (CRITICAL - re-validated)
 * - Tier 2: Semantic correctness (HIGH/MEDIUM - warnings only)
 * - Tier 3: Clinical quality (handled by qualityAssessment.ts)
 */

import { PlannerPlan } from '../models/PlannerPlan';
import { recordPlanValidationResult } from '../refinery/observation/ObservationHooks';
import {
  HAC_GROUP_DEFINITIONS,
  ORTHO_GROUP_DEFINITIONS,
  ENDO_GROUP_DEFINITIONS
} from './domainRouter';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationChecklistItem {
  id: string;
  tier: 1 | 2;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  passed: boolean;
  message?: string;
  details?: string;
}

export interface PlanValidationResult {
  tiers: {
    tier1_passed: boolean;
    tier2_has_critical: boolean;
  };
  checklist: ValidationChecklistItem[];
  summary: {
    critical_count: number;
    high_count: number;
    medium_count: number;
    info_count: number;
  };
}

type DomainType = 'HAC' | 'Safety' | 'Orthopedics' | 'Endocrinology' | 'Cardiology' | 'Neurology' | 'Gastroenterology' | 'Neonatology' | 'Nephrology' | 'Pulmonology' | 'Urology' | 'Behavioral Health' | 'Quality';
type ArchetypeType = 'Preventability_Detective' | 'Process_Auditor' | 'Data_Scavenger' | 'Exclusion_Hunter' | 'Outcome_Tracker';

// ============================================================================
// PRIMARY VALIDATION FUNCTION
// ============================================================================

/**
 * Validate V9.1 plan across Tier 1 (structural) and Tier 2 (semantic)
 * Returns real validation results - never dummy values
 */
export function validatePlanV91(plan: PlannerPlan): PlanValidationResult {
  const checklist: ValidationChecklistItem[] = [];

  // TIER 1: Structural Validation (paranoid re-check)
  checklist.push(checkT1_SchemaCompleteness(plan));
  checklist.push(checkT1_FiveGroupRule(plan));
  checklist.push(checkT1_EvidenceTypes(plan));
  checklist.push(checkT1_ToolReferences(plan));

  // TIER 2: Semantic Validation
  checklist.push(checkT2_TemplateMatch(plan));
  checklist.push(checkT2_ArchetypeCompatibility(plan));
  checklist.push(checkT2_ProvenanceSources(plan));
  checklist.push(checkT2_PediatricSafety(plan));
  checklist.push(checkT2_PromptKeywords(plan));
  checklist.push(checkT2_TaskPromptQuality(plan));
  checklist.push(checkT2_RankingAwareness(plan));

  // Calculate summary
  const tier1Items = checklist.filter(c => c.tier === 1);
  const tier2Items = checklist.filter(c => c.tier === 2);

  const tier1_passed = tier1Items.every(c => c.passed);
  const tier2_has_critical = tier2Items.some(c => !c.passed && c.severity === 'CRITICAL');

  const summary = {
    critical_count: checklist.filter(c => !c.passed && c.severity === 'CRITICAL').length,
    high_count: checklist.filter(c => !c.passed && c.severity === 'HIGH').length,
    medium_count: checklist.filter(c => !c.passed && c.severity === 'MEDIUM').length,
    info_count: checklist.filter(c => !c.passed && c.severity === 'INFO').length,
  };

  recordPlanValidationResult({
    runId: (plan as any)?.plan_metadata?.run_id,
    tier1Errors: summary.critical_count,
    tier2Warnings: summary.high_count + summary.medium_count + summary.info_count,
  });

  return {
    tiers: {
      tier1_passed,
      tier2_has_critical,
    },
    checklist,
    summary,
  };
}

// ============================================================================
// TIER 1: STRUCTURAL VALIDATION (CRITICAL)
// ============================================================================

/**
 * Tier 1 Check 1: Schema Completeness
 * Validates all 10 required sections are present in plan
 */
export function checkT1_SchemaCompleteness(plan: PlannerPlan): ValidationChecklistItem {
  const requiredSections = [
    'plan_metadata',
    'rationale',
    'clinical_config',
    'clinical_config.config_metadata',
    'clinical_config.domain',
    'clinical_config.surveillance',
    'clinical_config.signals',
    'clinical_config.timeline',
    'clinical_config.prompts',
    'clinical_config.criteria',
  ];

  const missingSections: string[] = [];

  for (const section of requiredSections) {
    if (!getNestedProperty(plan, section)) {
      missingSections.push(section);
    }
  }

  const passed = missingSections.length === 0;

  return {
    id: 'schema_completeness',
    tier: 1,
    severity: 'CRITICAL',
    passed,
    message: passed
      ? 'All 10 required sections present'
      : `Missing required sections: ${missingSections.join(', ')}`,
    details: passed ? undefined : `Found ${requiredSections.length - missingSections.length}/${requiredSections.length} sections`,
  };
}

/**
 * Tier 1 Check 2: Five-Group Rule
 * Validates exactly 5 signal groups exist (V9.1 requirement)
 */
export function checkT1_FiveGroupRule(plan: PlannerPlan): ValidationChecklistItem {
  const signalGroups = plan.clinical_config?.signals?.signal_groups || [];
  const groupCount = signalGroups.length;
  const passed = groupCount === 5;

  return {
    id: 'domain_structure_5_groups',
    tier: 1,
    severity: 'CRITICAL',
    passed,
    message: passed
      ? 'Exactly 5 signal groups present'
      : `Expected 5 signal groups, found ${groupCount}`,
    details: passed ? undefined : `Groups: ${signalGroups.map((g: any) => g.group_id).join(', ')}`,
  };
}

/**
 * Tier 1 Check 3: Evidence Types
 * Validates all signals have evidence_type (L1/L2/L3)
 */
export function checkT1_EvidenceTypes(plan: PlannerPlan): ValidationChecklistItem {
  const signalGroups = plan.clinical_config?.signals?.signal_groups || [];
  const allSignals: any[] = signalGroups.flatMap((g: any) => g.signals || []);

  const signalsWithoutEvidence = allSignals.filter(
    (s: any) => !s.evidence_type || !['L1', 'L2', 'L3'].includes(s.evidence_type)
  );

  const passed = signalsWithoutEvidence.length === 0;

  return {
    id: 'evidence_typing',
    tier: 1,
    severity: 'CRITICAL',
    passed,
    message: passed
      ? `All ${allSignals.length} signals have evidence_type`
      : `${signalsWithoutEvidence.length} signals missing evidence_type`,
    details: passed
      ? undefined
      : `Signals without evidence_type: ${signalsWithoutEvidence.map((s: any) => s.id).slice(0, 5).join(', ')}${signalsWithoutEvidence.length > 5 ? '...' : ''}`,
  };
}

/**
 * Tier 1 Check 4: Tool References
 * Validates all signal tool_ids reference existing clinical_tools
 */
export function checkT1_ToolReferences(plan: PlannerPlan): ValidationChecklistItem {
  const clinicalTools = plan.clinical_config?.clinical_tools || [];
  const toolIds = new Set(clinicalTools.map((t: any) => t.tool_id));

  const signalGroups = plan.clinical_config?.signals?.signal_groups || [];
  const allSignals: any[] = signalGroups.flatMap((g: any) => g.signals || []);

  const brokenReferences: string[] = [];

  allSignals.forEach((signal: any) => {
    if (signal.linked_tool_id && !toolIds.has(signal.linked_tool_id)) {
      brokenReferences.push(`${signal.id} → ${signal.linked_tool_id}`);
    }
  });

  const passed = brokenReferences.length === 0;

  return {
    id: 'dependency_integrity',
    tier: 1,
    severity: 'CRITICAL',
    passed,
    message: passed
      ? 'All signal tool references valid'
      : `${brokenReferences.length} broken tool references`,
    details: passed
      ? undefined
      : `Broken: ${brokenReferences.slice(0, 3).join(', ')}${brokenReferences.length > 3 ? '...' : ''}`,
  };
}

// ============================================================================
// TIER 2: SEMANTIC VALIDATION (HIGH/MEDIUM)
// ============================================================================

/**
 * Tier 2 Check 1: Template Match
 * Validates signal groups match domain-specific template structure
 */
export function checkT2_TemplateMatch(plan: PlannerPlan): ValidationChecklistItem {
  const domain = plan.clinical_config?.config_metadata?.domain || plan.clinical_config?.domain;
  const signalGroups = plan.clinical_config?.signals?.signal_groups || [];

  // Get expected groups for domain
  const expectedGroups = getExpectedGroupIds(domain);
  const actualGroupIds = signalGroups.map((g: any) => g.group_id);

  // Check for missing groups
  const missingGroups = expectedGroups.filter(g => !actualGroupIds.includes(g));

  // Check for unexpected groups
  const unexpectedGroups = actualGroupIds.filter(g => !expectedGroups.includes(g));

  const passed = missingGroups.length === 0 && unexpectedGroups.length === 0;

  let message = '';
  if (passed) {
    message = `All signal groups match ${domain} template`;
  } else {
    const issues: string[] = [];
    if (missingGroups.length > 0) {
      issues.push(`missing: ${missingGroups.join(', ')}`);
    }
    if (unexpectedGroups.length > 0) {
      issues.push(`unexpected: ${unexpectedGroups.join(', ')}`);
    }
    message = `Template mismatch - ${issues.join('; ')}`;
  }

  return {
    id: 'template_compliance',
    tier: 2,
    severity: 'HIGH',
    passed,
    message,
    details: passed ? undefined : `Expected groups: ${expectedGroups.join(', ')}`,
  };
}

/**
 * Tier 2 Check 2: Archetype Compatibility
 * Validates archetype is compatible with domain
 */
export function checkT2_ArchetypeCompatibility(plan: PlannerPlan): ValidationChecklistItem {
  const domain = (plan.clinical_config?.config_metadata?.domain || plan.clinical_config?.domain) as DomainType;
  const archetype = plan.clinical_config?.config_metadata?.archetype as ArchetypeType;

  const allowedArchetypes = getAllowedArchetypesForDomain(domain);
  const passed = allowedArchetypes.includes(archetype);

  return {
    id: 'archetype_selection',
    tier: 2,
    severity: 'CRITICAL',
    passed,
    message: passed
      ? `Archetype '${archetype}' is valid for ${domain}`
      : `Archetype '${archetype}' not allowed for ${domain} domain`,
    details: passed
      ? undefined
      : `Allowed archetypes for ${domain}: ${allowedArchetypes.join(', ')}`,
  };
}

/**
 * Tier 2 Check 3: Provenance Sources
 * Validates provenance sources are appropriate for domain
 */
export function checkT2_ProvenanceSources(plan: PlannerPlan): ValidationChecklistItem {
  const domain = (plan.clinical_config?.config_metadata?.domain || plan.clinical_config?.domain) as string;
  const signalGroups = plan.clinical_config?.signals?.signal_groups || [];
  const allSignals: any[] = signalGroups.flatMap((g: any) => g.signals || []);

  const inappropriateSources: string[] = [];

  // Define appropriate sources per domain
  const appropriateSources: Record<string, string[]> = {
    'HAC': ['NHSN', 'CDC', 'AHRQ', 'SPS', 'CMS'],
    'Safety': ['NHSN', 'CDC', 'AHRQ', 'SPS', 'CMS'],
    'Orthopedics': ['USNWR', 'AAOS', 'CMS', 'AOA'],
    'Endocrinology': ['ADA', 'AACE', 'Endocrine Society', 'CMS'],
    'Quality': ['USNWR', 'CMS', 'AHRQ', 'NQF'],
  };

  const expectedSources = appropriateSources[domain] || [];

  allSignals.forEach((signal: any) => {
    if (signal.provenance?.source) {
      const source = signal.provenance.source;
      const isAppropriate = expectedSources.some(expected =>
        source.toUpperCase().includes(expected.toUpperCase())
      );

      if (!isAppropriate) {
        inappropriateSources.push(`${signal.id}: ${source}`);
      }
    }
  });

  const passed = inappropriateSources.length === 0;

  return {
    id: 'provenance_safety',
    tier: 2,
    severity: 'CRITICAL',
    passed,
    message: passed
      ? `All provenance sources appropriate for ${domain}`
      : `${inappropriateSources.length} signals have inappropriate sources`,
    details: passed
      ? undefined
      : `Expected sources: ${expectedSources.join(', ')}. Issues: ${inappropriateSources.slice(0, 3).join('; ')}`,
  };
}

/**
 * Tier 2 Check 4: Pediatric Safety
 * Validates no adult-only clinical terminology is present
 */
export function checkT2_PediatricSafety(plan: PlannerPlan): ValidationChecklistItem {
  const adultOnlyTerms = [
    'SOFA', 'qSOFA', 'APACHE', 'MELD', 'CURB-65',
    'geriatric', 'elderly', 'nursing home', 'assisted living',
  ];

  const rationale = plan.rationale || {};
  const systemPrompt = plan.clinical_config?.prompts?.system_prompt || '';
  const taskPrompts = plan.clinical_config?.prompts?.task_prompts || {};

  const allText = [
    JSON.stringify(rationale),
    systemPrompt,
    JSON.stringify(taskPrompts),
  ].join(' ').toLowerCase();

  const foundAdultTerms: string[] = [];

  adultOnlyTerms.forEach(term => {
    if (allText.includes(term.toLowerCase())) {
      foundAdultTerms.push(term);
    }
  });

  const passed = foundAdultTerms.length === 0;

  return {
    id: 'pediatric_compliance',
    tier: 2,
    severity: 'HIGH',
    passed,
    message: passed
      ? 'No adult-only terminology found'
      : `Found adult-only terms: ${foundAdultTerms.join(', ')}`,
    details: passed
      ? undefined
      : 'Plan contains terminology inappropriate for pediatric populations',
  };
}

/**
 * Tier 2 Check 5: Prompt Keywords
 * Validates system prompt contains archetype-specific keywords
 */
export function checkT2_PromptKeywords(plan: PlannerPlan): ValidationChecklistItem {
  const archetype = plan.clinical_config?.config_metadata?.archetype as ArchetypeType;
  const systemPrompt = (plan.clinical_config?.prompts?.system_prompt || '').toLowerCase();

  const archetypeKeywords = getArchetypeKeywords(archetype);
  const requiredKeywords = archetypeKeywords.required;

  const missingKeywords = requiredKeywords.filter(
    keyword => !systemPrompt.includes(keyword.toLowerCase())
  );

  const passed = missingKeywords.length === 0;

  return {
    id: 'prompt_archetype_alignment',
    tier: 2,
    severity: 'MEDIUM',
    passed,
    message: passed
      ? `System prompt aligns with ${archetype} archetype`
      : `System prompt missing archetype keywords: ${missingKeywords.join(', ')}`,
    details: passed
      ? undefined
      : `Required keywords for ${archetype}: ${requiredKeywords.join(', ')}`,
  };
}

/**
 * Tier 2 Check 6: Task Prompt Quality
 * Validates task prompts have specific, actionable instructions
 */
export function checkT2_TaskPromptQuality(plan: PlannerPlan): ValidationChecklistItem {
  const taskPrompts = plan.clinical_config?.prompts?.task_prompts || {};

  const requiredTasks = [
    { name: 'patient_event_summary', keywords: ['summary', 'timeline', 'patient', 'event'] },
    { name: 'enrichment', keywords: ['signal', 'extract', 'identify', 'finding'] },
    { name: 'qa', keywords: ['validate', 'check', 'verify', 'consistency'] },
  ];

  const issues: string[] = [];

  requiredTasks.forEach(task => {
    const prompt = (taskPrompts as any)[task.name];

    if (!prompt || !prompt.instruction) {
      issues.push(`${task.name}: missing instruction`);
    } else {
      const instruction = prompt.instruction.toLowerCase();
      const matchingKeywords = task.keywords.filter(k => instruction.includes(k));

      if (matchingKeywords.length < 2) {
        issues.push(`${task.name}: weak specificity (found: ${matchingKeywords.join(', ') || 'none'})`);
      }

      if (instruction.length < 50) {
        issues.push(`${task.name}: too short (${instruction.length} chars)`);
      }
    }
  });

  const passed = issues.length === 0;

  return {
    id: 'task_prompt_quality',
    tier: 2,
    severity: 'MEDIUM',
    passed,
    message: passed
      ? 'All task prompts have specific instructions'
      : `Task prompt issues: ${issues.slice(0, 3).join('; ')}`,
    details: passed ? undefined : `Total issues: ${issues.length}`,
  };
}

/**
 * Tier 2 Check 7: Ranking Awareness
 * Validates that plans for highly-ranked specialties emphasize quality levers
 *
 * Goal: Drive Lurie toward #1 by ensuring ranked specialties have enhanced focus
 */
export function checkT2_RankingAwareness(plan: PlannerPlan): ValidationChecklistItem {
  const { getRankingForConcern, getSignalEmphasis } = require('../utils/rankingsLoader');

  const concernId = plan.clinical_config?.config_metadata?.concern_id || '';
  const domain = plan.clinical_config?.domain?.name || plan.clinical_config?.domain || '';

  // Check if this concern has ranking data
  const rankingInfo = getRankingForConcern(concernId);

  // If not a ranked specialty, pass automatically (INFO level)
  if (!rankingInfo) {
    return {
      id: 'ranking_awareness',
      tier: 2,
      severity: 'INFO',
      passed: true,
      message: 'Not a ranked specialty - ranking awareness not applicable',
    };
  }

  const { specialty, ranking } = rankingInfo;

  // For highly-ranked specialties (top 20), validate emphasis on quality
  if (ranking.rank > 20) {
    return {
      id: 'ranking_awareness',
      tier: 2,
      severity: 'INFO',
      passed: true,
      message: `Ranked #${ranking.rank} in ${specialty} - outside top 20`,
    };
  }

  // Get signal groups that should be emphasized
  const emphasizedGroups = getSignalEmphasis(domain as DomainType);
  const signalGroups = plan.clinical_config?.signals?.signal_groups || [];
  const groupIds = signalGroups.map(g => g.group_id as string);

  // Check if emphasized groups are present
  const missingEmphasis = emphasizedGroups.filter((eg: string) => !groupIds.includes(eg));

  // Check if prompts mention ranking context (ranked, quality, excellence, etc.)
  const systemPrompt = (plan.clinical_config?.prompts?.system_prompt || '').toLowerCase();
  const hasRankingContext = systemPrompt.includes('ranked') ||
                           systemPrompt.includes('quality') ||
                           systemPrompt.includes('excellence') ||
                           systemPrompt.includes('reputation');

  const issues: string[] = [];
  if (missingEmphasis.length > 0) {
    issues.push(`Missing emphasized signal groups: ${missingEmphasis.join(', ')}`);
  }
  if (!hasRankingContext) {
    issues.push('System prompt lacks ranking/quality context');
  }

  const passed = issues.length === 0;

  return {
    id: 'ranking_awareness',
    tier: 2,
    severity: 'HIGH',
    passed,
    message: passed
      ? `Ranked specialty (#${ranking.rank} in ${specialty}) - quality emphasis present`
      : `Ranked #${ranking.rank} in ${specialty} - ${issues.join('; ')}`,
    details: passed
      ? `This plan emphasizes quality levers appropriate for ${specialty} ranking`
      : `To improve ranking: ${emphasizedGroups.join(', ')} should be present and well-defined`,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get expected signal group IDs for a domain
 */
function getExpectedGroupIds(domain: any): string[] {
  const domainStr = typeof domain === 'string' ? domain : domain?.name || '';
  const domainLower = domainStr.toLowerCase();

  if (domainLower.includes('ortho') || domainLower.includes('cardio')) {
    return ORTHO_GROUP_DEFINITIONS.map(g => g.group_id);
  } else if (domainLower.includes('endo') || domainLower.includes('diabetes')) {
    return ENDO_GROUP_DEFINITIONS.map(g => g.group_id);
  } else {
    // HAC/Safety/default
    return HAC_GROUP_DEFINITIONS.map(g => g.group_id);
  }
}

/**
 * Get allowed archetypes for a domain
 */
function getAllowedArchetypesForDomain(domain: DomainType): ArchetypeType[] {
  switch (domain) {
    case 'HAC':
    case 'Safety':
      return ['Preventability_Detective', 'Exclusion_Hunter'];
    case 'Orthopedics':
      return ['Process_Auditor'];
    case 'Endocrinology':
      return ['Preventability_Detective', 'Exclusion_Hunter', 'Data_Scavenger'];
    case 'Cardiology':
    case 'Gastroenterology':
    case 'Nephrology':
    case 'Neurology':
      return ['Outcome_Tracker', 'Exclusion_Hunter'];
    case 'Neonatology':
      return ['Preventability_Detective'];
    case 'Pulmonology':
    case 'Urology':
    case 'Behavioral Health':
      return ['Process_Auditor'];
    case 'Quality':
      return ['Exclusion_Hunter', 'Process_Auditor'];
    default:
      return ['Preventability_Detective'];
  }
}

/**
 * Get archetype-specific keywords
 */
function getArchetypeKeywords(archetype: ArchetypeType): {
  required: string[];
  encouraged: string[];
} {
  switch (archetype) {
    case 'Preventability_Detective':
      return {
        required: ['preventable', 'bundle', 'care'],
        encouraged: ['intervention', 'timing', 'hospital-acquired', 'compliance'],
      };
    case 'Process_Auditor':
      return {
        required: ['process', 'timing', 'protocol'],
        encouraged: ['delay', 'adherence', 'guideline', 'documentation'],
      };
    case 'Data_Scavenger':
      return {
        required: ['data', 'missing', 'laboratory'],
        encouraged: ['value', 'measurement', 'completeness', 'external'],
      };
    case 'Exclusion_Hunter':
      return {
        required: ['exclusion', 'rule out', 'criteria'],
        encouraged: ['competing', 'exception', 'eligibility', 'contraindication'],
      };
    case 'Outcome_Tracker':
      return {
        required: ['outcome', 'survival', 'complication'],
        encouraged: ['readmission', 'mortality', 'postoperative', 'adverse event'],
      };
    default:
      return { required: [], encouraged: [] };
  }
}

/**
 * Get nested property by path
 */
function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

/**
 * Print validation results to console
 */
export function printValidationResults(result: PlanValidationResult): void {
  console.log('\n📋 V9.1 Validation Results:');
  console.log(`   Tier 1 (Structural): ${result.tiers.tier1_passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Tier 2 (Semantic): ${result.tiers.tier2_has_critical ? '⚠️ CRITICAL ISSUES' : '✅ PASS'}`);

  console.log('\n   Summary:');
  console.log(`     Critical: ${result.summary.critical_count}`);
  console.log(`     High: ${result.summary.high_count}`);
  console.log(`     Medium: ${result.summary.medium_count}`);
  console.log(`     Info: ${result.summary.info_count}`);

  console.log('\n   Checklist:');
  result.checklist.forEach(item => {
    const icon = item.passed ? '✅' : '❌';
    const tier = `[Tier ${item.tier}]`;
    const severity = `[${item.severity}]`;
    console.log(`     ${icon} ${tier} ${severity} ${item.id}`);
    if (item.message) {
      console.log(`        → ${item.message}`);
    }
    if (item.details) {
      console.log(`        ℹ️ ${item.details}`);
    }
  });

  console.log();
}
