/**
 * KDIGO AKI Staging Calculator
 *
 * Implements KDIGO 2012 AKI staging criteria
 * Pediatric-validated
 */

import { BaseClinicalTool, ClinicalToolResult } from './baseTool';

export interface KDIGOInputs {
  current_scr: number;      // mg/dL
  baseline_scr: number;     // mg/dL
  urine_output?: {
    volume_ml: number;
    duration_hours: number;
    weight_kg: number;
  };
}

export interface KDIGOResult extends ClinicalToolResult {
  aki_present: boolean;
  aki_stage: 0 | 1 | 2 | 3;
  rationale: string;
  scr_ratio: number;
  scr_stage: number;
  uop_stage: number;
  provenance: {
    tool: string;
    version: string;
    url: string;
  };
}

export class KDIGOAKIStaging extends BaseClinicalTool {
  tool_id = 'kdigo-aki-staging';
  tool_name = 'KDIGO AKI Staging';
  version = 'v2012';
  url = 'https://kdigo.org/guidelines/acute-kidney-injury/';
  pediatric_validated = true;

  /**
   * Calculate KDIGO AKI Stage
   *
   * Criteria (pediatric-adapted):
   * - Stage 1: SCr 1.5-1.9x baseline OR UOP <0.5 ml/kg/h for 6-12h
   * - Stage 2: SCr 2.0-2.9x baseline OR UOP <0.5 ml/kg/h for ≥12h
   * - Stage 3: SCr ≥3.0x baseline OR UOP <0.3 ml/kg/h for ≥24h OR anuria ≥12h
   */
  calculate(inputs: KDIGOInputs): KDIGOResult {
    // Calculate SCr-based stage
    const scrRatio = inputs.current_scr / inputs.baseline_scr;
    let scrStage = 0;

    if (scrRatio >= 3.0) {
      scrStage = 3;
    } else if (scrRatio >= 2.0) {
      scrStage = 2;
    } else if (scrRatio >= 1.5) {
      scrStage = 1;
    }

    // Calculate UOP-based stage
    let uopStage = 0;
    if (inputs.urine_output) {
      const uopRate = inputs.urine_output.volume_ml /
                      (inputs.urine_output.weight_kg * inputs.urine_output.duration_hours);

      if (uopRate < 0.3 && inputs.urine_output.duration_hours >= 24) {
        uopStage = 3;
      } else if (uopRate === 0 && inputs.urine_output.duration_hours >= 12) {
        uopStage = 3; // Anuria
      } else if (uopRate < 0.5 && inputs.urine_output.duration_hours >= 12) {
        uopStage = 2;
      } else if (uopRate < 0.5 && inputs.urine_output.duration_hours >= 6) {
        uopStage = 1;
      }
    }

    // Final stage is the maximum of SCr and UOP stages
    const akiStage = Math.max(scrStage, uopStage) as 0 | 1 | 2 | 3;

    return {
      aki_present: akiStage > 0,
      aki_stage: akiStage,
      scr_ratio: scrRatio,
      scr_stage: scrStage,
      uop_stage: uopStage,
      rationale: `SCr ratio: ${scrRatio.toFixed(2)}x baseline (stage ${scrStage}). ` +
                 `UOP stage: ${uopStage}. Final stage: ${akiStage}`,
      provenance: {
        tool: this.tool_name,
        version: this.version,
        url: this.url
      }
    };
  }

  /**
   * Generate HAC signals from KDIGO result
   */
  generateSignals(result: KDIGOResult): any[] {
    if (!result.aki_present) return [];

    const signals: any[] = [];

    // Stage 1 signal
    if (result.aki_stage >= 1) {
      signals.push({
        id: 'aki_stage_1_present',
        name: 'AKI Stage 1 Present',
        description: 'KDIGO AKI Stage 1 detected (mild)',
        review_group: 'clinical_insights',
        trigger_expr: 'kdigo_aki_stage >= 1',
        severity: 'info',
        provenance: {
          source: this.tool_name,
          source_url: this.url,
          confidence: 0.98
        }
      });
    }

    // Stage 2+ signal (more concerning)
    if (result.aki_stage >= 2) {
      signals.push({
        id: 'aki_stage_2_or_higher',
        name: `AKI Stage ${result.aki_stage}`,
        description: `KDIGO AKI Stage ${result.aki_stage} detected (${result.aki_stage === 2 ? 'moderate' : 'severe'})`,
        review_group: 'clinical_insights',
        trigger_expr: `kdigo_aki_stage >= 2`,
        severity: result.aki_stage === 3 ? 'error' : 'warn',
        provenance: {
          source: this.tool_name,
          source_url: this.url,
          confidence: 0.98
        }
      });
    }

    return signals;
  }
}
