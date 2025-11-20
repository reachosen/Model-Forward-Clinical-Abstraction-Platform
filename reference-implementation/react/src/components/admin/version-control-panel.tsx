import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { GitBranch, Plus, Rocket, GitCompare, Archive } from 'lucide-react'
import type { PromptVersionMetadata } from '../../api/promptStore'
import { useToast } from '../../hooks/use-toast'
import DeploymentModal from './deployment-modal'
import ComparisonModal from './comparison-modal'

interface VersionControlPanelProps {
  concernId: string
  versions: PromptVersionMetadata[]
  selectedVersion: string
  onVersionChange: (version: string) => void
}

export default function VersionControlPanel({
  concernId,
  versions,
  selectedVersion,
  onVersionChange,
}: VersionControlPanelProps) {
  const { toast } = useToast()
  const [showDeploymentModal, setShowDeploymentModal] = useState(false)
  const [showComparisonModal, setShowComparisonModal] = useState(false)

  const currentVersion = versions.find(v => v.version === selectedVersion)
  const activeVersion = versions.find(v => v.status === 'ACTIVE')

  const handleCreateDraft = () => {
    console.log('[v0] Creating new draft version')
    // API call would happen here
    toast({
      title: 'Draft Created',
      description: `New draft version created from ${selectedVersion}`,
    })
  }

  const handleDeprecate = () => {
    console.log('[v0] Deprecating version:', selectedVersion)
    toast({
      title: 'Version Deprecated',
      description: `Version ${selectedVersion} has been deprecated`,
      variant: 'destructive',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'default'
      case 'DRAFT':
        return 'secondary'
      case 'EXPERIMENTAL':
        return 'outline'
      case 'DEPRECATED':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Version Control
          </CardTitle>
          <CardDescription>Manage prompt versions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Version Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Version</label>
            <Select value={selectedVersion} onValueChange={onVersionChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {versions.map((version) => (
                  <SelectItem key={version.version} value={version.version}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{version.version}</span>
                      <Badge variant={getStatusColor(version.status)} className="text-xs">
                        {version.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Version Info */}
          {currentVersion && (
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={getStatusColor(currentVersion.status)}>
                  {currentVersion.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Created:</span>
                <span className="text-xs">
                  {new Date(currentVersion.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Created By:</span>
                <span className="text-xs truncate max-w-[140px]" title={currentVersion.created_by}>
                  {currentVersion.created_by}
                </span>
              </div>
              {currentVersion.published_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Published:</span>
                  <span className="text-xs">
                    {new Date(currentVersion.published_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              {currentVersion.active_in_environments.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Active In:</span>
                  <div className="flex flex-wrap gap-1">
                    {currentVersion.active_in_environments.map((env) => (
                      <Badge key={env} variant="outline" className="text-xs">
                        {env}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-3 border-t">
            <Button
              className="w-full gap-2"
              variant="outline"
              onClick={handleCreateDraft}
            >
              <Plus className="h-4 w-4" />
              New Draft Version
            </Button>

            {currentVersion?.status === 'DRAFT' && (
              <Button
                className="w-full gap-2"
                onClick={() => setShowDeploymentModal(true)}
              >
                <Rocket className="h-4 w-4" />
                Deploy Version
              </Button>
            )}

            <Button
              className="w-full gap-2"
              variant="outline"
              onClick={() => setShowComparisonModal(true)}
              disabled={versions.length < 2}
            >
              <GitCompare className="h-4 w-4" />
              Compare Versions
            </Button>

            {currentVersion?.status !== 'DEPRECATED' && currentVersion?.status !== 'ACTIVE' && (
              <Button
                className="w-full gap-2"
                variant="destructive"
                onClick={handleDeprecate}
              >
                <Archive className="h-4 w-4" />
                Deprecate Version
              </Button>
            )}
          </div>

          {/* Active Version Info */}
          {activeVersion && activeVersion.version !== selectedVersion && (
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-2">Currently Deployed:</p>
              <div className="flex items-center justify-between bg-primary/5 p-2 rounded-md">
                <span className="text-sm font-mono">{activeVersion.version}</span>
                <Badge variant="default" className="text-xs">ACTIVE</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DeploymentModal
        open={showDeploymentModal}
        onOpenChange={setShowDeploymentModal}
        version={selectedVersion}
        concernId={concernId}
      />

      <ComparisonModal
        open={showComparisonModal}
        onOpenChange={setShowComparisonModal}
        versions={versions}
        currentVersion={selectedVersion}
      />
    </>
  )
}
