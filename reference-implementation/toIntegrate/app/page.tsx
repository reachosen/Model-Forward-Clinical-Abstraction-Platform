'use client';

import { useState } from 'react';
import SearchFilterPanel from '@/components/search-filter-panel';
import { CaseInfo } from '@/types/case';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const sampleCases: CaseInfo[] = [
  {
    patient_id: 'PAT001',
    encounter_id: 'ENC001',
    episode_id: 'EP001',
    mrn: 'MRN100001',
    name: 'John Doe',
    scenario: 'Clear Positive CLABSI',
    risk_level: 'HIGH',
    determination: 'Likely CLABSI',
    domain: 'CLABSI',
    abstraction_datetime: '2024-01-20T10:00:00',
    risk_score: 0.87,
  },
  {
    patient_id: 'PAT002',
    encounter_id: 'ENC002',
    episode_id: 'EP002',
    mrn: 'MRN100002',
    name: 'Jane Smith',
    scenario: 'Clear Negative',
    risk_level: 'LOW',
    determination: 'Not CLABSI',
    domain: 'CLABSI',
    abstraction_datetime: '2024-01-19T14:30:00',
    risk_score: 0.12,
  },
  {
    patient_id: 'PAT003',
    encounter_id: 'ENC003',
    episode_id: 'EP003',
    mrn: 'MRN100003',
    name: 'Robert Johnson',
    scenario: 'Borderline Case',
    risk_level: 'MODERATE',
    determination: 'Borderline',
    domain: 'CAUTI',
    abstraction_datetime: '2024-01-18T09:15:00',
    risk_score: 0.56,
  },
  {
    patient_id: 'PAT004',
    encounter_id: 'ENC004',
    episode_id: 'EP004',
    mrn: 'MRN100004',
    name: 'Emily Davis',
    scenario: 'Suspected SSI',
    risk_level: 'CRITICAL',
    determination: 'Likely SSI',
    domain: 'SSI',
    abstraction_datetime: '2024-01-22T16:45:00',
    risk_score: 0.94,
  },
  {
    patient_id: 'PAT005',
    encounter_id: 'ENC005',
    episode_id: 'EP005',
    mrn: 'MRN100005',
    name: 'Michael Brown',
    scenario: 'Indeterminate CAUTI',
    risk_level: 'MODERATE',
    determination: 'Indeterminate',
    domain: 'CAUTI',
    abstraction_datetime: '2024-01-21T11:20:00',
    risk_score: 0.48,
  },
  {
    patient_id: 'PAT006',
    encounter_id: 'ENC006',
    episode_id: 'EP006',
    mrn: 'MRN100006',
    name: 'Sarah Wilson',
    scenario: 'Clear Negative SSI',
    risk_level: 'LOW',
    determination: 'Not SSI',
    domain: 'SSI',
    abstraction_datetime: '2024-01-17T08:30:00',
    risk_score: 0.08,
  },
];

export default function CaseListPage() {
  const [filteredCases, setFilteredCases] = useState<CaseInfo[]>(sampleCases);

  const getRiskLevelColor = (level?: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'MODERATE':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'LOW':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Case Management</h1>
          <p className="text-muted-foreground">
            Review and manage infection surveillance cases
          </p>
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          {/* Search & Filter Panel */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <SearchFilterPanel
              cases={sampleCases}
              onFilteredCasesChange={setFilteredCases}
            />
          </aside>

          {/* Case List */}
          <div>
            {filteredCases.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-lg text-muted-foreground mb-2">
                  No cases match your filters
                </p>
                <p className="text-sm text-muted-foreground">
                  Try removing some filters or adjusting your search
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredCases.map((caseInfo) => (
                  <Card key={caseInfo.episode_id} className="p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">
                          {caseInfo.name}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>MRN: {caseInfo.mrn}</span>
                          <span>•</span>
                          <span>Patient ID: {caseInfo.patient_id}</span>
                        </div>
                      </div>
                      <Badge className={getRiskLevelColor(caseInfo.risk_level)}>
                        {caseInfo.risk_level || 'N/A'}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">Scenario:</span>{' '}
                        {caseInfo.scenario}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <span>
                          <span className="font-medium">Domain:</span>{' '}
                          {caseInfo.domain || 'N/A'}
                        </span>
                        <span>
                          <span className="font-medium">Determination:</span>{' '}
                          {caseInfo.determination || 'N/A'}
                        </span>
                      </div>
                      {caseInfo.risk_score !== undefined && (
                        <p className="text-sm">
                          <span className="font-medium">Risk Score:</span>{' '}
                          {(caseInfo.risk_score * 100).toFixed(1)}%
                        </p>
                      )}
                      {caseInfo.abstraction_datetime && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(caseInfo.abstraction_datetime).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
