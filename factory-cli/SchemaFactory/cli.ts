#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { ContractSynthesizer } from './generators/contract_synthesizer';
import { S1_DomainResolutionStage } from '../PlanningFactory/stages/S1_DomainResolution';
import { S0_InputNormalizationStage } from '../PlanningFactory/stages/S0_InputNormalization';

const program = new Command();

program
  .name('schema-factory')
  .description('Certify contracts and hydrate prompts from a plan')
  .version('1.0.0');

program
  .command('certify')
  .description('Generate certified artifacts from a plan')
  .requiredOption('-p, --plan <path>', 'Path to plan.json')
  .option('-o, --output <path>', 'Output directory for certified artifacts', 'certified')
  .action(async (options) => {
    try {
      console.log(`
🏭 Schema Factory: Certification Protocol Initiated`);
      
      const planPath = path.resolve(options.plan);
      if (!fs.existsSync(planPath)) {
        throw new Error(`Plan file not found: ${planPath}`);
      }

      console.log(`   Loading plan: ${planPath}`);
      const plan = JSON.parse(fs.readFileSync(planPath, 'utf-8'));

      // 1. Reconstruct Context (The "Richness")
      // We rely on the Planner's S0/S1 stages to re-hydrate the context from the input
      console.log(`   Reconstructing Domain Context...`);
      const s0 = new S0_InputNormalizationStage();
      
      const inputSnapshot = plan.plan_metadata?.planning_input_snapshot || plan.planning_input;
      if (!inputSnapshot) {
          throw new Error("Plan is missing 'planning_input_snapshot'. Cannot re-hydrate context.");
      }

      const routed = await s0.execute(inputSnapshot);
      
      const s1 = new S1_DomainResolutionStage();
      const domainContext = await s1.execute(routed);
      
      console.log(`   Context Rehydrated: ${domainContext.domain} / ${domainContext.primary_archetype}`);

      // 2. Initialize Synthesizer
      const synthesizer = new ContractSynthesizer();
      
      // 3. Identify Tasks to Certify
      // We look at the tasks configured in the plan
      const taskPrompts = plan.clinical_config?.prompts?.task_prompts || {};
      const taskIds = Object.keys(taskPrompts);
      console.log(`   Tasks identified for certification: ${taskIds.join(', ')}`);

      // 4. Generate Artifacts
      const outputBase = path.resolve(options.output, domainContext.domain, routed.concern_id);
      fs.mkdirSync(outputBase, { recursive: true });

      const artifactSummary: any = {
        certified_at: new Date().toISOString(),
        metric_id: routed.concern_id,
        domain: domainContext.domain,
        tasks: {}
      };

      // Map S6 task names to Registry keys
      const taskMap: Record<string, string> = {
        'signal_generation': 'signal_enrichment',
        'clinical_reviewer': 'clinical_review_plan',
        'task_event_summary': 'event_summary',
        'task_followup_questions': 'followup_questions',
        'task_20_80_display_fields': '20_80_display_fields'
      };

      for (const rawTaskType of Array.from(taskIds)) {
        const taskType = taskMap[rawTaskType] || rawTaskType;
        console.log(`
   Processing Task: ${taskType} (from ${rawTaskType})`);
        
        // A. Hydrate
        // We use the primary archetype context for certification
        const promptContext = {
            ...domainContext,
            ortho_context: domainContext.semantic_context.packet,
            ranking_context: domainContext.semantic_context.ranking,
            archetype: domainContext.primary_archetype
        };

        const hydratedPrompt = synthesizer.hydratePrompt(
            domainContext.domain, 
            domainContext.semantic_context.ranking?.specialty_name || 'General', 
            taskType as string, 
            promptContext
        );

        // B. Extract Schema
        const schema = synthesizer.extractSchema(hydratedPrompt);

        // C. Generate Zod
        const zodCode = synthesizer.generateZodCode(schema, `${taskType}_Schema`);

        // D. Write Files
        const taskDir = path.join(outputBase, taskType as string);
        fs.mkdirSync(taskDir, { recursive: true });

        fs.writeFileSync(path.join(taskDir, 'prompt.md'), hydratedPrompt);
        fs.writeFileSync(path.join(taskDir, 'schema.json'), JSON.stringify(schema, null, 2));
        fs.writeFileSync(path.join(taskDir, 'contract.ts'), zodCode);

        console.log(`      ✅ Prompt, Schema, and Contract generated.`);
        
        artifactSummary.tasks[taskType as string] = {
            prompt_path: `${taskType}/prompt.md`,
            contract_path: `${taskType}/contract.ts`,
            schema_hash: "TODO: SHA256"
        };
      }

      // Write Summary
      fs.writeFileSync(path.join(outputBase, 'manifest.json'), JSON.stringify(artifactSummary, null, 2));
      console.log(`
✅ Certification Complete. Artifacts in: ${outputBase}`);

    } catch (error: any) {
      console.error(`
❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
