"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, FileText } from "lucide-react"
import { Card } from "@/components/ui/card"

interface PromptViewerProps {
  promptContent: string
  label?: string
}

export function PromptViewer({ promptContent, label = "prompt@play" }: PromptViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
      >
        <FileText className="h-3 w-3" />
        {label}
        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {isExpanded && (
        <Card className="p-4 bg-muted/50 border">
          <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground leading-relaxed">
            {promptContent}
          </pre>
        </Card>
      )}
    </div>
  )
}
