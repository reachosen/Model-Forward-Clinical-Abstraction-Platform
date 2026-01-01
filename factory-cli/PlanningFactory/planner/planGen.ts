import { PlanningInput } from '../../models/PlanningInput';
import { PlannerPlanV2 } from '../../models/PlannerPlan';
import { PromptPlan } from '../types';
import { S0_InputNormalizationStage } from '../stages/S0_InputNormalization';
import { S1_DomainResolutionStage } from '../stages/S1_DomainResolution';
import { S2_StructuralSkeletonStage } from '../stages/S2_StructuralSkeleton';
import { S3_TaskGraphIdentificationStage } from '../stages/S3_TaskGraphIdentification';
import { S4_PromptPlanGenerationStage } from '../stages/S4_PromptPlanGeneration';
import { S5_TaskExecutionStage } from '../stages/S5_TaskExecution';
import { S6_PlanAssemblyStage } from '../stages/S6_PlanAssembly';

export interface PlannerConfig {
  apiKey?: string;
  model?: string;
  useMock?: boolean;
  temperature?: number;
}

/**
 * E1: generatePromptPlan
 * 
 * Runs S0-S4 to generate a prompt execution plan from input.
 */
export async function generatePromptPlan(
  input: PlanningInput,
  config: PlannerConfig = {}
): Promise<PromptPlan> {
  // S0
  const s0 = new S0_InputNormalizationStage();
  const routed = await s0.execute(input as any);

  // S1
  const s1 = new S1_DomainResolutionStage();
  const domain = await s1.execute(routed);

  // S2
  const s2 = new S2_StructuralSkeletonStage();
  const skeleton = await s2.execute(routed, domain);

  // S3
  const s3 = new S3_TaskGraphIdentificationStage();
  const graph = await s3.execute(routed, domain, skeleton);

  // S4
  const s4 = new S4_PromptPlanGenerationStage();
  const prompts = await s4.execute(graph, domain);

  return prompts;
}

/**
 * E1: executePromptPlan
 * 
 * Runs S5-S6 to execute a prompt plan and assemble the final output.
 * Re-runs S0-S3 to reconstruct context (fast/non-LLM).
 */
export async function executePromptPlan(
  promptPlan: PromptPlan,
  input: PlanningInput,
  config: PlannerConfig = {}
): Promise<PlannerPlanV2> {
  // S0
  const s0 = new S0_InputNormalizationStage();
  const routed = await s0.execute(input as any);

  // S1
  const s1 = new S1_DomainResolutionStage();
  const domain = await s1.execute(routed);

  // S2
  const s2 = new S2_StructuralSkeletonStage();
  const skeleton = await s2.execute(routed, domain);

  // S3
  const s3 = new S3_TaskGraphIdentificationStage();
  const graph = await s3.execute(routed, domain, skeleton);

  // S5
  const s5 = new S5_TaskExecutionStage();
  const taskResults = await s5.execute(promptPlan, graph, skeleton, domain);

  // S6
  const s6 = new S6_PlanAssemblyStage();
  const plan = await s6.execute(skeleton, taskResults, domain, input as any, promptPlan);

  return plan;
}

export async function generatePlan(
  input: PlanningInput,
  config: PlannerConfig
): Promise<PlannerPlanV2> { // Return V2 plan
  
  console.log('🚀 Starting S0-S6 Pipeline via generatePlan...');

  const promptPlan = await generatePromptPlan(input, config);
  const plan = await executePromptPlan(promptPlan, input, config);

  return plan;
}
