/**
 * hac_rules.ts
 * Repository of HAC rule sets and criteria
 */

export interface HacRuleCriterion {
  id: string;
  name: string;
  description: string;
  logic?: string;
  type?: string;
  age_range?: string;
  required_signals?: string[];
  rationale?: string;
}

export interface HacRuleSet {
  id: string;
  framework: string;
  criteria: HacRuleCriterion[];
}

export function getHacRuleSet(ruleSetId: string): HacRuleSet {
  // Default mock rule set if specific ID not found
  return {
    id: ruleSetId,
    framework: 'NHSN',
    criteria: [
      {
        id: `${ruleSetId.toLowerCase()}_crit_1`,
        name: 'Primary Infection Criterion',
        description: 'Patient has a recognized pathogen identified from one or more blood specimens',
        logic: 'Laboratory confirmed bloodstream infection',
        type: 'inclusion',
        rationale: 'NHSN LCBI Criterion 1'
      },
      {
        id: `${ruleSetId.toLowerCase()}_crit_2`,
        name: 'Common Commensal Criterion',
        description: 'Patient has at least two blood cultures drawn on separate occasions',
        logic: 'Organism identified in blood is not related to an infection at another site',
        type: 'inclusion',
        rationale: 'NHSN LCBI Criterion 2'
      }
    ]
  };
}