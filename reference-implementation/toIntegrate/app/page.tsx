'use client'

import { useState } from 'react'
import EnhancedCaseCard from '@/components/enhanced-case-card'

// Sample data
const sampleCases = [
  {
    patient_id: 'PAT001',
    encounter_id: 'ENC001',
    episode_id: 'EP001',
    mrn: 'MRN100001',
    name: 'John Doe',
    scenario: 'Clear Positive CLABSI with elevated temperature and positive blood cultures',
    risk_level: 'CRITICAL' as const,
    risk_score: 95,
    status: 'PENDING' as const,
    days_since_admission: 5,
    line_days: 3,
    culture_status: 'POSITIVE' as const,
    abstraction_datetime: '2025-01-15T10:30:00Z',
    last_updated: '2025-01-15T14:22:00Z',
    domain: 'CLABSI'
  },
  {
    patient_id: 'PAT002',
    encounter_id: 'ENC002',
    episode_id: 'EP002',
    mrn: 'MRN100002',
    name: 'Jane Smith',
    scenario: 'Clear Negative - No infection criteria met',
    risk_level: 'LOW' as const,
    risk_score: 15,
    status: 'REVIEWED' as const,
    days_since_admission: 3,
    line_days: 2,
    culture_status: 'NEGATIVE' as const,
    abstraction_datetime: '2025-01-14T08:15:00Z',
    last_updated: '2025-01-14T16:45:00Z',
    domain: 'CLABSI'
  },
  {
    patient_id: 'PAT003',
    encounter_id: 'ENC003',
    episode_id: 'EP003',
    mrn: 'MRN100003',
    name: 'Robert Johnson',
    scenario: 'Borderline Case - Requires additional clinical review',
    risk_level: 'MODERATE' as const,
    risk_score: 62,
    status: 'FLAGGED' as const,
    days_since_admission: 7,
    line_days: 5,
    culture_status: 'PENDING' as const,
    abstraction_datetime: '2025-01-15T11:00:00Z',
    last_updated: '2025-01-15T13:30:00Z',
    domain: 'CLABSI'
  },
  {
    patient_id: 'PAT004',
    encounter_id: 'ENC004',
    episode_id: 'EP004',
    mrn: 'MRN100004',
    name: 'Maria Garcia',
    scenario: 'Possible CAUTI - Urinary symptoms present with catheter',
    risk_level: 'HIGH' as const,
    risk_score: 78,
    status: 'IN_REVIEW' as const,
    days_since_admission: 4,
    line_days: 4,
    culture_status: 'POSITIVE' as const,
    abstraction_datetime: '2025-01-15T09:00:00Z',
    last_updated: '2025-01-15T12:00:00Z',
    domain: 'CAUTI'
  },
  {
    patient_id: 'PAT005',
    encounter_id: 'ENC005',
    episode_id: 'EP005',
    mrn: 'MRN100005',
    name: 'David Lee',
    scenario: 'SSI surveillance - Post-operative monitoring',
    risk_level: 'MODERATE' as const,
    risk_score: 45,
    status: 'PENDING' as const,
    days_since_admission: 2,
    line_days: 1,
    culture_status: 'NONE' as const,
    abstraction_datetime: '2025-01-15T13:30:00Z',
    last_updated: '2025-01-15T15:00:00Z',
    domain: 'SSI'
  },
  {
    patient_id: 'PAT006',
    encounter_id: 'ENC006',
    episode_id: 'EP006',
    mrn: 'MRN100006',
    name: 'Sarah Williams',
    scenario: 'Low risk patient - Routine monitoring',
    risk_level: 'LOW' as const,
    risk_score: 22,
    status: 'REVIEWED' as const,
    days_since_admission: 1,
    line_days: 1,
    culture_status: 'NEGATIVE' as const,
    abstraction_datetime: '2025-01-14T14:00:00Z',
    last_updated: '2025-01-15T10:00:00Z',
    domain: 'CLABSI'
  }
]

export default function CaseListPage() {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)

  const handleCaseClick = (patientId: string) => {
    setSelectedCaseId(patientId)
    console.log(`Selected case: ${patientId}`)
    // In a real app, you would navigate to the case detail page
    // router.push(`/case/${patientId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 text-balance">
                Case Management Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Review and track infection control cases
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">{sampleCases.length} Cases</p>
                <p className="text-xs text-gray-500">
                  {sampleCases.filter(c => c.status === 'PENDING').length} Pending Review
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter/Stats Bar */}
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
            <span className="text-sm font-medium text-gray-700">Critical:</span>
            <span className="text-sm font-bold text-red-600">
              {sampleCases.filter(c => c.risk_level === 'CRITICAL').length}
            </span>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
            <span className="text-sm font-medium text-gray-700">High:</span>
            <span className="text-sm font-bold text-orange-600">
              {sampleCases.filter(c => c.risk_level === 'HIGH').length}
            </span>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
            <span className="text-sm font-medium text-gray-700">Moderate:</span>
            <span className="text-sm font-bold text-yellow-600">
              {sampleCases.filter(c => c.risk_level === 'MODERATE').length}
            </span>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
            <span className="text-sm font-medium text-gray-700">Low:</span>
            <span className="text-sm font-bold text-green-600">
              {sampleCases.filter(c => c.risk_level === 'LOW').length}
            </span>
          </div>
        </div>

        {/* Cases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sampleCases.map((caseInfo) => (
            <EnhancedCaseCard
              key={caseInfo.patient_id}
              caseInfo={caseInfo}
              onClick={handleCaseClick}
              isSelected={selectedCaseId === caseInfo.patient_id}
            />
          ))}
        </div>

        {/* Empty State (hidden when cases exist) */}
        {sampleCases.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No cases found</p>
          </div>
        )}
      </main>
    </div>
  )
}
