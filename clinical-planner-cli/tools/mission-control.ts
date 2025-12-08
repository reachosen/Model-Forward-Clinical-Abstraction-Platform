#!/usr/bin/env ts-node
/**
 * Mission Control CLI (command-line UI)
 *
 * Usage:
 *   npx ts-node tools/mission-control.ts help
 *   npx ts-node tools/mission-control.ts list [--group "<group>"] [--recommended-only] [--include-stale]
 *   npx ts-node tools/mission-control.ts describe <missionId>
 *   npx ts-node tools/mission-control.ts run <missionId> [--dry-run]
 *   npx ts-node tools/mission-control.ts groups
 */

import { spawn } from 'child_process';
import { GROUP_DESCRIPTIONS, Mission, MissionGroup, MISSIONS } from './missions';

const argv = process.argv.slice(2);
const subcommand = argv[0] || 'help';

function printHelp() {
  console.log('Mission Control - Unified CLI for key workflows.\n');
  console.log('Missions live in: tools/missions.ts\n');
  console.log('Commands:');
  console.log('Command\tDescription');
  console.log('mission-control list\tShow all missions grouped by purpose.');
  console.log('mission-control list --group "<group>"\tShow missions only for that group.');
  console.log('mission-control describe <missionId>\tShow full details of a mission.');
  console.log('mission-control run <missionId>\tRun the mission\'s underlying command.');
  console.log('mission-control groups\tShow available mission groups and descriptions.');
  console.log('mission-control pick\tInteractive picker (arrow keys) to choose and optionally run a mission.');
  console.log('mission-control run <missionId> --sample <sampleId>\tRun mission using a predefined sample (if available).');
}

function printGroups() {
  console.log('Group\tDescription');
  (Object.keys(GROUP_DESCRIPTIONS) as MissionGroup[]).forEach((group) => {
    console.log(`${group}\t${GROUP_DESCRIPTIONS[group]}`);
  });
}

interface ListOptions {
  group?: MissionGroup;
  recommendedOnly?: boolean;
  includeStale?: boolean;
}

function parseListOptions(args: string[]): ListOptions {
  const opts: ListOptions = { includeStale: true };
  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if (token === '--group') {
      const val = args[i + 1];
      if (val) {
        opts.group = val as MissionGroup;
        i++;
      }
    } else if (token === '--recommended-only') {
      opts.recommendedOnly = true;
    } else if (token === '--include-stale') {
      opts.includeStale = true;
    }
  }
  return opts;
}

function formatFlags(mission: Mission) {
  const flags: string[] = [];
  if (mission.recommended) flags.push('Recommended');
  if (mission.stale) flags.push('Stale');
  return flags.length ? flags.join(', ') : 'None';
}

function renderMissionDetail(mission: Mission) {
  console.log(`Mission ID   : ${mission.id}`);
  console.log(`Group        : ${mission.group}`);
  console.log(`Title        : ${mission.title}`);
  console.log(`Purpose      : ${mission.purpose}`);
  console.log(`Flags        : ${formatFlags(mission)}`);
  if (mission.lastVerified) console.log(`LastVerified : ${mission.lastVerified}`);

  if (mission.description && mission.description.length) {
    console.log('\nDescription:');
    mission.description.forEach((line) => console.log(`  - ${line}`));
  }

  console.log('\nCommand:');
  const rendered = [mission.command, ...mission.args].join(' ');
  console.log(`  ${rendered}`);

  if (mission.samples && mission.samples.length) {
    console.log('\nSamples:');
    mission.samples.forEach((s) => {
      console.log(`  - ${s.id}: ${s.title}`);
    });
  }

  if (mission.notes) {
    console.log('\nNotes:');
    console.log(`  ${mission.notes}`);
  }

  if (mission.stale) {
    console.log('\n[STALE] Marked as stale; prefer recommended missions when possible.');
  }
}

