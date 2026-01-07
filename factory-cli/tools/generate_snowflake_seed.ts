import * as fs from 'fs';
import * as path from 'path';
import { ContractSynthesizer } from '../SchemaFactory/generators/contract_synthesizer';
import { SemanticPacketLoader } from '../utils/semanticPacketLoader';

// 1. CONSTANTS & MAPPINGS
const APP_MAPPING: Record<string, string> = {
  'Orthopedics': 'ORTHO',
  'Cardiology': 'CARDIO', // Example
  'Neurology': 'NEURO'    // Example
};

const DOMAIN_ID_MAPPING: Record<string, string> = {
  'Orthopedics': 'orthopedics_usnwr'
};

const USER_ID = 'SYSTEM_SEEDER';

interface LeanPlan {
  handoff_metadata: {
    metric_id: string;
    domain: string;
    version: string;
  };
  schema_definitions: {
    metric_info: any;
    signal_catalog: Record<string, Array<{ 
      id: string;
      description: string;
      evidence_type: string;
      archetypes: string[];
    }>>;
  };
  execution_registry: {
    task_sequence: Array<{ 
      task_id: string;
      order: number;
      type: string;
      prompt_path: string;
      output_schema: string;
      archetypes_involved: string[];
    }>;
  };
}

function generateSql() {
  const planPath = path.join(__dirname, '../output/i32a-Orthopedics/lean_plan.json');
  
  if (!fs.existsSync(planPath)) {
    console.error(`❌ Plan not found: ${planPath}`);
    process.exit(1);
  }

  const plan: LeanPlan = JSON.parse(fs.readFileSync(planPath, 'utf-8'));
  const metadata = plan.handoff_metadata;

  // Resolve App Context
  const appId = APP_MAPPING[metadata.domain];
  const domainId = DOMAIN_ID_MAPPING[metadata.domain];

  if (!appId || !domainId) {
    console.error(`❌ Unknown App/Domain mapping for '${metadata.domain}'`);
    process.exit(1);
  }

  // Initialize Services for Hydration
  const synthesizer = new ContractSynthesizer(path.resolve(__dirname, '../domains_registry'));
  const packetLoader = SemanticPacketLoader.getInstance();
  
  // Load Context
  const packet = packetLoader.load(metadata.domain, metadata.metric_id);
  if (!packet) {
      console.warn(`⚠️  Warning: Semantic Packet not found for ${metadata.domain}/${metadata.metric_id}. Hydration may fail.`);
  }

  // Construct Hydration Context (matching S6 logic)
  const hydrationContext = {
      domain: metadata.domain,
      primary_archetype: 'Preventability_Detective', // Default or extract from plan if possible
      semantic_context: {
          packet: {
              metric: packet?.metrics[metadata.metric_id],
              signals: packet?.signals
          },
          ranking: null 
      },
      ortho_context: packet,
      ranking_context: null,
      archetype: 'Preventability_Detective'
  };

  const sqlLines: string[] = [];
  sqlLines.push(`-- ConfigDB Seed Script for ${metadata.metric_id}`);
  sqlLines.push(`-- Generated at: ${new Date().toISOString()}`);
  sqlLines.push(`-- INSTRUCTION: Set your context before running: USE SCHEMA YOUR_DATABASE.ConfigDB;`);
  sqlLines.push('');

  // ---------------------------------------------------------
  // 1. DOMAIN_CONFIG
  // ---------------------------------------------------------
  const domainPayload = JSON.stringify({
    name: metadata.domain,
    type: "USNWR_Specialty"
  }).replace(/'/g, "''"); // Simple SQL escape

  sqlLines.push(`-- 1. Upsert Domain Config`);
  sqlLines.push(`MERGE INTO DOMAIN_CONFIG AS target`);
  sqlLines.push(`USING (SELECT '${appId}' as APP_ID, '${domainId}' as DOMAIN_ID) AS source`);
  sqlLines.push(`ON target.APP_ID = source.APP_ID AND target.DOMAIN_ID = source.DOMAIN_ID`);
  sqlLines.push(`WHEN MATCHED THEN UPDATE SET target.PAYLOAD = PARSE_JSON('${domainPayload}'), target.UPDATED_AT = CURRENT_TIMESTAMP()`);
  sqlLines.push(`WHEN NOT MATCHED THEN INSERT (APP_ID, DOMAIN_ID, VERSION, STATUS, PAYLOAD, CREATED_AT, CREATED_BY)`);
  sqlLines.push(`VALUES (source.APP_ID, source.DOMAIN_ID, '1.0', 'ACTIVE', PARSE_JSON('${domainPayload}'), CURRENT_TIMESTAMP(), '${USER_ID}');`);
  sqlLines.push('');

  // ---------------------------------------------------------
  // 2. METRIC_CONFIG
  // ---------------------------------------------------------
  const metricPayload = JSON.stringify(plan.schema_definitions.metric_info).replace(/'/g, "''");

  sqlLines.push(`-- 2. Upsert Metric Config`);
  sqlLines.push(`MERGE INTO METRIC_CONFIG AS target`);
  sqlLines.push(`USING (SELECT '${appId}' as APP_ID, '${metadata.metric_id}' as METRIC_ID) AS source`);
  sqlLines.push(`ON target.APP_ID = source.APP_ID AND target.METRIC_ID = source.METRIC_ID`);
  sqlLines.push(`WHEN MATCHED THEN UPDATE SET target.PAYLOAD = PARSE_JSON('${metricPayload}'), target.UPDATED_AT = CURRENT_TIMESTAMP()`);
  sqlLines.push(`WHEN NOT MATCHED THEN INSERT (APP_ID, METRIC_ID, DOMAIN_ID, VERSION, STATUS, PAYLOAD, CREATED_AT, CREATED_BY)`);
  sqlLines.push(`VALUES (source.APP_ID, source.METRIC_ID, '${domainId}', '1.0', 'ACTIVE', PARSE_JSON('${metricPayload}'), CURRENT_TIMESTAMP(), '${USER_ID}');`);
  sqlLines.push('');

  // ---------------------------------------------------------
  // 3. SIGNAL_CONFIG
  // ---------------------------------------------------------
  sqlLines.push(`-- 3. Upsert Signal Config (Canonical)`);
  // Flatten signals
  for (const [groupId, signals] of Object.entries(plan.schema_definitions.signal_catalog)) {
    signals.forEach(sig => {
      const signalPayload = JSON.stringify({
        ...sig,
        group_id: groupId,
        metric_id: metadata.metric_id // Linking back to metric context
      }).replace(/'/g, "''");

      sqlLines.push(`MERGE INTO SIGNAL_CONFIG AS target`);
      sqlLines.push(`USING (SELECT '${appId}' as APP_ID, '${sig.id}' as SIGNAL_ID) AS source`);
      sqlLines.push(`ON target.APP_ID = source.APP_ID AND target.SIGNAL_ID = source.SIGNAL_ID`);
      sqlLines.push(`WHEN MATCHED THEN UPDATE SET target.PAYLOAD = PARSE_JSON('${signalPayload}'), target.UPDATED_AT = CURRENT_TIMESTAMP()`);
      sqlLines.push(`WHEN NOT MATCHED THEN INSERT (APP_ID, SIGNAL_ID, VERSION, STATUS, PAYLOAD, CREATED_AT, CREATED_BY)`);
      sqlLines.push(`VALUES (source.APP_ID, source.SIGNAL_ID, '1.0', 'ACTIVE', PARSE_JSON('${signalPayload}'), CURRENT_TIMESTAMP(), '${USER_ID}');`);
    });
  }
  sqlLines.push('');

  // ---------------------------------------------------------
  // 4. TASK_CONFIG & TASK_PROMPT_CONFIG
  // ---------------------------------------------------------
  sqlLines.push(`-- 4. Upsert Task & Prompt Configs`);
  
  plan.execution_registry.task_sequence.forEach(task => {
    // A. Task Definition
    const taskPayload = JSON.stringify({
      order: task.order,
      type: task.type,
      output_schema_ref: task.output_schema,
      archetypes: task.archetypes_involved
    }).replace(/'/g, "''");

    sqlLines.push(`-- Task: ${task.task_id}`);
    sqlLines.push(`MERGE INTO TASK_CONFIG AS target`);
    sqlLines.push(`USING (SELECT '${appId}' as APP_ID, '${task.task_id}' as TASK_ID) AS source`);
    sqlLines.push(`ON target.APP_ID = source.APP_ID AND target.TASK_ID = source.TASK_ID`);
    sqlLines.push(`WHEN MATCHED THEN UPDATE SET target.PAYLOAD = PARSE_JSON('${taskPayload}'), target.UPDATED_AT = CURRENT_TIMESTAMP()`);
    sqlLines.push(`WHEN NOT MATCHED THEN INSERT (APP_ID, TASK_ID, VERSION, STATUS, PAYLOAD, CREATED_AT, CREATED_BY)`);
    sqlLines.push(`VALUES (source.APP_ID, source.TASK_ID, '1.0', 'ACTIVE', PARSE_JSON('${taskPayload}'), CURRENT_TIMESTAMP(), '${USER_ID}');`);

    // B. Prompt Content (Hydrate!)
    let promptContent = "PROMPT GENERATION FAILED";
    
    try {
        const registryTaskName = task.task_id === 'clinical_review_helper' ? 'clinical_review_helper' : task.task_id;
        
        promptContent = synthesizer.hydratePrompt(
            metadata.domain,
            'General', // Specialty
            registryTaskName,
            hydrationContext
        );
    } catch (e: any) {
        console.warn(`⚠️  Hydration warning for ${task.task_id}: ${e.message}. Falling back to raw file.`);
        // Fallback: Read raw file
        const absolutePromptPath = path.join(__dirname, '../', task.prompt_path);
        if (fs.existsSync(absolutePromptPath)) {
            promptContent = fs.readFileSync(absolutePromptPath, 'utf-8');
        }
    }

    const promptPayload = JSON.stringify({
        content: promptContent,
        model: "gpt-4o-mini", 
        temperature: 0.0,
        is_hydrated: true
    }).replace(/'/g, "''").replace(/\\/g, "\\\\");

    sqlLines.push(`MERGE INTO TASK_PROMPT_CONFIG AS target`);
    sqlLines.push(`USING (SELECT '${appId}' as APP_ID, '${task.task_id}' as TASK_ID, 'v1.0' as PROMPT_VERSION) AS source`);
    sqlLines.push(`ON target.APP_ID = source.APP_ID AND target.TASK_ID = source.TASK_ID AND target.PROMPT_VERSION = source.PROMPT_VERSION`);
    sqlLines.push(`WHEN MATCHED THEN UPDATE SET target.PAYLOAD = PARSE_JSON('${promptPayload}'), target.UPDATED_AT = CURRENT_TIMESTAMP()`);
    sqlLines.push(`WHEN NOT MATCHED THEN INSERT (APP_ID, TASK_ID, PROMPT_VERSION, STATUS, PAYLOAD, CREATED_AT, CREATED_BY)`);
    sqlLines.push(`VALUES (source.APP_ID, source.TASK_ID, source.PROMPT_VERSION, 'ACTIVE', PARSE_JSON('${promptPayload}'), CURRENT_TIMESTAMP(), '${USER_ID}');`);
    sqlLines.push('');
  });


  // Output
  const outputPath = path.join(__dirname, '../output/i32a-Orthopedics/seed_snowflake.sql');
  fs.writeFileSync(outputPath, sqlLines.join('\n'));
  console.log(`\n🎉 Snowflake Seed Script Generated: ${outputPath}`);
}

generateSql();