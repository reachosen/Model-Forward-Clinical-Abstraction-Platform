import { NextRequest, NextResponse } from 'next/server';
import type { StructuredCase, SignalGroup, TimelinePhase, QAHistoryItem, TaskHistoryEntry, CriterionDetail } from '@/types/case';

const demoCases: Record<string, StructuredCase> = {
  clabsi_demo_001: {
    case_id: "clabsi_demo_001",
    concern_id: "clabsi",
    patient: {
      case_metadata: {},
      demographics: {
        age: 68,
        gender: "M"
      },
      devices: [],
      lab_results: [],
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
        signal_groups_count: 4,
        timeline_phases_identified: 3,
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
            evidence: "Central line in place for >2 calendar days before positive culture",
            confidence: 0.98
          },
          "criterion_2": {
            met: true,
            evidence: "Recognized pathogen (S. aureus) identified in blood culture",
            confidence: 0.97
          },
          "criterion_3": {
            met: true,
            evidence: "Matching organisms in central and peripheral blood cultures",
            confidence: 0.95
          },
          "criterion_4": {
            met: true,
            evidence: "Clinical signs of infection present (fever, elevated WBC)",
            confidence: 0.89
          },
          "criterion_5": {
            met: true,
            evidence: "No alternative source of bloodstream infection documented",
            confidence: 0.84
          }
        },
        criteria_total: 5,
        criteria_met_count: 5
      },
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
          citations: [],
          confidence: 0.94,
          timestamp: "2024-01-20T15:00:00Z"
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
          citations: [],
          confidence: 0.88,
          timestamp: "2024-01-20T15:15:00Z"
        }
      ],
      exclusion_analysis: []
    }
  }
};

const taskHistoryData: Record<string, TaskHistoryEntry[]> = {
  clabsi_demo_001_enrichment: [
    {
      task_metadata: {
        task_id: "enrich_20240120_100000",
        task_type: "enrichment",
        prompt_version: "v1.0",
        mode: "batch",
        executed_at: "2024-01-20T10:00:00Z",
        executed_by: "system",
        status: "completed",
        confidence: 0.89,
        demo_mode: true
      },
      result_summary: "Identified 12 signals across 4 groups with 3 distinct timeline phases",
      changes_from_previous: undefined,
      performance_metrics: {
        duration_ms: 4200,
        token_count: 3500,
        confidence: 0.89
      }
    },
    {
      task_metadata: {
        task_id: "enrich_20240118_143000",
        task_type: "enrichment",
        prompt_version: "v0.9",
        mode: "batch",
        executed_at: "2024-01-18T14:30:00Z",
        executed_by: "system",
        status: "completed",
        confidence: 0.82,
        demo_mode: true
      },
      result_summary: "Identified 10 signals across 3 groups with 2 timeline phases",
      changes_from_previous: "Added device events signal group, improved timeline phase detection",
      performance_metrics: {
        duration_ms: 3800,
        token_count: 3200,
        confidence: 0.82
      }
    }
  ]
};

const criteriaDetailsData: Record<string, CriterionDetail[]> = {
  clabsi_demo_001: [
    {
      criterion_id: "criterion_1",
      criterion_text: "Central line in place for >2 calendar days before BSI",
      met: true,
      evidence: "Central line was placed on 2024-01-15 and blood culture was positive on 2024-01-20, which is 5 days (>2 calendar days) after insertion.",
      confidence: 0.98,
      source_signals: ["sig_001", "sig_003"],
      task_attribution: {
        task_id: "abstract_20240120_143000",
        task_type: "abstraction",
        prompt_version: "v1.0",
        mode: "interactive",
        executed_at: "2024-01-20T14:30:00Z",
        executed_by: "nurse.jane",
        status: "completed",
        demo_mode: true
      }
    },
    {
      criterion_id: "criterion_2",
      criterion_text: "Recognized pathogen identified from blood culture",
      met: true,
      evidence: "S. aureus was identified in blood cultures, which is a recognized bacterial pathogen per NHSN criteria.",
      confidence: 0.97,
      source_signals: ["sig_003"],
      task_attribution: {
        task_id: "abstract_20240120_143000",
        task_type: "abstraction",
        prompt_version: "v1.0",
        mode: "interactive",
        executed_at: "2024-01-20T14:30:00Z",
        executed_by: "nurse.jane",
        status: "completed",
        demo_mode: true
      }
    },
    {
      criterion_id: "criterion_3",
      criterion_text: "Organism not related to infection at another site",
      met: true,
      evidence: "Clinical review revealed no documented alternative sources including pneumonia, UTI, surgical site infections, or skin/soft tissue infections. The organism (S. aureus) in the bloodstream had no alternative documented source.",
      confidence: 0.84,
      source_signals: [],
      task_attribution: {
        task_id: "abstract_20240120_143000",
        task_type: "abstraction",
        prompt_version: "v1.0",
        mode: "interactive",
        executed_at: "2024-01-20T14:30:00Z",
        executed_by: "nurse.jane",
        status: "completed",
        demo_mode: true
      }
    }
  ]
};

export async function GET(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const caseId = params.caseId;
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const caseData = demoCases[caseId];
  
  if (!caseData) {
    return NextResponse.json(
      { error: 'Case not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json(caseData);
}
