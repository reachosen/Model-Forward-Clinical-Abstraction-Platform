import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { GitCompare, Plus, Minus, Equal } from 'lucide-react'
import type { PromptVersionMetadata } from '../../api/promptStore'

interface ComparisonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  versions: PromptVersionMetadata[]
  currentVersion: string
}

export default function ComparisonModal({
  open,
  onOpenChange,
  versions,
  currentVersion,
}: ComparisonModalProps) {
  const [compareVersion, setCompareVersion] = useState(
    versions.find(v => v.version !== currentVersion)?.version || ''
  )

  const currentVersionData = versions.find(v => v.version === currentVersion)
  const compareVersionData = versions.find(v => v.version === compareVersion)

  // Mock diff data - in real implementation, this would come from API
  const diffSummary = {
    system_prompts: { added: 0, modified: 1, removed: 0 },
    task_prompts: { added: 1, modified: 1, removed: 0 },
    output_formats: { added: 0, modified: 0, removed: 0 },
  }

  const mockDiff = {
    system_prompts: [
      {
        key: 'clinical_expert',
        status: 'modified' as const,
        oldContent: 'You are a clinical expert...\n(previous version content)',
        newContent: 'You are a clinical expert specializing in infection prevention...\n(new version content)',
      },
    ],
    task_prompts: [
      {
        key: 'enrichment_prompt',
        status: 'modified' as const,
        oldContent: 'Review the following patient record...',
        newContent: 'Review the following patient record excerpt and extract...',
      },
      {
        key: 'validation_prompt',
        status: 'added' as const,
        oldContent: '',
        newContent: 'Validate the extracted data for completeness...',
      },
    ],
  }

  const getStatusIcon = (status: 'added' | 'modified' | 'removed') => {
    switch (status) {
      case 'added':
        return <Plus className="h-4 w-4 text-green-500" />
      case 'modified':
        return <Equal className="h-4 w-4 text-blue-500" />
      case 'removed':
        return <Minus className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusBadge = (status: 'added' | 'modified' | 'removed') => {
    const variants = {
      added: 'default',
      modified: 'secondary',
      removed: 'destructive',
    } as const
    return (
      <Badge variant={variants[status]} className="gap-1">
        {getStatusIcon(status)}
        {status}
      </Badge>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <GitCompare className="h-5 w-5" />
            Version Comparison
          </DialogTitle>
          <DialogDescription>
            Compare prompt differences between versions
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Base Version */}
          <div>
            <Label className="text-sm font-medium">Base Version</Label>
            <div className="mt-2 p-3 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold">{currentVersion}</span>
                {currentVersionData && (
                  <Badge variant={currentVersionData.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {currentVersionData.status}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Compare Version */}
          <div>
            <Label className="text-sm font-medium">Compare With</Label>
            <Select value={compareVersion} onValueChange={setCompareVersion}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {versions
                  .filter(v => v.version !== currentVersion)
                  .map((version) => (
                    <SelectItem key={version.version} value={version.version}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{version.version}</span>
                        <Badge variant="secondary" className="text-xs">
                          {version.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Diff Summary */}
        {compareVersion && (
          <>
            <div className="grid grid-cols-3 gap-3 pb-4">
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">System Prompts</div>
                <div className="flex gap-2 text-xs">
                  <span className="text-green-500">+{diffSummary.system_prompts.added}</span>
                  <span className="text-blue-500">~{diffSummary.system_prompts.modified}</span>
                  <span className="text-red-500">-{diffSummary.system_prompts.removed}</span>
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Task Prompts</div>
                <div className="flex gap-2 text-xs">
                  <span className="text-green-500">+{diffSummary.task_prompts.added}</span>
                  <span className="text-blue-500">~{diffSummary.task_prompts.modified}</span>
                  <span className="text-red-500">-{diffSummary.task_prompts.removed}</span>
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Output Formats</div>
                <div className="flex gap-2 text-xs">
                  <span className="text-green-500">+{diffSummary.output_formats.added}</span>
                  <span className="text-blue-500">~{diffSummary.output_formats.modified}</span>
                  <span className="text-red-500">-{diffSummary.output_formats.removed}</span>
                </div>
              </div>
            </div>

            {/* Detailed Diff */}
            <div className="flex-1 overflow-auto border rounded-lg">
              <Tabs defaultValue="system" className="h-full">
                <TabsList className="w-full justify-start rounded-none border-b bg-muted/50">
                  <TabsTrigger value="system">System Prompts</TabsTrigger>
                  <TabsTrigger value="task">Task Prompts</TabsTrigger>
                  <TabsTrigger value="output">Output Formats</TabsTrigger>
                </TabsList>
                <TabsContent value="system" className="p-4 space-y-4">
                  {mockDiff.system_prompts.map((diff) => (
                    <div key={diff.key} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 p-3 flex items-center justify-between">
                        <span className="font-mono text-sm font-semibold">{diff.key}</span>
                        {getStatusBadge(diff.status)}
                      </div>
                      <div className="grid grid-cols-2 divide-x text-sm">
                        <div className="p-3 bg-red-50/50 dark:bg-red-950/20">
                          <div className="text-xs text-muted-foreground mb-2">{currentVersion}</div>
                          <pre className="text-xs whitespace-pre-wrap font-mono">{diff.oldContent || '(empty)'}</pre>
                        </div>
                        <div className="p-3 bg-green-50/50 dark:bg-green-950/20">
                          <div className="text-xs text-muted-foreground mb-2">{compareVersion}</div>
                          <pre className="text-xs whitespace-pre-wrap font-mono">{diff.newContent}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="task" className="p-4 space-y-4">
                  {mockDiff.task_prompts.map((diff) => (
                    <div key={diff.key} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 p-3 flex items-center justify-between">
                        <span className="font-mono text-sm font-semibold">{diff.key}</span>
                        {getStatusBadge(diff.status)}
                      </div>
                      <div className="grid grid-cols-2 divide-x text-sm">
                        <div className="p-3 bg-red-50/50 dark:bg-red-950/20">
                          <div className="text-xs text-muted-foreground mb-2">{currentVersion}</div>
                          <pre className="text-xs whitespace-pre-wrap font-mono">{diff.oldContent || '(empty)'}</pre>
                        </div>
                        <div className="p-3 bg-green-50/50 dark:bg-green-950/20">
                          <div className="text-xs text-muted-foreground mb-2">{compareVersion}</div>
                          <pre className="text-xs whitespace-pre-wrap font-mono">{diff.newContent}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="output" className="p-4">
                  <div className="text-center text-muted-foreground py-8">
                    No changes in output formats
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
