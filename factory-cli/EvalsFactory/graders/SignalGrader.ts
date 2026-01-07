import { BaseGrader, GradeResult } from './BaseGrader';
import { TestCase, EngineOutput } from '../validation/types';
import { resolveSignalId } from '../../utils/signalResolver';

/**
 * E6: SignalGrader
 * 
 * Compares found vs expected signals using either Legacy fuzzy matching
 * or strict Dual-Truth Contract matching.
 */
export class SignalGrader extends BaseGrader {
  grade(testCase: TestCase, output: EngineOutput): GradeResult {
    if (testCase.contract) {
      return this.gradeContract(testCase, output);
    }
    return this.gradeLegacy(testCase, output);
  }

  private gradeContract(testCase: TestCase, output: EngineOutput): GradeResult {
    const contract = testCase.contract!;
    const expected = contract.expected_signals || [];
    const actual = output.signal_objects || [];
    const payload = output.raw_input.toLowerCase();

    if (expected.length === 0) {
      return {
        criterion: 'SignalRecall',
        score: 1.0,
        reasoning: 'No expected signals in contract',
        flagged: false,
        details: { found: [], missing: [] }
      };
    }

    const found: string[] = [];
    const missing: string[] = [];
    const ahFailures: string[] = [];
    const drFailures: string[] = [];
    
    let crPassCount = 0;
    let ahPassCount = 0;

    // Use registry-aware resolver instead of simple regex normalize
    const resolve = (id: string) => resolveSignalId(id, []) || id.toLowerCase();

    for (const exp of expected) {
      const normExpId = resolve(exp.signal_id);
      const expPolarity = exp.polarity || 'AFFIRM';

      // 1. CR: Concept Match (ID + Polarity)
      const match = actual.find(act => {
        const normActId = resolve(act.signal_id || act.name || "");
        return normActId === normExpId && (act.polarity || 'AFFIRM').toUpperCase() === expPolarity;
      });

      if (match) {
        crPassCount++;
        found.push(exp.signal_id);

        // 2. AH: Evidence Integrity
        let ahOk = true;
        if (exp.required_provenance && exp.required_provenance.length > 0) {
          for (const sub of exp.required_provenance) {
            const normSub = sub.toLowerCase();
            const inPayload = payload.includes(normSub);
            const inOutput = match.provenance.toLowerCase().includes(normSub);

            if (!inPayload) {
              ahFailures.push(`${exp.signal_id}: provenance_not_in_payload ("${sub}")`);
              ahOk = false;
            } else if (!inOutput) {
              ahFailures.push(`${exp.signal_id}: provenance_not_in_output ("${sub}")`);
              ahOk = false;
            }
          }
        }
        if (ahOk) ahPassCount++;
      } else {
        missing.push(exp.signal_id);
      }
    }

    // 3. DR-lite: Behavioral Flags
    if (contract.expected_behavior_flags && contract.expected_behavior_flags.length > 0) {
      const allTags = actual.flatMap(s => s.tags || []);
      for (const flag of contract.expected_behavior_flags) {
        if (!allTags.includes(flag)) {
          drFailures.push(`missing_behavior_flag: ${flag}`);
        }
      }
    }

    const crScore = crPassCount / expected.length;
    const ahScore = ahPassCount / expected.length; // Use expected length as denominator for strictness?
    // Alternative: ahScore = found.length > 0 ? ahPassCount / found.length : 1.0;
    
    const compositeScore = (crScore + ahScore) / 2;
    const flagged = crScore < 0.8 || ahScore < 1.0 || drFailures.length > 0;

    return {
      criterion: 'SignalRecall',
      score: compositeScore,
      reasoning: `Contract Match: CR=${crScore.toFixed(2)}, AH=${ahScore.toFixed(2)}. ${ahFailures.join('; ')}`,
      flagged,
      details: { 
        found, 
        missing, 
        ah_failures: ahFailures,
        dr_failures: drFailures,
        extra_signals_count: actual.length - found.length
      },
    };
  }

  private gradeLegacy(testCase: TestCase, output: EngineOutput): GradeResult {
    const mustFindSignals = testCase.expectations?.signal_generation?.must_find_signals || [];
    
    if (mustFindSignals.length === 0) {
      return {
        criterion: 'SignalRecall',
        score: 1.0,
        reasoning: 'No must_find_signals specified',
        flagged: false,
        details: { found: [], missing: [] },
      };
    }

    // Combine signals and summary into searchable corpus
    const signalsText = (output.signals || []).join(' ');
    const summaryText = output.summary || '';
    const corpus = this.normalize(`${signalsText} ${summaryText}`);

    const found: string[] = [];
    const missing: string[] = [];

    for (const signal of mustFindSignals) {
      if (this.substringMatch(corpus, signal)) {
        found.push(signal);
      } else {
        missing.push(signal);
      }
    }

    const score = found.length / mustFindSignals.length;
    const flagged = score < 0.8;

    return {
      criterion: 'SignalRecall',
      score,
      reasoning: `Legacy Match: Found ${found.length}/${mustFindSignals.length} signals`,
      flagged,
      details: { found, missing },
    };
  }
}
