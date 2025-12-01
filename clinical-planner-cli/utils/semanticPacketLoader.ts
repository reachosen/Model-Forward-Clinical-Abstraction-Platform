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

// Map internal domain names to folder names
const DOMAIN_DIR_MAP: Record<string, string> = {
  'Orthopedics': 'orthopedics',
  'HAC': 'hac',
  'Endocrinology': 'endocrinology',
  'Cardiology': 'cardiology'
};

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

  public load(domain: string): SemanticPacket | null {
    if (this.packets.has(domain)) {
      return this.packets.get(domain)!;
    }

    const folderName = DOMAIN_DIR_MAP[domain] || domain.toLowerCase();
    const dataDir = path.join(__dirname, '../data', folderName);

    if (!fs.existsSync(dataDir)) {
      // Not all domains have packets yet
      return null;
    }

    try {
      const metricsPath = path.join(dataDir, 'metrics.json');
      const signalsPath = path.join(dataDir, 'signals.json');
      const priorityPath = path.join(dataDir, 'priority.json');

      // Check if essential files exist
      if (!fs.existsSync(metricsPath) || !fs.existsSync(signalsPath)) {
        console.warn(`⚠️  Partial data packet found for ${domain}, skipping.`);
        return null;
      }

      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
      const signals = JSON.parse(fs.readFileSync(signalsPath, 'utf-8'));
      
      // Priority file is optional, default to empty if missing
      let priorities = { priority_by_metric: {}, all_high: [] };
      if (fs.existsSync(priorityPath)) {
        priorities = JSON.parse(fs.readFileSync(priorityPath, 'utf-8'));
      }

      const packet: SemanticPacket = { metrics, signals, priorities, domain };
      this.packets.set(domain, packet);
      
      console.log(`✅ Semantic Packet loaded for ${domain}`);
      return packet;
    } catch (error: any) {
      console.error(`❌ Failed to load Semantic Packet for ${domain}: ${error.message}`);
      return null;
    }
  }

  public getMetric(domain: string, metricId: string): SemanticMetric | undefined {
    const packet = this.load(domain);
    return packet?.metrics[metricId];
  }
}