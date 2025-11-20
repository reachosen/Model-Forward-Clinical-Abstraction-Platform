/**
 * PromptEditor - Form component for editing prompt versions
 */

import React, { useState } from 'react';
import { PromptVersion, TaskDefinition } from '../../types';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Label } from '../ui/Label';
import './PromptEditor.css';

interface PromptEditorProps {
  version: PromptVersion;
  task: TaskDefinition;
  onSave: (updates: {
    system_prompt: string;
    task_specific_additions?: string;
    changelog: string;
    status: 'stable' | 'experimental' | 'deprecated';
  }) => Promise<void>;
  onCancel: () => void;
}

export function PromptEditor({ version, task, onSave, onCancel }: PromptEditorProps) {
  const [systemPrompt, setSystemPrompt] = useState(version.system_prompt);
  const [taskSpecificAdditions, setTaskSpecificAdditions] = useState(version.task_specific_additions || '');
  const [changelog, setChangelog] = useState(version.changelog);
  const [status, setStatus] = useState<'stable' | 'experimental' | 'deprecated'>(version.status);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!systemPrompt.trim()) {
      newErrors.systemPrompt = 'System prompt is required';
    }

    if (!changelog.trim()) {
      newErrors.changelog = 'Changelog is required to document changes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      await onSave({
        system_prompt: systemPrompt,
        task_specific_additions: taskSpecificAdditions || undefined,
        changelog,
        status
      });
    } catch (error) {
      console.error('Failed to save prompt version:', error);
      setErrors({ save: 'Failed to save changes. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="prompt-editor">
      <div className="prompt-editor-header">
        <h2>Edit Prompt Version</h2>
        <p className="prompt-editor-subtitle">
          {task.task_id} - {version.version_id}
        </p>
      </div>

      <div className="prompt-editor-form">
        {errors.save && (
          <div className="error-message">{errors.save}</div>
        )}

        <div className="form-group">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'stable' | 'experimental' | 'deprecated')}
            className="status-select"
          >
            <option value="stable">Stable</option>
            <option value="experimental">Experimental</option>
            <option value="deprecated">Deprecated</option>
          </select>
        </div>

        <div className="form-group">
          <Label htmlFor="systemPrompt">System Prompt</Label>
          {errors.systemPrompt && (
            <span className="field-error">{errors.systemPrompt}</span>
          )}
          <Textarea
            id="systemPrompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={12}
            placeholder="Enter the system prompt that defines the AI's role and domain knowledge..."
            className={errors.systemPrompt ? 'error' : ''}
          />
          <span className="field-hint">
            {systemPrompt.length} characters
          </span>
        </div>

        <div className="form-group">
          <Label htmlFor="taskSpecificAdditions">Task-Specific Instructions (Optional)</Label>
          <Textarea
            id="taskSpecificAdditions"
            value={taskSpecificAdditions}
            onChange={(e) => setTaskSpecificAdditions(e.target.value)}
            rows={8}
            placeholder="Enter task-specific instructions and requirements..."
          />
          <span className="field-hint">
            {taskSpecificAdditions.length} characters
          </span>
        </div>

        <div className="form-group">
          <Label htmlFor="changelog">Changelog</Label>
          {errors.changelog && (
            <span className="field-error">{errors.changelog}</span>
          )}
          <Textarea
            id="changelog"
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            rows={4}
            placeholder="Describe what changed in this version..."
            className={errors.changelog ? 'error' : ''}
          />
          <span className="field-hint">
            Document all changes made to this version
          </span>
        </div>
      </div>

      <div className="prompt-editor-footer">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant="default" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
