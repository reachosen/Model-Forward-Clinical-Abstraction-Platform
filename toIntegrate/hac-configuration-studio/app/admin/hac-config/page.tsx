"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { HACSidebar } from "@/components/hac-sidebar"
import { NewHACDialog } from "@/components/new-hac-dialog"
import { listHACs, createHAC } from "@/lib/api/hac-config"
import type { HACDefinition } from "@/lib/types/hac-config"

export default function HACConfigIndexPage() {
  const router = useRouter()
  const [hacs, setHACs] = useState<HACDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewHACDialog, setShowNewHACDialog] = useState(false)

  useEffect(() => {
    listHACs()
      .then(setHACs)
      .finally(() => setLoading(false))
  }, [])

  const handleSelectHAC = (concernId: string) => {
    router.push(`/admin/hac-config/${concernId}`)
  }

  const handleCreateHAC = async (displayName: string, description: string) => {
    const newConfig = await createHAC(displayName, description)
    // Refresh HAC list
    const updatedHACs = await listHACs()
    setHACs(updatedHACs)
    // Navigate to the new HAC
    router.push(`/admin/hac-config/${newConfig.definition.concern_id}`)
  }

  const handleNewHAC = () => {
    setShowNewHACDialog(true)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading HACs...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <HACSidebar hacs={hacs} onSelectHAC={handleSelectHAC} onNewHAC={handleNewHAC} />
      <div className="flex flex-1 items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground">Select a HAC to Configure</h2>
          <p className="mt-2 text-muted-foreground">Choose a HAC from the sidebar or create a new one</p>
        </div>
      </div>
      <NewHACDialog open={showNewHACDialog} onOpenChange={setShowNewHACDialog} onCreateHAC={handleCreateHAC} />
    </div>
  )
}
