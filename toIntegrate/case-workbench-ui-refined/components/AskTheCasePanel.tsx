"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Loader2, Send } from "lucide-react"
import { PromptViewer } from "./PromptViewer"

interface AskTheCasePanelProps {
  onAsk: (question: string) => Promise<void>
  isLoading: boolean
  value?: string
  onChange?: (value: string) => void
  promptContent?: string
}

export function AskTheCasePanel({
  onAsk,
  isLoading,
  value: externalValue,
  onChange: externalOnChange,
  promptContent,
}: AskTheCasePanelProps) {
  const [internalQuestion, setInternalQuestion] = useState("")

  const question = externalValue !== undefined ? externalValue : internalQuestion
  const setQuestion = externalOnChange || setInternalQuestion

  const handleSubmit = async () => {
    if (!question.trim()) return
    await onAsk(question)
    setQuestion("")
  }

  return (
    <Card className="p-8 border-2 bg-card shadow-sm">
      <div className="space-y-4">
        {promptContent && (
          <div className="flex justify-end">
            <PromptViewer promptContent={promptContent} label="prompt@play" />
          </div>
        )}

        <Textarea
          placeholder="Ask a question about this case..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={12}
          disabled={isLoading}
          className="resize-none text-base"
        />
        <Button onClick={handleSubmit} disabled={isLoading || !question.trim()} className="w-full h-11 text-base">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Send className="mr-2 h-5 w-5" />
              Ask Question
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
