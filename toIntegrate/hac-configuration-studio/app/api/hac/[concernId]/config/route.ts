// Mock API route for HAC config operations
import { NextResponse } from "next/server"
import type { HACConfig } from "@/lib/types/hac-config"

let hacStore: Map<string, HACConfig>

// Dynamic import to avoid circular dependencies
async function getStore() {
  if (!hacStore) {
    const module = await import("../../route")
    hacStore = module.hacStore
  }
  return hacStore
}

export async function GET(request: Request, { params }: { params: { concernId: string } }) {
  const { concernId } = params
  const store = await getStore()

  const config = store.get(concernId)

  if (!config) {
    return NextResponse.json({ error: "HAC not found" }, { status: 404 })
  }

  return NextResponse.json(config)
}

export async function PUT(request: Request, { params }: { params: { concernId: string } }) {
  const { concernId } = params
  const config = (await request.json()) as HACConfig
  const store = await getStore()

  store.set(concernId, config)

  return NextResponse.json(config)
}
