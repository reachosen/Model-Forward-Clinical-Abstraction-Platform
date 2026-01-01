#!/usr/bin/env ts-node
/**
 * Browse and Run - Mission Control CLI
 *
 * Usage:
 *   npx ts-node MissionControl/browse-and-run.ts list
 *   npx ts-node MissionControl/browse-and-run.ts list --owner Evals
 *   npx ts-node MissionControl/browse-and-run.ts show plan:scaffold
 *   npx ts-node MissionControl/browse-and-run.ts run plan:scaffold --example Cardiology
 *   npx ts-node MissionControl/browse-and-run.ts run ops:demo --example "Emily I32a"
 */

import { spawn } from 'child_process';
import { Mission, Owner, MISSIONS, OWNER_DESCRIPTIONS } from './mission-catalog';

const argv = process.argv.slice(2);
const command = argv[0] || 'help';

// =============================================================================
// Helpers
// =============================================================================

function printHelp() {
  console.log(`
Mission Control - 9 Core Missions

Commands:
  list [--owner <owner>]     List missions (optionally filter by owner)
  show <id>                  Show mission details
  run <id> [--example <name>] Run a mission

Owners:
  Planning  ${OWNER_DESCRIPTIONS.Planning}
  Evals     ${OWNER_DESCRIPTIONS.Evals}
  Schema    ${OWNER_DESCRIPTIONS.Schema}
  Ops       ${OWNER_DESCRIPTIONS.Ops}

Examples:
  npm run missions -- list
  npm run missions -- list --owner Evals
  npm run missions -- show plan:scaffold
  npm run missions -- run ops:demo --example "Emily I32a"
`);
}

function getMission(id: string): Mission | undefined {
  return MISSIONS.find(m => m.id === id);
}

function filterByOwner(owner: string | undefined): Mission[] {
  if (!owner) return MISSIONS;
  const normalized = owner.charAt(0).toUpperCase() + owner.slice(1).toLowerCase();
  return MISSIONS.filter(m => m.owner === normalized);
}

// =============================================================================
// Commands
// =============================================================================

function listMissions(args: string[]) {
  const ownerIdx = args.indexOf('--owner');
  const owner = ownerIdx >= 0 ? args[ownerIdx + 1] : undefined;
  const missions = filterByOwner(owner);

  if (missions.length === 0) {
    console.log(`No missions found${owner ? ` for owner: ${owner}` : ''}`);
    return;
  }

  // Group by owner
  const grouped: Record<Owner, Mission[]> = { Planning: [], Evals: [], Schema: [], Ops: [] };
  missions.forEach(m => grouped[m.owner].push(m));

  console.log('\n  Mission Control - Core Missions\n');

  (['Planning', 'Evals', 'Schema', 'Ops'] as Owner[]).forEach(ownerKey => {
    const ownerMissions = grouped[ownerKey];
    if (ownerMissions.length === 0) return;

    console.log(`  ${ownerKey}`);
    console.log(`  ${'─'.repeat(50)}`);
    ownerMissions.forEach(m => {
      console.log(`  ${m.id.padEnd(20)} ${m.title}`);
    });
    console.log('');
  });
}

function showMission(id: string | undefined) {
  if (!id) {
    console.error('Usage: show <mission-id>');
    return;
  }

  const mission = getMission(id);
  if (!mission) {
    console.error(`Mission not found: ${id}`);
    console.log('Use "list" to see available missions.');
    return;
  }

  console.log(`
  ${mission.id}
  ${'─'.repeat(50)}
  Title:   ${mission.title}
  Owner:   ${mission.owner}
  Purpose: ${mission.purpose}

  Command:
    ${mission.command} ${mission.args.join(' ')}
`);

  if (mission.examples && mission.examples.length > 0) {
    console.log('  Examples:');
    mission.examples.forEach(ex => {
      console.log(`    ${ex.name}`);
      console.log(`      ${mission.command} ${ex.args.join(' ')}`);
    });
    console.log('');
  }
}

function runMission(args: string[]) {
  const id = args[0];
  if (!id) {
    console.error('Usage: run <mission-id> [options] [--example <name>]');
    return;
  }

  const mission = getMission(id);
  if (!mission) {
    console.error(`Mission not found: ${id}`);
    return;
  }

  // Check for --example flag
  const exampleIdx = args.indexOf('--example');
  let argsToUse = [...mission.args]; // Clone to avoid mutation

  if (exampleIdx >= 0 && mission.examples) {
    const exampleName = args[exampleIdx + 1];
    const example = mission.examples.find(e =>
      e.name.toLowerCase() === exampleName?.toLowerCase()
    );
    if (example) {
      argsToUse = example.args;
    } else {
      console.error(`Example not found: ${exampleName}`);
      console.log('Available examples:');
      mission.examples.forEach(e => console.log(`  - ${e.name}`));
      return;
    }
  }

  // Dynamic Argument Substitution
  // Iterate through argsToUse and replace {{key}} with value from CLI args --key value
  const finalArgs: string[] = [];
  const missingParams: string[] = [];

  for (let i = 0; i < argsToUse.length; i++) {
    const arg = argsToUse[i];
    if (arg.startsWith('{{') && arg.endsWith('}}')) {
      const key = arg.slice(2, -2); // Remove {{ and }}
      const flag = `--${key}`;
      
      const cliFlagIdx = args.indexOf(flag);
      if (cliFlagIdx >= 0 && cliFlagIdx + 1 < args.length) {
        finalArgs.push(args[cliFlagIdx + 1]);
      } else {
        missingParams.push(flag);
      }
    } else {
      finalArgs.push(arg);
    }
  }

  if (missingParams.length > 0) {
    console.error(`\n❌ Missing required parameters for ${mission.id}:`);
    missingParams.forEach(p => console.error(`   ${p} <value>`));
    console.log(`\nUsage example:`);
    console.log(`   npm run missions -- run ${mission.id} ${missingParams.map(p => `${p} value`).join(' ')}`);
    return;
  }

  console.log(`\n  Running: ${mission.id}\n`);
  console.log(`  ${mission.command} ${finalArgs.join(' ')}\n`);

  const child = spawn(mission.command, finalArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  child.on('exit', (code) => {
    if (code === 0) {
      console.log(`\n  Mission completed.`);
    } else {
      console.error(`\n  Mission failed (exit code ${code})`);
    }
  });
}

// =============================================================================
// Main
// =============================================================================

switch (command) {
  case 'help':
  case '--help':
  case '-h':
    printHelp();
    break;
  case 'list':
    listMissions(argv.slice(1));
    break;
  case 'show':
    showMission(argv[1]);
    break;
  case 'run':
    runMission(argv.slice(1));
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
}
