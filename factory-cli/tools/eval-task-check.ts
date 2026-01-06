#!/usr/bin/env ts-node

/**
 * Eval Task Check - per-metric readiness report
 *
 * Verifies presence and hashes for the EvalTaskIndex steps:
 * 1) ConsumePlanningFactoryOutput (plan.json)
 * 2) ResolvePrompts
 * 3) BuildBatchStrategy
 * 4) GenerateBatches
 * 5) FreezeGoldenSet
 * 6) RunSAFE (latest present)
 * 7) CertifyArtifacts (present or not)
 *
 * Usage:
 *   npx ts-node tools/eval-task-check.ts I32a
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Paths, resolveMetricPath } from '../utils/pathConfig';

type Status = 'PASS' | 'FAIL' | 'WARN';

interface StepResult {
  step: string;
  status: Status;
  path?: string;
  detail?: string;
}

function hashFile(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function fileExists(p: string): boolean {
  try {
    fs.accessSync(p, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function findPlan(metricId: string, specialty?: string): string | undefined {
  const cliRoot = Paths.cliRoot();
  const candidates = [
    path.join(cliRoot, 'output', `${metricId.toLowerCase()}-${specialty?.toLowerCase()}`, 'plan.json'),
    path.join(cliRoot, 'output', `plan_${metricId.toLowerCase()}.json`),
    path.join(cliRoot, 'output', `${metricId.toLowerCase()}`, 'plan.json'),
  ];
  return candidates.find(fileExists);
}

function pickLatestVersion(files: string[]): string | undefined {
  if (files.length === 0) return undefined;
  // Prefer vN suffix if present, otherwise latest mtime will do (but caller supplies list from readdirSync)
  const versioned = files
    .map((f) => {
      const match = f.match(/v(\d+)/i);
      return { f, v: match ? parseInt(match[1], 10) : -1 };
    })
    .sort((a, b) => b.v - a.v);
  return versioned[0].f;
}

function main() {
  const metricId = process.argv[2] || 'I32a';
  const metricPath = resolveMetricPath(metricId);
  const cliRoot = Paths.cliRoot();
  const testcasesDir = Paths.metricTestcases(metricPath);
  const certRoot = Paths.certifiedMetric(metricPath);

  const results: StepResult[] = [];

  // 1) Plan
  const planPath = findPlan(metricId, metricPath.specialty);
  if (!planPath) {
    results.push({ step: 'ConsumePlanningFactoryOutput', status: 'FAIL', detail: 'plan.json not found' });
    print(results);
    return;
  }
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf-8'));
  const planHash = hashFile(planPath);
  const planOk = plan?.plan_metadata?.concern?.concern_id?.toUpperCase() === metricId.toUpperCase();
  results.push({
    step: 'ConsumePlanningFactoryOutput',
    status: planOk ? 'PASS' : 'FAIL',
    path: rel(planPath, cliRoot),
    detail: `hash=${planHash}`,
  });

  // 2) Prompts
  const taskPrompts =
    plan?.prompts?.task_prompts ||
    plan?.clinical_config?.prompts?.task_prompts ||
    {};
  let promptsStatus: Status = 'PASS';
  const promptDetails: string[] = [];
  Object.entries<any>(taskPrompts).forEach(([taskId, cfg]) => {
    const refPath = cfg?.template_ref?.path;
    if (!refPath) {
      promptsStatus = 'FAIL';
      promptDetails.push(`${taskId}: missing template_ref.path`);
      return;
    }
    const full = path.isAbsolute(refPath) ? refPath : path.join(cliRoot, refPath);
    if (!fileExists(full)) {
      promptsStatus = 'FAIL';
      promptDetails.push(`${taskId}: missing ${rel(full, cliRoot)}`);
      return;
    }
    const h = hashFile(full);
    promptDetails.push(`${taskId}: ${rel(full, cliRoot)} hash=${h}`);
  });
  results.push({
    step: 'ResolvePrompts',
    status: promptsStatus,
    detail: promptDetails.join(' | ') || 'no prompts found in plan',
  });

  // 3) Strategy
  const strategyPath = path.join(testcasesDir, 'generation_strategy.json');
  if (!fileExists(strategyPath)) {
    results.push({ step: 'BuildBatchStrategy', status: 'FAIL', detail: 'generation_strategy.json missing' });
  } else {
    const strategyHash = hashFile(strategyPath);
    results.push({
      step: 'BuildBatchStrategy',
      status: 'PASS',
      path: rel(strategyPath, cliRoot),
      detail: `hash=${strategyHash}`,
    });
  }

  // 4) Batches
  let batchesStatus: Status = 'PASS';
  let batchCount = 0;
  const batchFiles = fileExists(testcasesDir)
    ? fs.readdirSync(testcasesDir).filter((f) => f.startsWith(`${metricId}_batch_`) && f.endsWith('.json'))
    : [];
  batchCount = batchFiles.length;
  if (batchCount === 0) {
    batchesStatus = 'FAIL';
  }
  results.push({
    step: 'GenerateBatches',
    status: batchesStatus,
    path: rel(testcasesDir, cliRoot),
    detail: `batches=${batchCount}`,
  });

  // 5) Golden
  const goldenFiles = fileExists(testcasesDir)
    ? fs.readdirSync(testcasesDir).filter((f) => f.startsWith('golden_set') && f.endsWith('.json'))
    : [];
  const goldenPicked = pickLatestVersion(goldenFiles);
  if (!goldenPicked) {
    results.push({ step: 'FreezeGoldenSet', status: 'FAIL', detail: 'no golden_set*.json found' });
  } else {
    const goldenPath = path.join(testcasesDir, goldenPicked);
    results.push({
      step: 'FreezeGoldenSet',
      status: 'PASS',
      path: rel(goldenPath, cliRoot),
      detail: `hash=${hashFile(goldenPath)}`,
    });
  }

  // 6) SAFE latest
  const safePath = path.join(cliRoot, 'output', 'eval', `${metricId}_latest.json`);
  if (!fileExists(safePath)) {
    results.push({ step: 'RunSAFE', status: 'FAIL', detail: `${rel(safePath, cliRoot)} missing` });
  } else {
    results.push({
      step: 'RunSAFE',
      status: 'PASS',
      path: rel(safePath, cliRoot),
      detail: `hash=${hashFile(safePath)}`,
    });
  }

  // 7) Certification
  let certStatus: Status = 'WARN';
  let certDetail = 'not certified';
  if (fileExists(certRoot)) {
    const versionDirs = fs.readdirSync(certRoot).filter((d) => fs.statSync(path.join(certRoot, d)).isDirectory());
    const latestCertDir = pickLatestVersion(versionDirs);
    if (latestCertDir) {
      const certDir = path.join(certRoot, latestCertDir);
      const certFile = fs.readdirSync(certDir).find((f) => f.endsWith('.json'));
      if (certFile) {
        certStatus = 'PASS';
        const certPath = path.join(certDir, certFile);
        certDetail = `${rel(certPath, cliRoot)} hash=${hashFile(certPath)}`;
      }
    }
  }
  results.push({ step: 'CertifyArtifacts', status: certStatus, detail: certDetail });

  print(results);
}

function rel(p: string, root: string): string {
  return path.relative(root, p);
}

function print(results: StepResult[]) {
  console.log('\nEval Task Check\n');
  console.log('| Step | Status | Path | Detail |');
  console.log('| --- | --- | --- | --- |');
  for (const r of results) {
    console.log(`| ${r.step} | ${r.status} | ${r.path ?? ''} | ${r.detail ?? ''} |`);
  }
  console.log('\nDONE\n');
}

main();
