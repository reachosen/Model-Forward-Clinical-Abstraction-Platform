/**
 * pathConfig.ts - Centralized Semantic Path Resolution
 *
 * Provides consistent path resolution for the domain registry folder structure:
 *   domains_registry/{FRAMEWORK}/{SPECIALTY}/metrics/{METRIC}/
 *
 * Usage:
 *   const metricPath = resolveMetricPath('I25');
 *   const promptsDir = Paths.metricPrompts(metricPath);
 */

import * as path from 'path';
import * as fs from 'fs';

// CLI root is one level up from utils/
const CLI_ROOT = path.resolve(__dirname, '..');

// =============================================================================
// Types
// =============================================================================

export interface MetricPath {
  framework: string;    // HAC, USNWR, SPS
  specialty?: string;   // Orthopedics, Cardiology (undefined for HAC)
  metric: string;       // I25, CLABSI
}

export interface ConcernEntry {
  domain: string;
  archetype: string;
  specialty: string | null;
  description: string;
  category: string;
}

export interface ConcernRegistry {
  version: string;
  concerns: Record<string, ConcernEntry>;
}

// =============================================================================
// Framework Mapping
// =============================================================================

/**
 * Maps domain names from concern-registry to framework/specialty structure.
 * HAC is its own framework; other domains are specialties under USNWR.
 */
const FRAMEWORK_MAP: Record<string, { framework: string; specialty?: string }> = {
  'HAC': { framework: 'HAC' },
  'Orthopedics': { framework: 'USNWR', specialty: 'Orthopedics' },
  'Cardiology': { framework: 'USNWR', specialty: 'Cardiology' },
  'Endocrinology': { framework: 'USNWR', specialty: 'Endocrinology' },
  'Nephrology': { framework: 'USNWR', specialty: 'Nephrology' },
  'Neonatology': { framework: 'USNWR', specialty: 'Neonatology' },
  'Neurology': { framework: 'USNWR', specialty: 'Neurology' },
  'Gastroenterology': { framework: 'USNWR', specialty: 'Gastroenterology' },
  'Urology': { framework: 'USNWR', specialty: 'Urology' },
  'Pulmonology': { framework: 'USNWR', specialty: 'Pulmonology' },
  'Behavioral Health': { framework: 'USNWR', specialty: 'Behavioral_Health' },
  'Cancer': { framework: 'USNWR', specialty: 'Cancer' },
};

// =============================================================================
// Path Resolution Functions
// =============================================================================

