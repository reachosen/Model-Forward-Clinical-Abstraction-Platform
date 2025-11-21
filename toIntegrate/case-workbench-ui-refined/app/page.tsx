import Link from "next/link"
import { Card } from "@/components/ui/card"
import { redirect } from "next/navigation"

export default function HomePage() {
  redirect("/case/demo-001")

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Case Workbench</h1>
          <p className="text-lg text-muted-foreground">Clinical case review and enrichment platform</p>
        </div>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Demo Cases</h2>
          <div className="space-y-3">
            <Link
              href="/case/demo-001"
              className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
            >
              <div className="mb-1 font-medium">Case #DEMO-001</div>
              <div className="text-sm text-muted-foreground">Patient with chest pain and shortness of breath</div>
            </Link>

            <Link
              href="/case/demo-002"
              className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
            >
              <div className="mb-1 font-medium">Case #DEMO-002</div>
              <div className="text-sm text-muted-foreground">Follow-up case for chronic condition management</div>
            </Link>
          </div>
        </Card>
      </div>
    </main>
  )
}
