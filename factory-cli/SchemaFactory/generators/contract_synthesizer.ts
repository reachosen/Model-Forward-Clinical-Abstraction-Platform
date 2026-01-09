import * as fs from 'fs';
import * as path from 'path';

/**
 * ContractSynthesizer
 * 
 * Bridges Planning Factory artifacts with Backend/Eval contracts.
 */
export class ContractSynthesizer {
  private registryBase: string;

  constructor(registryBase?: string) {
    this.registryBase = registryBase || path.resolve(__dirname, '../../domains_registry');
  }

  /**
   * Hydrates a prompt template with rich context.
   */
  public hydratePrompt(
    domain: string,
    specialty: string,
    taskType: string,
    context: any
  ): string {
    let templatePath: string | null = null;

    // 1. Check for Metric-Specific Override
    // Context usually comes from SchemaFactory/cli.ts which now injects 'metric_id'
    if (context.metric_id) {
      const overridePath = path.join(
        this.registryBase,
        'USNWR',
        domain,
        'metrics',
        context.metric_id,
        'prompts',
        `${taskType}.md`
      );
      if (fs.existsSync(overridePath)) {
        templatePath = overridePath;
      }
    }

    // 2. Fallback to Shared Path
    if (!templatePath) {
      templatePath = path.join(
        this.registryBase,
        'USNWR',
        domain,
        '_shared',
        'prompts',
        `${taskType}.md`
      );
    }

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`);
    }

    const template = fs.readFileSync(templatePath, 'utf-8');
    
    // V11: Use Unified Hydration Engine
    const { hydratePromptText } = require('../../PlanningFactory/utils/promptBuilder');
    return hydratePromptText(taskType, template, context);
  }

  /**
   * Extracts the JSON Schema block from a hydrated prompt.
   */
  public extractSchema(hydratedPrompt: string): any {
    // Matches "REQUIRED JSON SCHEMA" followed by optional colon/asterisks/whitespace, then code block
    const schemaMatch = hydratedPrompt.match(/REQUIRED JSON SCHEMA[:*]*\s*```json\s*([\s\S]*?)```/);
    if (!schemaMatch) {
      throw new Error('No REQUIRED JSON SCHEMA block found in prompt.');
    }

    try {
      return JSON.parse(schemaMatch[1]);
    } catch (e) {
      throw new Error(`Failed to parse extracted schema: ${(e as Error).message}`);
    }
  }

  /**
   * Generates a Zod schema code string from a JSON Schema object.
   */
  public generateZodCode(jsonSchema: any, rootName: string = 'Schema'): string {
    const lines: string[] = [`import { z } from 'zod';`, ''];
    lines.push(`export const ${rootName} = ${this.jsonSchemaToZod(jsonSchema)};`);
    lines.push(`export type ${rootName}Type = z.infer<typeof ${rootName}>;`);
    return lines.join('\n');
  }

  private jsonSchemaToZod(schema: any): string {
    if (!schema) return 'z.any()';

    if (schema.type === 'object') {
      const props: string[] = [];
      if (schema.properties) {
        for (const [key, val] of Object.entries(schema.properties)) {
          const isOptional = !schema.required?.includes(key);
          props.push(`${key}: ${this.jsonSchemaToZod(val)}${isOptional ? '.optional()' : ''}`);
        }
      }
      return `z.object({\n  ${props.join(',\n  ')}\n})`;
    }

    if (schema.type === 'array') {
      return `z.array(${this.jsonSchemaToZod(schema.items)})`;
    }

    if (schema.type === 'string') {
      if (schema.enum) {
        const enums = schema.enum.map((e: string) => `'${e}'`).join(', ');
        return `z.enum([${enums}])`;
      }
      return 'z.string()';
    }

    if (schema.type === 'number' || schema.type === 'integer') {
      return 'z.number()';
    }

    if (schema.type === 'boolean') {
      return 'z.boolean()';
    }
    
    if (schema.type === 'null') {
      return 'z.null()';
    }

    return `z.unknown()`;
  }
}
