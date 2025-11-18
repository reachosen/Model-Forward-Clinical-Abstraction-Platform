"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { ThumbsUp, ThumbsDown } from 'lucide-react'

interface FeedbackFormData {
  sentiment: "positive" | "negative" | null
  comments: string
}

export function FeedbackForm() {
  const { toast } = useToast()
  const [formData, setFormData] = useState<FeedbackFormData>({
    sentiment: null,
    comments: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSentimentChange = (sentiment: "positive" | "negative") => {
    setFormData({
      ...formData,
      sentiment,
    })
  }

  const validateForm = (): string | null => {
    if (!formData.sentiment) return "Please select thumbs up or thumbs down"
    if (!formData.comments.trim()) return "Please provide your comments"
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sentiment: formData.sentiment,
          comments: formData.comments,
          timestamp: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit feedback")
      }

      toast({
        title: "Success",
        description: "Feedback submitted successfully",
      })

      // Reset form
      setFormData({
        sentiment: null,
        comments: "",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Case Review Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Thumbs Up/Down Selection */}
            <div className="space-y-3">
              <Label>How would you rate this case review?</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={formData.sentiment === "positive" ? "default" : "outline"}
                  size="default"
                  onClick={() => handleSentimentChange("positive")}
                  className="flex-1 h-12"
                >
                  <ThumbsUp className="mr-2 h-5 w-5" />
                  Thumbs Up
                </Button>
                <Button
                  type="button"
                  variant={formData.sentiment === "negative" ? "default" : "outline"}
                  size="default"
                  onClick={() => handleSentimentChange("negative")}
                  className="flex-1 h-12"
                >
                  <ThumbsDown className="mr-2 h-5 w-5" />
                  Thumbs Down
                </Button>
              </div>
            </div>

            {/* Comments Text Area */}
            <div className="space-y-2">
              <Label htmlFor="comments">Your Comments</Label>
              <Textarea
                id="comments"
                placeholder="Please share your feedback about this case review"
                value={formData.comments}
                onChange={(e) =>
                  setFormData({ ...formData, comments: e.target.value })
                }
                rows={12}
                className="resize-none"
              />
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Toaster />
    </>
  )
}
