
import { PlanningInput } from '../../models/PlannerPlan';
import { S0_InputNormalizationStage } from '../../orchestrator/stages/S0_InputNormalization';
import { S1_DomainResolutionStage } from '../../orchestrator/stages/S1_DomainResolution';

async function testMultiArchetypeResolution() {
  console.log('🧪 Testing Multi-Archetype Resolution (S1)\n');
  console.log('='.repeat(60));

  const cases = [
    {
      id: 'I25',
      desc: 'Supracondylar fracture',
      expected: ['Process_Auditor', 'Delay_Driver_Profiler']
    },
    {
      id: 'I27',
      desc: 'Forearm fracture',
      expected: ['Process_Auditor', 'Exclusion_Hunter']
    },
    {
      id: 'I32a',
      desc: 'Idiopathic scoliosis',
      expected: ['Preventability_Detective', 'Outcome_Tracker']
    },
    {
      id: 'I32b',
      desc: 'Neuromuscular scoliosis',
      expected: ['Preventability_Detective', 'Outcome_Tracker', 'Data_Scavenger']
    }
  ];

  const s0 = new S0_InputNormalizationStage();
  const s1 = new S1_DomainResolutionStage();
  let failures = 0;

  for (const testCase of cases) {
    console.log(`\n📋 Testing ${testCase.id}: ${testCase.desc}`);
    
    const input: PlanningInput = {
      planning_input_id: `test-${testCase.id}`,
      concern: testCase.id, // V9.1 compat
      concern_id: testCase.id,
      domain_hint: 'Orthopedics',
      intent: 'quality_reporting',
      target_population: 'pediatric',
      specific_requirements: []
    };

    try {
        const routed = await s0.execute(input);
        const context = await s1.execute(routed);
        
        const actual = context.archetypes;
        const match = JSON.stringify(actual) === JSON.stringify(testCase.expected);

        if (match) {
            console.log(`   ✅ MATCH: ${JSON.stringify(actual)}`);
        } else {
            console.log(`   ❌ MISMATCH!`);
            console.log(`      Expected: ${JSON.stringify(testCase.expected)}`);
            console.log(`      Actual:   ${JSON.stringify(actual)}`);
            failures++;
        }

    } catch (e: any) {
        console.error(`   ❌ EXCEPTION: ${e.message}`);
        failures++;
    }
  }

  console.log('\n' + '='.repeat(60));
  if (failures === 0) {
      console.log('🎉 ALL ARCHETYPE TESTS PASSED');
  } else {
      console.log(`💥 ${failures} TESTS FAILED`);
      process.exit(1);
  }
}

if (require.main === module) {
  testMultiArchetypeResolution().catch(e => console.error(e));
}
