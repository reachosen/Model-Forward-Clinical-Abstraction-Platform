/**
 * Provenance Types
 *
 * Source attribution and traceability structures
 */

import { ClinicalTool, ConflictResolution } from './ResearchBundle';

export interface Provenance {
  research_enabled: boolean;
  research_bundle_id?: string;

  sources: ProvenanceSource[];
  clinical_tools: ClinicalTool[];
  conflicts_resolved: ConflictResolution[];
}

export interface ProvenanceSource {
  authority: string;
  title: string;
  version: string;
  url: string;
  fetched_at: string;
  cache_status: 'cached' | 'live';
  cached_date?: string;
  checksum?: string;
  elements_sourced: string[];
}

export interface SignalProvenance {
  source: string;
  source_section?: string;
  source_url: string;
  confidence: number;
  fetched_at?: string;
}

export interface CriterionProvenance {
  source: string;
  source_section?: string;
  source_url: string;
  fetched_at?: string;
}

export interface ProvenanceTool {
  tool_id: string;
  tool_name: string;
  version: string;
  url: string;
  pediatric_validated: boolean;
  signals_generated: string[];
}
