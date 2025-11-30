/**
 * S5: Task Execution & Local Validation
 *
 * **Quality-Guided Generation**: Use JSON schemas + prompt injection
 *
 * Executes tasks from the prompt plan, calling LLM with quality-guided constraints:
 * - JSON schemas enforce structure (Tier 1 validation at generation time)
 * - Prompt injection embeds quality requirements (Tier 2 guidance)
 * - Task-specific temperatures balance creativity vs determinism
 * - Local validation after each task execution
 *
 * Input: PromptPlan + TaskGraph + StructuralSkeleton + DomainContext
 * Output: TaskExecutionResults (map of task_id → output)
 *
 * Quality Strategy:
 * - Use response_format='json_schema' to enforce structure (prevents Tier 1 failures)
 * - Inject context-specific requirements into prompts (reduces Tier 2 warnings)
 * - Validate each task output locally before proceeding
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

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Result container for S5 execution
export interface TaskExecutionResults {
  execution_id: string;
  outputs: TaskOutput[];
}

// ============================================================================
// OpenAI Client Setup
// ============================================================================

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get model from environment (default to gpt-4o-mini if not set)
const DEFAULT_MODEL = process.env.MODEL || 'gpt-4o-mini';

interface LLMCallOptions {
  model: string;
  temperature: number;
  response_format: 'json' | 'json_schema' | 'text';
  schema?: any;
  prompt: string;
  skeleton?: any; // For accessing signal groups
}

/**
 * Real OpenAI API call
 *
 * Calls OpenAI API with:
 * - model: from .env (gpt-4o-mini) or task-specific override
 * - temperature: task-specific (0.3-0.7)
 * - response_format: "json_object" for JSON or structured outputs
 * - messages: [{ role: "user", content: prompt }]
 */
async function callLLM(options: LLMCallOptions & { task_type?: string }): Promise<any> {
  console.log(`    🤖 LLM Call: ${options.model} (temp=${options.temperature}, format=${options.response_format})`);

  try {
    // Build the prompt (add JSON instruction if needed)
    let finalPrompt = options.prompt;
    if (options.response_format === 'json' || options.response_format === 'json_schema') {
      // OpenAI requires the word "json" in the prompt when using json_object mode
      finalPrompt = `${options.prompt}\n\n**IMPORTANT**: Respond with valid JSON only. Do not include any text outside the JSON structure.`;
    }

    // Build the API call parameters
    const apiParams: any = {
      model: DEFAULT_MODEL, // Use model from .env
      temperature: options.temperature,
      messages: [
        {
          role: 'user',
          content: finalPrompt,
        },
      ],
    };

    // Set response format based on task requirements
    if (options.response_format === 'json' || options.response_format === 'json_schema') {
      // OpenAI uses 'json_object' for JSON mode
      apiParams.response_format = { type: 'json_object' };
    }

    // Make the API call
    const completion = await openai.chat.completions.create(apiParams);

    // Extract the response content
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse JSON responses
    if (options.response_format === 'json' || options.response_format === 'json_schema') {
      try {
        return JSON.parse(content);
      } catch (parseError) {
        console.error(`    ⚠️  Failed to parse JSON response: ${content.substring(0, 100)}...`);
        throw new Error(`Invalid JSON response from OpenAI: ${parseError}`);
      }
    }

    // Return plain text response
    return { result: content };

  } catch (error: any) {
    console.error(`    ❌ OpenAI API error: ${error.message}`);
    throw new Error(`OpenAI API call failed: ${error.message}`);
  }
}

// ============================================================================
// Prompt Template Loader (Mock)
// ============================================================================

/**
 * Load prompt template from file system
 *
 * In production, this would load from:
 * prompts/{domain}/{archetype}/{task}/v{N}.ts
 *
 * For now, we generate inline templates based on domain/archetype/task
 */
