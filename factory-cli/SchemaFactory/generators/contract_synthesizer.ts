import * as fs from 'fs';
import * as path from 'path';
import { getSignalEnrichmentVariables } from '../../shared/context_builders/signalEnrichment';
import { getExclusionCheckVariables } from '../../shared/context_builders/exclusionCheck';
import { getEventSummaryVariables } from '../../shared/context_builders/eventSummary';
import { getFollowupQuestionsVariables } from '../../shared/context_builders/followupQuestions';
import { getClinicalReviewPlanVariables } from '../../shared/context_builders/clinicalReviewPlan';
import { getClinicalReviewHelperVariables } from '../../shared/context_builders/clinicalReviewHelper';

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

    let template = fs.readFileSync(templatePath, 'utf-8');
    
    // Get variables using shared builders
    const variables = this.getVariablesForTask(taskType, context);

    // Hydrate
    for (const [key, value] of Object.entries(variables)) {
      template = template.split(`{{${key}}}`).join(value);
    }

    // Clean up simple handlebars conditionals used in templates.
    template = template.replace(/{{#if\s+[^}]+}}/g, '').replace(/{{\/if}}/g, '');

    return template;
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

    return 'z.unknown()';
  }

  private getVariablesForTask(taskType: string, context: any): Record<string, string> {
    switch (taskType) {
      case 'signal_enrichment':
        return getSignalEnrichmentVariables(context);
      case 'exclusion_check':
        return getExclusionCheckVariables(context);
      case 'event_summary':
        return getEventSummaryVariables(context);
      case 'followup_questions':
        return getFollowupQuestionsVariables(context);
      case 'clinical_review_plan':
        return getClinicalReviewPlanVariables(context);
      case 'clinical_review_helper':
        return getClinicalReviewHelperVariables(context);
      default:
        return {};
    }
  }
}
