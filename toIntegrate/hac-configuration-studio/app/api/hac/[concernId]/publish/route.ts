// Mock API route for publishing HAC config
import { NextResponse } from "next/server"
import type { HACConfig } from "@/lib/types/hac-config"

export async function POST(request: Request, { params }: { params: { concernId: string } }) {
  const { targetStatus } = await request.json()

  // In production, update database and trigger deployment
  const updatedConfig: Partial<HACConfig> = {
    definition: {
      hac_id: "1",
      concern_id: params.concernId,
      display_name: "Updated HAC",
      status: targetStatus,
      version: 2,
    },
  }

  return NextResponse.json(updatedConfig)
}
