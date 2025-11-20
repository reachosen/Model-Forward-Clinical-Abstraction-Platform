import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Label } from '../ui/Label'
import { Textarea } from '../ui/Textarea'
import { Badge } from '../ui/Badge'
import { ChevronDown, ChevronRight, CheckCircle2, XCircle } from 'lucide-react'
import type { OutputFormat } from '../../api/promptStore'

interface OutputFormatsTabProps {
  formats: Record<string, OutputFormat>
  onChange: (updated: Record<string, OutputFormat>) => void
}

export default function OutputFormatsTab({ formats, onChange }: OutputFormatsTabProps) {
  const [expandedFormats, setExpandedFormats] = useState<Set<string>>(new Set(Object.keys(formats)))
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const toggleExpand = (key: string) => {
    const newExpanded = new Set(expandedFormats)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedFormats(newExpanded)
  }

  const handleSchemaChange = (key: string, newSchemaText: string) => {
    try {
      const parsedSchema = JSON.parse(newSchemaText)
      onChange({
        ...formats,
        [key]: { ...formats[key], schema: parsedSchema }
      })
      // Clear validation error
      const newErrors = { ...validationErrors }
      delete newErrors[key]
      setValidationErrors(newErrors)
    } catch (error) {
      // Store validation error
      setValidationErrors({
        ...validationErrors,
        [key]: error instanceof Error ? error.message : 'Invalid JSON'
      })
    }
  }

  const handleTemplateChange = (key: string, newTemplate: string) => {
    onChange({
      ...formats,
      [key]: { ...formats[key], template: newTemplate }
    })
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Output Formats (Schemas)</h3>
        <p className="text-sm text-muted-foreground">
          Define JSON schemas that enforce structured output from the LLM. These schemas ensure consistency and enable automated validation.
        </p>
      </div>

      {Object.entries(formats).map(([key, format]) => {
        const isExpanded = expandedFormats.has(key)
        const hasError = validationErrors[key]
        const isValid = !hasError

        return (
          <Card key={key} className={hasError ? 'border-destructive' : ''}>
            <CardHeader className="cursor-pointer" onClick={() => toggleExpand(key)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <CardTitle className="text-base font-mono flex items-center gap-2">
                      {key}
                      {isValid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {format.template}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={isValid ? 'default' : 'destructive'}>
                  {isValid ? 'Valid JSON' : 'Invalid'}
                </Badge>
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor={`${key}-template`} className="text-sm font-medium">
                      Description
                    </Label>
                    <Textarea
                      id={`${key}-template`}
                      value={format.template}
                      onChange={(e) => handleTemplateChange(key, e.target.value)}
                      className="mt-2 text-sm"
                      rows={2}
                      placeholder="Brief description of this output format..."
                    />
                  </div>

                  <div>
                    <Label htmlFor={`${key}-schema`} className="text-sm font-medium">
                      JSON Schema
                    </Label>
                    <Textarea
                      id={`${key}-schema`}
                      value={JSON.stringify(format.schema, null, 2)}
                      onChange={(e) => handleSchemaChange(key, e.target.value)}
                      className="mt-2 font-mono text-sm min-h-[400px]"
                      placeholder="Enter JSON schema..."
                    />
                    {hasError && (
                      <p className="text-sm text-destructive mt-2 flex items-center gap-1">
                        <XCircle className="h-4 w-4" />
                        {hasError}
                      </p>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                    <strong>Tip:</strong> Use JSON Schema Draft 7 format. The schema defines the structure and validation rules for LLM output.
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
