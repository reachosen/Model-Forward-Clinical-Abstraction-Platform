/**
 * S5: Task Execution & Local Validation
 *
 * **Quality-Guided Generation**: Multi-Lane Execution
 */

import {
  PromptPlan,
  TaskGraph,
  StructuralSkeleton,
  DomainContext,
  TaskOutput,
  ValidationResult,
  TaskExecutionResults,
} from '../types';
import { validateTaskWithArchetypeContext, scoreTaskSafety } from '../validators/ContextAwareValidation';
import { SAFEObserverContext } from '../../types/safety';
import { recordLLMCall } from '../../EvalsFactory/refinery/observation/ObservationHooks';
import OpenAI from 'openai';
import { ChatCompletionContentPart, ChatCompletionContentPartText } from 'openai/resources/chat/completions';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as promptsConfig from '../config/prompts.json';
import { getSignalEnrichmentVariables } from '../../shared/context_builders/signalEnrichment';
import { getEventSummaryVariables } from '../../shared/context_builders/eventSummary';
import { getSummary2080Variables } from '../../shared/context_builders/summary2080';
import { getFollowupQuestionsVariables } from '../../shared/context_builders/followupQuestions';
import { getClinicalReviewPlanVariables } from '../../shared/context_builders/clinicalReviewPlan';
import { getExclusionCheckVariables } from '../../shared/context_builders/exclusionCheck';
import { getClinicalReviewHelperVariables } from '../../shared/context_builders/clinicalReviewHelper';
import { exclusionCheckJsonSchema, ExclusionCheckResult } from '../schemas/exclusionCheckSchema';
import { clinicalReviewHelperJsonSchema, ClinicalReviewHelperResult } from '../schemas/clinicalReviewHelperSchema';
import { signalEnrichmentJsonSchema, SignalEnrichmentResult } from '../schemas/signalEnrichmentSchema';
import { eventSummaryJsonSchema, EventSummaryResult } from '../schemas/eventSummarySchema';
import { followupQuestionsJsonSchema, FollowupQuestionsResult } from '../schemas/followupQuestionsSchema';
import { clinicalReviewPlanJsonSchema, ClinicalReviewPlanResult } from '../schemas/clinicalReviewPlanSchema';
import { displayFieldsJsonSchema, DisplayFieldsResult } from '../schemas/20_80_display_fields';
import { buildMetricFramedPrompt, buildDynamicRoleName, buildMetricContextString } from '../utils/promptBuilder';
import { loadPromptFromRegistry } from '../utils/promptLoader';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const TASK_SCHEMAS: Partial<Record<string, object>> = {
  signal_enrichment: signalEnrichmentJsonSchema,
  event_summary: eventSummaryJsonSchema,
  followup_questions: followupQuestionsJsonSchema,
  clinical_review_plan: clinicalReviewPlanJsonSchema,
  '20_80_display_fields': displayFieldsJsonSchema,
  exclusion_check: exclusionCheckJsonSchema,
  clinical_review_helper: clinicalReviewHelperJsonSchema,
};

function parseExclusionCheck(raw: any): ExclusionCheckResult {
  let parsed = raw;
  if (typeof raw === 'string') {
     try {
       parsed = JSON.parse(raw);
     } catch (e) {
       throw new Error(`exclusion_check: invalid JSON: ${(e as Error).message}`);
     }
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof (parsed as any).exclusion_check !== 'object'
  ) {
    throw new Error('exclusion_check: missing exclusion_check object');
  }

  return parsed as ExclusionCheckResult;
}

function parseClinicalReviewHelper(raw: any): ClinicalReviewHelperResult {
  let parsed = raw;
  if (typeof raw === 'string') {
     try {
       parsed = JSON.parse(raw);
     } catch (e) {
       throw new Error(`clinical_review_helper: invalid JSON: ${(e as Error).message}`);
     }
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof (parsed as any).review_helper !== 'object'
  ) {
    throw new Error('clinical_review_helper: missing review_helper object');
  }

  return parsed as ClinicalReviewHelperResult;
}

