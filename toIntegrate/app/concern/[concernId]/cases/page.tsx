"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CaseCard } from "@/components/case-card";
import { ArrowLeft, Filter, Search } from 'lucide-react';
import Link from "next/link";
import type { CaseSummary } from "@/types/case";

// Mock data - replace with actual API calls
const mockCases: Record<string, CaseSummary[]> = {
  clabsi: [
    {
      case_id: "clabsi_demo_001",
      concern_id: "clabsi",
      patient_summary: "68M with central line, Day 5 S. aureus bacteremia",
      latest_task_state: {
        stage: "abstraction",
        status: "completed",
        version: "v1.0",
        timestamp: "2024-01-20T14:30:00Z"
      },
      risk_level: "high",
      flags: ["DEMO"]
    },
    {
      case_id: "clabsi_002",
      concern_id: "clabsi",
      patient_summary: "45F with PICC line, positive blood culture Day 3",
      latest_task_state: {
        stage: "enrichment",
        status: "completed",
        version: "v1.0",
        timestamp: "2024-01-19T10:00:00Z"
      },
      risk_level: "medium"
    },
    {
      case_id: "clabsi_003",
      concern_id: "clabsi",
      patient_summary: "72M ICU patient, suspected line infection",
      latest_task_state: {
        stage: "enrichment",
        status: "in_progress",
        version: "v1.0",
        timestamp: "2024-01-21T08:00:00Z"
      },
      risk_level: "high"
    }
  ],
  cauti: [
    {
      case_id: "cauti_demo_001",
      concern_id: "cauti",
      patient_summary: "55F with Foley catheter, UTI symptoms Day 4",
      latest_task_state: {
        stage: "abstraction",
        status: "completed",
        version: "v1.0",
        timestamp: "2024-01-18T16:00:00Z"
      },
      risk_level: "medium",
      flags: ["DEMO"]
    }
  ],
  ssi: [
    {
      case_id: "ssi_demo_001",
      concern_id: "ssi",
      patient_summary: "62M post-op cardiac surgery, wound complications",
      latest_task_state: {
        stage: "abstraction",
        status: "completed",
        version: "v1.0",
        timestamp: "2024-01-17T12:00:00Z"
      },
      risk_level: "high",
      flags: ["DEMO"]
    }
  ]
};

const concernNames: Record<string, string> = {
  clabsi: "CLABSI",
  cauti: "CAUTI",
  ssi: "SSI"
};

export default function CaseListPage({ params }: { params: { concernId: string } }) {
  const [taskStateFilter, setTaskStateFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const cases = mockCases[params.concernId] || [];
  const concernName = concernNames[params.concernId] || params.concernId.toUpperCase();

  // Apply filters
  const filteredCases = cases.filter((caseItem) => {
    // Task state filter
    if (taskStateFilter !== "all" && caseItem.latest_task_state.stage !== taskStateFilter) {
      return false;
    }

    // Risk filter
    if (riskFilter !== "all" && caseItem.risk_level !== riskFilter) {
      return false;
    }

    // Search filter
    if (searchQuery && !caseItem.patient_summary.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    return true;
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{concernName} Cases</h1>
          <p className="text-sm text-muted-foreground">
            {filteredCases.length} {filteredCases.length === 1 ? 'case' : 'cases'} found
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <Select value={taskStateFilter} onValueChange={setTaskStateFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Task State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            <SelectItem value="context">Context Ready</SelectItem>
            <SelectItem value="enrichment">Enriched</SelectItem>
            <SelectItem value="abstraction">Abstracted</SelectItem>
            <SelectItem value="feedback">Complete</SelectItem>
          </SelectContent>
        </Select>

        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Risk Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risks</SelectItem>
            <SelectItem value="high">High Risk</SelectItem>
            <SelectItem value="medium">Medium Risk</SelectItem>
            <SelectItem value="low">Low Risk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Case Grid */}
      {filteredCases.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No cases found matching your filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCases.map((caseItem) => (
            <CaseCard key={caseItem.case_id} caseSummary={caseItem} />
          ))}
        </div>
      )}
    </div>
  );
}
