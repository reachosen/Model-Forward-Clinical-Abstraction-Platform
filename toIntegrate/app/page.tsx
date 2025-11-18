import { FeedbackForm } from "@/components/feedback-form"

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Medical Case Review Feedback
          </h1>
          <p className="text-muted-foreground">
            Provide your feedback on the case review
          </p>
        </div>
        <FeedbackForm />
      </div>
    </main>
  )
}
