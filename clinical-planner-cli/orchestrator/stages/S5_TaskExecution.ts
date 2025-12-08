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
  ArchetypeType,
} from '../types';
import { validateTaskWithArchetypeContext } from '../validators/ContextAwareValidation';
import { recordLLMCall } from '../../refinery/observation/ObservationHooks';
import OpenAI from 'openai';
import { ChatCompletionContentPart, ChatCompletionContentPartText } from 'openai/resources/chat/completions';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { getSignalEnrichmentCoreBody } from '../prompts/signalEnrichment';
import { getEventSummaryCoreBody } from '../prompts/eventSummary';
import { getSummary2080CoreBody } from '../prompts/summary2080';
import { getFollowupQuestionsCoreBody } from '../prompts/followupQuestions';
import { getClinicalReviewPlanCoreBody } from '../prompts/clinicalReviewPlan';
import { getMultiArchetypeSynthesisDraftCoreBody, getMultiArchetypeSynthesisVerifyCoreBody } from '../prompts/multiArchetypeSynthesis';
import { signalEnrichmentJsonSchema, SignalEnrichmentResult } from '../schemas/signalEnrichmentSchema';
import { eventSummaryJsonSchema, EventSummaryResult } from '../schemas/eventSummarySchema';
import { followupQuestionsJsonSchema, FollowupQuestionsResult } from '../schemas/followupQuestionsSchema';
import { clinicalReviewPlanJsonSchema, ClinicalReviewPlanResult } from '../schemas/clinicalReviewPlanSchema';
import { multiArchetypeSynthesisJsonSchema, MultiArchetypeSynthesisResult } from '../schemas/multiArchetypeSynthesisSchema';
import { buildMetricFramedPrompt, buildDynamicRoleName, buildMetricContextString, compressLaneFindings, buildCompressedLaneFindingsString } from '../utils/promptBuilder';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const TASK_SCHEMAS: Partial<Record<string, object>> = {
  signal_enrichment: signalEnrichmentJsonSchema,
  event_summary: eventSummaryJsonSchema,
  followup_questions: followupQuestionsJsonSchema,
  clinical_review_plan: clinicalReviewPlanJsonSchema,
  // CoVE tasks use the same schema
  multi_archetype_synthesis_draft: multiArchetypeSynthesisJsonSchema,
  multi_archetype_synthesis_verify: multiArchetypeSynthesisJsonSchema,
};

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
    !Array.isArray((parsed as any).clinical_tools)
  ) {
    throw new Error('clinical_review_plan: missing clinical_tools array');
  }

  return parsed as ClinicalReviewPlanResult;
}

function parseMultiArchetypeSynthesis(raw: any): MultiArchetypeSynthesisResult {
  let parsed = raw;
  if (typeof raw === 'string') {
     try {
       parsed = JSON.parse(raw);
     } catch (e) {
       throw new Error(`multi_archetype_synthesis: invalid JSON: ${(e as Error).message}`);
     }
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray((parsed as any).merged_signal_groups)
  ) {
    throw new Error('multi_archetype_synthesis: missing merged_signal_groups array');
  }

  return parsed as MultiArchetypeSynthesisResult;
}

export interface TaskExecutionResults {
  execution_id: string;
  outputs: TaskOutput[];
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_MODEL = process.env.MODEL || 'gpt-4o-mini';

// C7/C8: Configuration from .env
const SYNTHESIS_MAX_TOKENS = parseInt(process.env.SYNTHESIS_MAX_TOKENS || '1200', 10);
// NOTE: synth temperature reserved for future tuning; removed to avoid unused var
const SYNTHESIS_VERIFY_TEMPERATURE = parseFloat(process.env.SYNTHESIS_VERIFY_TEMPERATURE || '0.0');

interface LLMCallOptions {
  model: string;
  temperature: number;
  response_format: 'json' | 'json_schema' | 'text';
  schema?: any;
  prompt: string;
  skeleton?: any;
  max_tokens?: number; // C7/C8: Optional token limit
  top_p?: number;
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

