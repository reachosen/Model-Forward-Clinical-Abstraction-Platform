/**
 * Plan Assessment Module
 *
 * @deprecated This file is deprecated and will be removed in v10.0.
 * For V9.1 plans, use validatePlanV91() from './validateV91.ts' for validation.
 * For comprehensive quality assessment, use assessPlanQuality() from './qualityAssessment.ts'.
 * This module is maintained for backward compatibility with V1/V2 plans only.
 *
 * Generates validation results and quality assessment for planner output
 */

import { PlannerPlan, HACConfig } from '../models/PlannerPlan';

// Deprecation warning flags (only warn once per process)
let hasWarnedValidation = false;
let hasWarnedQuality = false;

export interface ValidationResult {
    is_valid: boolean;
    errors: string[];
    warnings: string[];
    schema_valid: boolean;
    business_rules_valid: boolean;
}

export interface QualityDimensions {
    completeness: number;        // 0-1: Are all required fields present?
    clinical_accuracy: number;   // 0-1: Does configuration make clinical sense?
    data_feasibility: number;    // 0-1: Can signals be extracted from typical EHR?
    parsimony: number;          // 0-1: Is configuration lean/focused?
}

export interface QualityAssessment {
    overall_score: number;       // 0-1: Weighted average of dimensions
    dimensions: QualityDimensions;
    requires_review: boolean;    // True if score < 0.7 or critical issues found
    review_priority: 'low' | 'medium' | 'high';
    flagged_areas: string[];     // Specific areas requiring attention
}

/**
 * Assess plan validation
 * Returns structured validation result with errors and warnings
 *
 * @deprecated Use validatePlanV91() from './validateV91.ts' for V9.1 plans.
 * This function will be removed in v10.0.
 */
