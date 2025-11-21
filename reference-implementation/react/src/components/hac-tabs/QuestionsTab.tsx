import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription } from '../ui/alert';
import { Info } from 'lucide-react';
import type { HACQuestionsConfig } from '../../types/hac-config';

interface QuestionsTabProps {
  config: HACQuestionsConfig;
  onChange: (updated: HACQuestionsConfig) => void;
}

type ScopeType = 'signal' | 'criterion' | 'timeline' | 'overall';

export function QuestionsTab({ config, onChange }: QuestionsTabProps) {
  const allScopes: ScopeType[] = ['signal', 'criterion', 'timeline', 'overall'];

  const handleScopeToggle = (scope: ScopeType, checked: boolean) => {
    const newScopes = checked ? [...config.allowed_scopes, scope] : config.allowed_scopes.filter((s) => s !== scope);
    onChange({ ...config, allowed_scopes: newScopes });
  };

  const handlePriorityChange = (level: 'high' | 'medium' | 'low', value: number) => {
    onChange({
      ...config,
      priority_distribution: {
        ...config.priority_distribution,
        [level]: value,
      },
    });
  };

  const totalPriority =
    config.priority_distribution.high + config.priority_distribution.medium + config.priority_distribution.low;

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Configure how suggested questions are generated in the Clinical Review phase. These questions help clinicians focus on key aspects of the case.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Generation Settings</CardTitle>
          <CardDescription>Control how questions are generated and displayed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="generation_mode">Generation Mode</Label>
            <Select
              value={config.generation_mode}
              onValueChange={(value: 'backend' | 'fallback' | 'hybrid') =>
                onChange({ ...config, generation_mode: value })
              }
            >
              <SelectTrigger id="generation_mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backend">Backend</SelectItem>
                <SelectItem value="fallback">Fallback</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Backend: AI-generated questions | Fallback: Template-based | Hybrid: Try AI, fallback to templates
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_questions">Maximum Questions</Label>
            <Input
              id="max_questions"
              type="number"
              min="1"
              max="10"
              value={config.max_questions}
              onChange={(e) => onChange({ ...config, max_questions: parseInt(e.target.value) || 1 })}
            />
            <p className="text-xs text-muted-foreground">Maximum number of questions to display per case (1-10)</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Question Scopes</CardTitle>
          <CardDescription>Select which types of questions can be generated</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {allScopes.map((scope) => (
              <div key={scope} className="flex items-start space-x-3">
                <Checkbox
                  id={`scope-${scope}`}
                  checked={config.allowed_scopes.includes(scope)}
                  onCheckedChange={(checked) => handleScopeToggle(scope, checked === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor={`scope-${scope}`} className="cursor-pointer font-medium capitalize">
                    {scope}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {scope === 'signal' && 'Questions about specific data signals and measurements'}
                    {scope === 'criterion' && 'Questions about diagnostic criteria and requirements'}
                    {scope === 'timeline' && 'Questions about temporal relationships and sequences'}
                    {scope === 'overall' && 'High-level questions about the case as a whole'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Priority Distribution</CardTitle>
          <CardDescription>
            How many questions of each priority level to generate (must sum ≤ max questions)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="priority_high">High Priority</Label>
            <Input
              id="priority_high"
              type="number"
              min="0"
              max={config.max_questions}
              value={config.priority_distribution.high}
              onChange={(e) => handlePriorityChange('high', parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority_medium">Medium Priority</Label>
            <Input
              id="priority_medium"
              type="number"
              min="0"
              max={config.max_questions}
              value={config.priority_distribution.medium}
              onChange={(e) => handlePriorityChange('medium', parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority_low">Low Priority</Label>
            <Input
              id="priority_low"
              type="number"
              min="0"
              max={config.max_questions}
              value={config.priority_distribution.low}
              onChange={(e) => handlePriorityChange('low', parseInt(e.target.value) || 0)}
            />
          </div>

          {totalPriority > config.max_questions && (
            <Alert variant="destructive">
              <AlertDescription>
                Total priority distribution ({totalPriority}) exceeds max questions ({config.max_questions})
              </AlertDescription>
            </Alert>
          )}

          {totalPriority <= config.max_questions && totalPriority > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Distribution: {totalPriority} of {config.max_questions} questions allocated
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fallback Templates</CardTitle>
          <CardDescription>
            JSON templates used when generation mode is 'fallback' or 'hybrid' (optional)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fallback_templates">Template JSON</Label>
            <Textarea
              id="fallback_templates"
              value={JSON.stringify(config.fallback_templates, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  onChange({ ...config, fallback_templates: parsed });
                } catch {
                  // Invalid JSON, don't update
                }
              }}
              rows={10}
              className="font-mono text-sm"
              placeholder='{\n  "signal": ["Template question 1", "Template question 2"],\n  "criterion": ["Template question 3"]\n}'
            />
            <p className="text-xs text-muted-foreground">
              Must be valid JSON. Used for UI fallback question generation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
