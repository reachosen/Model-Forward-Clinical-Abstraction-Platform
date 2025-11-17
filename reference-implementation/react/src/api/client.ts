/**
 * API Client for CLABSI Abstraction Application
 * Updated to support structured case format (4-section model)
 */

import axios from 'axios';
import {
  CaseInfo,
  CaseView,
  FeedbackSubmission,
  Evidence,
  StructuredCase,
  QAHistoryEntry,
  InterrogationContext,
  TaskMetadata,
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  /**
   * Get list of all available cases
   */
  async getCases(): Promise<{ cases: CaseInfo[]; total: number }> {
    const response = await apiClient.get('/cases');
    return response.data;
  },

  /**
   * Get detailed case view for a specific patient
   * Now uses demo/context endpoint with structured format
   */
  async getCase(patientId: string): Promise<CaseView> {
    // For backward compatibility, try to load structured case and convert
    try {
      const structuredCase = await this.getStructuredCase('clabsi', patientId);
      return this.convertStructuredToCaseView(structuredCase);
    } catch (error) {
      // Fallback to legacy endpoint if available
      const response = await apiClient.get(`/cases/${patientId}`);
      return response.data;
    }
  },

  /**
   * Get structured case (4-section model) via demo/context endpoint
   */
  async getStructuredCase(domainId: string, caseId: string): Promise<StructuredCase> {
    const response = await apiClient.post('/api/demo/context', {
      domain_id: domainId,
      case_id: caseId,
    });

    if (response.data.success && response.data.data.case_data) {
      return response.data.data.case_data;
    }

    throw new Error('Failed to load structured case');
  },

  /**
   * Get abstraction for a case via demo/abstract endpoint
   */
  async getAbstraction(domainId: string, caseId: string, contextFragments?: any[]) {
    const response = await apiClient.post('/api/demo/abstract', {
      domain_id: domainId,
      case_id: caseId,
      context_fragments: contextFragments || [],
    });

    return response.data;
  },

  /**
   * Submit clinician feedback on a case
   */
  async submitFeedback(feedback: FeedbackSubmission): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/feedback', feedback);
    return response.data;
  },

  /**
   * Get current execution mode
   */
  async getMode(): Promise<{ mode: 'TEST' | 'PROD' }> {
    const response = await apiClient.get('/mode');
    return response.data;
  },

  /**
   * Set execution mode
   */
  async setMode(mode: 'TEST' | 'PROD'): Promise<{ success: boolean; mode: string }> {
    const response = await apiClient.post('/mode', { mode });
    return response.data;
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string }> {
    const response = await apiClient.get('/health');
    return response.data;
  },

  /**
   * Get evidence for a specific signal
   */
  async getEvidence(signalId: string): Promise<{ evidence: Evidence[]; signal_id: string }> {
    const response = await apiClient.get(`/evidence/${signalId}`);
    return response.data;
  },

  /**
   * Interrogate a task (Ask Panel support)
   */
  async interrogateTask(
    taskId: string,
    question: string,
    interrogationContext: InterrogationContext
  ): Promise<QAHistoryEntry> {
    const response = await apiClient.post(`/v1/task/${taskId}/interrogate`, {
      question,
      interrogation_context: interrogationContext,
    });

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to interrogate task');
  },

  /**
   * Get all tasks for a case
   */
  async getCaseTasks(caseId: string): Promise<{
    case_id: string;
    task_count: number;
    tasks: (TaskMetadata & { section?: string; summary?: any; determination?: string })[];
  }> {
    const response = await apiClient.get(`/v1/case/${caseId}/tasks`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to get case tasks');
  },

  /**
   * Get specific task details
   */
  async getTask(taskId: string): Promise<any> {
    const response = await apiClient.get(`/v1/task/${taskId}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to get task');
  },

  /**
   * Submit demo feedback via /api/demo/feedback
   */
  async submitDemoFeedback(
    domainId: string,
    caseId: string,
    feedbackType: string,
    comment?: string
  ): Promise<{ status: string; feedback_id: string; message: string }> {
    const response = await apiClient.post('/api/demo/feedback', {
      domain_id: domainId,
      case_id: caseId,
      feedback_type: feedbackType,
      comment: comment || '',
    });

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to submit feedback');
  },

  /**
   * Helper: Convert StructuredCase to CaseView for backward compatibility
   * Uses the same logic as the frontend caseAdapter utility
   */
  convertStructuredToCaseView(structuredCase: StructuredCase): CaseView {
    const { patient, enrichment, abstraction } = structuredCase;

    // Map signals from enrichment section
    const signals = enrichment.signal_groups.flatMap((group) =>
      group.signals.map((signal) => ({
        signal_id: signal.signal_id,
        signal_name: signal.signal_name,
        signal_type: this.mapSignalType(signal.signal_type as string),
        value: signal.value,
        severity: (signal.severity as any) || 'INFO',
        rationale: `${group.signal_type} signal`,
        timestamp: signal.timestamp,
        confidence: group.group_confidence,
      }))
    );

    // Map timeline phases to timeline events
    const timeline = enrichment.timeline_phases.map((phase) => ({
      event_id: `phase-${phase.phase_name}`,
      event_datetime: phase.start_date,
      event_type: phase.phase_name,
      description: phase.description || phase.events?.join(', ') || '',
      phase: this.mapTimelinePhase(phase.phase_name),
      severity: 'INFO' as const,
    }));

    // Map criteria evaluation to rule evaluations
    const rule_evaluations: any = {};
    Object.entries(abstraction.criteria_evaluation.criteria_met).forEach(([key, value]) => {
      rule_evaluations[key] = {
        result: value.met,
        evidence: value.evidence,
        confidence: abstraction.criteria_evaluation.confidence,
      };
    });

    // Create abstraction summary
    const summary = {
      patient_id: patient.case_metadata.patient_id,
      encounter_id: patient.case_metadata.encounter_id,
      episode_id: patient.case_metadata.encounter_id,
      mrn: patient.demographics.mrn,
      age: patient.demographics.age,
      gender: patient.demographics.gender,
      abstraction_datetime: abstraction.task_metadata.executed_at,
      abstraction_version: abstraction.task_metadata.prompt_version,
      mode: 'TEST' as const,
      key_findings: enrichment.summary.key_findings,
      risk_level: this.determineRiskLevel(abstraction.criteria_evaluation.confidence),
      risk_score: abstraction.criteria_evaluation.confidence,
      risk_factors: [],
      timeline_summary: {},
      likely_clabsi: abstraction.criteria_evaluation.determination.includes('CONFIRMED'),
      confidence: abstraction.criteria_evaluation.confidence,
      meets_nhsn_criteria: abstraction.criteria_evaluation.determination.includes('CONFIRMED'),
      positive_findings: enrichment.summary.key_findings,
      negative_findings: abstraction.exclusion_analysis
        .filter((e) => !e.met)
        .map((e) => e.rationale),
      unresolved_questions: [],
      recommended_actions: [],
    };

    // Create QA result
    const qa_result = {
      qa_status: (structuredCase.qa?.validation_status === 'passed' ? 'PASS' : 'WARN') as 'PASS' | 'WARN' | 'FAIL',
      qa_score: abstraction.criteria_evaluation.confidence,
      rules_evaluated:
        abstraction.criteria_evaluation.total_criteria ||
        Object.keys(abstraction.criteria_evaluation.criteria_met).length,
      rules_passed:
        abstraction.criteria_evaluation.criteria_met_count ||
        Object.values(abstraction.criteria_evaluation.criteria_met).filter((c) => c.met).length,
      rules_warnings: 0,
      rules_failed: 0,
      missing_data_fields: [],
      contradictions: [],
      validation_errors: structuredCase.qa?.validation_errors || [],
      recommended_actions: [],
      rule_details: Object.entries(abstraction.criteria_evaluation.criteria_met).map(
        ([key, value]) => ({
          rule_name: key,
          status: (value.met ? 'PASS' : 'FAIL') as 'PASS' | 'WARN' | 'FAIL',
          message: value.evidence,
        })
      ),
    };

    // Create case info
    const case_info = {
      patient_id: patient.case_metadata.patient_id,
      encounter_id: patient.case_metadata.encounter_id,
      episode_id: patient.case_metadata.encounter_id,
      mrn: patient.demographics.mrn,
      name: `Patient ${patient.case_metadata.patient_id}`,
      scenario: structuredCase.concern_id.toUpperCase(),
      risk_level: this.determineRiskLevel(abstraction.criteria_evaluation.confidence),
      determination: abstraction.criteria_evaluation.determination,
      domain: structuredCase.concern_id.toUpperCase(),
      abstraction_datetime: abstraction.task_metadata.executed_at,
      status: 'REVIEWED' as const,
    };

    return {
      summary,
      qa_result,
      signals,
      timeline,
      rule_evaluations,
      status: 'SUCCESS',
      generated_at: abstraction.task_metadata.executed_at,
      mode: 'TEST',
      case_info,
    };
  },

  /**
   * Helper: Map signal types
   */
  mapSignalType(signalType: string): 'DEVICE' | 'LAB' | 'VITAL' | 'MEDICATION' | 'PROCEDURE' {
    const typeMap: Record<string, 'DEVICE' | 'LAB' | 'VITAL' | 'MEDICATION' | 'PROCEDURE'> = {
      device: 'DEVICE',
      lab: 'LAB',
      vital_sign: 'VITAL',
      medication: 'MEDICATION',
      procedure: 'PROCEDURE',
    };
    return typeMap[signalType.toLowerCase()] || 'VITAL';
  },

  /**
   * Helper: Map timeline phases
   */
  mapTimelinePhase(phaseName: string): 'PRE_LINE' | 'LINE_PLACEMENT' | 'MONITORING' | 'CULTURE' | 'POST_CULTURE' {
    const phaseMap: Record<string, 'PRE_LINE' | 'LINE_PLACEMENT' | 'MONITORING' | 'CULTURE' | 'POST_CULTURE'> = {
      'Device Placement': 'LINE_PLACEMENT',
      'Infection Window': 'MONITORING',
      'Symptom Onset': 'MONITORING',
      'Diagnostic Workup': 'CULTURE',
      'Post-Culture': 'POST_CULTURE',
    };
    return phaseMap[phaseName] || 'MONITORING';
  },

  /**
   * Helper: Determine risk level from confidence
   */
  determineRiskLevel(confidence: number): 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
    if (confidence >= 0.9) return 'CRITICAL';
    if (confidence >= 0.75) return 'HIGH';
    if (confidence >= 0.5) return 'MODERATE';
    return 'LOW';
  },
};

export default api;
