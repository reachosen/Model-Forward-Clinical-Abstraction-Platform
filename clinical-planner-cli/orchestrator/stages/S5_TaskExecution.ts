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
} from '../types';
import { validateTaskWithArchetypeContext } from '../validators/ContextAwareValidation';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

export interface TaskExecutionResults {
  execution_id: string;
  outputs: TaskOutput[];
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_MODEL = process.env.MODEL || 'gpt-4o-mini';

interface LLMCallOptions {
  model: string;
  temperature: number;
  response_format: 'json' | 'json_schema' | 'text';
  schema?: any;
  prompt: string;
  skeleton?: any;
}

async function callLLM(options: LLMCallOptions & { task_type?: string }): Promise<any> {
  console.log(`    🤖 LLM Call: ${options.model} (temp=${options.temperature}, format=${options.response_format})`);

  try {
    let finalPrompt = options.prompt;
    if (options.response_format === 'json' || options.response_format === 'json_schema') {
      finalPrompt = `${options.prompt}\n\n**IMPORTANT**: Respond with valid JSON only.`;
    }

    const apiParams: any = {
      model: DEFAULT_MODEL,
      temperature: options.temperature,
      messages: [{ role: 'user', content: finalPrompt }],
    };

    if (options.response_format === 'json' || options.response_format === 'json_schema') {
      apiParams.response_format = { type: 'json_object' };
    }

    const completion = await openai.chat.completions.create(apiParams);
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('No content in OpenAI response');

    if (options.response_format === 'json' || options.response_format === 'json_schema') {
      try {
        return JSON.parse(content);
      } catch (parseError) {
        throw new Error(`Invalid JSON response from OpenAI: ${parseError}`);
      }
    }

    return { result: content };

  } catch (error: any) {
    console.error(`    ❌ OpenAI API error: ${error.message}`);
    throw new Error(`OpenAI API call failed: ${error.message}`);
  }
}

function loadPromptTemplate(template_id: string, context: any): string {
  const { domain, archetype, task_type, skeleton, ranking_context, ortho_context, task_outputs } = context;

  // Build Ortho Context String
  let orthoContextString = '';
  if (ortho_context) {
    const { metric, signals } = ortho_context;
    orthoContextString = `
**ORTHOPEDIC METRIC CONTEXT (HIGH PRIORITY):**
- **Metric Name:** ${metric.metric_name}
- **Clinical Focus:** ${metric.clinical_focus}
- **Rationale:** ${metric.rationale}

**Risk Factors (MUST ADDRESS):**
${metric.risk_factors.map((r: string) => `- ${r}`).join('\n')}

**Review Questions (MUST ANSWER):**
${metric.review_questions.map((q: string) => `- ${q}`).join('\n')}

**Signal Groups & Definitions:**
${metric.signal_groups.map((gid: string) => {
     const sigs = signals[gid] || [];
     return `- **${gid}**: ${sigs.join(', ')}`;
  }).join('\n')}
`;
  }

  // Aggregate Lane Summaries for Synthesis
  let laneFindings = '';
  if (task_outputs && task_type === 'multi_archetype_synthesis') {
    const outputsMap = task_outputs as Map<string, TaskOutput>;
    const summaries: string[] = [];
    
    outputsMap.forEach((val, key) => {
      if (key.includes('event_summary')) {
        const lane = key.split(':')[0];
        summaries.push(`### ${lane.toUpperCase()} FINDINGS:\n${JSON.stringify(val.output.summary || val.output)}`);
      }
    });
    laneFindings = summaries.join('\n\n');
  }

  const templates: Record<string, string> = {
    signal_enrichment: `
You are a clinical quality expert analyzing ${domain} cases.
**Context:**
- Domain: ${domain}
- Archetype: ${archetype}
${orthoContextString}

**Signal Groups:**
${skeleton?.clinical_config?.signals?.signal_groups?.map((g: any, idx: number) => `${idx + 1}. ${g.group_id}: ${g.display_name}`).join('\n')}

**REQUIRED JSON SCHEMA:**
{ "signals": [{ "id": "SIG_001", "description": "...", "evidence_type": "L1", "group_id": "..." }] }
`,

    event_summary: `
You are a clinical narrative expert summarizing a ${domain} case.
**Context:**
- Domain: ${domain}
- Archetype: ${archetype}
${ranking_context ? `- Institution Rank: #${ranking_context.rank}` : ''}
${orthoContextString}

**REQUIRED JSON SCHEMA:**
{ "summary": "Comprehensive narrative summary..." }
`,

    summary_20_80: `
You are generating patient/provider summaries.
${ranking_context ? `**Rank:** #${ranking_context.rank}` : ''}
${orthoContextString}

**REQUIRED JSON SCHEMA:**
{ "patient_summary": "...", "provider_summary": "..." }
`,

    followup_questions: `
Generate follow-up questions.
**Context:**
- Archetype: ${archetype}
${orthoContextString}

**REQUIRED JSON SCHEMA:**
{ "questions": ["Question 1?", "Question 2?"] }
`,

    clinical_review_plan: `
Design a clinical review plan.
**Context:**
- Archetype: ${archetype}
${orthoContextString}

**REQUIRED JSON SCHEMA:**
{ "clinical_tools": [{ "tool_id": "...", "description": "..." }], "review_order": ["..."] }
`,

    multi_archetype_synthesis: `
You are the Lead Clinical Investigator synthesizing findings from multiple specialist agents.

**Context:**
- Domain: ${domain}
- Primary Archetype: ${archetype}
${orthoContextString}

**LANE FINDINGS TO SYNTHESIZE:**
${laneFindings}

**INSTRUCTIONS:**
1. Review the findings from each lane above.
2. Resolve any conflicts (e.g., if Exclusion Hunter found a valid exclusion, the case is EXCLUDED).
3. Synthesize a final determination narrative.
4. Compile a unified list of signals and tools.

**REQUIRED JSON SCHEMA:**
{
  "final_determination": "string (Summary of final status)",
  "synthesis_rationale": "string (Why this determination was reached)",
  "merged_signal_groups": [ { "group_id": "...", "signals": [...] } ],
  "unified_clinical_tools": [...]
}
`
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
      
      // Determine specific archetype for this task if namespaced
      // e.g. "process_auditor:event_summary" -> "Process_Auditor"
      let taskArchetype = archetype;
      if (taskId.includes(':')) {
        const prefix = taskId.split(':')[0];
        // Simple mapping back to Title Case (heuristic)
        if (prefix === 'process_auditor') taskArchetype = 'Process_Auditor';
        if (prefix === 'exclusion_hunter') taskArchetype = 'Exclusion_Hunter';
        if (prefix === 'preventability_detective') taskArchetype = 'Preventability_Detective';
        if (prefix === 'data_scavenger') taskArchetype = 'Data_Scavenger';
      }

      const prompt = loadPromptTemplate(config.template_id, {
        domain,
        archetype: taskArchetype,
        task_type: promptNode.type,
        skeleton,
        ranking_context,
        ortho_context,
        task_outputs: taskOutputs,
      });

      const output = await callLLM({
        model: config.model,
        temperature: config.temperature,
        response_format: config.response_format,
        schema: config.schema_ref ? {} : undefined,
        prompt,
        task_type: promptNode.type,
        skeleton,
      });

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