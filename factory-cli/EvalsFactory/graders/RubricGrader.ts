import { BaseGrader, GradeResult } from './BaseGrader';
import OpenAI from 'openai';
import { getOpenAIClientOptions } from '../../utils/envConfig';

/**
 * E7: RubricGrader
 * 
 * Uses an LLM to grade nuanced narrative quality based on a rubric.
 */
export class RubricGrader extends BaseGrader {
  private client: OpenAI;

  constructor(apiKey: string) {
    super();
    this.client = new OpenAI(getOpenAIClientOptions(apiKey));
  }

  async gradeNuanced(testCase: any, output: any, rubric: string): Promise<GradeResult> {
    const prompt = `
You are an expert Clinical Quality Auditor.
Your job is to grade the clinical quality of the following output based on a provided rubric.

RUBRIC:
${rubric}

TEST CASE DESCRIPTION:
${testCase.description}

PATIENT PAYLOAD:
${testCase.patient_payload}

ENGINE OUTPUT:
${JSON.stringify(output, null, 2)}

GRADES:
- Provide a score from 0.0 to 1.0.
- Provide a brief reasoning.
- Provide a "flagged" status (true if score < 0.7).

Respond in JSON format:
{
  "score": 0.0-1.0,
  "reasoning": "...",
  "flagged": true/false
}
`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Empty response from Rubric Judge');

    const result = JSON.parse(content);

    return {
      criterion: 'RubricGrade',
      score: result.score,
      reasoning: result.reasoning,
      flagged: result.flagged,
    };
  }

  // Implementation of BaseGrader.grade (dummy for sync calls)
  grade(testCase: any, output: any): GradeResult {
    throw new Error('RubricGrader requires async gradeNuanced()');
  }
}
