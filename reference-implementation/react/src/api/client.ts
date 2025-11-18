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

// Mock data for demo cases (fallback when backend is unavailable)
const mockDemoCases: Record<string, StructuredCase> = {
  clabsi_demo_001: {
    case_id: "clabsi_demo_001",
    concern_id: "clabsi",
    patient: {
      case_metadata: {
        case_id: "clabsi_demo_001",
        patient_id: "clabsi_demo_001",
        encounter_id: "enc_demo_001",
        created_date: "2024-01-15T00:00:00Z",
        infection_type: "CLABSI",
        facility_id: "DEMO_FACILITY",
        unit: "ICU"
      },
      demographics: {
        age: 68,
        gender: "M",
        mrn: "DEMO-001"
      },
      devices: {
        "central_line": {
          insertion_date: "2024-01-15",
          insertion_time: "08:00",
          line_type: "Central Line",
          insertion_site: "Right subclavian",
          removal_date: null,
          device_days_at_event: 5
        }
      },
      lab_results: [
        {
          test_id: "lab_001",
          test_type: "Blood Culture",
          collection_date: "2024-01-20",
          collection_time: "06:00",
          sample_type: "Blood",
          organism: "S. aureus",
          organism_type: "Bacteria",
          source_id: "BC-20240120-001"
        }
      ],
      clinical_signals: [],
      clinical_notes: [],
      clinical_events: []
    },
    enrichment: {
      task_metadata: {
        task_id: "enrich_20240120_100000",
        task_type: "enrichment",
        prompt_version: "v1.0",
        mode: "batch",
        executed_at: "2024-01-20T10:00:00Z",
        executed_by: "system",
        status: "completed",
        confidence: 0.89,
        duration_ms: 4200,
        token_count: 3500,
        demo_mode: true
      },
      summary: {
        signals_identified: 12,
        key_findings: [
          "Central line placed on Day 0 in ICU setting",
          "S. aureus bacteremia identified on Day 5 post-insertion",
          "No alternative source of infection documented",
          "Patient developed fever and leukocytosis on Day 4"
        ],
        confidence: 0.89
      },
      signal_groups: [
        {
          signal_type: "Device Events",
          group_confidence: 0.92,
          signals: [
            {
              signal_id: "sig_001",
              signal_name: "Central Line Insertion",
              value: "Right subclavian central line placed",
              timestamp: "2024-01-15T08:00:00Z",
              confidence: 0.95
            },
            {
              signal_id: "sig_002",
              signal_name: "Line Site Assessment",
              value: "Site clean, no drainage noted",
              timestamp: "2024-01-16T08:00:00Z",
              confidence: 0.88
            }
          ]
        },
        {
          signal_type: "Laboratory Results",
          group_confidence: 0.94,
          signals: [
            {
              signal_id: "sig_003",
              signal_name: "Blood Culture - Positive",
              value: "S. aureus identified in central and peripheral cultures",
              timestamp: "2024-01-20T06:00:00Z",
              confidence: 0.98
            },
            {
              signal_id: "sig_004",
              signal_name: "WBC Elevation",
              value: "15.2 K/uL",
              timestamp: "2024-01-19T07:00:00Z",
              confidence: 0.91
            }
          ]
        },
        {
          signal_type: "Clinical Signs",
          group_confidence: 0.87,
          signals: [
            {
              signal_id: "sig_005",
              signal_name: "Fever Spike",
              value: "Temperature 39.1°C",
              timestamp: "2024-01-19T14:30:00Z",
              confidence: 0.92
            },
            {
              signal_id: "sig_006",
              signal_name: "Tachycardia",
              value: "Heart rate 118 bpm",
              timestamp: "2024-01-19T14:30:00Z",
              confidence: 0.84
            }
          ]
        }
      ],
      timeline_phases: [
        {
          phase_id: "phase_001",
          phase_name: "Pre-Infection Period",
          start_date: "2024-01-15T00:00:00Z",
          end_date: "2024-01-18T23:59:59Z",
          events_in_phase: 8,
          significance: "low"
        },
        {
          phase_id: "phase_002",
          phase_name: "Clinical Deterioration",
          start_date: "2024-01-19T00:00:00Z",
          end_date: "2024-01-19T23:59:59Z",
          events_in_phase: 12,
          significance: "high"
        },
        {
          phase_id: "phase_003",
          phase_name: "Infection Confirmation",
          start_date: "2024-01-20T00:00:00Z",
          end_date: "2024-01-20T23:59:59Z",
          events_in_phase: 6,
          significance: "high"
        }
      ]
    },
    abstraction: {
      task_metadata: {
        task_id: "abstract_20240120_143000",
        task_type: "abstraction",
        prompt_version: "v1.0",
        mode: "interactive",
        executed_at: "2024-01-20T14:30:00Z",
        executed_by: "nurse.jane",
        status: "completed",
        confidence: 0.92,
        duration_ms: 6800,
        token_count: 5200,
        demo_mode: true
      },
      narrative: "68-year-old male patient with central line placement on admission to ICU. Developed S. aureus bacteremia on Day 5 post-insertion. Clinical presentation consistent with CLABSI criteria with no alternative infection source identified. Patient exhibited fever (39.1°C), leukocytosis (WBC 15.2), and positive blood cultures from both central and peripheral draws with matching organisms.",
      criteria_evaluation: {
        determination: "CLABSI_CONFIRMED",
        confidence: 0.92,
        criteria_met: {
          "criterion_1": {
            met: true,
            evidence: "Central line in place for >2 calendar days before positive culture"
          },
          "criterion_2": {
            met: true,
            evidence: "Recognized pathogen (S. aureus) identified in blood culture"
          },
          "criterion_3": {
            met: true,
            evidence: "Matching organisms in central and peripheral blood cultures"
          },
          "criterion_4": {
            met: true,
            evidence: "Clinical signs of infection present (fever, elevated WBC)"
          },
          "criterion_5": {
            met: true,
            evidence: "No alternative source of bloodstream infection documented"
          }
        },
        total_criteria: 5,
        criteria_met_count: 5
      },
      exclusion_analysis: []
    },
    qa: {
      validation_status: "passed",
      validation_errors: [],
      qa_history: [
        {
          qa_id: "qa_001",
          question: "Why was the patient determined to meet CLABSI criteria?",
          answer: "The patient met all five NHSN CLABSI criteria: (1) Central line was in place for >2 days before the positive culture (Day 0 to Day 5), (2) S. aureus, a recognized pathogen, was identified, (3) Matching organisms were found in both central and peripheral cultures, (4) Clinical signs of infection were present including fever of 39.1°C and elevated WBC of 15.2, and (5) No alternative source of bloodstream infection was documented in the clinical record.",
          interrogation_context: {
            mode: "explain",
            target_type: "overall",
            target_id: "clabsi_demo_001"
          },
          task_metadata: {
            task_id: "qa_20240120_150000",
            task_type: "interrogation",
            prompt_version: "v1.0",
            mode: "interactive",
            executed_at: "2024-01-20T15:00:00Z",
            executed_by: "nurse.jane",
            status: "completed",
            demo_mode: true
          },
          citations: [],
          confidence: 0.94
        },
        {
          qa_id: "qa_002",
          question: "What evidence supports that there was no alternative source?",
          answer: "The clinical documentation was reviewed for alternative infection sources. No urinary tract infection, pneumonia, surgical site infection, or skin/soft tissue infection was documented. The chest X-ray showed no infiltrates, urinalysis was negative, and there were no surgical wounds or skin lesions noted in the nursing assessments.",
          interrogation_context: {
            mode: "validate",
            target_type: "criterion",
            target_id: "criterion_5"
          },
          task_metadata: {
            task_id: "qa_20240120_151500",
            task_type: "interrogation",
            prompt_version: "v1.0",
            mode: "interactive",
            executed_at: "2024-01-20T15:15:00Z",
            executed_by: "nurse.jane",
            status: "completed",
            demo_mode: true
          },
          citations: [],
          confidence: 0.88
        }
      ]
    }
  }
};

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
    try {
      const response = await apiClient.post('/api/demo/context', {
        domain_id: domainId,
        case_id: caseId,
      });

      if (response.data.success && response.data.data.case_data) {
        return response.data.data.case_data;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      // Fallback to mock data for demo cases when backend is unavailable
      console.log(`Backend unavailable, using mock data for ${caseId}`);
      const mockCase = mockDemoCases[caseId];

      if (mockCase) {
        return mockCase;
      }

      throw new Error('Failed to load structured case - backend unavailable and no mock data found');
    }
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
        signal_type: this.mapSignalType(group.signal_type),
        value: typeof signal.value === 'boolean' ? String(signal.value) : signal.value,
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