function parseSignalEnrichment(raw: any): SignalEnrichmentResult {
  let parsed = raw;
  if (typeof raw === 'string') {
     try {
       parsed = JSON.parse(raw);
     } catch (e) {
       throw new Error(`signal_enrichment: invalid JSON: ${(e as Error).message}`);
     }
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray((parsed as any).signal_groups)
  ) {
    throw new Error('signal_enrichment: missing signal_groups array');
  }

  return parsed as SignalEnrichmentResult;
}

function parseEventSummary(raw: any): EventSummaryResult {
  let parsed = raw;
  if (typeof raw === 'string') {
     try {
       parsed = JSON.parse(raw);
     } catch (e) {
       throw new Error(`event_summary: invalid JSON: ${(e as Error).message}`);
     }
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof (parsed as any).event_summary !== 'string'
  ) {
    throw new Error('event_summary: missing or invalid event_summary field');
  }

  return parsed as EventSummaryResult;
}

function parseFollowupQuestions(raw: any): FollowupQuestionsResult {
  let parsed = raw;
  if (typeof raw === 'string') {
     try {
       parsed = JSON.parse(raw);
     } catch (e) {
       throw new Error(`followup_questions: invalid JSON: ${(e as Error).message}`);
     }
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray((parsed as any).followup_questions)
  ) {
    throw new Error('followup_questions: missing followup_questions array');
  }

  return parsed as FollowupQuestionsResult;
}

function parseClinicalReviewPlan(raw: any): ClinicalReviewPlanResult {
  let parsed = raw;
  if (typeof raw === 'string') {
     try {
       parsed = JSON.parse(raw);
     } catch (e) {
       throw new Error(`clinical_review_plan: invalid JSON: ${(e as Error).message}`);
     }
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof (parsed as any).clinical_reviewer !== 'object'
  ) {
    throw new Error('clinical_review_plan: missing clinical_reviewer object');
  }

  return parsed as ClinicalReviewPlanResult;
}