function resolveArgs(mission: Mission, sampleId?: string): string[] {
  if (sampleId && mission.samples && mission.samples.length) {
    const match = mission.samples.find((s) => s.id === sampleId);
    if (match) return match.args;
    console.error(`Sample not found: ${sampleId}. Using default args.`);
  }
  return mission.args;
}

function listMissions(args: string[]) {
  const opts = parseListOptions(args);
  const filtered = MISSIONS.filter((mission) => {
    if (opts.group && mission.group !== opts.group) return false;
    if (opts.recommendedOnly && !mission.recommended) return false;
    if (!opts.includeStale && mission.stale) return false;
    return true;
  });

  const grouped: Record<MissionGroup, Mission[]> = {} as Record<MissionGroup, Mission[]>;
  filtered.forEach((mission) => {
    if (!grouped[mission.group]) grouped[mission.group] = [];
    grouped[mission.group].push(mission);
  });

  (Object.keys(GROUP_DESCRIPTIONS) as MissionGroup[]).forEach((group) => {
    const missions = grouped[group];
    if (!missions || missions.length === 0) return;
    console.log(`=== ${group} ===`);
    console.log(`${GROUP_DESCRIPTIONS[group]}\n`);
    missions.forEach((mission) => {
      const flagLabel = mission.stale ? '[ STALE]' : '[]';
      console.log(`  ${flagLabel} ${mission.id}`);
      console.log(`      Title   : ${mission.title}`);
      console.log(`      Purpose : ${mission.purpose}`);
      console.log(`      Flags   : ${formatFlags(mission)}`);
      if (mission.lastVerified) console.log(`      LastVerified: ${mission.lastVerified}`);
      console.log('');
    });
  });
}

function describeMission(id: string | undefined) {
  if (!id) {
    console.error('Missing mission id. Usage: mission-control describe <missionId>');
    return;
  }
  const mission = MISSIONS.find((m) => m.id === id);
  if (!mission) {
    console.error(`Mission not found: ${id}`);
    console.error('Use: mission-control list to see available missions.');
    return;
  }
  renderMissionDetail(mission);
}

function runMission(id: string | undefined, dryRun: boolean, sampleId?: string) {
  if (!id) {
    console.error('Missing mission id. Usage: mission-control run <missionId> [--dry-run]');
    return;
  }
  const mission = MISSIONS.find((m) => m.id === id);
  if (!mission) {
    console.error(`Mission not found: ${id}`);
    console.error('Use: mission-control list to see available missions.');
    return;
  }

  const args = resolveArgs(mission, sampleId);
  const rendered = [mission.command, ...args].join(' ');
  if (dryRun) {
    console.log('DRY RUN  Mission', mission.id);
    console.log('\nCommand to execute:');
    console.log(`  ${rendered}`);
    return;
  }

  console.log(`Running mission: ${mission.id}`);
  console.log(`  Command: ${rendered}\n`);

  const child = spawn(mission.command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  child.on('exit', (code) => {
    if (code === 0) {
      console.log('\nMission completed with exit code 0');
    } else {
      console.error(`\nMission failed with exit code ${code}`);
    }
  });
}

function parseRunArgs(args: string[]): { id?: string; dryRun: boolean; sampleId?: string } {
  const result: { id?: string; dryRun: boolean; sampleId?: string } = { dryRun: false };
  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if (!result.id && !token.startsWith('--')) {
      result.id = token;
    } else if (token === '--dry-run') {
      result.dryRun = true;
    } else if (token === '--sample') {
      const val = args[i + 1];
      if (val) {
        result.sampleId = val;
        i++;
      }
    }
  }
  return result;
}

