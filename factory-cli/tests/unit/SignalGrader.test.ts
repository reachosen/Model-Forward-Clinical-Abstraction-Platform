import { SignalGrader } from '../../EvalsFactory/graders/SignalGrader';
import { TestCase, EngineOutput } from '../../EvalsFactory/validation/types';

async function runTests() {
  console.log('🧪 Running SignalGrader Dual-Truth Tests...');
  const grader = new SignalGrader();

  // Test 1: Contract Happy Path
  {
    console.log('\nCASE 1: Contract Happy Path (ID + Polarity + Provenance)');
    const payload = "Incision site has scant serous fluid on POD 5. No purulence.";
    const testCase: TestCase = {
      test_id: 'CONTRACT-001',
      contract: {
        intents: ['KNOWLEDGE'],
        expected_signals: [
          {
            signal_id: 'wound_drainage_erythema',
            polarity: 'AFFIRM',
            required_provenance: ['scant serous fluid']
          }
        ]
      }
    } as any;

    const output: EngineOutput = {
      raw_input: payload,
      signal_objects: [
        {
          signal_id: 'wound_drainage_erythema',
          polarity: 'AFFIRM',
          provenance: "Incision site has scant serous fluid on POD 5."
        }
      ]
    } as any;

    const result = grader.grade(testCase, output);
    
    if (result.score !== 1.0) {
      throw new Error(`Expected score 1.0, got ${result.score}`);
    }
    if (result.flagged) {
      throw new Error(`Expected not flagged, but was flagged`);
    }
    if (result.details.found[0] !== 'wound_drainage_erythema') {
      throw new Error(`Expected found signal ID 'wound_drainage_erythema', got '${result.details.found[0]}'`);
    }
    console.log('  ✅ Passed');
  }

  // Test 2: Doubt Conflict (AFFIRM + DENY)
  {
    console.log('\nCASE 2: Doubt Conflict (AFFIRM + DENY + Behavior Flag)');
    const payload = "Mom says incision is 'red and angry'. Surgeon note: 'Incision well-approximated, no erythema'.";
    const testCase: TestCase = {
      test_id: 'CONTRACT-002',
      contract: {
        intents: ['AMBIGUITY'],
        expected_signals: [
          {
            signal_id: 'wound_drainage_erythema',
            polarity: 'AFFIRM',
            required_provenance: ['red and angry']
          },
          {
            signal_id: 'wound_drainage_erythema',
            polarity: 'DENY',
            required_provenance: ['no erythema']
          }
        ],
        expected_behavior_flags: ['AMBIGUITY_TRIGGER']
      }
    } as any;

    const output: EngineOutput = {
      raw_input: payload,
      signal_objects: [
        {
          signal_id: 'wound_drainage_erythema',
          polarity: 'AFFIRM',
          provenance: "Mom says incision is 'red and angry'.",
          tags: ['Preventability_Detective', 'AMBIGUITY_TRIGGER']
        },
        {
          signal_id: 'wound_drainage_erythema',
          polarity: 'DENY',
          provenance: "Surgeon note: 'Incision well-approximated, no erythema'.",
          tags: ['Preventability_Detective', 'AMBIGUITY_TRIGGER']
        }
      ]
    } as any;

    const result = grader.grade(testCase, output);
    
    if (result.score !== 1.0) {
      throw new Error(`Expected score 1.0, got ${result.score}. Details: ${JSON.stringify(result.details)}`);
    }
    if (result.details.found.length !== 2) {
      throw new Error(`Expected 2 found signals, got ${result.details.found.length}`);
    }
    if (result.details.dr_failures && result.details.dr_failures.length > 0) {
      throw new Error(`Expected 0 DR failures, got ${result.details.dr_failures.length}`);
    }
    console.log('  ✅ Passed');
  }

  // Test 3: Legacy Fallback
  {
    console.log('\nCASE 3: Legacy Fallback (No contract)');
    const testCase: TestCase = {
      test_id: 'LEGACY-001',
      expectations: {
        signal_generation: {
          must_find_signals: ['Wound drainage']
        }
      }
    } as any;

    const output: EngineOutput = {
      signals: ['Wound drainage present at incision site'],
      summary: 'Summary with wound drainage text'
    } as any;

    const result = grader.grade(testCase, output);
    
    if (result.score !== 1.0) {
      throw new Error(`Expected legacy score 1.0, got ${result.score}`);
    }
    if (result.details.found[0] !== 'Wound drainage') {
      throw new Error(`Expected found 'Wound drainage', got '${result.details.found[0]}'`);
    }
    console.log('  ✅ Passed');
  }

  console.log('\n🏁 ALL SIGNAL GRADER TESTS PASSED');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED');
  console.error(err);
  process.exit(1);
});