function parseDisplayFields(raw: any): DisplayFieldsResult {
  let parsed = raw;
  if (typeof raw === 'string') {
     try {
       parsed = JSON.parse(raw);
     } catch (e) {
       throw new Error(`20_80_display_fields: invalid JSON: ${(e as Error).message}`);
     }
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray((parsed as any).display_fields)
  ) {
    throw new Error('20_80_display_fields: missing display_fields array');
  }

  return parsed as DisplayFieldsResult;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_MODEL = process.env.MODEL || 'gpt-4o-mini';

// TESTING HOOK: Allow injecting prompts for Refinery without writing to disk
const promptOverrides = new Map<string, string>();

export function registerPromptOverride(templateId: string, templateText: string) {
  promptOverrides.set(templateId, templateText);
}

export function clearPromptOverrides() {
  promptOverrides.clear();
}

interface LLMCallOptions {
  model: string;
  temperature: number;
  response_format: 'json' | 'json_schema' | 'text';
  schema?: any;
  prompt: string;
  skeleton?: any;
  max_tokens?: number; // C7/C8: Optional token limit
  top_p?: number;
  patient_payload?: string;
}

async function callLLM(options: LLMCallOptions & { task_type?: string }): Promise<any> {
  const tokenInfo = options.max_tokens ? `, max_tokens=${options.max_tokens}` : '';
  console.log(`    🤖 LLM Call: ${options.model} (temp=${options.temperature}, format=${options.response_format}${tokenInfo})`);
  recordLLMCall({
    stageId: 'S5',
    taskId: options.task_type,
    model: options.model,
    temperature: options.temperature,
    max_tokens: options.max_tokens,
    top_p: options.top_p,
  });

  try {
    let finalPrompt = options.prompt;
    if (options.response_format === 'json' || options.response_format === 'json_schema') {
      finalPrompt = `${options.prompt}\n\n**IMPORTANT**: Respond with valid JSON only.`;
    }

    const messages: any[] = [{ role: 'user', content: finalPrompt }];

    // DETERMINISTIC HAND-OFF (E2): Inject patient narrative if provided
    if (options.patient_payload) {
      messages.unshift({
        role: 'system',
        content: `PATIENT NARRATIVE (factual source):\n\n${options.patient_payload}`
      });
    }

    const apiParams: any = {
      model: options.model || DEFAULT_MODEL,
      temperature: options.temperature,
      messages: messages,
    };

    // C7/C8: Apply max_tokens if specified
    if (options.max_tokens) {
      apiParams.max_tokens = options.max_tokens;
    }
    if (options.top_p !== undefined) {
      apiParams.top_p = options.top_p;
    }

    if (options.response_format === 'json_schema' && options.schema) {
      // Use OpenAI's structured output via tools
      apiParams.tools = [
        {
          type: 'function',
          function: {
            name: 'extract_data', // A dummy function name for schema adherence
            description: `Extracts data according to the provided schema for task type: ${options.task_type}`,
            parameters: options.schema,
          },
        },
      ];
      apiParams.tool_choice = { type: 'function', function: { name: 'extract_data' } };
    } else if (options.response_format === 'json') {
      // For general JSON, use response_format directly
      apiParams.response_format = { type: 'json_object' };
    }

    const completion = await openai.chat.completions.create(apiParams);
    const message = completion.choices[0]?.message;

    if (!message) {
      console.log('    ⚠️  OpenAI response message is empty. Raw completion:', completion);
      throw new Error('No message in OpenAI response');
    }

    if (options.response_format === 'json_schema' && options.schema) {
      // For structured output via tools, the content is in tool_calls
      const toolCall = message.tool_calls?.[0];
      if (!toolCall || toolCall.function.name !== 'extract_data') {
        throw new Error('OpenAI did not call the expected structured extraction tool.');
      }
      try {
        return JSON.parse(toolCall.function.arguments);
      } catch (parseError) {
        throw new Error(`Invalid JSON arguments from OpenAI tool call: ${parseError}`);
      }
    } else if (options.response_format === 'json') {
      const content = message.content;
      if (!content) {
        console.log('    ⚠️  OpenAI response content is empty for JSON mode. Raw message:', message);
        throw new Error('No content in OpenAI response for JSON mode');
      }
      try {
        return JSON.parse(content);
      } catch (parseError) {
        throw new Error(`Invalid JSON response from OpenAI: ${parseError}`);
      }
    } else { // Handle 'text' response_format, which might also have array content
      let extractedContent: string | null = null;
      if (typeof message.content === 'string') {
        extractedContent = message.content;
      } else if (Array.isArray(message.content)) {
        extractedContent = (message.content as ChatCompletionContentPart[])
          .filter((part): part is ChatCompletionContentPartText => part.type === 'text' && typeof part.text === 'string')
          .map(part => part.text)
          .join('\n'); // Join text parts with newlines
      }

      if (!extractedContent || extractedContent.trim().length === 0) {
        console.log('    ⚠️  OpenAI response content is empty for TEXT mode. Raw message:', message);
        throw new Error('No text content in OpenAI response');
      }
      return { result: extractedContent };
    }

  } catch (error: any) {
    console.error(`    ❌ OpenAI API error: ${error.message}`);
    throw new Error(`OpenAI API call failed: ${error.message}`);
  }
}

function loadPromptTemplate(template_id: string, context: any): string {
  const { domain, specialty_name, archetype, task_type, ortho_context, patient_payload } = context;

  // Build metric context string using the domain-agnostic builder
  const metricContextString = buildMetricContextString(ortho_context);
  const metricName = ortho_context?.metric?.metric_name;

  // Create an extended context for prompts that need local variables
  const promptContext = { ...context, patient_payload };

  // 1. Get Template (Check overrides first)
  let promptText: string = promptOverrides.get(template_id) || '';

  if (!promptText) {
    // TRY LOADING FROM DOMAINS REGISTRY (V10 Preferred Source)
    promptText = loadPromptFromRegistry(domain, specialty_name, task_type) || '';
    
    if (promptText) {
      console.log(`    📖 Loaded prompt from domains_registry: ${task_type}`);
    } else {
      // Fallback to internal config
      const templateEntry = (promptsConfig as any)[template_id];
      if (!templateEntry || !templateEntry.template) {
          throw new Error(`Prompt template not found in registry: ${template_id}`);
      }
      promptText = templateEntry.template;
    }
  }

  // 2. Get Variables (from helper functions)
  let variables: Record<string, string> = {};
  
  if (task_type === 'signal_enrichment') {
    variables = getSignalEnrichmentVariables(promptContext);
  } else if (task_type === 'event_summary') {
    variables = getEventSummaryVariables(promptContext);
  } else if (task_type === '20_80_display_fields') {
    variables = getSummary2080Variables(promptContext);
  } else if (task_type === 'followup_questions') {
    variables = getFollowupQuestionsVariables(promptContext);
  } else if (task_type === 'clinical_review_plan') {
    variables = getClinicalReviewPlanVariables(promptContext);
  } else if (task_type === 'exclusion_check') {
    variables = getExclusionCheckVariables(promptContext);
  } else if (task_type === 'clinical_review_helper') {
    variables = getClinicalReviewHelperVariables(promptContext);
  }

  // 3. Interpolate
  for (const [key, value] of Object.entries(variables)) {
    // Global replace for {{key}}
    promptText = promptText.split(`{{${key}}}`).join(value);
  }

  // 4. Wrap in System Prompt
  return buildMetricFramedPrompt({
    roleName: buildDynamicRoleName(task_type, domain, metricName, archetype),
    metricContext: metricContextString,
    coreBody: promptText
  });
}

export class S5_TaskExecutionStage {
  async execute(
    promptPlan: PromptPlan,
    taskGraph: TaskGraph,
    skeleton: StructuralSkeleton,
    domainContext: DomainContext
  ): Promise<TaskExecutionResults> {
    const { domain, archetypes, primary_archetype, semantic_context } = domainContext;
    const ranking_context = semantic_context.ranking;
    const specialty_name = ranking_context?.specialty_name;
    const ortho_context = semantic_context.packet;
    const patient_payload = domainContext.patient_payload;

    console.log(`\n[S5] Task Execution & Local Validation (Unified Control Plane)`);
    console.log(`  Domain: ${domain}`);
    console.log(`  Primary Archetype: ${primary_archetype}`);
    console.log(`  Active Archetypes: ${archetypes.join(', ')}`);
    if (patient_payload) {
      console.log(`  Patient Payload: ${patient_payload.length} chars`);
    } else {
      console.warn('  ⚠️  No patient payload provided in domainContext');
    }
    console.log(`  Tasks to execute: ${promptPlan.nodes.length}`);

    const taskOutputs: Map<string, TaskOutput> = new Map();
    const executionOrder = this.getExecutionOrder(taskGraph);

    for (const taskId of executionOrder) {
      console.log(`\n  📋 Executing unified task: ${taskId}`);

      const promptNode = promptPlan.nodes.find(n => n.id === taskId);
      if (!promptNode) throw new Error(`No prompt found for task: ${taskId}`);

      // E2: Deterministic Hand-off Fix - Fail-fast if narrative is missing for clinical tasks
      const narrativeRequiredTasks: string[] = ['signal_enrichment', 'event_summary', '20_80_display_fields', 'followup_questions'];
      if (narrativeRequiredTasks.includes(promptNode.type) && !patient_payload) {
        throw new Error(`[S5] Critical Error: Task ${taskId} (${promptNode.type}) requires patient_payload but it is empty. Check S0 normalization.`);
      }

      const config = promptNode.prompt_config;
      
      // Standard single-pass execution for all tasks in the Unified Control Plane
      const prompt = loadPromptTemplate(config.template_id, {
        domain,
        specialty_name,
        archetype: primary_archetype,
        archetypes: archetypes,
        task_type: promptNode.type,
        skeleton,
        ranking_context,
        ortho_context,
        task_outputs: taskOutputs,
        patient_payload,
      });

      const schema = TASK_SCHEMAS[promptNode.type];
      
      let output = await callLLM({
        model: config.model,
        temperature: config.temperature,
        response_format: schema ? 'json_schema' : config.response_format,
        schema: schema,
        prompt,
        task_type: promptNode.type,
        skeleton,
        max_tokens: config.max_tokens,
        top_p: config.top_p,
        patient_payload,
      });
      
      // Post-processing / Type-casting for known schemas
      if (promptNode.type === 'signal_enrichment') {
        output = parseSignalEnrichment(output);
      } else if (promptNode.type === 'event_summary') {
        output = parseEventSummary(output);
      } else if (promptNode.type === 'followup_questions') {
        output = parseFollowupQuestions(output);
      } else if (promptNode.type === 'clinical_review_plan') {
        output = parseClinicalReviewPlan(output);
      } else if (promptNode.type === '20_80_display_fields') {
        output = parseDisplayFields(output);
      } else if (promptNode.type === 'exclusion_check') {
        output = parseExclusionCheck(output);
      } else if (promptNode.type === 'clinical_review_helper') {
        output = parseClinicalReviewHelper(output);
      }

      console.log(`    ✅ Task completed`);

      // Local validation (using primary archetype context)
      const validation = validateTaskWithArchetypeContext(
        primary_archetype,
        promptNode.type,
        output
      );

      if (!validation.passed) {
        console.log(`    ❌ Validation failed: ${validation.errors.join(', ')}`);
        // For now, we log and throw. In future, retry logic goes here.
        throw new Error(`Task ${taskId} validation failed: ${validation.errors[0]}`);
      }

      // SAFE Scorecard Hook (Phase 1: Log only)
      try {
        const safeContext: SAFEObserverContext = {
          run_id: `run_${Date.now()}`, // Simple run ID for now
          task_id: taskId,
          metric_id: ortho_context?.metric?.metric_name || 'unknown',
          archetype: primary_archetype
        };
        const scorecard = scoreTaskSafety(output, safeContext);
        // Debug-level log to avoid cluttering production output too much
        if (process.env.DEBUG_SAFE === 'true') {
           console.log(`    🛡️  [SAFE Scorecard] ${taskId}:`, JSON.stringify(scorecard, null, 0));
        }
      } catch (safeErr) {
        // Non-blocking catch
        console.warn(`    ⚠️  SAFE Scoring failed for ${taskId}:`, safeErr);
      }

      const taskOutput: TaskOutput = {
        taskId: taskId,
        output: { ...output, task_type: promptNode.type },
        validation: {
          passed: validation.passed,
          errors: validation.errors,
          warnings: validation.warnings
        },
      };

      taskOutputs.set(taskId, taskOutput);
    }

    return {
      execution_id: `exec_${Date.now()}`,
      outputs: Array.from(taskOutputs.values()),
    };
  }

  private getExecutionOrder(taskGraph: TaskGraph): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const inDegree = new Map<string, number>();

    taskGraph.nodes.forEach(node => inDegree.set(node.id, 0));
    taskGraph.edges.forEach(([_, to]) => {
      inDegree.set(to, (inDegree.get(to) || 0) + 1);
    });

    const queue: string[] = [];
    taskGraph.nodes.forEach(node => {
      if (inDegree.get(node.id) === 0) queue.push(node.id);
    });

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      order.push(nodeId);
      visited.add(nodeId);

      taskGraph.edges
        .filter(([from, _]) => from === nodeId)
        .forEach(([_, to]) => {
          const newDegree = (inDegree.get(to) || 0) - 1;
          inDegree.set(to, newDegree);
          if (newDegree === 0 && !visited.has(to)) {
            queue.push(to);
          }
        });
    }

    if (order.length !== taskGraph.nodes.length) {
      // Fallback for disconnected graphs (rare but possible with lanes)
      const unvisited = taskGraph.nodes.filter(n => !visited.has(n.id)).map(n => n.id);
      return [...order, ...unvisited];
    }

    return order;
  }

  validate(results: TaskExecutionResults, taskGraph: TaskGraph): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const outputIds = new Set(results.outputs.map(o => o.taskId));
    
    for (const node of taskGraph.nodes) {
      if (!outputIds.has(node.id)) {
        errors.push(`Missing output for task: ${node.id}`);
      }
    }

    return { passed: errors.length === 0, errors, warnings };
  }
}