export function assessValidation(plan: PlannerPlan): ValidationResult {
    // Runtime deprecation warning (only once per process)
    if (!hasWarnedValidation) {
        console.warn('\n⚠️  WARNING: assessValidation() is DEPRECATED and will be removed in v10.0');
        console.warn('   Use validatePlanV91() from "./validateV91.ts" for V9.1 plans instead.\n');
        hasWarnedValidation = true;
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Get the configuration (prefer clinical_config, fallback to hac_config)
    const config: any = (plan as any).clinical_config ?? (plan as any).hac_config; // Use 'any' for backward compatibility

    // Schema validation (basic structure checks)
    let schemaValid = true;
    if (!config) {
        errors.push('Missing config object (expected clinical_config or hac_config)');
        schemaValid = false;
    }

    // Check for planner_version in different possible locations
    const plannerVersion = (plan as any).planner_version || plan.plan_metadata?.planner_version;
    if (!plannerVersion) {
        warnings.push('Missing planner_version (expected plan_metadata.planner_version)');
    }

    // Check for timestamp in different possible locations
    const timestamp = (plan as any).created_at || plan.plan_metadata?.generated_at;
    if (!timestamp) {
        errors.push('Missing timestamp (expected plan_metadata.generated_at)');
        schemaValid = false;
    }

    if (!config) {
        return {
            is_valid: false,
            errors,
            warnings,
            schema_valid: schemaValid,
            business_rules_valid: false,
        };
    }

    // Business rule validation
    let businessRulesValid = true;

    // 1. max_findings must be 1-10
    if (config.config2080?.max_findings !== undefined) {
        const maxFindings = config.config2080.max_findings;
        if (maxFindings < 1 || maxFindings > 10) {
            errors.push(`config2080.max_findings must be between 1 and 10. Got ${maxFindings}`);
            businessRulesValid = false;
        }
    } else {
        warnings.push('config2080.max_findings not set, will use default');
    }

    // 2. min_confidence must be 0.5-0.95
    if (config.config2080?.min_confidence !== undefined) {
        const minConf = config.config2080.min_confidence;
        if (minConf < 0.5 || minConf > 0.95) {
            errors.push(`config2080.min_confidence must be between 0.5 and 0.95. Got ${minConf}`);
            businessRulesValid = false;
        }
        if (minConf < 0.7) {
            warnings.push('Low confidence threshold (<0.7) may produce many false positives');
        }
    } else {
        warnings.push('config2080.min_confidence not set, will use default');
    }

    // 3. Clinical review auto_run dependency
    if (config.phases?.clinical_review?.auto_run && !config.phases?.enrichment) {
        errors.push('If clinical_review.auto_run is true, enrichment phase must be enabled');
        businessRulesValid = false;
    }

    // 4. Prompt length checks
    const MAX_PROMPT_LENGTH = 10000;
    if (config.prompts?.system_prompt && config.prompts.system_prompt.length > MAX_PROMPT_LENGTH) {
        warnings.push(`System prompt exceeds recommended length (${MAX_PROMPT_LENGTH} chars)`);
    }
    if (config.prompts?.task_prompts?.enrichment && config.prompts.task_prompts.enrichment.length > MAX_PROMPT_LENGTH) {
        warnings.push(`Enrichment prompt exceeds recommended length (${MAX_PROMPT_LENGTH} chars)`);
    }
    if (config.prompts?.task_prompts?.qa && config.prompts.task_prompts.qa.length > MAX_PROMPT_LENGTH) {
        warnings.push(`QA prompt exceeds recommended length (${MAX_PROMPT_LENGTH} chars)`);
    }

    // 5. Questions configuration
    if (config.questions?.max_questions !== undefined) {
        if (config.questions.max_questions < 1 || config.questions.max_questions > 20) {
            errors.push(`questions.max_questions must be between 1 and 20. Got ${config.questions.max_questions}`);
            businessRulesValid = false;
        }
        if (config.questions.max_questions > 10) {
            warnings.push('Too many questions (>10) may overwhelm reviewers');
        }
    }

    const isValid = schemaValid && businessRulesValid;

    return {
        is_valid: isValid,
        errors,
        warnings,
        schema_valid: schemaValid,
        business_rules_valid: businessRulesValid,
    };
}

/**
 * Assess plan quality across multiple dimensions
 * Returns quality score and specific recommendations
 *
 * @deprecated Use assessPlanQuality() from './qualityAssessment.ts' for comprehensive quality assessment.
 * This function will be removed in v10.0.
 */
export function assessQuality(plan: PlannerPlan, validation: ValidationResult): QualityAssessment {
    // Runtime deprecation warning (only once per process)
    if (!hasWarnedQuality) {
        console.warn('\n⚠️  WARNING: assessQuality() is DEPRECATED and will be removed in v10.0');
        console.warn('   Use assessPlanQuality() from "./qualityAssessment.ts" for comprehensive quality assessment.\n');
        hasWarnedQuality = true;
    }

    const config: any = (plan as any).clinical_config ?? (plan as any).hac_config; // Use 'any' for backward compatibility
    const flaggedAreas: string[] = [];

    // Check if config exists
    if (!config) {
        return {
            overall_score: 0,
            dimensions: {
                completeness: 0,
                clinical_accuracy: 0,
                data_feasibility: 0,
                parsimony: 0,
            },
            requires_review: true,
            review_priority: 'high',
            flagged_areas: ['Plan configuration is completely missing'],
        };
    }

    // 1. Completeness: Are all critical fields present?
    let completeness = 1.0;
    const requiredFields = [
        'definition',
        'prompts',
        'phases',
        'config2080',
        'questions',
        'fieldMappings',
    ];
    requiredFields.forEach(field => {
        if (!config[field as keyof HACConfig]) {
            completeness -= 0.15;
            flaggedAreas.push(`Missing ${field} configuration`);
        }
    });

    // Check prompts completeness
    if (config.prompts) {
        if (!config.prompts.system_prompt) {
            completeness -= 0.05;
            flaggedAreas.push('Missing system prompt');
        }
        if (!config.prompts.task_prompts?.enrichment) {
            completeness -= 0.05;
            flaggedAreas.push('Missing enrichment prompt');
        }
        if (!config.prompts.task_prompts?.qa) {
            completeness -= 0.05;
            flaggedAreas.push('Missing QA prompt');
        }
    }

    completeness = Math.max(0, Math.min(1, completeness));

    // 2. Clinical Accuracy: Does configuration make clinical sense?
    let clinicalAccuracy = 0.85; // Start with baseline

    // Check if prompts contain clinical terminology
    const clinicalTermsFound = checkClinicalTerminology(config);
    if (clinicalTermsFound < 3) {
        clinicalAccuracy -= 0.15;
        flaggedAreas.push('Prompts lack sufficient clinical terminology');
    }

    // Check for appropriate question count
    if (config.questions?.max_questions) {
        if (config.questions.max_questions < 3) {
            clinicalAccuracy -= 0.1;
            flaggedAreas.push('Too few questions may miss important clinical details');
        }
    }

    clinicalAccuracy = Math.max(0, Math.min(1, clinicalAccuracy));

    // 3. Data Feasibility: Can signals be extracted from typical EHR?
    let dataFeasibility = 0.9; // Start optimistic

    // Check if signal_preferences are reasonable
    if (config.config2080?.signal_preferences) {
        const signalCount = config.config2080.signal_preferences.length;
        if (signalCount === 0) {
            dataFeasibility -= 0.2;
            flaggedAreas.push('No signals configured');
        }
        if (signalCount > 50) {
            dataFeasibility -= 0.1;
            flaggedAreas.push('Too many signals may impact performance');
        }
    }

    dataFeasibility = Math.max(0, Math.min(1, dataFeasibility));

    // 4. Parsimony: Is configuration lean and focused?
    let parsimony = 1.0;

    // Check prompt lengths
    if (config.prompts) {
        const totalPromptLength =
            (config.prompts.system_prompt?.length || 0) +
            (config.prompts.task_prompts?.enrichment?.length || 0) +
            (config.prompts.task_prompts?.qa?.length || 0);

        if (totalPromptLength > 15000) {
            parsimony -= 0.15;
            flaggedAreas.push('Prompts are very long, consider condensing');
        } else if (totalPromptLength > 10000) {
            parsimony -= 0.05;
        }
    }

    // Check max_findings
    if (config.config2080?.max_findings && config.config2080.max_findings > 7) {
        parsimony -= 0.1;
        flaggedAreas.push('High max_findings may reduce focus on critical cases');
    }

    parsimony = Math.max(0, Math.min(1, parsimony));

    // Calculate overall score (weighted average)
    const weights = {
        completeness: 0.3,
        clinical_accuracy: 0.35,
        data_feasibility: 0.2,
        parsimony: 0.15,
    };

    const overallScore =
        completeness * weights.completeness +
        clinicalAccuracy * weights.clinical_accuracy +
        dataFeasibility * weights.data_feasibility +
        parsimony * weights.parsimony;

    // Determine if review required
    const requiresReview =
        overallScore < 0.7 ||
        !validation.is_valid ||
        validation.errors.length > 0 ||
        flaggedAreas.length > 3;

    // Determine review priority
    let reviewPriority: 'low' | 'medium' | 'high' = 'low';
    if (!validation.is_valid || validation.errors.length > 0) {
        reviewPriority = 'high';
    } else if (overallScore < 0.6 || flaggedAreas.length > 3) {
        reviewPriority = 'high';
    } else if (overallScore < 0.75 || validation.warnings.length > 2) {
        reviewPriority = 'medium';
    }

    return {
        overall_score: overallScore,
        dimensions: {
            completeness,
            clinical_accuracy: clinicalAccuracy,
            data_feasibility: dataFeasibility,
            parsimony,
        },
        requires_review: requiresReview,
        review_priority: reviewPriority,
        flagged_areas: flaggedAreas,
    };
}

/**
 * Check if prompts contain clinical terminology
 * Returns count of clinical terms found
 */
function checkClinicalTerminology(config: any): number {
    const clinicalTerms = [
        'patient', 'clinical', 'diagnosis', 'symptom', 'treatment',
        'infection', 'procedure', 'medical', 'hospital', 'care',
        'assessment', 'review', 'criteria', 'indication', 'surveillance',
        'bloodstream', 'catheter', 'ventilator', 'surgical', 'device',
    ];

    const allText = [
        config.prompts?.system_prompt || '',
        config.prompts?.task_prompts?.enrichment || '',
        config.prompts?.task_prompts?.qa || '',
    ].join(' ').toLowerCase();

    let termCount = 0;
    clinicalTerms.forEach(term => {
        if (allText.includes(term)) {
            termCount++;
        }
    });

    return termCount;
}

/**
 * Generate comprehensive assessment of plan
 * Combines validation and quality assessment
 */
export function assessPlan(plan: PlannerPlan): {
    validation: ValidationResult;
    quality_assessment: QualityAssessment;
} {
    const validation = assessValidation(plan);
    const quality_assessment = assessQuality(plan, validation);

    // CRITICAL: Validation must also consider quality score
    // A plan with low quality score should NOT pass validation
    const QUALITY_THRESHOLD = 0.7;
    const qualityMeetsThreshold = quality_assessment.overall_score >= QUALITY_THRESHOLD;

    // Final validation status must satisfy BOTH business rules AND quality threshold
    const finalIsValid = validation.is_valid && qualityMeetsThreshold;

    // Add quality-based error if threshold not met
    const finalErrors = [...validation.errors];
    const finalWarnings = [...validation.warnings];

    if (!qualityMeetsThreshold && validation.is_valid) {
        // Business rules passed but quality is too low
        finalErrors.push(
            `Quality score ${Math.round(quality_assessment.overall_score * 100)}% is below threshold (${Math.round(QUALITY_THRESHOLD * 100)}%). ` +
            `Flagged areas: ${quality_assessment.flagged_areas.join(', ') || 'None specified'}`
        );
    }

    return {
        validation: {
            ...validation,
            is_valid: finalIsValid,
            errors: finalErrors,
            warnings: finalWarnings,
        },
        quality_assessment,
    };
}
