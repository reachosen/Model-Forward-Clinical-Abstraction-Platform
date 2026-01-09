import * as fs from 'fs/promises';
import * as path from 'path';
import OpenAI from 'openai';
import { BatchPlan, GenerationScenario } from '../../flywheel/dataset/BatchConfig';
import { buildSystemPrompt, buildUserPrompt } from '../../flywheel/dataset/core';
import { getOpenAIClientOptions } from '../../utils/envConfig';

/**
 * E3/E4: CaseGenerator
 * 
 * Generates test cases from a batch strategy and saves as JSONL.
 */
export class CaseGenerator {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI(getOpenAIClientOptions(apiKey));
  }

  async generate(plan: BatchPlan, batchIndex: number, seed?: number): Promise<any[]> {
    const concernId = plan.metric_id;
    const domain = plan.domain;
    const scenarios = plan.scenarios;

    const systemPrompt = buildSystemPrompt(concernId, domain, plan.global_duet);
    const userPrompt = buildUserPrompt(scenarios, batchIndex);

    const response = await this.client.chat.completions.create({
      model: process.env.DATASET_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
      seed: seed // E3: Deterministic generation
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Empty response from LLM');

    const data = JSON.parse(content);
    
    return data.test_cases.map((tc: any, i: number) => ({
      ...tc,
      test_id: `${concernId}-BATCH${batchIndex + 1}-${String(i + 1).padStart(3, '0')}`,
      concern_id: concernId,
      metadata: {
        ...tc.metadata,
        generated_at: new Date().toISOString(),
        batch_index: batchIndex + 1,
        scenario: scenarios[i]?.description,
        version: 'v1.0', // E4: Version tag
        seed: seed
      }
    }));
  }

  async saveJsonl(cases: any[], outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    const lines = cases.map(c => JSON.stringify(c)).join('\n');
    await fs.writeFile(outputPath, lines + '\n');
  }
}