    const apiParams: any = {
      model: options.model || DEFAULT_MODEL,
      temperature: options.temperature,
      messages: [{ role: 'user', content: finalPrompt }],
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
  const { domain, archetype, task_type, ortho_context, task_outputs } = context;

  // Build metric context string using the domain-agnostic builder
  const metricContextString = buildMetricContextString(ortho_context);
  const metricName = ortho_context?.metric?.metric_name;

  // C7/C8: Use compressed lane findings for synthesis prompts to reduce token usage
  let laneFindings = '';
  if (task_outputs && task_type === 'multi_archetype_synthesis') {
    const outputsMap = task_outputs as Map<string, TaskOutput>;
    const compressed = compressLaneFindings(outputsMap);
    laneFindings = buildCompressedLaneFindingsString(compressed);
    console.log(`    📦 Compressed ${compressed.length} lane findings for synthesis`);
  }

  // Create an extended context for prompts that need local variables
  const promptContext = { ...context, laneFindings };

  // Build dynamic role names based on task type, domain, and metric
  const templates: Record<string, string> = {
    signal_enrichment: buildMetricFramedPrompt({
      roleName: buildDynamicRoleName('signal_enrichment', domain, metricName, archetype),
      metricContext: metricContextString,
      coreBody: getSignalEnrichmentCoreBody(promptContext)
    }),

    event_summary: buildMetricFramedPrompt({
      roleName: buildDynamicRoleName('event_summary', domain, metricName),
      metricContext: metricContextString,
      coreBody: getEventSummaryCoreBody(promptContext)
    }),

    summary_20_80: buildMetricFramedPrompt({
      roleName: buildDynamicRoleName('summary_20_80', domain, metricName),
      metricContext: metricContextString,
      coreBody: getSummary2080CoreBody(promptContext)
    }),

    followup_questions: buildMetricFramedPrompt({
      roleName: buildDynamicRoleName('followup_questions', domain, metricName),
      metricContext: metricContextString,
      coreBody: getFollowupQuestionsCoreBody(promptContext)
    }),

    clinical_review_plan: buildMetricFramedPrompt({
      roleName: buildDynamicRoleName('clinical_review_plan', domain, metricName),
      metricContext: metricContextString,
      coreBody: getClinicalReviewPlanCoreBody(promptContext)
    }),

    multi_archetype_synthesis_draft: buildMetricFramedPrompt({
      roleName: buildDynamicRoleName('multi_archetype_synthesis_draft', domain, metricName),
      metricContext: metricContextString,
      coreBody: getMultiArchetypeSynthesisDraftCoreBody(promptContext)
    }),

    multi_archetype_synthesis_verify: buildMetricFramedPrompt({
      roleName: buildDynamicRoleName('multi_archetype_synthesis_verify', domain, metricName),
      metricContext: metricContextString,
      coreBody: getMultiArchetypeSynthesisVerifyCoreBody(promptContext)
    })
  };

  return templates[task_type] || `Generate output for ${task_type} task.`;
}

export class S5_TaskExecutionStage {
  async execute(
    promptPlan: PromptPlan,
    taskGraph: TaskGraph,
    skeleton: StructuralSkeleton,
    domainContext: DomainContext
  ): Promise<TaskExecutionResults> {
    const { domain, primary_archetype, semantic_context } = domainContext;
    const ranking_context = semantic_context.ranking;
    const ortho_context = semantic_context.packet;
    const archetype = primary_archetype; // Use primary for context

    console.log(`\n[S5] Task Execution & Local Validation`);
    console.log(`  Domain: ${domain}`);
    console.log(`  Primary Archetype: ${archetype}`);
    console.log(`  Tasks to execute: ${promptPlan.nodes.length}`);

    const taskOutputs: Map<string, TaskOutput> = new Map();
    const executionOrder = this.getExecutionOrder(taskGraph);

    for (const taskId of executionOrder) {
      console.log(`\n  📋 Executing task: ${taskId}`);

      const promptNode = promptPlan.nodes.find(n => n.id === taskId);
      if (!promptNode) throw new Error(`No prompt found for task: ${taskId}`);

      const config = promptNode.prompt_config;
      
      // Lane-to-Archetype mapping: each lane uses its own archetype prompts
      // Exception: synthesis lane uses primary archetype's synthesis prompt
      const LANE_TO_ARCHETYPE: Record<string, ArchetypeType | 'SYNTHESIS'> = {
        process_auditor: 'Process_Auditor',
        exclusion_hunter: 'Exclusion_Hunter',
        preventability_detective: 'Preventability_Detective',
        preventability_detective_metric: 'Preventability_Detective_Metric',
        data_scavenger: 'Data_Scavenger',
        delay_driver_profiler: 'Delay_Driver_Profiler',
        outcome_tracker: 'Outcome_Tracker',
        synthesis: 'SYNTHESIS', // Special merge node - uses primary archetype
      };

      // Determine specific archetype for this task based on lane
      let taskArchetype: ArchetypeType = archetype; // Default to primary archetype

      if (taskId.includes(':')) {
        const prefix = taskId.split(':')[0];
        const mappedArchetype = LANE_TO_ARCHETYPE[prefix];

        if (mappedArchetype === 'SYNTHESIS') {
          // Synthesis lane: use primary archetype for synthesis prompts
          // e.g., Orthopedics_Process_Auditor_multi_archetype_synthesis_v3
          taskArchetype = archetype;
        } else if (mappedArchetype) {
          // Regular lane: use lane-specific archetype
          // e.g., Orthopedics_Delay_Driver_Profiler_signal_enrichment_v3
          taskArchetype = mappedArchetype;
        }
        // If prefix not found, fall back to primary archetype
      }

      let output;

      // Special handling for CoVE (Chain of Verification) tasks
      if (promptNode.type === 'multi_archetype_synthesis') {
        console.log(`    🔄 Starting CoVE: Draft -> Verify`);

        // Step 1: DRAFT
        const draftPrompt = loadPromptTemplate('multi_archetype_synthesis_draft', {
          domain,
          archetype: taskArchetype,
          task_type: 'multi_archetype_synthesis_draft',
          skeleton,
          ranking_context,
          ortho_context,
          task_outputs: taskOutputs,
        });

        const draftSchema = TASK_SCHEMAS['multi_archetype_synthesis_draft'];

        let draftRaw = await callLLM({
          model: config.model,
          temperature: config.temperature,
          response_format: draftSchema ? 'json_schema' : config.response_format,
          schema: draftSchema,
          prompt: draftPrompt,
          task_type: 'multi_archetype_synthesis_draft',
          skeleton,
          max_tokens: SYNTHESIS_MAX_TOKENS, // C7/C8: Cap synthesis draft tokens
          top_p: config.top_p,
        });
        
        // Validate draft
        draftRaw = parseMultiArchetypeSynthesis(draftRaw);

        console.log(`    📝 Draft synthesis complete`);

        // Step 2: VERIFY
        // Need to pass draftSynthesisJson to the template
        const verifyPrompt = loadPromptTemplate('multi_archetype_synthesis_verify', {
          domain,
          archetype: taskArchetype,
          task_type: 'multi_archetype_synthesis_verify',
          skeleton,
          ranking_context,
          ortho_context,
          task_outputs: taskOutputs,
          draftSynthesisJson: JSON.stringify(draftRaw, null, 2), // Pass draft as string
        });

        const verifySchema = TASK_SCHEMAS['multi_archetype_synthesis_verify'];

        let verifiedRaw = await callLLM({
          model: config.model,
          temperature: SYNTHESIS_VERIFY_TEMPERATURE,
          response_format: verifySchema ? 'json_schema' : config.response_format,
          schema: verifySchema,
          prompt: verifyPrompt,
          task_type: 'multi_archetype_synthesis_verify',
          skeleton,
          max_tokens: SYNTHESIS_MAX_TOKENS,
          top_p: config.top_p,
        });
        
        // Validate verification result
        verifiedRaw = parseMultiArchetypeSynthesis(verifiedRaw);

        console.log(`    🛡️  Verification complete`);
        output = verifiedRaw;

      } else {
        // Standard single-pass execution
        const prompt = loadPromptTemplate(config.template_id, {
          domain,
          archetype: taskArchetype,
          task_type: promptNode.type,
          skeleton,
          ranking_context,
          ortho_context,
          task_outputs: taskOutputs,
        });

        const schema = TASK_SCHEMAS[promptNode.type];
        
        output = await callLLM({
          model: config.model,
          temperature: config.temperature,
          response_format: schema ? 'json_schema' : config.response_format,
          schema: schema,
          prompt,
          task_type: promptNode.type,
          skeleton,
          max_tokens: config.max_tokens,
          top_p: config.top_p,
        });
      }
      
      // Post-processing / Type-casting for known schemas
      if (promptNode.type === 'signal_enrichment') {
        output = parseSignalEnrichment(output);
      } else if (promptNode.type === 'event_summary') {
        output = parseEventSummary(output);
      } else if (promptNode.type === 'followup_questions') {
        output = parseFollowupQuestions(output);
      } else if (promptNode.type === 'clinical_review_plan') {
        output = parseClinicalReviewPlan(output);
      }

      console.log(`    ✅ Task completed`);

      // Local validation
      const validation = validateTaskWithArchetypeContext(
        taskArchetype,
        promptNode.type,
        output
      );

      if (!validation.passed) {
        console.log(`    ❌ Validation failed: ${validation.errors.join(', ')}`);
        // For now, we log and throw. In future, retry logic goes here.
        throw new Error(`Task ${taskId} validation failed: ${validation.errors[0]}`);
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
