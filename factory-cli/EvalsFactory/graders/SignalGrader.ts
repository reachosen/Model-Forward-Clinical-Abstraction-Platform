import { BaseGrader, GradeResult } from './BaseGrader';
import { TestCase, EngineOutput } from '../validation/types';

/**
 * E6: SignalGrader
 * 
 * Compares found vs expected signals.
 */
export class SignalGrader extends BaseGrader {
  grade(testCase: TestCase, output: EngineOutput): GradeResult {
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
      reasoning: `Found ${found.length}/${mustFindSignals.length} must_find_signals`,
      flagged,
      details: { found, missing },
    };
  }
}
