import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { Info } from 'lucide-react';
import type { HACDefinition } from '../../types/hac-config';

interface BasicsTabProps {
  definition: HACDefinition;
  onChange: (updated: HACDefinition) => void;
}

export function BasicsTab({ definition, onChange }: BasicsTabProps) {
  const isNewHAC = definition.concern_id.startsWith('new-hac-');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>HAC Identity</CardTitle>
          <CardDescription>Basic information about this Healthcare-Associated Condition configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="concern_id">
              Concern ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="concern_id"
              value={definition.concern_id}
              onChange={(e) => onChange({ ...definition, concern_id: e.target.value.toLowerCase().replace(/\s/g, '') })}
              disabled={!isNewHAC}
              placeholder="e.g., clabsi, vap, cauti"
              className={!isNewHAC ? 'bg-muted' : ''}
            />
            <p className="text-xs text-muted-foreground">
              {isNewHAC
                ? 'Unique identifier (lowercase, no spaces). Cannot be changed after creation.'
                : 'Concern ID cannot be changed after creation'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name">
              Display Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="display_name"
              value={definition.display_name}
              onChange={(e) => onChange({ ...definition, display_name: e.target.value })}
              placeholder="e.g., Central Line–Associated Bloodstream Infection"
            />
            <p className="text-xs text-muted-foreground">Human-readable name shown in the UI</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={definition.description || ''}
              onChange={(e) => onChange({ ...definition, description: e.target.value })}
              placeholder="Longer explanation of this HAC configuration..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Optional detailed description for documentation purposes</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Input value={definition.status} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Managed via Preview & Publish tab</p>
            </div>

            <div className="space-y-2">
              <Label>Version</Label>
              <Input value={definition.version} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Auto-incremented on publish</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Save your changes frequently. The configuration will not take effect until you publish it from the Preview tab.
        </AlertDescription>
      </Alert>
    </div>
  );
}
