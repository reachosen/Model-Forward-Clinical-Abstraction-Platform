// Mock API route for HAC preview
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: { concernId: string } }) {
  const { sampleCaseId } = await request.json()

  // Mock preview response - replace with actual pipeline execution
  const mockPreviewCase = {
    case_id: sampleCaseId,
    patient_name: "John Doe",
    concern_type: params.concernId,
    enrichment_results: {
      findings: ["Central line present for >48 hours", "Positive blood culture"],
      confidence: 0.85,
    },
    clinical_review: {
      status: "pending",
    },
  }

  return NextResponse.json({ previewCase: mockPreviewCase })
}