export const Paths = {
  // -------------------------------------------------------------------------
  // Root paths
  // -------------------------------------------------------------------------
  cliRoot: () => CLI_ROOT,

  // -------------------------------------------------------------------------
  // Domain registry paths (semantic authority for metrics)
  // -------------------------------------------------------------------------
  domains: () => path.join(CLI_ROOT, 'domains_registry'),

  framework: (framework: string) =>
    path.join(Paths.domains(), framework),

  specialty: (framework: string, specialty: string) =>
    path.join(Paths.framework(framework), specialty),

  /**
   * Returns the base path for a metric.
   * - HAC metrics: domains/HAC/metrics/{METRIC}
   * - USNWR metrics: domains/USNWR/{SPECIALTY}/metrics/{METRIC}
   */
  metric: (p: MetricPath) => p.specialty
    ? path.join(Paths.specialty(p.framework, p.specialty), 'metrics', p.metric)
    : path.join(Paths.framework(p.framework), 'metrics', p.metric),

  // -------------------------------------------------------------------------
  // Metric sub-paths
  // -------------------------------------------------------------------------
  metricPrompts: (p: MetricPath) => path.join(Paths.metric(p), 'prompts'),
  metricDefinitions: (p: MetricPath) => path.join(Paths.metric(p), 'definitions'),
  metricSignals: (p: MetricPath) => path.join(Paths.metric(p), 'signals'),
  metricConfig: (p: MetricPath) => path.join(Paths.metric(p), 'config'),
  metricTests: (p: MetricPath) => path.join(Paths.metric(p), 'tests'),
  metricTestcases: (p: MetricPath) => path.join(Paths.metricTests(p), 'testcases'),
  metricGolden: (p: MetricPath) => path.join(Paths.metricTests(p), 'golden'),
  metricStrategy: (p: MetricPath) => path.join(Paths.metric(p), 'strategy'),
  metricArchetypes: (p: MetricPath) => path.join(Paths.metric(p), 'archetypes'),
  metricValidators: (p: MetricPath) => path.join(Paths.metric(p), 'validators'),

  // -------------------------------------------------------------------------
  // Shared paths (within specialty or framework)
  // -------------------------------------------------------------------------
  shared: (framework: string, specialty?: string) => specialty
    ? path.join(Paths.specialty(framework, specialty), '_shared')
    : path.join(Paths.framework(framework), '_shared'),

  sharedPrompts: (framework: string, specialty?: string) =>
    path.join(Paths.shared(framework, specialty), 'prompts'),

  sharedArchetypes: (framework: string, specialty?: string) =>
    path.join(Paths.shared(framework, specialty), 'archetypes'),

  sharedSignals: (framework: string, specialty?: string) =>
    path.join(Paths.shared(framework, specialty), 'signals'),

  sharedDefinitions: (framework: string, specialty?: string) =>
    path.join(Paths.shared(framework, specialty), 'definitions'),

  // -------------------------------------------------------------------------
  // Cross-domain shared (minimal)
  // -------------------------------------------------------------------------
  crossDomain: () => path.join(CLI_ROOT, 'shared'),
  schemas: () => path.join(Paths.crossDomain(), 'schemas'),
  archetypeDefaults: () => path.join(Paths.crossDomain(), 'archetypes'),
  contracts: () => path.join(Paths.crossDomain(), 'contracts'),
  scoring: () => path.join(Paths.crossDomain(), 'scoring'),
  harness: () => path.join(Paths.crossDomain(), 'harness'),

  // -------------------------------------------------------------------------
  // Status and archives
  // -------------------------------------------------------------------------
  statusDir: () => path.join(CLI_ROOT, 'status'),
  statusFile: () => path.join(Paths.statusDir(), 'current.json'),
  archiveRoot: () => path.join(CLI_ROOT, '_archive'),
  archiveBucket: (concernId: string, date: Date = new Date()) => {
    const bucket = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return path.join(Paths.archiveRoot(), bucket, concernId);
  },

  // -------------------------------------------------------------------------
  // Runs (ephemeral, git-ignored)
  // -------------------------------------------------------------------------
  runs: () => path.join(CLI_ROOT, process.env.RUNS_DIR || 'runs'),

  run: (date: string, metricBatch: string) =>
    path.join(Paths.runs(), date, metricBatch),

  runForMetric: (metric: string, batch?: string) => {
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const suffix = batch ? `${metric}_${batch}` : metric;
    return path.join(Paths.runs(), date, suffix);
  },

  // -------------------------------------------------------------------------
  // Certified (handoff zone, mirrors domain structure)
  // -------------------------------------------------------------------------
  certified: () => path.join(CLI_ROOT, process.env.CERTIFIED_DIR || 'certified'),

  certifiedMetric: (p: MetricPath) => p.specialty
    ? path.join(Paths.certified(), p.framework, p.specialty, 'metrics', p.metric)
    : path.join(Paths.certified(), p.framework, 'metrics', p.metric),

  // -------------------------------------------------------------------------
  // Legacy paths (for backward compatibility during migration)
  // -------------------------------------------------------------------------
  legacy: {
    data: () => path.join(CLI_ROOT, 'data', 'flywheel'),
    testcases: (metric?: string) => metric
      ? path.join(Paths.legacy.data(), 'testcases', `${metric}_batch_*.json`)
      : path.join(Paths.legacy.data(), 'testcases'),
    reports: () => path.join(Paths.legacy.data(), 'reports'),
    output: () => path.join(CLI_ROOT, 'output'),
    signalLibrary: () => path.join(CLI_ROOT, 'signal_library'),
  },
};

// =============================================================================
// Metric Path Resolution
// =============================================================================

let _registryCache: ConcernRegistry | null = null;

