/**
 * Research Bundle Types
 *
 * Data structures for research phase outputs
 */

export interface ResearchBundle {
  research_id: string;
  concern_id: string;
  domain: string;
  generated_at: string;

  coverage: {
    sources_attempted: number;
    sources_successful: number;
    coverage_score: number;
  };

  sources: ResearchSource[];
  clinical_tools: ClinicalTool[];
  conflicts: ConflictResolution[];
  research_confidence: number;
}

export interface ResearchSource {
  authority: string;
  title: string;
  version: string;
  url: string;
  fetched_at: string;
  cache_status: 'cached' | 'live';
  cached_date?: string;
  checksum?: string;
  content: SourceContent;
  elements_sourced?: string[];
}

export interface SourceContent {
  inclusion_criteria?: string[];
  exclusion_criteria?: string[];
  measurement_period?: string;
  reporting_unit?: string;
  age_considerations?: {
    pediatric_adaptations?: string[];
  };
  bundle_elements?: string[];
  metric_scoring?: any;
  [key: string]: any;
}

export interface ClinicalTool {
  tool_id: string;
  tool_name: string;
  version: string;
  url: string;
  pediatric_validated: boolean;
  use_case: string;
  inputs: string[];
  outputs: string[];
  computation_logic: Record<string, any>;
  signals_generated?: string[];
}

export interface ConflictResolution {
  element: string;
  conflicting_sources: string[];
  resolution: string;
  rationale: string;
  user_approved?: boolean;
}

export interface ResearchOptions {
  forceRefresh?: boolean;
  sourcePriority?: string[];
}

export interface CacheEntry {
  concern_id: string;
  authority: string;
  version: string;
  cached_date: string;
  cache_path: string;
}
