/**
 * Example Component: Structured Case Viewer
 *
 * Demonstrates how to use the new StructuredCase types and utilities
 */

import React from 'react';
import {
  StructuredCase,
  TaskMetadata,
  SignalGroup,
} from '../types';
import {
  isStructuredCase,
  structuredToLegacyCaseView,
  extractPatientDemographics,
  extractEnrichmentSummary,
  extractAbstractionSummary,
} from '../utils/caseAdapter';

interface StructuredCaseViewerProps {
  caseData: StructuredCase | any; // Can accept either format
}

/**
 * Component that displays a structured case using the 4-section model
 */
export const StructuredCaseViewer: React.FC<StructuredCaseViewerProps> = ({ caseData }) => {
  // Type guard: check if this is a structured case
  const isStructured = isStructuredCase(caseData);

  if (!isStructured) {
    // If legacy format, you could convert it here or display differently
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-yellow-800">
          Legacy case format detected. Please use structured format.
        </p>
      </div>
    );
  }

  // Extract data using utility functions
  const patientDemo = extractPatientDemographics(caseData);
  const enrichmentSummary = extractEnrichmentSummary(caseData.enrichment);
  const abstractionSummary = extractAbstractionSummary(caseData.abstraction);

  return (
    <div className="space-y-6">
      {/* Case Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Case {caseData.case_id}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Concern: <span className="font-medium">{caseData.concern_id.toUpperCase()}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Patient ID</p>
            <p className="font-mono font-medium">{patientDemo.patient_id}</p>
          </div>
        </div>
      </div>

      {/* Patient Section */}
      <section className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Patient Information
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">MRN</p>
            <p className="font-medium">{patientDemo.mrn}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Age / Gender</p>
            <p className="font-medium">{patientDemo.age}y / {patientDemo.gender}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Encounter</p>
            <p className="font-medium font-mono text-sm">{patientDemo.encounter_id}</p>
          </div>
        </div>

        {/* Devices */}
        {caseData.patient.devices && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Devices</h4>
            <div className="space-y-2">
              {Object.entries(caseData.patient.devices).map(([deviceType, device]) => (
                <div key={deviceType} className="bg-gray-50 p-3 rounded">
                  <div className="flex justify-between">
                    <span className="font-medium">{deviceType.replace('_', ' ')}</span>
                    <span className="text-sm text-gray-600">
                      {device.line_type} - {device.insertion_site}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Inserted: {device.insertion_date}
                    {device.device_days_at_event && ` (${device.device_days_at_event} days)`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Enrichment Section */}
      <section className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Clinical Enrichment
          </h3>
          <TaskMetadataBadge metadata={caseData.enrichment.task_metadata} />
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Signals Identified"
            value={enrichmentSummary.signals_identified}
          />
          <StatCard
            label="Signal Groups"
            value={enrichmentSummary.signal_groups}
          />
          <StatCard
            label="Timeline Phases"
            value={enrichmentSummary.timeline_phases}
          />
          <StatCard
            label="Confidence"
            value={`${(enrichmentSummary.confidence * 100).toFixed(0)}%`}
          />
        </div>

        {/* Key Findings */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Findings</h4>
          <ul className="space-y-1">
            {enrichmentSummary.key_findings.map((finding, idx) => (
              <li key={idx} className="text-sm text-gray-700 flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                {finding}
              </li>
            ))}
          </ul>
        </div>

        {/* Signal Groups */}
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Signal Groups</h4>
          <div className="space-y-3">
            {caseData.enrichment.signal_groups.map((group: SignalGroup, idx: number) => (
              <SignalGroupCard key={idx} group={group} />
            ))}
          </div>
        </div>
      </section>

      {/* Abstraction Section */}
      <section className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Clinical Abstraction
          </h3>
          <TaskMetadataBadge metadata={caseData.abstraction.task_metadata} />
        </div>

        {/* Determination */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-blue-800 font-semibold">Determination</p>
              <p className="text-lg font-bold text-blue-900 mt-1">
                {abstractionSummary.determination}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-800">Confidence</p>
              <p className="text-2xl font-bold text-blue-900">
                {(abstractionSummary.confidence * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>

        {/* Narrative */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Clinical Narrative</h4>
          <p className="text-gray-700 leading-relaxed">{abstractionSummary.narrative}</p>
        </div>

        {/* Criteria Evaluation */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Criteria Evaluation ({abstractionSummary.criteria_met_count} / {abstractionSummary.total_criteria})
          </h4>
          <div className="space-y-2">
            {Object.entries(caseData.abstraction.criteria_evaluation.criteria_met).map(
              ([key, criterion]) => (
                <div key={key} className="flex items-start space-x-3 p-3 bg-gray-50 rounded">
                  <div className="flex-shrink-0 mt-1">
                    {criterion.met ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">
                      {formatCriterionKey(key)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{criterion.evidence}</p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* QA Section (if available) */}
      {caseData.qa && caseData.qa.qa_history.length > 0 && (
        <section className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            QA History ({caseData.qa.qa_history.length} interactions)
          </h3>
          <div className="space-y-3">
            {caseData.qa.qa_history.map((qa, idx) => (
              <div key={idx} className="border-l-4 border-purple-500 pl-4 py-2">
                <p className="font-medium text-gray-900">{qa.question}</p>
                <p className="text-sm text-gray-700 mt-1">{qa.answer}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Mode: {qa.interrogation_context.mode} |
                  Target: {qa.interrogation_context.target_type} |
                  Confidence: {qa.confidence ? `${(qa.confidence * 100).toFixed(0)}%` : 'N/A'}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

// Helper Components

const TaskMetadataBadge: React.FC<{ metadata: TaskMetadata }> = ({ metadata }) => (
  <div className="text-right text-xs">
    <div className="flex items-center space-x-2">
      <span className={`px-2 py-1 rounded ${
        metadata.status === 'completed' ? 'bg-green-100 text-green-800' :
        metadata.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
        'bg-red-100 text-red-800'
      }`}>
        {metadata.status}
      </span>
      <span className="text-gray-600">{metadata.mode}</span>
    </div>
    <div className="text-gray-500 mt-1">
      {metadata.task_type} • v{metadata.prompt_version}
    </div>
  </div>
);

const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="bg-gray-50 p-3 rounded">
    <p className="text-xs text-gray-600">{label}</p>
    <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
  </div>
);

const SignalGroupCard: React.FC<{ group: SignalGroup }> = ({ group }) => (
  <div className="bg-gray-50 p-3 rounded">
    <div className="flex justify-between items-center mb-2">
      <span className="font-medium text-sm">{group.signal_type.replace('_', ' ')}</span>
      <span className="text-xs text-gray-600">
        {group.signals.length} signals • {(group.group_confidence * 100).toFixed(0)}% confidence
      </span>
    </div>
    <div className="space-y-1">
      {group.signals.slice(0, 3).map((signal, idx) => (
        <div key={idx} className="text-xs text-gray-700 flex justify-between">
          <span>{signal.signal_name}</span>
          <span className="font-mono">{String(signal.value)} {signal.unit || ''}</span>
        </div>
      ))}
      {group.signals.length > 3 && (
        <p className="text-xs text-gray-500 italic">
          +{group.signals.length - 3} more signals
        </p>
      )}
    </div>
  </div>
);

// Icon placeholders (you can replace with actual icon library)
const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
      clipRule="evenodd"
    />
  </svg>
);

const XCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
      clipRule="evenodd"
    />
  </svg>
);

// Utility helper
function formatCriterionKey(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default StructuredCaseViewer;
