import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Paths, resolveMetricPath } from './pathConfig';

export interface PointerRef {
  path: string;
  hash: string;
  version?: string;
  generated_at?: string;
}

export interface StatusFile {
  concern_id: string;
  updated_at: string;
  plan?: PointerRef;
  strategy?: PointerRef;
  golden?: PointerRef;
  safe?: {
    latest?: PointerRef;
    certified?: PointerRef;
  };
  certified?: PointerRef;
  prompts?: Record<string, PointerRef>;
}

async function computeHash(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function loadJson<T = any>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

export async function findLatestPlanForConcern(concernId: string): Promise<PointerRef | undefined> {
  const outputDir = path.join(Paths.cliRoot(), 'output');
  let latest: { mtime: number; ref: PointerRef } | undefined;

  const entries = await fs.readdir(outputDir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const planPath = path.join(outputDir, entry.name, 'plan.json');
    if (!(await fileExists(planPath))) continue;

    const plan = await loadJson<any>(planPath);
    const planConcern = plan?.plan_metadata?.concern?.concern_id;
    if (String(planConcern).toUpperCase() !== concernId.toUpperCase()) continue;

    const stats = await fs.stat(planPath);
    const ref: PointerRef = {
      path: path.relative(Paths.cliRoot(), planPath),
      hash: await computeHash(planPath),
      version: plan?.plan_metadata?.plan_version,
      generated_at: plan?.plan_metadata?.workflow?.generated_at,
    };

    if (!latest || stats.mtimeMs > latest.mtime) {
      latest = { mtime: stats.mtimeMs, ref };
    }
  }

  return latest?.ref;
}

export async function findActiveStrategy(concernId: string): Promise<PointerRef | undefined> {
  try {
    const metricPath = resolveMetricPath(concernId);
    const strategyDir = Paths.metricTestcases(metricPath);
    const candidate = path.join(strategyDir, 'strategy_ACTIVE.json');
    if (await fileExists(candidate)) {
      return {
        path: path.relative(Paths.cliRoot(), candidate),
        hash: await computeHash(candidate),
      };
    }

    const fallback = path.join(strategyDir, 'generation_strategy.json');
    if (await fileExists(fallback)) {
      return {
        path: path.relative(Paths.cliRoot(), fallback),
        hash: await computeHash(fallback),
      };
    }
  } catch {
    // no-op
  }
  return undefined;
}

export async function findActiveGolden(concernId: string): Promise<PointerRef | undefined> {
  try {
    const metricPath = resolveMetricPath(concernId);
    const testDir = Paths.metricTestcases(metricPath);
    const entries = await fs.readdir(testDir).catch(() => []);
    const goldenFiles = entries.filter((f) => /^golden_set.*\.json$/i.test(f));
    if (goldenFiles.length === 0) return undefined;

    let latest: { mtime: number; ref: PointerRef } | undefined;
    for (const file of goldenFiles) {
      const full = path.join(testDir, file);
      const stats = await fs.stat(full);
      const ref: PointerRef = {
        path: path.relative(Paths.cliRoot(), full),
        hash: await computeHash(full),
      };
      if (!latest || stats.mtimeMs > latest.mtime) {
        latest = { mtime: stats.mtimeMs, ref };
      }
    }
    return latest?.ref;
  } catch {
    return undefined;
  }
}

export async function findCertifiedArtifact(concernId: string): Promise<PointerRef | undefined> {
  try {
    const metricPath = resolveMetricPath(concernId);
    const certRoot = Paths.certifiedMetric(metricPath);
    const versions = await fs.readdir(certRoot, { withFileTypes: true }).catch(() => []);
    const versionDirs = versions.filter((v) => v.isDirectory());
    if (versionDirs.length === 0) return undefined;

    // Pick highest semver-ish name by lexicographic order
    const latestVersion = versionDirs.map((v) => v.name).sort().reverse()[0];
    const versionPath = path.join(certRoot, latestVersion);
    const files = await fs.readdir(versionPath);
    // Prefer certification.json if present
    const certFile = files.find((f) => f === 'certification.json') || files.find((f) => f.endsWith('.json'));
    if (!certFile) return undefined;

    const full = path.join(versionPath, certFile);
    const ref: PointerRef = {
      path: path.relative(Paths.cliRoot(), full),
      hash: await computeHash(full),
      version: latestVersion,
    };
    return ref;
  } catch {
    return undefined;
  }
}

export async function collectPromptsFromPlan(planRef?: PointerRef): Promise<Record<string, PointerRef>> {
  if (!planRef) return {};
  const planPath = path.isAbsolute(planRef.path) ? planRef.path : path.join(Paths.cliRoot(), planRef.path);
  const plan = await loadJson<any>(planPath);
  const tasks = plan?.prompts?.task_prompts || {};
  const promptRefs: Record<string, PointerRef> = {};

  for (const [taskId, cfg] of Object.entries<any>(tasks)) {
    const templatePath = cfg?.template_ref?.path;
    if (!templatePath) continue;
    const full = path.isAbsolute(templatePath) ? templatePath : path.join(Paths.cliRoot(), templatePath);
    if (!(await fileExists(full))) continue;
    promptRefs[taskId] = {
      path: path.relative(Paths.cliRoot(), full),
      hash: await computeHash(full),
      version: cfg?.template_ref?.version,
    };
  }

  return promptRefs;
}

export async function writeStatusFile(status: StatusFile): Promise<void> {
  const statusPath = Paths.statusFile();
  await ensureDir(path.dirname(statusPath));
  await fs.writeFile(statusPath, JSON.stringify(status, null, 2), 'utf-8');
}

export async function updateStatusFromRun(options: {
  concernId: string;
  safeLatestPath: string;
  safeCertifiedPath?: string;
}): Promise<StatusFile> {
  const { concernId, safeLatestPath, safeCertifiedPath } = options;
  const safeLatestFull = path.isAbsolute(safeLatestPath)
    ? safeLatestPath
    : path.join(Paths.cliRoot(), safeLatestPath);

  const safeLatest: PointerRef = {
    path: path.relative(Paths.cliRoot(), safeLatestFull),
    hash: await computeHash(safeLatestFull),
  };

  const plan = await findLatestPlanForConcern(concernId);
  const strategy = await findActiveStrategy(concernId);
  const golden = await findActiveGolden(concernId);
  const certified = await findCertifiedArtifact(concernId);
  const prompts = await collectPromptsFromPlan(plan);

  const status: StatusFile = {
    concern_id: concernId,
    updated_at: new Date().toISOString(),
    plan,
    strategy,
    golden,
    safe: {
      latest: safeLatest,
      certified: safeCertifiedPath && (await fileExists(safeCertifiedPath))
        ? {
            path: path.relative(Paths.cliRoot(), safeCertifiedPath),
            hash: await computeHash(safeCertifiedPath),
          }
        : undefined,
    },
    certified,
    prompts,
  };

  await writeStatusFile(status);
  return status;
}

export async function archiveFile(filePath: string, concernId: string, now: Date = new Date()): Promise<void> {
  const bucket = Paths.archiveBucket(concernId, now);
  await ensureDir(bucket);
  const dest = path.join(bucket, path.basename(filePath));
  await fs.rename(filePath, dest);
}

export async function pruneGeneratedArtifacts(options: {
  concernId: string;
  keepPlans?: number;
  keepSafeReports?: number;
}): Promise<void> {
  const { concernId, keepPlans = 2, keepSafeReports = 2 } = options;

  // Plans: keep latest + last
  const outputDir = path.join(Paths.cliRoot(), 'output');
  const planCandidates: { mtime: number; path: string }[] = [];
  const entries = await fs.readdir(outputDir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(outputDir, entry.name, 'plan.json');
    if (!(await fileExists(candidate))) continue;
    const plan = await loadJson<any>(candidate).catch(() => undefined);
    if (plan?.plan_metadata?.concern?.concern_id?.toUpperCase() !== concernId.toUpperCase()) continue;
    const stats = await fs.stat(candidate);
    planCandidates.push({ mtime: stats.mtimeMs, path: candidate });
  }
  planCandidates.sort((a, b) => b.mtime - a.mtime);
  for (const candidate of planCandidates.slice(keepPlans)) {
    await archiveFile(candidate.path, concernId);
  }

  // SAFE reports: keep latest + certified (treated as keepSafeReports)
  const evalDir = path.join(Paths.cliRoot(), 'output', 'eval');
  const safeCandidates: { mtime: number; path: string }[] = [];
  const safeEntries = await fs.readdir(evalDir).catch(() => []);
  for (const file of safeEntries) {
    if (!file.toLowerCase().includes(concernId.toLowerCase())) continue;
    const full = path.join(evalDir, file);
    const stats = await fs.stat(full);
    safeCandidates.push({ mtime: stats.mtimeMs, path: full });
  }
  safeCandidates.sort((a, b) => b.mtime - a.mtime);
  for (const candidate of safeCandidates.slice(keepSafeReports)) {
    await archiveFile(candidate.path, concernId);
  }
}
