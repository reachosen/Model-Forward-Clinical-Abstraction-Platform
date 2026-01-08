import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { ContractSynthesizer } from '../SchemaFactory/generators/contract_synthesizer';
import { SemanticPacketLoader } from '../utils/semanticPacketLoader';
import { resolveMetricPath } from '../utils/pathConfig';

// 1. CONSTANTS & MAPPINGS
const APP_MAPPING: Record<string, string> = {
  'Orthopedics': 'ORTHO',
  'Cardiology': 'CARDIO',
  'Neurology': 'NEURO'
};

const DOMAIN_ID_MAPPING: Record<string, string> = {
  'Orthopedics': 'orthopedics_usnwr'
};

const USER_ID = 'SYSTEM_SEEDER';
const ALLOWED_ARCHETYPES = new Set([
  'Process_Auditor',
  'Preventability_Detective',
  'Preventability_Detective_Metric',
  'Exclusion_Hunter',
  'Data_Scavenger',
  'Delay_Driver_Profiler',
  'Outcome_Tracker'
]);

interface LeanPlan {
  handoff_metadata: {
    metric_id: string;
    domain: string;
    version: string;
  };
  schema_definitions: {
    metric_info: any;
    metric_archetype_bindings?: Array<{ 
      archetype_id: string;
      role: string;
    }>;
    signal_catalog: Record<string, Array<{ 
      id?: string;
      signal_id?: string;
      canonical_key?: string;
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
  const args = process.argv.slice(2);
  const metricFlagIdx = args.indexOf('--metric');
  const metricId = metricFlagIdx !== -1 ? args[metricFlagIdx + 1] : 'I32a';

  console.log(`🚀 Generating Snowflake Seed for: ${metricId}`);

  const metricPath = resolveMetricPath(metricId);
  const cliRoot = path.join(__dirname, '..');
  
  // Resolve Plan Path using standard logic
  const planDirName = `${metricId.toLowerCase()}-${(metricPath.specialty || 'General').toLowerCase()}`;
  const planPath = path.join(cliRoot, 'output', planDirName, 'lean_plan.json');

  if (!fs.existsSync(planPath)) {
    console.error(`❌ Plan not found: ${planPath}`);
    process.exit(1);
  }

  const plan: LeanPlan = JSON.parse(fs.readFileSync(planPath, 'utf-8'));
  const metadata = plan.handoff_metadata;
  const metricVersion = plan.schema_definitions.metric_info?.version || metadata.version || '1.0';
  const planRef = path
    .relative(cliRoot, planPath)
    .replace(/\\/g, '/');

  // Resolve App Context
  const appId = APP_MAPPING[metadata.domain];
  const domainId = DOMAIN_ID_MAPPING[metadata.domain];

  if (!appId || !domainId) {
    console.error(`❌ Unknown App/Domain mapping for '${metadata.domain}'`);
    process.exit(1);
  }

  // Initialize Services for Hydration
  const synthesizer = new ContractSynthesizer(path.resolve(cliRoot, 'domains_registry'));
  const packetLoader = SemanticPacketLoader.getInstance();
  
  // Load Context
  const packet = packetLoader.load(metadata.domain, metadata.metric_id);
  if (!packet) {
      console.warn(`⚠️ Warning: Semantic Packet not found for ${metadata.domain}/${metadata.metric_id}. Hydration may fail.`);
  }

  // Construct Hydration Context (matching S6 logic)
  const hydrationContext = {
      domain: metadata.domain,
      metric_id: metadata.metric_id,
      primary_archetype: 'Preventability_Detective', 
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

  // 1. DOMAIN_CONFIG
  const domainPayload = JSON.stringify({
    name: metadata.domain,
    type: "USNWR_Specialty"
  }).replace(/'/g, "''"); 

  sqlLines.push(`-- 1. Upsert Domain Config`);
  sqlLines.push(`MERGE INTO DOMAIN_CONFIG AS target`);
  sqlLines.push(`USING (SELECT '${appId}' as APP_ID, '${domainId}' as DOMAIN_ID) AS source`);
  sqlLines.push(`ON target.APP_ID = source.APP_ID AND target.DOMAIN_ID = source.DOMAIN_ID`);
  sqlLines.push(`WHEN MATCHED THEN UPDATE SET target.PAYLOAD = PARSE_JSON('${domainPayload}'), target.UPDATED_AT = CURRENT_TIMESTAMP()`);
  sqlLines.push(`WHEN NOT MATCHED THEN INSERT (APP_ID, DOMAIN_ID, VERSION, STATUS, PAYLOAD, CREATED_AT, CREATED_BY)`);
  sqlLines.push(`VALUES (source.APP_ID, source.DOMAIN_ID, '1.0', 'ACTIVE', PARSE_JSON('${domainPayload}'), CURRENT_TIMESTAMP(), '${USER_ID}');`);
  sqlLines.push('');

  // 2. METRIC_CONFIG
  const metricPayload = JSON.stringify(plan.schema_definitions.metric_info).replace(/'/g, "''");

  sqlLines.push(`-- 2. Upsert Metric Config`);
  sqlLines.push(`MERGE INTO METRIC_CONFIG AS target`);
  sqlLines.push(`USING (SELECT '${appId}' as APP_ID, '${metadata.metric_id}' as METRIC_ID) AS source`);
  sqlLines.push(`ON target.APP_ID = source.APP_ID AND target.METRIC_ID = source.METRIC_ID`);
  sqlLines.push(`WHEN MATCHED THEN UPDATE SET target.PAYLOAD = PARSE_JSON('${metricPayload}'), target.UPDATED_AT = CURRENT_TIMESTAMP()`);
  sqlLines.push(`WHEN NOT MATCHED THEN INSERT (APP_ID, METRIC_ID, DOMAIN_ID, VERSION, STATUS, PAYLOAD, CREATED_AT, CREATED_BY)`);
  sqlLines.push(`VALUES (source.APP_ID, source.METRIC_ID, '${domainId}', '1.0', 'ACTIVE', PARSE_JSON('${metricPayload}'), CURRENT_TIMESTAMP(), '${USER_ID}');`);
  sqlLines.push('');

  // 3. METRIC_ARCHETYPE_BINDING
  const bindings = plan.schema_definitions.metric_archetype_bindings || [];
  if (bindings.length > 0) {
    sqlLines.push(`-- 3. Upsert Metric Archetype Bindings`);
    const bindingPayload = JSON.stringify({ source: 'PlanningFactory', plan_ref: planRef }).replace(/'/g, "''");
    bindings.forEach(binding => {
      sqlLines.push(`MERGE INTO METRIC_ARCHETYPE_BINDING AS target`);
      sqlLines.push(`USING (SELECT '${appId}' as APP_ID, '${metadata.metric_id}' as METRIC_ID, '${binding.archetype_id}' as ARCHETYPE_ID, '${metricVersion}' as VERSION) AS source`);
      sqlLines.push(`ON target.APP_ID = source.APP_ID AND target.METRIC_ID = source.METRIC_ID AND target.ARCHETYPE_ID = source.ARCHETYPE_ID AND target.VERSION = source.VERSION`);
      sqlLines.push(`WHEN MATCHED THEN UPDATE SET target.ROLE = '${binding.role}', target.PAYLOAD = PARSE_JSON('${bindingPayload}'), target.UPDATED_AT = CURRENT_TIMESTAMP()`);
      sqlLines.push(`WHEN NOT MATCHED THEN INSERT (APP_ID, METRIC_ID, ARCHETYPE_ID, ROLE, VERSION, STATUS, PAYLOAD, CREATED_AT, CREATED_BY)`);
      sqlLines.push(`VALUES (source.APP_ID, source.METRIC_ID, source.ARCHETYPE_ID, '${binding.role}', source.VERSION, 'ACTIVE', PARSE_JSON('${bindingPayload}'), CURRENT_TIMESTAMP(), '${USER_ID}');`);
      sqlLines.push('');
    });
  }

  // 4. SIGNAL_CONFIG
  sqlLines.push(`-- 4. Upsert Signal Config (Canonical)`);
  for (const [groupId, signals] of Object.entries(plan.schema_definitions.signal_catalog)) {
    signals.forEach(sig => {
      const signalId = sig.id || sig.signal_id || sig.canonical_key;
      const signalPayload = JSON.stringify({
        ...sig,
        group_id: groupId,
        metric_id: metadata.metric_id,
        canonical_key: sig.canonical_key
      }).replace(/'/g, "''");

      sqlLines.push(`MERGE INTO SIGNAL_CONFIG AS target`);
      sqlLines.push(`USING (SELECT '${appId}' as APP_ID, '${signalId}' as SIGNAL_ID) AS source`);
      sqlLines.push(`ON target.APP_ID = source.APP_ID AND target.SIGNAL_ID = source.SIGNAL_ID`);
      sqlLines.push(`WHEN MATCHED THEN UPDATE SET target.PAYLOAD = PARSE_JSON('${signalPayload}'), target.UPDATED_AT = CURRENT_TIMESTAMP()`);
      sqlLines.push(`WHEN NOT MATCHED THEN INSERT (APP_ID, SIGNAL_ID, VERSION, STATUS, PAYLOAD, CREATED_AT, CREATED_BY)`);
      sqlLines.push(`VALUES (source.APP_ID, source.SIGNAL_ID, '1.0', 'ACTIVE', PARSE_JSON('${signalPayload}'), CURRENT_TIMESTAMP(), '${USER_ID}');`);
    });
  }
  sqlLines.push('');

  // 5. TASK_CONFIG & TASK_PROMPT_CONFIG
  sqlLines.push(`-- 5. Upsert Task & Prompt Configs`);
  
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

    // B. Prompt Content (Certified-first)
    let promptContent = "PROMPT GENERATION FAILED";
    let promptSourceRef = task.prompt_path;
    let promptStatus = 'ACTIVE';

    try {
        const registryTaskName = task.task_id;
        const certifiedPath = path.join(cliRoot, 'certified', metadata.domain, metadata.metric_id, registryTaskName, 'prompt.md');

        if (fs.existsSync(certifiedPath)) {
            promptContent = fs.readFileSync(certifiedPath, 'utf-8');
            promptSourceRef = path.relative(cliRoot, certifiedPath).replace(/\\/g, '/');
            promptStatus = 'CERTIFIED';
        } else {
            promptContent = synthesizer.hydratePrompt(metadata.domain, 'General', registryTaskName, hydrationContext);
            promptSourceRef = task.prompt_path;
        }
    } catch (e: any) {
        console.warn(`⚠️ Hydration warning for ${task.task_id}: ${e.message}. Falling back to raw file.`);
        const absolutePromptPath = path.join(cliRoot, task.prompt_path);
        if (fs.existsSync(absolutePromptPath)) {
            promptContent = fs.readFileSync(absolutePromptPath, 'utf-8');
            promptSourceRef = task.prompt_path;
        }
    }

    const promptHash = createHash('sha256').update(promptContent, 'utf-8').digest('hex');
    const promptVersion = `v1-${promptHash.slice(0, 8)}`;

    const promptPayload = JSON.stringify({
        content_md: promptContent,
        format: 'markdown',
        hash: promptHash,
        source_ref: promptSourceRef
    }).replace(/'/g, "''").replace(/\\/g, "\\\\");

    sqlLines.push(`MERGE INTO TASK_PROMPT_CONFIG AS target`);
    sqlLines.push(`USING (SELECT '${appId}' as APP_ID, '${task.task_id}' as TASK_ID, '${promptVersion}' as PROMPT_VERSION) AS source`);
    sqlLines.push(`ON target.APP_ID = source.APP_ID AND target.TASK_ID = source.TASK_ID AND target.PROMPT_VERSION = source.PROMPT_VERSION`);
    sqlLines.push(`WHEN MATCHED THEN UPDATE SET target.PAYLOAD = PARSE_JSON('${promptPayload}'), target.UPDATED_AT = CURRENT_TIMESTAMP()`);
    sqlLines.push(`WHEN NOT MATCHED THEN INSERT (APP_ID, TASK_ID, PROMPT_VERSION, STATUS, PAYLOAD, CREATED_AT, CREATED_BY)`);
    sqlLines.push(`VALUES (source.APP_ID, source.TASK_ID, source.PROMPT_VERSION, '${promptStatus}', PARSE_JSON('${promptPayload}'), CURRENT_TIMESTAMP(), '${USER_ID}');`);
    sqlLines.push('');
  });

  const outputDir = path.join(cliRoot, 'output', planDirName);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'seed_snowflake.sql');
  fs.writeFileSync(outputPath, sqlLines.join('\n'));
  console.log(`\n🎉 Snowflake Seed Script Generated: ${outputPath}`);
}

generateSql();