/**
 * Loads the concern registry (cached after first load).
 */
function loadRegistry(): ConcernRegistry {
  if (_registryCache) return _registryCache;

  const registryPath = path.join(CLI_ROOT, 'config', 'concern-registry.json');
  if (!fs.existsSync(registryPath)) {
    throw new Error(`Concern registry not found: ${registryPath}`);
  }

  const content = fs.readFileSync(registryPath, 'utf-8');
  _registryCache = JSON.parse(content) as ConcernRegistry;
  return _registryCache;
}

/**
 * Resolves a concern_id (e.g., "I25", "CLABSI") to a MetricPath.
 *
 * @example
 * resolveMetricPath('I25')
 * // => { framework: 'USNWR', specialty: 'Orthopedics', metric: 'I25' }
 *
 * resolveMetricPath('CLABSI')
 * // => { framework: 'HAC', metric: 'CLABSI' }
 */
export function resolveMetricPath(concernId: string): MetricPath {
  const registry = loadRegistry();
  const concern = registry.concerns[concernId];

  if (!concern) {
    throw new Error(`Unknown concern_id: ${concernId}. Check config/concern-registry.json`);
  }

  const mapping = FRAMEWORK_MAP[concern.domain];
  if (!mapping) {
    // Default: treat unknown domain as USNWR specialty
    console.warn(`Unknown domain '${concern.domain}' for ${concernId}, defaulting to USNWR`);
    return {
      framework: 'USNWR',
      specialty: concern.domain.replace(/\s+/g, '_'),
      metric: concernId,
    };
  }

  return {
    framework: mapping.framework,
    specialty: mapping.specialty,
    metric: concernId,
  };
}

/**
 * Creates a MetricPath manually (without registry lookup).
 * Use when you know the exact framework/specialty.
 */
export function createMetricPath(
  framework: string,
  metric: string,
  specialty?: string
): MetricPath {
  return { framework, specialty, metric };
}

// =============================================================================
// Run ID Utilities
// =============================================================================

export interface RunId {
  date: string;      // YYYY-MM-DD
  metric: string;
  batch?: string;
  fullPath: string;
}

/**
 * Creates a new run ID with timestamp.
 */
export function createRunId(metric: string, batch?: string): RunId {
  const date = new Date().toISOString().slice(0, 10);
  const suffix = batch ? `${metric}_${batch}` : metric;
  return {
    date,
    metric,
    batch,
    fullPath: path.join(Paths.runs(), date, suffix),
  };
}

/**
 * Ensures a directory exists, creating it if necessary.
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Ensures all parent directories for a metric exist.
 */
export function ensureMetricDirs(p: MetricPath): void {
  const dirs = [
    Paths.metricPrompts(p),
    Paths.metricDefinitions(p),
    Paths.metricSignals(p),
    Paths.metricConfig(p),
    Paths.metricTestcases(p),
    Paths.metricGolden(p),
    Paths.metricStrategy(p),
  ];
  dirs.forEach(ensureDir);
}

// =============================================================================
// Path Validation
// =============================================================================

/**
 * Checks if a metric's domain folder exists.
 */
export function metricExists(p: MetricPath): boolean {
  return fs.existsSync(Paths.metric(p));
}

/**
 * Lists all metrics under a framework/specialty.
 */
export function listMetrics(framework: string, specialty?: string): string[] {
  const metricsDir = specialty
    ? path.join(Paths.specialty(framework, specialty), 'metrics')
    : path.join(Paths.framework(framework), 'metrics');

  if (!fs.existsSync(metricsDir)) return [];

  return fs.readdirSync(metricsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

/**
 * Lists all frameworks.
 */
export function listFrameworks(): string[] {
  const domainsDir = Paths.domains();
  if (!fs.existsSync(domainsDir)) return [];

  return fs.readdirSync(domainsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

/**
 * Lists all specialties under a framework.
 */
export function listSpecialties(framework: string): string[] {
  const frameworkDir = Paths.framework(framework);
  if (!fs.existsSync(frameworkDir)) return [];

  return fs.readdirSync(frameworkDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('_') && d.name !== 'metrics')
    .map(d => d.name);
}
