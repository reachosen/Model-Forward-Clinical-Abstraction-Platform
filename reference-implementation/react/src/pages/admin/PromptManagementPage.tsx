import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Save, Eye, Rocket } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import VersionControlPanel from '../../components/admin/version-control-panel'
import SystemPromptsTab from '../../components/admin/system-prompts-tab'
import TaskPromptsTab from '../../components/admin/task-prompts-tab'
import OutputFormatsTab from '../../components/admin/output-formats-tab'
import { mockPromptVersions, mockPromptLibrary } from '../../api/promptStore'

const HACS = [
  { value: 'clabsi', label: 'CLABSI - Central Line-Associated Bloodstream Infection' },
  { value: 'cauti', label: 'CAUTI - Catheter-Associated Urinary Tract Infection' },
  { value: 'ssi', label: 'SSI - Surgical Site Infection' },
  { value: 'vae', label: 'VAE - Ventilator-Associated Event' },
  { value: 'cdiff', label: 'C.diff - Clostridioides difficile' },
]

const PROMPT_TYPES = [
  { value: 'system', label: 'System Prompts' },
  { value: 'task', label: 'Task Prompts' },
  { value: 'output', label: 'Output Formats' },
]

export default function PromptManagementPage() {
  const [selectedHAC, setSelectedHAC] = useState('clabsi')
  const [selectedPromptType, setSelectedPromptType] = useState('system')
  const [selectedVersion, setSelectedVersion] = useState('v1.1')
  const [promptLibrary, setPromptLibrary] = useState(mockPromptLibrary)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const currentVersionMetadata = mockPromptVersions.find(v => v.version === selectedVersion)
  const currentHAC = HACS.find(h => h.value === selectedHAC)

  const handleSaveDraft = () => {
    console.log('[v0] Saving draft:', {
      hac: selectedHAC,
      version: selectedVersion,
      promptLibrary
    })
    setHasUnsavedChanges(false)
    // In real implementation: API call to POST /v1/admin/prompts/:concernId/:version
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Prompt Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage LLM prompts for HAC surveillance
              </p>
            </div>
            <div className="flex items-center gap-2">
              {currentVersionMetadata?.status === 'ACTIVE' && (
                <Badge variant="default" className="gap-1">
                  <Rocket className="h-3 w-3" />
                  Deployed
                </Badge>
              )}
              {hasUnsavedChanges && (
                <Badge variant="destructive">Unsaved Changes</Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">HAC:</span>
              <Select value={selectedHAC} onValueChange={setSelectedHAC}>
                <SelectTrigger className="w-[400px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HACS.map((hac) => (
                    <SelectItem key={hac.value} value={hac.value}>
                      {hac.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Prompt Type:</span>
              <Select value={selectedPromptType} onValueChange={setSelectedPromptType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROMPT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Prompt Library Editor</CardTitle>
                    <CardDescription>
                      Edit prompts and schemas for {currentHAC?.label}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={handleSaveDraft}
                      disabled={!hasUnsavedChanges}
                    >
                      <Save className="h-4 w-4" />
                      Save Draft
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={selectedPromptType} onValueChange={setSelectedPromptType}>
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="system">System Prompts</TabsTrigger>
                    <TabsTrigger value="task">Task Prompts</TabsTrigger>
                    <TabsTrigger value="output">Output Formats</TabsTrigger>
                  </TabsList>
                  <TabsContent value="system" className="space-y-4">
                    <SystemPromptsTab
                      prompts={promptLibrary.system_prompts}
                      onChange={(updated) => {
                        setPromptLibrary({ ...promptLibrary, system_prompts: updated })
                        setHasUnsavedChanges(true)
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="task" className="space-y-4">
                    <TaskPromptsTab
                      prompts={promptLibrary.task_prompts}
                      onChange={(updated) => {
                        setPromptLibrary({ ...promptLibrary, task_prompts: updated })
                        setHasUnsavedChanges(true)
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="output" className="space-y-4">
                    <OutputFormatsTab
                      formats={promptLibrary.output_formats}
                      onChange={(updated) => {
                        setPromptLibrary({ ...promptLibrary, output_formats: updated })
                        setHasUnsavedChanges(true)
                      }}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sticky Sidebar - Version Control */}
          <div className="lg:col-span-1">
            <div className="sticky top-32">
              <VersionControlPanel
                concernId={selectedHAC}
                versions={mockPromptVersions}
                selectedVersion={selectedVersion}
                onVersionChange={setSelectedVersion}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
