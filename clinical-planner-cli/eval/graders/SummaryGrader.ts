import { BaseGrader, GradeResult } from './BaseGrader';
import { TestCase, EngineOutput } from '../../flywheel/validation/types';

/**
 * E6: SummaryGrader
 * 
 * Checks for key phrases in summary.
 */
export class SummaryGrader extends BaseGrader {
  grade(testCase: TestCase, output: EngineOutput): GradeResult {
    const mustContainPhrases = testCase.expectations?.event_summary?.must_contain_phrases || [];
    
    if (mustContainPhrases.length === 0) {
      return {
        criterion: 'SummaryCoverage',
        score: 1.0,
        reasoning: 'No must_contain_phrases specified',
        flagged: false,
        details: { found: [], missing: [] },
      };
    }

    const summaryText = output.summary || '';
    const found: string[] = [];
    const missing: string[] = [];

    for (const phrase of mustContainPhrases) {
      if (this.substringMatch(summaryText, phrase)) {
        found.push(phrase);
      } else {
        missing.push(phrase);
      }
    }

    const score = found.length / mustContainPhrases.length;
    const flagged = score < 0.8;

    return {
      criterion: 'SummaryCoverage',
      score,
      reasoning: `Found ${found.length}/${mustContainPhrases.length} must_contain_phrases in summary`,
      flagged,
      details: { found, missing },
    };
  }
}
