import * as fs from 'fs';
import * as path from 'path';

export interface SemanticMetric {
  metric_name: string;
  metric_type: string;
  clinical_focus: string;
  rationale: string;
  submetrics: string[];
  risk_factors: string[];
  review_questions: string[];
  signal_groups: string[];
  priority_for_clinical_review: string;
  primary_archetype?: string;
  archetypes?: string[];
  expected_signal_groups?: string[];
  expected_signal_group_count?: number;
  rule_in_criteria?: any[];
  rule_out_criteria?: any[];
  ambiguity_triggers?: any[];
  exclusion_criteria?: any[];
  exception_criteria?: any[];
}

export interface SemanticSignals {
  [group_id: string]: (string | any)[];
}

export interface SemanticPriority {
  priority_by_metric: Record<string, string>;
  all_high: string[];
}

export interface SemanticPacket {
  metrics: Record<string, SemanticMetric>;
  signals: SemanticSignals;
  priorities: SemanticPriority;
  domain: string;
  isSpecialized?: boolean;
}

function normalizeKey(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function toSignalObject(signal: string | any): Record<string, any> {
  if (typeof signal === 'string') {
    return { name: signal, description: signal };
  }
  return { ...signal };
}

function buildCanonicalKey(groupId: string, signal: Record<string, any>): string {
  const desc =
    signal.description ||
    signal.name ||
    signal.signal_id ||
    signal.id ||
    '';
  return normalizeKey(`${groupId}|${desc}`);
}

export function normalizeSignalGroups(signals: SemanticSignals): SemanticSignals {
  const normalized: SemanticSignals = {};
  for (const [groupId, groupSignals] of Object.entries(signals || {})) {
    const seen = new Set<string>();
    const deduped: any[] = [];
    (groupSignals || []).forEach((sig) => {
      const signalObj = toSignalObject(sig);
      const canonicalKey = buildCanonicalKey(groupId, signalObj);
      if (!canonicalKey) return;
      if (seen.has(canonicalKey)) return;
      seen.add(canonicalKey);
      if (!signalObj.canonical_key) {
        signalObj.canonical_key = canonicalKey;
      }
      deduped.push(signalObj);
    });
    normalized[groupId] = deduped;
  }
  return normalized;
}

export class SemanticPacketLoader {
  private static instance: SemanticPacketLoader;
  private packets: Map<string, SemanticPacket> = new Map();

  private constructor() {}

  public static getInstance(): SemanticPacketLoader {
    if (!SemanticPacketLoader.instance) {
      SemanticPacketLoader.instance = new SemanticPacketLoader();
    }
    return SemanticPacketLoader.instance;
  }

  public clearCache(): void {
    this.packets.clear();
  }

  public load(domain: string, metricId?: string): SemanticPacket | null {
    if (this.packets.has(domain) && !metricId) {
      return this.packets.get(domain)!;
    }

    const usnwrSpecialty = domain.replace(/ /g, '_'); 
    const registryPathInCli = path.join(__dirname, '../domains_registry');
    const registryRoot = fs.existsSync(registryPathInCli) ? registryPathInCli : path.join(__dirname, '../../domains_registry');

    const usnwrPath = path.join(registryRoot, 'USNWR', usnwrSpecialty, '_shared');
    const hacPath = path.join(registryRoot, 'HAC', '_shared');

    let dataDir: string;
    if (domain === 'HAC' && fs.existsSync(path.join(hacPath, 'metrics.json'))) {
      dataDir = hacPath;
    } else if (fs.existsSync(path.join(usnwrPath, 'metrics.json'))) {
      dataDir = usnwrPath;
    } else {
      return null;
    }

    try {
      const metricsPath = path.join(dataDir, 'metrics.json');
      const signalsPath = path.join(dataDir, 'signals.json');
      const priorityPath = path.join(dataDir, 'priority.json');

      if (!fs.existsSync(metricsPath) || !fs.existsSync(signalsPath)) {
        return null;
      }

      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
      const signals = JSON.parse(fs.readFileSync(signalsPath, 'utf-8'));
      
      let priorities = { priority_by_metric: {}, all_high: [] };
      if (fs.existsSync(priorityPath)) {
        priorities = JSON.parse(fs.readFileSync(priorityPath, 'utf-8'));
      }

      const basePacket: SemanticPacket = { metrics, signals, priorities, domain };
      
      if (!this.packets.has(domain)) {
        this.packets.set(domain, basePacket);
      }

      let packetToReturn = metricId
        ? this.applyMetricOverlay(basePacket, registryRoot, domain, metricId)
        : basePacket;
      const disableNormalization = process.env.DISABLE_SIGNAL_NORMALIZATION === '1';
      if (!disableNormalization && packetToReturn.signals) {
        packetToReturn = {
          ...packetToReturn,
          signals: normalizeSignalGroups(packetToReturn.signals)
        };
      }

      return packetToReturn;
    } catch (error: any) {
      console.error(`❌ Failed to load Semantic Packet for ${domain}: ${error.message}`);
      return null;
    }
  }

  private applyMetricOverlay(basePacket: SemanticPacket, registryRoot: string, domain: string, metricId: string): SemanticPacket {
    try {
      const usnwrSpecialty = domain.replace(/ /g, '_');
      const metricFolder = domain === 'HAC' 
        ? path.join(registryRoot, 'HAC', 'metrics', metricId)
        : path.join(registryRoot, 'USNWR', usnwrSpecialty, 'metrics', metricId);

      const defSignalsPath = path.join(metricFolder, 'definitions', 'signal_groups.json');
      const defMetricPath = path.join(metricFolder, 'definitions', 'metrics.json');
      const defRulesPath = path.join(metricFolder, 'definitions', 'review_rules.json');

      if (!fs.existsSync(defSignalsPath) && !fs.existsSync(defMetricPath) && !fs.existsSync(defRulesPath)) {
        return basePacket;
      }

      const logKey = `${domain}:${metricId}`;
      const shouldLog = !(global as any)._overlayLogged?.[logKey];
      if (shouldLog) {
        if (!(global as any)._overlayLogged) (global as any)._overlayLogged = {};
        (global as any)._overlayLogged[logKey] = true;
        
        const hashBase = [defSignalsPath, defMetricPath, defRulesPath].filter(p => fs.existsSync(p)).map(p => fs.statSync(p).mtimeMs).join('|');
        const hash = Buffer.from(hashBase).toString('hex').slice(0, 6);
        console.log(`\n  semantic overlay  metric=${metricId}  hash=${hash}`);
      }
      
      const overlaidPacket: SemanticPacket = JSON.parse(JSON.stringify(basePacket));
      overlaidPacket.isSpecialized = true;

      if (fs.existsSync(defMetricPath)) {
          const defMetric = JSON.parse(fs.readFileSync(defMetricPath, 'utf-8'));
          const metricKey = Object.keys(defMetric)[0]; 
          if (metricKey) {
              overlaidPacket.metrics[metricId] = {
                  ...overlaidPacket.metrics[metricId],
                  ...defMetric[metricKey]
              };
          }
      } else if (fs.existsSync(defRulesPath)) {
          const defRules = JSON.parse(fs.readFileSync(defRulesPath, 'utf-8'));
          const questions = (defRules.ambiguity_triggers || []).map((t: any) => t.reviewer_prompt || t.description);
          
          overlaidPacket.metrics[metricId] = {
              ...overlaidPacket.metrics[metricId],
              metric_name: overlaidPacket.metrics[metricId]?.metric_name || defRules.description,
              review_questions: questions.length > 0 ? questions : overlaidPacket.metrics[metricId]?.review_questions,
              rule_in_criteria: defRules.rule_in_criteria,
              rule_out_criteria: defRules.rule_out_criteria
          };
          if (shouldLog) console.log(`  ├─ review_questions : ${questions.length} (review_rules.json)`);
      }
      
      if (fs.existsSync(defSignalsPath)) {
        const defs = JSON.parse(fs.readFileSync(defSignalsPath, 'utf-8'));
        if (shouldLog) {
            console.log(`  ├─ base groups      : signals.json`);
            const baseGroupIds = Object.keys(basePacket.signals);
            baseGroupIds.forEach((gid, i) => {
                const char = i === baseGroupIds.length - 1 ? '└─' : '├─';
                console.log(`  │  ${char} ${gid.padEnd(18)} : ${basePacket.signals[gid]?.length || 0}`);
            });
        }

        if (shouldLog) console.log(`  └─ metric overrides : metric/signal_groups.json`);
        if (defs.signal_groups) {
            // Deduplicate overrides by group_id (take the last/latest definition)
            const overrideMap = new Map<string, any[]>();
            defs.signal_groups.forEach((g: any) => overrideMap.set(g.group_id.toLowerCase(), g.signals || []));

            const groups = Array.from(overrideMap.entries());
            groups.forEach(([groupId, specializedSignals], idx) => {
                const isLast = idx === groups.length - 1;
                const char = isLast ? '└─' : '├─';
                const baseCount = basePacket.signals[groupId]?.length || 0;
                const delta = specializedSignals.length - baseCount;
                
                overlaidPacket.signals[groupId] = specializedSignals;
                
                if (shouldLog) {
                    const deltaStr = delta > 0 ? `+${delta}` : `${delta}`;
                    const deltaInfo = delta !== 0 
                        ? `: ${deltaStr.padEnd(3)} (${baseCount} → ${specializedSignals.length})` 
                        : `: no override`;
                    console.log(`     ${char} ${groupId.padEnd(18)} ${deltaInfo}`);
                }
            });
        }
      }
      return overlaidPacket;
    } catch (error) {
      console.warn(`⚠️  Failed to apply semantic overlay for ${metricId}:`, error);
    }
    return basePacket;
  }

  public getMetric(domain: string, metricId: string): SemanticMetric | undefined {
    const packet = this.load(domain, metricId);
    return packet?.metrics[metricId];
  }
}