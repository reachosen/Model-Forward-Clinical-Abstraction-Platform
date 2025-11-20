import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Badge } from '../ui/badge'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { TaskPrompt } from '../../api/promptStore'

interface TaskPromptsTabProps {
  prompts: Record<string, TaskPrompt>
  onChange: (updated: Record<string, TaskPrompt>) => void
}

export default function TaskPromptsTab({ prompts, onChange }: TaskPromptsTabProps) {
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set(Object.keys(prompts)))

  const toggleExpand = (key: string) => {
    const newExpanded = new Set(expandedPrompts)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedPrompts(newExpanded)
  }

  const handleTemplateChange = (key: string, newTemplate: string) => {
    onChange({
      ...prompts,
      [key]: { ...prompts[key], template: newTemplate }
    })
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Task Prompts (Workflows)</h3>
        <p className="text-sm text-muted-foreground">
          Define specific task instructions for data enrichment, rule evaluation, and other workflow steps.
        </p>
      </div>

      {Object.entries(prompts).map(([key, prompt]) => {
        const isExpanded = expandedPrompts.has(key)
        return (
          <Card key={key}>
            <CardHeader className="cursor-pointer" onClick={() => toggleExpand(key)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <CardTitle className="text-base font-mono">{key}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      Variables: {prompt.variables.map(v => (
                        <Badge key={v} variant="outline" className="text-xs font-mono">{`{{${v}}}`}</Badge>
                      ))}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor={`${key}-template`} className="text-sm font-medium">
                      Task Template
                    </Label>
                    <Textarea
                      id={`${key}-template`}
                      value={prompt.template}
                      onChange={(e) => handleTemplateChange(key, e.target.value)}
                      className="mt-2 font-mono text-sm min-h-[300px]"
                      placeholder="Enter task prompt template..."
                    />
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                    <strong>Tip:</strong> Use double curly braces for variables: {`{{variable_name}}`}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
