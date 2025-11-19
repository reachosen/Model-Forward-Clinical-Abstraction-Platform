import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { Label } from '../ui/label'
import { Alert, AlertDescription } from '../ui/alert'
import { Rocket, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useToast } from '../../hooks/use-toast'

interface DeploymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  version: string
  concernId: string
}

export default function DeploymentModal({
  open,
  onOpenChange,
  version,
  concernId,
}: DeploymentModalProps) {
  const { toast } = useToast()
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>(['dev'])
  const [isDeploying, setIsDeploying] = useState(false)

  const environments = [
    { id: 'dev', name: 'Development', description: 'Testing environment' },
    { id: 'staging', name: 'Staging', description: 'Pre-production validation' },
    { id: 'production', name: 'Production', description: 'Live clinical use' },
  ]

  const handleEnvironmentToggle = (envId: string) => {
    setSelectedEnvironments((prev) =>
      prev.includes(envId)
        ? prev.filter((id) => id !== envId)
        : [...prev, envId]
    )
  }

  const handleDeploy = async () => {
    setIsDeploying(true)
    console.log('[v0] Deploying version:', { concernId, version, environments: selectedEnvironments })
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setIsDeploying(false)
    toast({
      title: 'Deployment Successful',
      description: `Version ${version} deployed to ${selectedEnvironments.join(', ')}`,
    })
    onOpenChange(false)
  }

  const hasProductionSelected = selectedEnvironments.includes('production')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Rocket className="h-5 w-5" />
            Deploy Version {version}
          </DialogTitle>
          <DialogDescription>
            Promote this version to active status in selected environments
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Environment Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Select Target Environments</Label>
            {environments.map((env) => (
              <div key={env.id} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                <Checkbox
                  id={env.id}
                  checked={selectedEnvironments.includes(env.id)}
                  onCheckedChange={() => handleEnvironmentToggle(env.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor={env.id} className="font-medium cursor-pointer">
                    {env.name}
                  </Label>
                  <p className="text-sm text-muted-foreground">{env.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Production Warning */}
          {hasProductionSelected && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> Deploying to production will immediately affect live clinical abstractions. 
                Ensure this version has been thoroughly tested in staging.
              </AlertDescription>
            </Alert>
          )}

          {/* Deployment Impact Summary */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Deployment Impact
            </h4>
            <ul className="text-sm space-y-1 text-muted-foreground ml-6">
              <li>• Current active version will be marked as DEPRECATED</li>
              <li>• This version will become the new ACTIVE version</li>
              <li>• All new abstractions will use this version immediately</li>
              <li>• Existing in-progress cases will continue with their current version</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeploying}>
            Cancel
          </Button>
          <Button
            onClick={handleDeploy}
            disabled={selectedEnvironments.length === 0 || isDeploying}
            className="gap-2"
          >
            <Rocket className="h-4 w-4" />
            {isDeploying ? 'Deploying...' : 'Deploy Version'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
