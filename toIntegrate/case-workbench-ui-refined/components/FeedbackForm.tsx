"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { ThumbsUp, ThumbsDown } from "lucide-react"

export function FeedbackForm() {
  const [feedback, setFeedback] = useState("")
  const [rating, setRating] = useState<"up" | "down" | null>(null)

  const handleSubmit = () => {
    console.log("Feedback submitted:", { rating, feedback })
    // TODO: Implement feedback submission
    setFeedback("")
    setRating(null)
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Rate this review</p>
          <div className="flex gap-3">
            <Button
              variant={rating === "up" ? "default" : "outline"}
              size="lg"
              onClick={() => setRating("up")}
              className="flex-1"
            >
              <ThumbsUp className="h-5 w-5 mr-2" />
              Helpful
            </Button>
            <Button
              variant={rating === "down" ? "default" : "outline"}
              size="lg"
              onClick={() => setRating("down")}
              className="flex-1"
            >
              <ThumbsDown className="h-5 w-5 mr-2" />
              Not Helpful
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Textarea
            id="feedback"
            placeholder="Share your thoughts on this case review..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
          />
        </div>

        <Button onClick={handleSubmit} disabled={!rating || !feedback.trim()} className="w-full">
          Submit Feedback
        </Button>
      </div>
    </Card>
  )
}
