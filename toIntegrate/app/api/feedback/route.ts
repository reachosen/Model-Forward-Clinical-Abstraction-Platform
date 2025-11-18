import { NextRequest, NextResponse } from "next/server"

interface FeedbackRequest {
  caseId: string
  reviewerId: string
  sentiment: "positive" | "negative"
  comments: string
  timestamp: string
}

export async function POST(request: NextRequest) {
  try {
    const body: FeedbackRequest = await request.json()

    if (!body.sentiment || !body.comments) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    if (body.sentiment !== "positive" && body.sentiment !== "negative") {
      return NextResponse.json(
        { error: "Invalid sentiment value" },
        { status: 400 }
      )
    }

    const feedbackData = {
      ...body,
      caseId: "AUTO_GENERATED_CASE_ID", // Will be replaced with actual logic
      reviewerId: "AUTO_GENERATED_REVIEWER_ID", // Will be replaced with actual logic
    }

    console.log("[v0] Feedback received:", JSON.stringify(feedbackData, null, 2))

    // TODO: Save to database with auto-generated caseId and reviewerId
    // await db.feedback.create({ data: feedbackData })

    return NextResponse.json(
      { 
        success: true, 
        message: "Feedback submitted successfully",
        feedbackId: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[v0] Error processing feedback:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
