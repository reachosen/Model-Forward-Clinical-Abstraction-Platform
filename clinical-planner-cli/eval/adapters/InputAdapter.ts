import { TestCase } from '../../flywheel/validation/types';
import { PlanningInput } from '../../models/PlannerPlan';

/**
 * E2: InputAdapter
 * 
 * Maps TestCase (eval format) to PlanningInput (Planner Engine format).
 * Centralizes hand-off logic including patient_payload resolution.
 */
export class InputAdapter {
  /**
   * Adapt a TestCase to PlanningInput
   */
  static adapt(testCase: TestCase): PlanningInput {
    return {
      planning_input_id: testCase.test_id,
      concern: testCase.concern_id,
      // Default to surveillance intent for eval cases
      intent: 'surveillance',
      // domain_hint will be resolved by S1 from concern_id
      domain_hint: undefined as any, 
      target_population: 'General', // Fallback
      specific_requirements: [],
      
      clinical_context: {
        objective: testCase.description,
        patient_payload: testCase.patient_payload,
      },
      
      metadata: {
        notes: testCase.patient_payload, // Fallback for legacy support
        test_id: testCase.test_id,
      },
      
      // Minimal data profile to satisfy schema
      data_profile: {
        sources: [
          {
            source_id: 'EHR',
            type: 'EHR',
            available_data: ['notes', 'labs', 'meds'],
          },
        ],
      },
    };
  }
}
