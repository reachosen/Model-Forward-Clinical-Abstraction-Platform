import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConcernCard } from "@/components/concern-card";
import { ArrowRight, Beaker } from 'lucide-react';
import type { ConcernInfo } from "@/types/case";

const concerns: ConcernInfo[] = [
  {
    concern_id: "clabsi",
    concern_name: "CLABSI",
    description: "Central Line-Associated Bloodstream Infection",
    demo_case_id: "clabsi_demo_001"
  },
  {
    concern_id: "cauti",
    concern_name: "CAUTI",
    description: "Catheter-Associated Urinary Tract Infection",
    demo_case_id: "cauti_demo_001"
  },
  {
    concern_id: "ssi",
    concern_name: "SSI",
    description: "Surgical Site Infection",
    demo_case_id: "ssi_demo_001"
  }
];

export default function HomePage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">CA Factory</h1>
        <p className="text-lg text-muted-foreground">
          Clinical Abstraction Pipeline for Healthcare-Associated Infections
        </p>
      </div>

      {/* Quick Start Demo */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5" />
            Quick Start
          </CardTitle>
          <CardDescription>
            Try the interactive CLABSI demo case to see the full pipeline in action
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/case/clabsi_demo_001">
            <Button size="lg" className="w-full sm:w-auto">
              Start with CLABSI Demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Concern Selection */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Select a Concern</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {concerns.map((concern) => (
            <ConcernCard key={concern.concern_id} concern={concern} />
          ))}
        </div>
      </div>
    </div>
  );
}
