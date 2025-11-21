import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/Separator';
import { CheckCircle2, XCircle, Play, Upload, Archive, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { HACConfig } from '../../types/hac-config';

interface PreviewTabProps {
  config: HACConfig;
  onPreview: (sampleCaseId: string) => Promise<void>;
  onPublish: (targetStatus: 'active' | 'archived') => Promise<void>;
}

export function PreviewTab({ config, onPreview, onPublish }: PreviewTabProps) {
  const [sampleCaseId, setSampleCaseId] = useState('demo-case-001');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [publishLoading, setPublishLoading] = useState(false);

  const handleRunPreview = async () => {
    if (!sampleCaseId) return;
    setPreviewLoading(true);
    try {
      await onPreview(sampleCaseId);
      // In a real implementation, this would return preview data
      setPreviewData({
        case_id: sampleCaseId,
        concern_type: config.definition.concern_id,
        patient_name: 'John Doe',
        status: 'success',
      });
    } catch (error) {
      console.error('Preview failed:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePublish = async (targetStatus: 'active' | 'archived') => {
    setPublishLoading(true);
    try {
      await onPublish(targetStatus);
    } finally {
      setPublishLoading(false);
    }
  };

  const validation = validateConfig(config);
  const canPublish = validation.every((v) => v.valid);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left Panel - Config Summary & Controls */}
      <div className="space-y-6">
        {/* Config Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration Summary</CardTitle>
            <CardDescription>Current state of HAC configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">HAC Name</span>
                <span className="text-sm text-muted-foreground">{config.definition.display_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Concern ID</span>
                <span className="font-mono text-sm text-muted-foreground">{config.definition.concern_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <Badge variant={config.definition.status === 'active' ? 'default' : 'secondary'}>
                  {config.definition.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Version</span>
                <span className="text-sm text-muted-foreground">{config.definition.version}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Validation Checks</h4>
              {validation.map((check, index) => (
                <div key={index} className="flex items-start gap-2">
                  {check.valid ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 text-destructive" />
                  )}
                  <div className="flex-1">
                    <p className={cn('text-sm', check.valid ? 'text-foreground' : 'text-destructive')}>{check.label}</p>
                    {!check.valid && check.message && <p className="text-xs text-muted-foreground">{check.message}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Preview Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Preview Configuration</CardTitle>
            <CardDescription>Test the HAC pipeline on a sample case</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sample_case_id">Sample Case ID</Label>
              <Input
                id="sample_case_id"
                value={sampleCaseId}
                onChange={(e) => setSampleCaseId(e.target.value)}
                placeholder="e.g., demo-case-001"
              />
              <p className="text-xs text-muted-foreground">
                Enter a case ID to preview how this HAC config will process it
              </p>
            </div>

            <Button onClick={handleRunPreview} disabled={!sampleCaseId || previewLoading} className="w-full">
              <Play className="mr-2 h-4 w-4" />
              {previewLoading ? 'Running Preview...' : 'Run Preview'}
            </Button>

            {previewData && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>Preview completed successfully for case {previewData.case_id}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Publish Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Publish Configuration</CardTitle>
            <CardDescription>Make this HAC config live or archive it</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canPublish && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Cannot publish: Fix all validation errors first</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              {config.definition.status !== 'active' && (
                <Button
                  onClick={() => handlePublish('active')}
                  disabled={!canPublish || publishLoading}
                  className="w-full"
                  variant="default"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {publishLoading ? 'Publishing...' : 'Publish as Active'}
                </Button>
              )}

              {config.definition.status === 'active' && (
                <Button
                  onClick={() => handlePublish('archived')}
                  disabled={publishLoading}
                  className="w-full"
                  variant="outline"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  {publishLoading ? 'Archiving...' : 'Archive HAC'}
                </Button>
              )}
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Publishing will increment the version number and make this config live in the Case Workbench.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Preview */}
      <div className="space-y-6">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Case Preview</CardTitle>
            <CardDescription>
              {previewData ? 'Live preview of processed case' : 'Run a preview to see results'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {previewData ? (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>Preview - Not Live</AlertDescription>
                </Alert>

                <div className="rounded-lg border border-border bg-muted/50 p-6">
                  <h3 className="mb-4 text-lg font-semibold">Case: {previewData.case_id}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Patient:</span>
                      <span className="font-medium">{previewData.patient_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Concern:</span>
                      <span className="font-medium">{previewData.concern_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="default">{previewData.status}</Badge>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-3">
                    <h4 className="font-medium">Enrichment Results</h4>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>• Finding 1: Sample enrichment data</p>
                      <p>• Finding 2: Sample signal detection</p>
                      <p>• Confidence: 85%</p>
                    </div>
                  </div>

                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This is a simulated preview. In production, this would show the actual Case View rendered with your configuration.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border">
                <div className="text-center">
                  <Play className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Run a preview to see how this HAC will behave</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface ValidationCheck {
  label: string;
  valid: boolean;
  message?: string;
}

function validateConfig(config: HACConfig): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  // Check prompts
  const activeSystemPrompt = config.prompts.find((p) => p.prompt_type === 'system' && p.is_active);
  const activeEnrichmentPrompt = config.prompts.find((p) => p.prompt_type === 'enrichment' && p.is_active);
  const activeClinicalPrompt = config.prompts.find((p) => p.prompt_type === 'clinical_review' && p.is_active);

  checks.push({
    label: 'Active System Prompt',
    valid: !!activeSystemPrompt,
    message: !activeSystemPrompt ? 'At least one system prompt must be active' : undefined,
  });

  checks.push({
    label: 'Active Enrichment Prompt',
    valid: !!activeEnrichmentPrompt,
    message: !activeEnrichmentPrompt ? 'At least one enrichment prompt must be active' : undefined,
  });

  checks.push({
    label: 'Active Clinical Review Prompt',
    valid: !!activeClinicalPrompt,
    message: !activeClinicalPrompt ? 'At least one clinical review prompt must be active' : undefined,
  });

  // Check phases
  const enrichmentPhase = config.phases.find((p) => p.phase_name === 'enrichment');
  const clinicalPhase = config.phases.find((p) => p.phase_name === 'clinical_review');

  const phasesValid = !clinicalPhase?.auto_run || !!(clinicalPhase.auto_run && enrichmentPhase?.enabled);

  checks.push({
    label: 'Phase Configuration Valid',
    valid: phasesValid,
    message: !phasesValid ? 'Clinical Review auto-run requires Enrichment to be enabled' : undefined,
  });

  // Check 20/80 config
  const config2080Valid =
    config.config2080.max_findings >= 1 &&
    config.config2080.max_findings <= 10 &&
    config.config2080.min_confidence >= 0.5 &&
    config.config2080.min_confidence <= 0.95;

  checks.push({
    label: '20/80 Config Valid',
    valid: config2080Valid,
    message: !config2080Valid ? 'Max findings must be 1-10, confidence 0.5-0.95' : undefined,
  });

  // Check questions
  const totalPriority =
    config.questions.priority_distribution.high +
    config.questions.priority_distribution.medium +
    config.questions.priority_distribution.low;
  const questionsValid =
    config.questions.max_questions >= 1 &&
    config.questions.max_questions <= 10 &&
    totalPriority <= config.questions.max_questions;

  checks.push({
    label: 'Questions Config Valid',
    valid: questionsValid,
    message: !questionsValid ? 'Max questions 1-10, priority distribution must not exceed max' : undefined,
  });

  // Check field mappings
  const hasCriterionMappings = config.fieldMappings.some((m) => m.mapping_type === 'criterion');

  checks.push({
    label: 'Field Mappings Present',
    valid: hasCriterionMappings,
    message: !hasCriterionMappings ? 'At least one criterion mapping is recommended' : undefined,
  });

  return checks;
}
