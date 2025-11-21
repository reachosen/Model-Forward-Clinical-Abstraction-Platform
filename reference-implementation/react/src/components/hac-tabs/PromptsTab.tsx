import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Alert, AlertDescription } from '../ui/alert';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import type { HACTaskPrompt } from '../../types/hac-config';

interface PromptsTabProps {
  prompts: HACTaskPrompt[];
  onChange: (updated: HACTaskPrompt[]) => void;
}

interface PromptEditorProps {
  promptType: 'system' | 'enrichment' | 'clinical_review';
  prompts: HACTaskPrompt[];
  onChange: (updated: HACTaskPrompt[]) => void;
}

function PromptEditor({ promptType, prompts, onChange }: PromptEditorProps) {
  const [showCopied, setShowCopied] = useState(false);

  const promptsOfType = prompts.filter((p) => p.prompt_type === promptType);
  const activePrompt = promptsOfType.find((p) => p.is_active) || promptsOfType[0];

  const getStatusColor = (status: HACTaskPrompt['status']) => {
    switch (status) {
      case 'stable':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'experimental':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'draft':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'deprecated':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
    }
  };

  const handleContentChange = (content: string) => {
    if (!activePrompt) return;
    const updated = prompts.map((p) => (p.prompt_id === activePrompt.prompt_id ? { ...p, content } : p));
    onChange(updated);
  };

  const handleVersionChange = (promptId: string) => {
    const updated = prompts.map((p) => ({
      ...p,
      is_active: p.prompt_id === promptId && p.prompt_type === promptType,
    }));
    onChange(updated);
  };

  const handleDuplicate = () => {
    if (!activePrompt) return;
    const newPrompt: HACTaskPrompt = {
      ...activePrompt,
      prompt_id: `${promptType}-${Date.now()}`,
      version: `${parseInt(activePrompt.version.split('.')[0]) + 1}.0.0`,
      status: 'draft',
      is_active: false,
    };
    onChange([...prompts, newPrompt]);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const getPromptTitle = (type: string) => {
    switch (type) {
      case 'system':
        return 'System Prompt';
      case 'enrichment':
        return 'Enrichment Prompt';
      case 'clinical_review':
        return 'Clinical Review Prompt';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{getPromptTitle(promptType)}</CardTitle>
            <CardDescription>Configure the {promptType} prompt for this HAC</CardDescription>
          </div>
          {activePrompt && (
            <Badge variant="outline" className={getStatusColor(activePrompt.status)}>
              {activePrompt.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activePrompt ? (
          <>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Version</label>
                <Select value={activePrompt.prompt_id} onValueChange={handleVersionChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {promptsOfType.map((prompt) => (
                      <SelectItem key={prompt.prompt_id} value={prompt.prompt_id}>
                        v{prompt.version} {prompt.is_active ? '(Active)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-6">
                <Button onClick={handleDuplicate} variant="outline" size="sm">
                  {showCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {showCopied ? 'Duplicated' : 'Duplicate'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prompt Content</label>
              <Textarea
                value={activePrompt.content}
                onChange={(e) => handleContentChange(e.target.value)}
                rows={12}
                className="font-mono text-sm"
                placeholder="Enter your prompt here..."
              />
              <p className="text-xs text-muted-foreground">
                Available variables: {'{{'}patient_data{'}}'},  {'{{'}lab_results{'}}'},  {'{{'}clinical_context{'}}'}
              </p>
            </div>
          </>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No prompt configured. Click Duplicate to create one.</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export function PromptsTab({ prompts, onChange }: PromptsTabProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Prompts define how the AI analyzes cases for this HAC. Each prompt type serves a different purpose in the pipeline.
        </AlertDescription>
      </Alert>

      <PromptEditor promptType="system" prompts={prompts} onChange={onChange} />
      <PromptEditor promptType="enrichment" prompts={prompts} onChange={onChange} />
      <PromptEditor promptType="clinical_review" prompts={prompts} onChange={onChange} />
    </div>
  );
}
