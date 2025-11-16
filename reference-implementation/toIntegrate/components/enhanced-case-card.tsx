'use client'

import { Clock, Eye, CheckCircle, Flag, Calendar, Activity, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'

// TypeScript interfaces
interface EnhancedCaseCardProps {
  caseInfo: CaseCardInfo
  onClick: (patientId: string) => void
  isSelected?: boolean
}

interface CaseCardInfo {
  patient_id: string
  encounter_id: string
  episode_id: string
  mrn: string
  name: string
  scenario: string
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
  risk_score: number
  status: 'PENDING' | 'IN_REVIEW' | 'REVIEWED' | 'FLAGGED'
  days_since_admission?: number
  line_days?: number
  culture_status?: 'NONE' | 'PENDING' | 'POSITIVE' | 'NEGATIVE'
  abstraction_datetime?: string
  last_updated?: string
  domain?: string
}

// Risk level configuration
interface RiskLevelConfig {
  label: string
  color: string
  backgroundColor: string
  borderColor: string
  icon: string
}

const riskLevelConfig: Record<string, RiskLevelConfig> = {
  CRITICAL: {
    label: 'Critical',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
    icon: '🔴'
  },
  HIGH: {
    label: 'High',
    color: '#ea580c',
    backgroundColor: '#ffedd5',
    borderColor: '#f97316',
    icon: '🟠'
  },
  MODERATE: {
    label: 'Moderate',
    color: '#d97706',
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    icon: '🟡'
  },
  LOW: {
    label: 'Low',
    color: '#059669',
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
    icon: '🟢'
  }
}

// Status configuration
const statusConfig = {
  PENDING: { label: 'Pending', icon: Clock, color: '#6b7280', bg: '#f3f4f6' },
  IN_REVIEW: { label: 'In Review', icon: Eye, color: '#3b82f6', bg: '#dbeafe' },
  REVIEWED: { label: 'Reviewed', icon: CheckCircle, color: '#059669', bg: '#d1fae5' },
  FLAGGED: { label: 'Flagged', icon: Flag, color: '#dc2626', bg: '#fee2e2' }
}

// Culture status configuration
const cultureStatusConfig = {
  POSITIVE: { label: 'Positive', color: '#dc2626', bg: '#fee2e2' },
  PENDING: { label: 'Pending', color: '#d97706', bg: '#fef3c7' },
  NEGATIVE: { label: 'Negative', color: '#059669', bg: '#d1fae5' },
  NONE: { label: 'No Culture', color: '#6b7280', bg: '#f3f4f6' }
}

// Format date helper
function formatDate(isoDate?: string): string {
  if (!isoDate) return 'N/A'
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function EnhancedCaseCard({ caseInfo, onClick, isSelected = false }: EnhancedCaseCardProps) {
  const riskConfig = riskLevelConfig[caseInfo.risk_level]
  const StatusIcon = statusConfig[caseInfo.status].icon
  const cultureConfig = caseInfo.culture_status ? cultureStatusConfig[caseInfo.culture_status] : null

  const handleClick = () => {
    onClick(caseInfo.patient_id)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick(caseInfo.patient_id)
    }
  }

  return (
    <article
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Case card for ${caseInfo.name}, risk level ${riskConfig.label}, status ${statusConfig[caseInfo.status].label}`}
      className={cn(
        'group relative bg-white rounded-lg shadow-md hover:shadow-xl',
        'transition-all duration-200 ease-in-out',
        'hover:-translate-y-1 cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'p-5',
        isSelected && 'ring-2 ring-blue-500 shadow-lg shadow-blue-100'
      )}
      style={{ borderLeft: `4px solid ${riskConfig.color}` }}
    >
      {/* Top Badges Row */}
      <div className="flex items-start justify-between gap-2 mb-4">
        {/* Risk Badge */}
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            backgroundColor: riskConfig.backgroundColor,
            color: riskConfig.color,
            border: `1px solid ${riskConfig.borderColor}`
          }}
        >
          <span aria-hidden="true">{riskConfig.icon}</span>
          <span>{riskConfig.label}</span>
        </div>

        {/* Status Badge */}
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            backgroundColor: statusConfig[caseInfo.status].bg,
            color: statusConfig[caseInfo.status].color
          }}
        >
          <StatusIcon className="w-3 h-3" aria-hidden="true" />
          <span>{statusConfig[caseInfo.status].label}</span>
        </div>
      </div>

      {/* Header - Patient Name and MRN */}
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <h3 className="text-lg font-bold text-gray-900">{caseInfo.name}</h3>
        <span className="text-sm font-mono font-medium text-gray-600">{caseInfo.mrn}</span>
      </div>

      {/* Basic Info */}
      <div className="space-y-1 mb-4">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Encounter:</span> {caseInfo.encounter_id}
        </p>
        <p className="text-sm text-gray-600 line-clamp-2">
          <span className="font-medium">Scenario:</span> {caseInfo.scenario}
        </p>
        {caseInfo.domain && (
          <p className="text-sm text-gray-600">
            <span className="font-medium">Domain:</span> {caseInfo.domain}
          </p>
        )}
      </div>

      {/* Quick Metrics Row */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
        {/* Days since admission */}
        {caseInfo.days_since_admission !== undefined && (
          <div className="flex items-center gap-1.5" title="Days since admission">
            <Calendar className="w-4 h-4 text-gray-500" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900">{caseInfo.days_since_admission}</span>
              <span className="text-xs text-gray-500">days</span>
            </div>
          </div>
        )}

        {/* Line days */}
        {caseInfo.line_days !== undefined && (
          <div className="flex items-center gap-1.5" title="Days with central line">
            <Activity className="w-4 h-4 text-gray-500" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900">{caseInfo.line_days}</span>
              <span className="text-xs text-gray-500">line days</span>
            </div>
          </div>
        )}

        {/* Culture status */}
        {cultureConfig && (
          <div className="flex items-center gap-1.5" title="Blood culture status">
            <FlaskConical className="w-4 h-4 text-gray-500" aria-hidden="true" />
            <div
              className="px-2 py-1 rounded text-xs font-semibold"
              style={{
                backgroundColor: cultureConfig.bg,
                color: cultureConfig.color
              }}
            >
              {cultureConfig.label}
            </div>
          </div>
        )}
      </div>

      {/* Risk Score Bar */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">Risk Score</span>
          <span className="text-xs font-bold text-gray-700">{caseInfo.risk_score}/100</span>
        </div>
        <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
            style={{
              width: `${caseInfo.risk_score}%`,
              backgroundColor: riskConfig.color
            }}
            aria-valuenow={caseInfo.risk_score}
            aria-valuemin={0}
            aria-valuemax={100}
            role="progressbar"
            aria-label={`Risk score: ${caseInfo.risk_score} out of 100`}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Abstracted: {formatDate(caseInfo.abstraction_datetime)}</span>
        <button
          className="text-blue-600 hover:text-blue-700 font-medium hover:underline focus:outline-none"
          onClick={(e) => {
            e.stopPropagation()
            onClick(caseInfo.patient_id)
          }}
          aria-label={`Review case for ${caseInfo.name}`}
        >
          Review Case →
        </button>
      </div>
    </article>
  )
}
