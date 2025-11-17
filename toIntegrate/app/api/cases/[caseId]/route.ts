import { NextRequest, NextResponse } from 'next/server';
import type { StructuredCase } from '@/types/case';

// Mock demo case data - replace with actual database/API calls
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
        task_id: "clabsi.enrichment",
        task_type: "enrichment",
        prompt_version: "v1.0",
        mode: "batch",
        executed_at: "2024-01-20T10:00:00Z",
        executed_by: "system",
        status: "completed",
        confidence: 0.89,
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
      signal_groups: [],
      timeline_phases: []
    },
    abstraction: {
      task_metadata: {
        task_id: "clabsi.abstraction",
        task_type: "abstraction",
        prompt_version: "v1.0",
        mode: "interactive",
        executed_at: "2024-01-20T14:30:00Z",
        executed_by: "nurse.jane",
        status: "completed",
        confidence: 0.92,
        demo_mode: true
      },
      narrative: "68-year-old male patient with central line placement on admission to ICU. Developed S. aureus bacteremia on Day 5 post-insertion. Clinical presentation consistent with CLABSI criteria with no alternative infection source identified.",
      criteria_evaluation: {
        determination: "CLABSI_CONFIRMED",
        confidence: 0.92,
        criteria_met: {},
        criteria_total: 5,
        criteria_met_count: 5
      },
      qa_history: [],
      exclusion_analysis: []
    }
  }
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
