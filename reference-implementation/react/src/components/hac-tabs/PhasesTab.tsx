import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '../ui/button';
import { useState } from 'react';
import type { HACPhaseConfig, PhaseName } from '../../types/hac-config';

interface PhasesTabProps {
  phases: HACPhaseConfig[];
  onChange: (updated: HACPhaseConfig[]) => void;
}

interface PhaseConfigPanelProps {
  phase: HACPhaseConfig;
  onChange: (updated: HACPhaseConfig) => void;
  enrichmentEnabled: boolean;
}

function PhaseConfigPanel({ phase, onChange, enrichmentEnabled }: PhaseConfigPanelProps) {
  const [newInput, setNewInput] = useState('');

  const getPhaseTitle = (name: PhaseName) => {
    switch (name) {
      case 'enrichment':
        return 'Enrichment Phase';
      case 'clinical_review':
        return 'Clinical Review Phase';
      case 'feedback':
        return 'Feedback Phase';
    }
  };

  const getPhaseDescription = (name: PhaseName) => {
    switch (name) {
      case 'enrichment':
        return 'Initial AI analysis to extract findings and signals from case data';
      case 'clinical_review':
        return 'Detailed review with 20/80 summary and suggested questions';
      case 'feedback':
        return 'Collect clinician feedback on the analysis';
    }
  };

  const handleAddInput = () => {
    if (!newInput.trim()) return;
    onChange({
      ...phase,
      required_inputs: [...phase.required_inputs, newInput.trim()],
    });
    setNewInput('');
  };

  const handleRemoveInput = (input: string) => {
    onChange({
      ...phase,
      required_inputs: phase.required_inputs.filter((i) => i !== input),
    });
  };

  const showAutoRunWarning = phase.phase_name === 'clinical_review' && phase.auto_run && !enrichmentEnabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getPhaseTitle(phase.phase_name)}</CardTitle>
        <CardDescription>{getPhaseDescription(phase.phase_name)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor={`${phase.phase_name}-enabled`}>Enable Phase</Label>
            <p className="text-xs text-muted-foreground">Show this phase in the Case View interface</p>
          </div>
          <Switch
            id={`${phase.phase_name}-enabled`}
            checked={phase.enabled}
            onCheckedChange={(enabled) => onChange({ ...phase, enabled })}
          />
        </div>

        {phase.enabled && (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor={`${phase.phase_name}-autorun`}>Auto-Run</Label>
                <p className="text-xs text-muted-foreground">Trigger LLM analysis automatically when tab opens</p>
              </div>
              <Switch
                id={`${phase.phase_name}-autorun`}
                checked={phase.auto_run}
                onCheckedChange={(auto_run) => onChange({ ...phase, auto_run })}
              />
            </div>

            {showAutoRunWarning && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Clinical Review auto-run requires Enrichment phase to be enabled</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor={`${phase.phase_name}-timeout`}>Timeout (ms)</Label>
              <Input
                id={`${phase.phase_name}-timeout`}
                type="number"
                value={phase.timeout_ms}
                onChange={(e) => onChange({ ...phase, timeout_ms: parseInt(e.target.value) || 0 })}
                min="1000"
                step="1000"
              />
              <p className="text-xs text-muted-foreground">Maximum time to wait for LLM response (default: 120000ms)</p>
            </div>

            <div className="space-y-2">
              <Label>Required Inputs</Label>
              <div className="flex flex-wrap gap-2">
                {phase.required_inputs.map((input) => (
                  <Badge key={input} variant="secondary" className="gap-1">
                    {input}
                    <button onClick={() => handleRemoveInput(input)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., patient_data, lab_results"
                  value={newInput}
                  onChange={(e) => setNewInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddInput()}
                />
                <Button onClick={handleAddInput} variant="outline" size="sm">
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Data requirements that must be present before this phase can run
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function PhasesTab({ phases, onChange }: PhasesTabProps) {
  const enrichmentPhase = phases.find((p) => p.phase_name === 'enrichment');
  const clinicalReviewPhase = phases.find((p) => p.phase_name === 'clinical_review');
  const feedbackPhase = phases.find((p) => p.phase_name === 'feedback');

  const handlePhaseChange = (updated: HACPhaseConfig) => {
    onChange(phases.map((p) => (p.phase_name === updated.phase_name ? updated : p)));
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Configure which phases are available and how they behave. If Enrichment is disabled, Clinical Review auto-run must be off.
        </AlertDescription>
      </Alert>

      {enrichmentPhase && (
        <PhaseConfigPanel phase={enrichmentPhase} onChange={handlePhaseChange} enrichmentEnabled={true} />
      )}

      {clinicalReviewPhase && (
        <PhaseConfigPanel
          phase={clinicalReviewPhase}
          onChange={handlePhaseChange}
          enrichmentEnabled={enrichmentPhase?.enabled || false}
        />
      )}

      {feedbackPhase && (
        <PhaseConfigPanel
          phase={feedbackPhase}
          onChange={handlePhaseChange}
          enrichmentEnabled={enrichmentPhase?.enabled || false}
        />
      )}
    </div>
  );
}
