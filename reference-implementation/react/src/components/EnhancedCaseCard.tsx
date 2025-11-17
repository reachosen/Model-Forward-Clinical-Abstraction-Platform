/**
 * Enhanced Case Card Component
 * Visual case cards with risk indicators, status badges, and quick metrics
 * Adapted from Vercel v0.dev generation
 */

import React from 'react';
import { Clock, Eye, CheckCircle, Flag, Calendar, Activity, FlaskConical } from 'lucide-react';
import './EnhancedCaseCard.css';

// TypeScript interfaces
interface EnhancedCaseCardProps {
  caseInfo: CaseCardInfo;
  onClick: (patientId: string) => void;
  isSelected?: boolean;
}

interface CaseCardInfo {
  patient_id: string;
  encounter_id: string;
  episode_id: string;
  mrn: string;
  name: string;
  scenario: string;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  status: 'PENDING' | 'IN_REVIEW' | 'REVIEWED' | 'FLAGGED';
  days_since_admission?: number;
  line_days?: number;
  culture_status?: 'NONE' | 'PENDING' | 'POSITIVE' | 'NEGATIVE';
  abstraction_datetime?: string;
  last_updated?: string;
  domain?: string;
}

// Risk level configuration
interface RiskLevelConfig {
  label: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  icon: string;
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
};

// Status configuration
const statusConfig = {
  PENDING: { label: 'Pending', icon: Clock, color: '#6b7280', bg: '#f3f4f6' },
  IN_REVIEW: { label: 'In Review', icon: Eye, color: '#3b82f6', bg: '#dbeafe' },
  REVIEWED: { label: 'Reviewed', icon: CheckCircle, color: '#059669', bg: '#d1fae5' },
  FLAGGED: { label: 'Flagged', icon: Flag, color: '#dc2626', bg: '#fee2e2' }
};

// Culture status configuration
const cultureStatusConfig = {
  POSITIVE: { label: 'Positive', color: '#dc2626', bg: '#fee2e2' },
  PENDING: { label: 'Pending', color: '#d97706', bg: '#fef3c7' },
  NEGATIVE: { label: 'Negative', color: '#059669', bg: '#d1fae5' },
  NONE: { label: 'No Culture', color: '#6b7280', bg: '#f3f4f6' }
};

// Format date helper
function formatDate(isoDate?: string): string {
  if (!isoDate) return 'N/A';
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const EnhancedCaseCard: React.FC<EnhancedCaseCardProps> = ({
  caseInfo,
  onClick,
  isSelected = false
}) => {
  const riskConfig = riskLevelConfig[caseInfo.risk_level];
  const StatusIcon = statusConfig[caseInfo.status].icon;
  const cultureConfig = caseInfo.culture_status ? cultureStatusConfig[caseInfo.culture_status] : null;

  const handleClick = () => {
    onClick(caseInfo.patient_id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(caseInfo.patient_id);
    }
  };

  return (
    <article
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Case card for ${caseInfo.name}, risk level ${riskConfig.label}, status ${statusConfig[caseInfo.status].label}`}
      className={`enhanced-case-card ${isSelected ? 'selected' : ''}`}
      style={{ borderLeft: `4px solid ${riskConfig.color}` }}
      data-testid="case-card"
      data-case-id={caseInfo.patient_id}
    >
      {/* Top Badges Row */}
      <div className="badges-row">
        {/* Risk Badge */}
        <div
          className="risk-badge"
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
          className="status-badge"
          style={{
            backgroundColor: statusConfig[caseInfo.status].bg,
            color: statusConfig[caseInfo.status].color
          }}
        >
          <StatusIcon className="status-icon" aria-hidden="true" />
          <span>{statusConfig[caseInfo.status].label}</span>
        </div>
      </div>

      {/* Header - Patient Name and MRN */}
      <div className="card-header">
        <h3 className="patient-name">{caseInfo.name}</h3>
        <span className="mrn">{caseInfo.mrn}</span>
      </div>

      {/* Basic Info */}
      <div className="basic-info">
        <p className="info-line">
          <span className="label">Encounter:</span> {caseInfo.encounter_id}
        </p>
        <p className="info-line scenario">
          <span className="label">Scenario:</span> {caseInfo.scenario}
        </p>
        {caseInfo.domain && (
          <p className="info-line">
            <span className="label">Domain:</span> {caseInfo.domain}
          </p>
        )}
      </div>

      {/* Quick Metrics Row */}
      <div className="metrics-row">
        {/* Days since admission */}
        {caseInfo.days_since_admission !== undefined && (
          <div className="metric" title="Days since admission">
            <Calendar className="metric-icon" aria-hidden="true" />
            <div className="metric-value">
              <span className="value">{caseInfo.days_since_admission}</span>
              <span className="unit">days</span>
            </div>
          </div>
        )}

        {/* Line days */}
        {caseInfo.line_days !== undefined && (
          <div className="metric" title="Days with central line">
            <Activity className="metric-icon" aria-hidden="true" />
            <div className="metric-value">
              <span className="value">{caseInfo.line_days}</span>
              <span className="unit">line days</span>
            </div>
          </div>
        )}

        {/* Culture status */}
        {cultureConfig && (
          <div className="metric" title="Blood culture status">
            <FlaskConical className="metric-icon" aria-hidden="true" />
            <div
              className="culture-badge"
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
      <div className="risk-score-section">
        <div className="risk-score-header">
          <span className="label">Risk Score</span>
          <span className="score">{caseInfo.risk_score}/100</span>
        </div>
        <div className="risk-score-bar-container">
          <div
            className="risk-score-bar"
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
      <div className="card-footer">
        <span className="abstraction-date">Abstracted: {formatDate(caseInfo.abstraction_datetime)}</span>
        <button
          className="review-button"
          onClick={(e) => {
            e.stopPropagation();
            onClick(caseInfo.patient_id);
          }}
          aria-label={`Review case for ${caseInfo.name}`}
        >
          Review Case →
        </button>
      </div>
    </article>
  );
};

export default EnhancedCaseCard;
