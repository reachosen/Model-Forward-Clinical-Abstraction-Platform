export interface CaseInfo {
  patient_id: string;
  encounter_id: string;
  episode_id: string;
  mrn: string;
  name: string;
  scenario: string;
  risk_level?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  determination?: string;
  domain?: string;
  abstraction_datetime?: string;
  risk_score?: number;
}

export interface FilterOptions {
  riskLevels: Array<'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'>;
  determinations: string[];
  domains: string[];
}

export type SortOption = 'date-desc' | 'date-asc' | 'risk-desc' | 'name-asc';
