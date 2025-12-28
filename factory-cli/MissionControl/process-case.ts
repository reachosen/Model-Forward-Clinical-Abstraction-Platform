#!/usr/bin/env node
/**
 * Process Case - Run a clinical case through the full S0-S5 abstraction pipeline
 *
 * This is the core execution engine that processes patient data through
 * all pipeline stages and displays the Mission Control Dashboard with results.
 *
 * Usage:
 *   npx ts-node MissionControl/process-case.ts demo --case emily --metric I32a
 */

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { S5_TaskExecutionStage } from '../PlanningFactory/stages/S5_TaskExecution';
import { S0_InputNormalizationStage } from '../PlanningFactory/stages/S0_InputNormalization';
import { S1_DomainResolutionStage } from '../PlanningFactory/stages/S1_DomainResolution';
import { S2_StructuralSkeletonStage } from '../PlanningFactory/stages/S2_StructuralSkeleton';
import { S3_TaskGraphIdentificationStage } from '../PlanningFactory/stages/S3_TaskGraphIdentification';
import { PromptPlan } from '../PlanningFactory/types';

const program = new Command();

program
  .name('process-case')
  .description('Process a clinical case through the full abstraction pipeline')
  .version('1.0.0');

program
  .command('demo')
  .description('Run a certified mission demo (Emily Case)')
  .requiredOption('-c, --case <id>', 'Case ID', 'emily')
  .option('-m, --metric <id>', 'Metric ID', 'I32a')
  .action(async (options) => {
    try {
      console.log(`\n🚀 Processing Case: ${options.case.toUpperCase()} / ${options.metric}`);

      // 1. Load Data
      const casePath = path.resolve(__dirname, `../data/${options.case}_case.json`);
      if (!fs.existsSync(casePath)) {
        throw new Error(`Case file not found: ${casePath}`);
      }
      const patientData = fs.readFileSync(casePath, 'utf-8');
      console.log(`   📄 Loaded Patient Payload (${patientData.length} chars)`);

      // 2. Initialize Pipeline Stages
      const s0 = new S0_InputNormalizationStage();
      const s1 = new S1_DomainResolutionStage();
      const s2 = new S2_StructuralSkeletonStage();
      const s3 = new S3_TaskGraphIdentificationStage();
      const s5 = new S5_TaskExecutionStage();

      // 3. Synthesize Plan (Simulating Planning Factory for this specific run)
      // In a real run, we would load a certified plan.json, but here we want to demonstrate
      // the live hydration of the certified logic.
      console.log(`\n   Initializing Abstraction Plan...`);

      const input = {
        planning_input_id: 'demo_run',
        concern: options.metric,
        concern_id: options.metric, // V9.1 field
        domain_hint: 'Orthopedics',
        domain: 'Orthopedics', // V9.1 field
        intent: 'quality_reporting',
        clinical_context: {
             patient_payload: patientData
        }
      };

      const routed = await s0.execute(input as any);
      const domainContext = await s1.execute(routed);
      const skeleton = await s2.execute(routed, domainContext);
      const graph = await s3.execute(routed, domainContext, skeleton);

      // 4. Step 0: Exclusion Check (The Gatekeeper)
      console.log(`\n   Step 0: Running Exclusion Check...`);
      const exclusionPlan: PromptPlan = {
          graph_id: 'gatekeeper_graph',
          nodes: [{
              id: 'exclusion_check',
              type: 'exclusion_check' as any,
              prompt_config: {
                  template_id: 'exclusion_check',
                  model: 'gpt-4o-mini',
                  temperature: 0,
                  response_format: 'json_schema'
              }
          }]
      };

      const exclusionGraph = {
          graph_id: 'gatekeeper_graph',
          nodes: [{ id: 'exclusion_check', type: 'exclusion_check' }],
          edges: [],
          constraints: { must_run: ['exclusion_check'], optional: [] }
      };

      const gatekeeperResults = await s5.execute(exclusionPlan, exclusionGraph as any, skeleton, domainContext);
      const exclusionOutput = gatekeeperResults.outputs[0]?.output?.exclusion_check;

      console.log(`\n\n===============================================================`);
      console.log(`   MISSION CONTROL DASHBOARD: ${options.metric} - ${options.case.toUpperCase()}`);
      console.log(`===============================================================\n`);

      if (exclusionOutput) {
          console.log(`📊 EXCLUSION CHECK`);
          console.log(`   Status: ${exclusionOutput.overall_status.toUpperCase()}`);
          console.log(`   Reason: ${exclusionOutput.final_exclusion_reason || 'N/A'}`);
          console.log(`---------------------------------------------------------------`);

          if (exclusionOutput.overall_status === 'excluded') {
              console.log(`\n🛑 Case EXCLUDED. Stopping further processing.`);
              console.log(`\n✅ Processing Complete (Early Termination).`);
              return;
          }
      }

      // 5. Steps 1-5: Orientation, Atomic Facts, and Deep Review
      console.log(`\n   Case not excluded. Processing remaining tasks (Steps 1-5)...`);
      const orderedTaskIds = [
        "20_80_display_fields",
        "event_summary",
        "signal_enrichment",
        "followup_questions",
        "clinical_review_plan",
        "clinical_review_helper"
      ];

      const promptPlan: PromptPlan = {
          graph_id: 'deep_review_graph',
          nodes: orderedTaskIds.map(id => ({
              id: id,
              type: id as any,
              prompt_config: {
                  template_id: id,
                  model: 'gpt-4o-mini',
                  temperature: 0,
                  response_format: 'json_schema'
              }
          }))
      };

      const linearGraph = {
          ...graph,
          nodes: orderedTaskIds.map(id => ({ id, type: id })),
          edges: orderedTaskIds.slice(0, -1).map((id, i) => [id, orderedTaskIds[i+1]] as [string, string])
      };

      const results = await s5.execute(promptPlan, linearGraph as any, skeleton, domainContext);

      // 6. Display Output (Remaining Dashboard)
      // Orientation (Step 1)
      const display2080 = results.outputs.find(o => o.output.task_type === '20_80_display_fields')?.output;
      // 20/80 Display
      if (display2080) {
          console.log(`📊 20/80 DISPLAY FIELDS (Step 1)`);
          const fields = display2080.display_fields || [];
          fields.sort((a: any, b: any) => a.order - b.order);

          fields.forEach((f: any) => {
              console.log(`   ${f.label.padEnd(25)}: ${f.value}`);
          });
          console.log(`---------------------------------------------------------------`);
      }

      // Timeline (Step 2)
      const summary = results.outputs.find(o => o.output.task_type === 'event_summary')?.output;
      if (summary) {
          console.log(`📅 EVENT TIMELINE (Step 2)`);
          console.log(`   Complete: ${summary.timeline_complete ? 'Yes' : 'No'}`);
          console.log(`   Summary: ${summary.event_summary.substring(0, 300)}...`);
          console.log(`   Key Timestamps: ${summary.key_timestamps?.join(', ')}`);
          console.log(`---------------------------------------------------------------`);
      }

      // Atomic Facts (Step 3)
      const signals = results.outputs.find(o => o.output.task_type === 'signal_enrichment')?.output;
      if (signals) {
          console.log(`🔬 SIGNAL ENRICHMENT (Step 3)`);

          if (!signals.signal_groups || signals.signal_groups.length === 0) {
              console.log(`   No clinical signals identified.`);
          } else {
              signals.signal_groups.forEach((group: any) => {
                  console.log(`\n   📂 GROUP: ${group.group_id.toUpperCase()}`);

                  if (!group.signals || group.signals.length === 0) {
                      console.log(`      (No signals)`);
                  } else {
                      group.signals.forEach((sig: any) => {
                          const archetypes = sig.tags ? `[${sig.tags.join(', ')}]` : '';
                          console.log(`      • ${sig.description.padEnd(60)} ${archetypes}`);
                          console.log(`        🔍 Provenance: "${sig.provenance.substring(0, 100)}${sig.provenance.length > 100 ? '...' : ''}"`);
                      });
                  }
              });
          }
          console.log(`\n---------------------------------------------------------------`);
      }

      // Where to Look (Step 4)
      const followup = results.outputs.find(o => o.output.task_type === 'followup_questions')?.output;
      if (followup) {
          console.log(`❓ FOLLOW-UP QUESTIONS (Step 4)`);
          followup.followup_questions?.slice(0, 3).forEach((q: string) => console.log(`   - ${q}`));
          console.log(`   ... (+${followup.followup_questions?.length - 3} more)`);
          console.log(`---------------------------------------------------------------`);
      }

      // Clinical Review (Step 5)
      const review = results.outputs.find(o => o.output.task_type === 'clinical_review_plan')?.output?.clinical_reviewer;
      if (review) {
          console.log(`👨‍⚕️ CLINICAL REVIEW PLAN (Step 5)`);
          console.log(`   Call: ${review.overall_call.toUpperCase()}`);
          console.log(`   Alignment: ${review.metric_alignment}`);
          console.log(`---------------------------------------------------------------`);
      }

      // Review Helper (Step 6)
      const helper = results.outputs.find(o => o.output.task_type === 'clinical_review_helper')?.output?.review_helper;
      if (helper) {
          console.log(`🛠️  REVIEW HELPER (Step 6)`);
          console.log(`   Notes: ${helper.helper_notes}`);
          console.log(`   Actions: ${helper.suggested_actions?.join(', ')}`);
      }

      console.log(`\n✅ Processing Complete.`);

    } catch (error: any) {
      console.error(`\n❌ Processing Failed: ${error.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