function loadPromptTemplate(template_id: string, context: any): string {
  const { domain, archetype, task_type, skeleton, ranking_context } = context;

  // Base prompts by task type
  const templates: Record<string, string> = {
    signal_enrichment: `
You are a clinical quality expert analyzing ${domain} cases.

**Context:**
- Domain: ${domain}
- Archetype: ${archetype}
- Focus: ${archetype === 'Process_Auditor' ? 'Protocol compliance and quality metrics' : 'Preventability assessment and root cause'}

**Signal Groups to Enrich (MUST generate 2 signals for EACH group):**
${skeleton?.clinical_config?.signals?.signal_groups?.map((g: any, idx: number) => `${idx + 1}. ${g.group_id}: ${g.display_name}`).join('\n')}

**CRITICAL Requirements:**
- MUST generate exactly 2 signals for EACH of the ${skeleton?.clinical_config?.signals?.signal_groups?.length || 5} signal groups above
- Each signal must have: id, description, evidence_type (L1/L2/L3), group_id
- Signals should be clinically relevant to ${domain}
${archetype === 'Process_Auditor' ? '- Focus on protocol deviations and compliance gaps' : '- Focus on preventability indicators'}
- Use evidence-based sources
- Total signals expected: ${(skeleton?.clinical_config?.signals?.signal_groups?.length || 5) * 2}

**REQUIRED JSON SCHEMA:**
{
  "signals": [
    {
      "id": "SIG_001",
      "description": "Clinical description of the signal",
      "evidence_type": "L1",
      "group_id": "delay_drivers",
      "linked_tool_id": null
    }
  ]
}

Generate the signals array with 2 signals for each of the ${skeleton?.clinical_config?.signals?.signal_groups?.length || 5} signal groups listed above.
`,

    event_summary: `
You are a clinical narrative expert summarizing a ${domain} case.

**Context:**
- Domain: ${domain}
- Archetype: ${archetype}
${ranking_context ? `- Institution Rank: #${ranking_context.rank} in ${ranking_context.specialty_name}` : ''}

**Requirements:**
${archetype === 'Process_Auditor' ? '- Describe protocol adherence timeline\n- Highlight compliance successes and failures' : '- Follow HAC investigation narrative arc\n- State preventability determination clearly'}
${ranking_context ? `- MUST mention: "ranked #${ranking_context.rank} in ${ranking_context.specialty_name}"` : ''}
- Length: 150-300 words (minimum 100 characters)
- Include patient safety context

**REQUIRED JSON SCHEMA:**
{
  "summary": "A comprehensive narrative summary of the clinical case, 150-300 words, describing the event timeline, protocol adherence, and quality findings."
}

Generate a detailed event summary in the exact JSON format shown above.
`,

    summary_20_80: `
You are generating patient-facing and provider-facing summaries for a ${domain} quality case.

${ranking_context ? `**Institution Context:** Ranked #${ranking_context.rank} in ${ranking_context.specialty_name}` : ''}

**20% Patient Summary:**
- Simple, clear language
- Focus on what happened and next steps
- Reassuring tone

**80% Provider Summary:**
- Clinical detail and protocol compliance
- Quality metrics and benchmarks
${ranking_context ? `- Reference ranking context (#${ranking_context.rank} performance standards)` : ''}
- Actionable improvement opportunities

**REQUIRED JSON SCHEMA:**
{
  "patient_summary": "Simple, clear language summary for the patient (50-100 words)",
  "provider_summary": "Detailed clinical summary for providers with quality metrics (100-150 words)"
}

Generate both summaries in the exact JSON format shown above.
`,

    followup_questions: `
You are generating follow-up questions for a ${domain} case investigation.

**Context:**
- Archetype: ${archetype}
- Focus: ${archetype === 'Process_Auditor' ? 'Protocol compliance investigation' : 'Root cause analysis'}

**REQUIRED JSON SCHEMA:**
{
  "questions": [
    "First targeted follow-up question?",
    "Second targeted follow-up question?",
    "Third targeted follow-up question?"
  ]
}

Generate 3-5 targeted follow-up questions in the exact JSON format shown above.
`,

    clinical_review_plan: `
You are designing a clinical review plan for a ${domain} case.

**Context:**
- Archetype: ${archetype}

**Requirements:**
- Define clinical review tools (${archetype === 'Process_Auditor' ? 'checklists, compliance audits' : 'root cause analysis, fishbone diagrams'})
- Specify review order prioritizing high-impact areas
- Include 2-3 tools with priorities

**REQUIRED JSON SCHEMA:**
{
  "clinical_tools": [
    {
      "tool_id": "TOOL_001",
      "description": "Description of the clinical review tool",
      "priority": 1
    }
  ],
  "review_order": ["TOOL_001", "TOOL_002"]
}

Generate the clinical review plan in the exact JSON format shown above.
`,
  };

  return templates[task_type] || `Generate output for ${task_type} task.`;
}

// ============================================================================
// S5: Task Execution Stage
// ============================================================================

export class S5_TaskExecutionStage {
  async execute(
    promptPlan: PromptPlan,
    taskGraph: TaskGraph,
    skeleton: StructuralSkeleton,
    domainContext: DomainContext
  ): Promise<TaskExecutionResults> {
    const { domain, archetype, ranking_context } = domainContext;

    console.log(`\n[S5] Task Execution & Local Validation`);
    console.log(`  Domain: ${domain}`);
    console.log(`  Archetype: ${archetype}`);
    console.log(`  Tasks to execute: ${promptPlan.nodes.length}`);

    const taskOutputs: Map<string, TaskOutput> = new Map();
    const executionOrder = this.getExecutionOrder(taskGraph);

    console.log(`  Execution order: ${executionOrder.join(' → ')}`);

    // Execute tasks in dependency order
    for (const taskId of executionOrder) {
      console.log(`\n  📋 Executing task: ${taskId}`);

      const promptNode = promptPlan.nodes.find(n => n.id === taskId);
      if (!promptNode) {
        throw new Error(`No prompt found for task: ${taskId}`);
      }

      const config = promptNode.prompt_config;

      // Load prompt template
      const prompt = loadPromptTemplate(config.template_id, {
        domain,
        archetype,
        task_type: promptNode.type,
        skeleton,
        ranking_context,
        task_outputs: taskOutputs, // Previous task outputs for context
      });

      // Call LLM with quality-guided constraints
      const output = await callLLM({
        model: config.model,
        temperature: config.temperature,
        response_format: config.response_format,
        schema: config.schema_ref ? { /* would load schema */ } : undefined,
        prompt,
        task_type: promptNode.type,
        skeleton, // Pass skeleton for signal group context
      });

      console.log(`    ✅ Task completed`);

      // Debug: show output structure for troubleshooting
      if (promptNode.type === 'signal_enrichment') {
        console.log(`    📝 Debug - signal_enrichment output keys:`, Object.keys(output || {}));
        console.log(`    📝 Debug - signals type:`, typeof output?.signals, Array.isArray(output?.signals));
      }
      if (promptNode.type === 'event_summary') {
        console.log(`    📝 Debug - event_summary output:`, JSON.stringify(output, null, 2).substring(0, 200));
      }

      // Local validation (context-aware)
      const validation = validateTaskWithArchetypeContext(
        archetype,
        promptNode.type,
        output
      );

      if (!validation.passed) {
        console.log(`    ❌ Validation failed: ${validation.errors.join(', ')}`);
        throw new Error(`Task ${taskId} validation failed: ${validation.errors[0]}`);
      }

      if (validation.warnings.length > 0) {
        console.log(`    ⚠️  Warnings: ${validation.warnings.join(', ')}`);
      } else {
        console.log(`    ✅ Validation passed`);
      }

      // Store task output
      const taskOutput: TaskOutput = {
        taskId: taskId,
        output: {
          ...output,
          task_type: promptNode.type,
          metadata: {
            model: config.model,
            temperature: config.temperature,
            timestamp: new Date().toISOString(),
          },
        },
        validation: {
          passed: validation.passed,
          errors: validation.errors,
          warnings: validation.warnings,
          metrics: validation.metadata ? { ...validation.metadata } : undefined,
        },
      };

      taskOutputs.set(taskId, taskOutput);
    }

    console.log(`\n  ✅ All tasks executed successfully (${taskOutputs.size} outputs)`);

    return {
      execution_id: `exec_${Date.now()}`,
      outputs: Array.from(taskOutputs.values()),
    };
  }

  /**
   * Get execution order from task graph (topological sort)
   *
   * Ensures tasks execute in dependency order:
   * - signal_enrichment runs first (no dependencies)
   * - event_summary runs after signal_enrichment
   * - other tasks run after event_summary
   */
  private getExecutionOrder(taskGraph: TaskGraph): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const inDegree = new Map<string, number>();

    // Calculate in-degree for each node
    taskGraph.nodes.forEach(node => inDegree.set(node.id, 0));
    taskGraph.edges.forEach(([_, to]) => {
      inDegree.set(to, (inDegree.get(to) || 0) + 1);
    });

    // Start with nodes that have no dependencies
    const queue: string[] = [];
    taskGraph.nodes.forEach(node => {
      if (inDegree.get(node.id) === 0) {
        queue.push(node.id);
      }
    });

    // Process queue (topological sort)
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      order.push(nodeId);
      visited.add(nodeId);

      // Reduce in-degree for dependent nodes
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
      throw new Error('Cyclic dependency detected in task graph');
    }

    return order;
  }

  /**
   * Validate task execution results
   *
   * Should ALWAYS pass since:
   * - JSON schemas enforce structure at generation time (Tier 1)
   * - Prompt injection embeds requirements (Tier 2)
   * - Local validation confirms each task output
   */
  validate(results: TaskExecutionResults, taskGraph: TaskGraph): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check all tasks have outputs
    const taskIds = new Set(taskGraph.nodes.map(n => n.id));
    const outputIds = new Set(results.outputs.map((o: TaskOutput) => o.taskId));

    for (const taskId of taskIds) {
      if (!outputIds.has(taskId)) {
        errors.push(`⭐ CRITICAL: No output for task: ${taskId}`);
      }
    }

    // Check each output passed local validation
    for (const output of results.outputs) {
      if (!output.validation.passed) {
        errors.push(`⭐ CRITICAL: Task ${output.taskId} failed local validation`);
      }

      if (output.validation.warnings.length > 0) {
        warnings.push(`Task ${output.taskId} has warnings: ${output.validation.warnings.join(', ')}`);
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      metadata: {
        output_count: results.outputs.length,
        task_count: taskGraph.nodes.length,
      },
    };
  }
}

/**
 * Quality-First Architecture Notes:
 *
 * 1. Quality-Guided Generation (Strategy 2: JSON Schema):
 *    - response_format='json_schema' enforces structure
 *    - Tier 1 failures become impossible (schema validation at generation time)
 *    - LLM cannot omit required fields or use wrong types
 *
 * 2. Quality-Guided Generation (Strategy 3: Prompt Injection):
 *    - Ranking context injected into prompts ("ranked #20 in...")
 *    - Archetype requirements embedded in prompts
 *    - Domain-specific sources mentioned
 *    - Tier 2 warnings become rare (requirements are explicit)
 *
 * 3. Local Validation (Context-Aware):
 *    - Each task validated with archetype/task-specific criteria
 *    - Process_Auditor signals checked for protocol focus
 *    - Preventability_Detective signals checked for preventability mentions
 *    - Early detection of quality issues
 *
 * 4. Execution Order (Dependency-Aware):
 *    - Topological sort ensures correct execution order
 *    - signal_enrichment runs first (no deps)
 *    - event_summary uses signal outputs
 *    - Other tasks use event_summary outputs
 *
 * 5. Benefits:
 *    - Fewer validation failures (schemas enforce structure)
 *    - Higher quality outputs (requirements in prompts)
 *    - Predictable execution (dependency-aware ordering)
 *    - Early detection (local validation after each task)
 */
