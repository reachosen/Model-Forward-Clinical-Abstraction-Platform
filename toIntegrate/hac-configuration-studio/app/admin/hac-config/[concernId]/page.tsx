"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { HACSidebar } from "@/components/hac-sidebar"
import { HACHeader } from "@/components/hac-header"
import { BasicsTab } from "@/components/hac-tabs/basics-tab"
import { PromptsTab } from "@/components/hac-tabs/prompts-tab"
import { PhasesTab } from "@/components/hac-tabs/phases-tab"
import { TwentyEightyTab } from "@/components/hac-tabs/twenty-eighty-tab"
import { QuestionsTab } from "@/components/hac-tabs/questions-tab"
import { MappingsTab } from "@/components/hac-tabs/mappings-tab"
import { PreviewTab } from "@/components/hac-tabs/preview-tab"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { listHACs } from "@/lib/api/hac-config"
import { useHACConfig } from "@/hooks/use-hac-config"
import type {
  HACDefinition,
  HACTaskPrompt,
  HACPhaseConfig,
  HAC2080Config,
  HACQuestionsConfig,
  HACFieldMapping,
} from "@/lib/types/hac-config"

interface HACConfigPageProps {
  params: {
    concernId: string
  }
}

export default function HACConfigPage({ params }: HACConfigPageProps) {
  const router = useRouter()
  const [hacs, setHACs] = useState<HACDefinition[]>([])
  const { config, loading, saveConfig, setConfig, runPreview, publish } = useHACConfig(params.concernId)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("basics")

  useEffect(() => {
    listHACs().then(setHACs)
  }, [])

  const handleSelectHAC = (concernId: string) => {
    router.push(`/admin/hac-config/${concernId}`)
  }

  const handleNewHAC = () => {
    const newConcernId = `new-hac-${Date.now()}`
    router.push(`/admin/hac-config/${newConcernId}`)
  }

  const handleSave = async () => {
    if (!config) return
    setIsSaving(true)
    try {
      await saveConfig(config)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDefinitionChange = (updated: HACDefinition) => {
    if (!config) return
    setConfig({ ...config, definition: updated })
  }

  const handlePromptsChange = (updated: HACTaskPrompt[]) => {
    if (!config) return
    setConfig({ ...config, prompts: updated })
  }

  const handlePhasesChange = (updated: HACPhaseConfig[]) => {
    if (!config) return
    setConfig({ ...config, phases: updated })
  }

  const handle2080Change = (updated: HAC2080Config) => {
    if (!config) return
    setConfig({ ...config, config2080: updated })
  }

  const handleQuestionsChange = (updated: HACQuestionsConfig) => {
    if (!config) return
    setConfig({ ...config, questions: updated })
  }

  const handleMappingsChange = (updated: HACFieldMapping[]) => {
    if (!config) return
    setConfig({ ...config, fieldMappings: updated })
  }

  const handlePreview = async (sampleCaseId: string) => {
    await runPreview(sampleCaseId)
  }

  const handlePublish = async (targetStatus: "active" | "archived") => {
    await publish(targetStatus)
  }

  if (loading) {
    return (
      <div className="flex h-screen">
        <HACSidebar
          hacs={hacs}
          selectedConcernId={params.concernId}
          onSelectHAC={handleSelectHAC}
          onNewHAC={handleNewHAC}
        />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-muted-foreground">Loading configuration...</div>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="flex h-screen">
        <HACSidebar
          hacs={hacs}
          selectedConcernId={params.concernId}
          onSelectHAC={handleSelectHAC}
          onNewHAC={handleNewHAC}
        />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-foreground">HAC Not Found</h2>
            <p className="mt-2 text-muted-foreground">The requested HAC configuration could not be loaded</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <HACSidebar
        hacs={hacs}
        selectedConcernId={params.concernId}
        onSelectHAC={handleSelectHAC}
        onNewHAC={handleNewHAC}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <HACHeader definition={config.definition} onSave={handleSave} isSaving={isSaving} />

        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6 grid w-full grid-cols-7">
                <TabsTrigger value="basics">Basics</TabsTrigger>
                <TabsTrigger value="prompts">Prompts</TabsTrigger>
                <TabsTrigger value="phases">Phases</TabsTrigger>
                <TabsTrigger value="2080">20/80</TabsTrigger>
                <TabsTrigger value="questions">Questions</TabsTrigger>
                <TabsTrigger value="mappings">Mappings</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="basics">
                <BasicsTab definition={config.definition} onChange={handleDefinitionChange} />
              </TabsContent>

              <TabsContent value="prompts">
                <PromptsTab prompts={config.prompts} onChange={handlePromptsChange} />
              </TabsContent>

              <TabsContent value="phases">
                <PhasesTab phases={config.phases} onChange={handlePhasesChange} />
              </TabsContent>

              <TabsContent value="2080">
                <TwentyEightyTab config={config.config2080} onChange={handle2080Change} />
              </TabsContent>

              <TabsContent value="questions">
                <QuestionsTab config={config.questions} onChange={handleQuestionsChange} />
              </TabsContent>

              <TabsContent value="mappings">
                <MappingsTab mappings={config.fieldMappings} onChange={handleMappingsChange} />
              </TabsContent>

              <TabsContent value="preview">
                <PreviewTab config={config} onPreview={handlePreview} onPublish={handlePublish} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
