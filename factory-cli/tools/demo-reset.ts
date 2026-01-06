import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

function removePath(target: string) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function run(command: string, args: string[]) {
  const res = spawnSync(command, args, { stdio: 'inherit', shell: true, cwd: process.cwd() });
  if (res.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

try {
  const cliRoot = process.cwd();
  const outputRuns = path.join(cliRoot, 'output', 'runs');
  const outputPlan = path.join(cliRoot, 'output', 'i32a-orthopedics');
  const certifiedPath = path.join(cliRoot, 'certified', 'Orthopedics', 'I32a');

  console.log('Cleaning demo outputs...');
  removePath(outputRuns);
  removePath(outputPlan);
  removePath(certifiedPath);

  console.log('Launching demo campaign...');
  run('npx', ['ts-node', 'tools/conductor/cli.ts', 'launch', '--manifest', '../campaigns/usnwr_ortho_2025.json']);

  console.log('Running ops:demo...');
  run('npm', ['run', 'missions', '--', 'run', 'ops:demo', '--example', 'Emily I32a']);
} catch (err: any) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
