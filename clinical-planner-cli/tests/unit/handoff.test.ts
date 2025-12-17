import { S0_InputNormalizationStage } from '../../orchestrator/stages/S0_InputNormalization';
import { S5_TaskExecutionStage } from '../../orchestrator/stages/S5_TaskExecution';
import { PlanningInput } from '../../models/PlannerPlan';
import { DomainContext } from '../../orchestrator/types';

async function runTest() {
  console.log('Running E2: Hand-off Fix Tests...');

  // Test 1
  {
    console.log('Test 1: S0 should resolve patient_payload from clinical_context.patient_payload');
    const s0 = new S0_InputNormalizationStage();
    const input: PlanningInput = {
      concern: 'I25',
      intent: 'surveillance',
      clinical_context: {
        objective: 'Test',
        patient_payload: 'This is the narrative'
      }
    } as any;
    
    const routed = await s0.execute(input);
    if (routed.patient_payload !== 'This is the narrative') {
      throw new Error(`Expected 'This is the narrative', got '${routed.patient_payload}'`);
    }
    console.log('  ✓ Passed');
  }

  // Test 2
  {
    console.log('Test 2: S0 should resolve patient_payload from metadata.notes fallback');
    const s0 = new S0_InputNormalizationStage();
    const input: PlanningInput = {
      concern: 'I25',
      intent: 'surveillance',
      metadata: {
        notes: 'Fallback narrative'
      }
    } as any;
    
    const routed = await s0.execute(input);
    if (routed.patient_payload !== 'Fallback narrative') {
      throw new Error(`Expected 'Fallback narrative', got '${routed.patient_payload}'`);
    }
    console.log('  ✓ Passed');
  }

  // Test 3
  {
    console.log('Test 3: S5 should fail-fast if patient_payload is missing for clinical tasks');
    const s5 = new S5_TaskExecutionStage();
    const domainContext: DomainContext = {
      domain: 'HAC',
      primary_archetype: 'Process_Auditor',
      archetypes: ['Process_Auditor'],
      semantic_context: {},
      patient_payload: undefined
    } as any;

    const promptPlan = {
      nodes: [{ id: 'task1', type: 'signal_enrichment', prompt_config: {} }]
    } as any;

    const taskGraph = { nodes: [{ id: 'task1' }], edges: [] } as any;

    try {
      await s5.execute(promptPlan, taskGraph, {} as any, domainContext);
      throw new Error('S5 should have failed due to missing patient_payload');
    } catch (err: any) {
      if (!err.message.includes('requires patient_payload but it is empty')) {
        throw new Error(`Unexpected error message: ${err.message}`);
      }
      console.log('  ✓ Passed (Correctly failed-fast)');
    }
  }

  console.log('\n✅ ALL HAND-OFF TESTS PASSED');
}

runTest().catch(err => {
  console.error('\n❌ TEST FAILED');
  console.error(err);
  process.exit(1);
});