async function interactivePick(args: string[]) {
  const opts = parseListOptions(args);
  const items = MISSIONS.filter((mission) => {
    if (opts.group && mission.group !== opts.group) return false;
    if (opts.recommendedOnly && !mission.recommended) return false;
    if (!opts.includeStale && mission.stale) return false;
    return true;
  });

  if (items.length === 0) {
    console.log('No missions match your filters.');
    return;
  }

  let index = 0;
  const stdin = process.stdin;
  stdin.setRawMode?.(true);
  stdin.resume();
  stdin.setEncoding('utf8');

  const instructions = 'Arrow keys: navigate | Enter: select | q: quit';

  function render() {
    console.clear();
    console.log('Mission Control Picker');
    console.log(instructions);
    console.log(`Filters: group=${opts.group ?? 'all'}, recommendedOnly=${!!opts.recommendedOnly}, includeStale=${opts.includeStale !== false}`);
    console.log('');
    items.forEach((mission, i) => {
      const pointer = i === index ? '>' : ' ';
      const flags = mission.recommended ? '[rec]' : mission.stale ? '[stale]' : '';
      console.log(`${pointer} ${mission.id} ${flags ? flags : ''} - ${mission.title} (${mission.group})`);
    });
  }

  function cleanup() {
    stdin.setRawMode?.(false);
    stdin.pause();
    stdin.removeListener('data', onData);
  }

  function onData(key: string) {
    if (key === '\u0003' || key === 'q') {
      cleanup();
      return;
    }
    if (key === '\u001b[A') {
      index = (index - 1 + items.length) % items.length;
      render();
      return;
    }
    if (key === '\u001b[B') {
      index = (index + 1) % items.length;
      render();
      return;
    }
  if (key === '\r' || key === '\n') {
      const selected = items[index];
      cleanup();
      console.clear();
      console.log('Selected mission:\n');
      renderMissionDetail(selected);
      (async () => {
        // Sample selection (arrow-driven)
        const sampleOpts = [
          { id: '', label: 'Default args' },
          ...(selected.samples || []).map((s) => ({ id: s.id, label: `${s.id} - ${s.title}` })),
        ];
        const sampleId = await selectFromList('Select sample (Enter to choose):', sampleOpts);

        // Run mode selection (arrow-driven)
        const mode = await selectFromList('Select run mode:', [
          { id: 'run', label: 'Run' },
          { id: 'dry', label: 'Dry-run' },
          { id: 'cancel', label: 'Cancel' },
        ]);
        if (!mode || mode === 'cancel') return;

        runMission(selected.id, mode === 'dry', sampleId || undefined);
      })();
    }
  }

  stdin.on('data', onData);
  render();
}

function selectFromList(title: string, options: { id: string; label: string }[]): Promise<string | undefined> {
  if (options.length === 0) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    let index = 0;
    const stdin = process.stdin;
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const instructions = 'Arrow keys: navigate | Enter: select | q: cancel';

    function render() {
      console.clear();
      console.log(title);
      console.log(instructions);
      console.log('');
      options.forEach((opt, i) => {
        const pointer = i === index ? '>' : ' ';
        console.log(`${pointer} ${opt.label}`);
      });
    }

    function cleanup() {
      stdin.setRawMode?.(false);
      stdin.pause();
      stdin.removeListener('data', onData);
    }

    function onData(key: string) {
      if (key === '\u0003' || key === 'q') {
        cleanup();
        resolve(undefined);
        return;
      }
      if (key === '\u001b[A') {
        index = (index - 1 + options.length) % options.length;
        render();
        return;
      }
      if (key === '\u001b[B') {
        index = (index + 1) % options.length;
        render();
        return;
      }
      if (key === '\r' || key === '\n') {
        const sel = options[index].id;
        cleanup();
        resolve(sel);
        return;
      }
    }

    stdin.on('data', onData);
    render();
  });
}

switch (subcommand) {
  case 'help':
    printHelp();
    break;
  case 'groups':
    printGroups();
    break;
  case 'list':
    listMissions(argv.slice(1));
    break;
  case 'describe':
    describeMission(argv[1]);
    break;
  case 'run': {
    const parsed = parseRunArgs(argv.slice(1));
    runMission(parsed.id, parsed.dryRun, parsed.sampleId);
    break;
  }
  case 'pick':
    (async () => {
      await interactivePick(argv.slice(1));
    })();
    break;
  default:
    console.error(`Unknown subcommand: ${subcommand}`);
    printHelp();
}
