export interface GradeResult {
  criterion: string;
  score: number;
  reasoning: string;
  flagged: boolean;
  details?: any;
}

export abstract class BaseGrader {
  abstract grade(testCase: any, output: any): GradeResult;

  protected normalize(text: string): string {
    return text.toLowerCase().trim();
  }

  protected substringMatch(haystack: string, needle: string): boolean {
    return this.normalize(haystack).includes(this.normalize(needle));
  }
}
