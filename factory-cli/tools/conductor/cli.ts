#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { CampaignManifest, FlightContext, TrackStep } from './types';
import { TRACKS } from './tracks';
import { MISSIONS } from '../missions';

const argv = process.argv.slice(2);
const command = argv[0];

if (command === 'launch') {
  const manifestPath = getArg('--manifest');
  if (!manifestPath) {
    console.error('Error: --manifest argument required');
    process.exit(1);
  }
  launchCampaign(manifestPath);
} else {
  console.log('Usage: ts-node tools/conductor/cli.ts launch --manifest <path>');
}

function getArg(name: string): string | undefined {
  const idx = argv.indexOf(name);
  return idx !== -1 ? argv[idx + 1] : undefined;
}

function launchCampaign(manifestPath: string) {
  const fullPath = path.resolve(process.cwd(), manifestPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Manifest not found: ${fullPath}`);
    process.exit(1);
  }

  const manifest: CampaignManifest = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  
  console.log(`
🚀 LAUNCHING CAMPAIGN: ${manifest.title}`);
  console.log(`   ID: ${manifest.id}`);
  console.log(`   Scope: ${manifest.scope.length} metrics`);
  console.log('====================================================');
  
  const flights: FlightContext[] = manifest.scope.map(item => ({
    runId: `${manifest.id}_${Date.now()}_${item.metricId}`,
    campaignId: manifest.id,
    metricId: item.metricId,
    status: 'PENDING',
    currentStepIndex: 0,
    artifacts: {},
    history: []
  }));

  renderBoard(manifest, flights);
  console.log('\n[INFO] Starting Execution Loop...\n');
  
  for (let i = 0; i < flights.length; i++) {
    const flight = flights[i];
    const item = manifest.scope[i];
    const track = TRACKS[item.track];

    if (!track) {
      console.error(`[ERROR] Track not found: ${item.track} for metric ${item.metricId}`);
      flight.status = 'FAILED';
      continue;
    }

    flight.status = 'RUNNING';
    renderBoard(manifest, flights);

    for (const step of track.steps) {
      console.log(`\n[${flight.metricId}] Executing Step: ${step.name}...`);
      
      try {
        executeStep(step, flight);
        console.log(`   ✅ Success`);
      } catch (err: any) {
        console.error(`   ❌ Failed: ${err.message}`);
        flight.status = 'FAILED';
        break;
      }
    }

    if (flight.status !== 'FAILED') {
      flight.status = 'COMPLETED';
    }
    renderBoard(manifest, flights);
  }
}

function renderBoard(manifest: CampaignManifest, flights: FlightContext[]) {
  console.log('METRIC\tTRACK\t\tSTATUS');
  console.log('----------------------------------------------------');
  manifest.scope.forEach((item, i) => {
    console.log(`${item.metricId}\t${item.track}\t[${flights[i].status}]`);
  });
  console.log('====================================================');
}

function executeStep(step: TrackStep, flight: FlightContext) {
  const mission = MISSIONS.find(m => m.id === step.missionId);
  if (!mission) throw new Error(`Mission ID ${step.missionId} not found`);

  const runDir = path.resolve('output/runs', flight.runId);
  if (!fs.existsSync(runDir)) fs.mkdirSync(runDir, { recursive: true });

  const vars: Record<string, string> = {
    '{{metricId}}': flight.metricId,
    '{{runDir}}': runDir,
    '{{input_plan}}': flight.artifacts.plan || ''
  };

  const finalArgs = mission.args.map(arg => {
    // 1. Check if this arg is a key in step.args (e.g. "{{metric}}")
    if (step.args && step.args[arg]) {
      let val = step.args[arg];
      // Interpolate global vars in that value
      Object.keys(vars).forEach(v => {
        val = val.replace(v, vars[v]);
      });
      return val;
    }
    
    // 2. Default interpolation for arg itself
    let val = arg;
    Object.keys(vars).forEach(v => {
        val = val.replace(v, vars[v]);
    });
    return val;
  });

  // console.log(`[DEBUG] Exec: ${mission.command} ${finalArgs.join(' ')}`);

  const res = spawnSync(mission.command, finalArgs, { 
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd() 
  });

  if (res.status !== 0) {
    throw new Error(`Exit code ${res.status}`);
  }

  if (step.outputArtifact) {
    const artifactPath = step.outputArtifact.replace('{{runDir}}', vars['{{runDir}}']);
    
    if (!fs.existsSync(artifactPath)) {
       throw new Error(`Expected artifact not found: ${artifactPath}`);
    }
    
    // Auto-map artifacts based on known types
    if (artifactPath.endsWith('plan.json')) flight.artifacts.plan = artifactPath;
    if (artifactPath.endsWith('strategy.json')) flight.artifacts.strategy = artifactPath;
    if (artifactPath.endsWith('test_cases.json')) flight.artifacts.testCases = artifactPath;
    if (artifactPath.endsWith('eval_report.json')) flight.artifacts.evalReport = artifactPath;
  }
}