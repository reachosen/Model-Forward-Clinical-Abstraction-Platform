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
}

export interface SemanticSignals {
  [group_id: string]: string[];
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
    // 1. Load Base Domain Packet (Cached)
    if (this.packets.has(domain) && !metricId) {
      return this.packets.get(domain)!;
    }

    // Determine Search Paths
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
      
      // Cache base packet if not already cached
      if (!this.packets.has(domain)) {
        this.packets.set(domain, basePacket);
      }

      // 2. Metric Definition Overlay (The senior architect's required fix)
      if (metricId) {
        return this.applyMetricOverlay(basePacket, registryRoot, domain, metricId);
      }
      
      return basePacket;
    } catch (error: any) {
      console.error(`❌ Failed to load Semantic Packet for ${domain}: ${error.message}`);
      return null;
    }
  }

  /**
   * SPEC: metric-level definitions/* MUST override domain-level _shared/*
   */
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
        // Guardrail: Log WARN when metricId provided but no definitions found
        console.warn(`⚠️  [SEMANTIC_DEFAULT] No specialized definitions found for ${metricId} in ${domain}. Using domain defaults.`);
        return basePacket;
      }

      console.log(`⚡ [SEMANTIC_OVERLAY] Aligning Plan with Eval definitions for ${metricId}`);
      
      // Deep clone to avoid cache pollution
      const overlaidPacket: SemanticPacket = JSON.parse(JSON.stringify(basePacket));

      // 1. Overlay Metric Metadata (Risk Factors, Questions, Signal Group Names)
      if (fs.existsSync(defMetricPath)) {
          const defMetric = JSON.parse(fs.readFileSync(defMetricPath, 'utf-8'));
          const metricKey = Object.keys(defMetric)[0]; // Usually the ID is the key
          if (metricKey) {
              overlaidPacket.metrics[metricId] = {
                  ...overlaidPacket.metrics[metricId],
                  ...defMetric[metricKey]
              };
              console.log(`   → Overlaid metric metadata from metrics.json`);
          }
      } else if (fs.existsSync(defRulesPath)) {
          // FALLBACK: Extract questions from review_rules.json
          const defRules = JSON.parse(fs.readFileSync(defRulesPath, 'utf-8'));
          const questions = (defRules.ambiguity_triggers || []).map((t: any) => t.reviewer_prompt || t.description);
          
          overlaidPacket.metrics[metricId] = {
              ...overlaidPacket.metrics[metricId],
              metric_name: defRules.description || overlaidPacket.metrics[metricId]?.metric_name,
              review_questions: questions.length > 0 ? questions : overlaidPacket.metrics[metricId]?.review_questions,
              signal_groups: overlaidPacket.metrics[metricId]?.signal_groups // Keep base groups if missing
          };
          console.log(`   → Overlaid metric metadata from review_rules.json (${questions.length} questions)`);
      }
      
      // 2. Overlay Signals
      if (fs.existsSync(defSignalsPath)) {
        const defs = JSON.parse(fs.readFileSync(defSignalsPath, 'utf-8'));
        
        if (defs.signal_groups) {
            // Mapping table for known group ID mismatches between Registry and definitions
            const groupIdMap: Record<string, string> = {
            'infection_prevention': 'infection_risks',
            'surgical_bundle_compliance': 'bundle_compliance',
            'outcome_monitoring': 'outcome_risks',
            'readmission_prevention': 'readmission_risks'
            };

            defs.signal_groups.forEach((group: any) => {
            const rawId = group.group_id.toLowerCase();
            const targetId = groupIdMap[rawId] || rawId;
            
            const specializedSignals = group.signals?.map((s: any) => s.description) || [];
            
            if (specializedSignals.length > 0) {
                overlaidPacket.signals[targetId] = specializedSignals;
                console.log(`   → Syncing ${targetId}: ${specializedSignals.length} signals imported from definitions`);
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