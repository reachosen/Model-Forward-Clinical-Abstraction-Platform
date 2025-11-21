// Mock API route for listing and creating HACs
import { NextResponse } from "next/server"
import type { HACDefinition, HACConfig } from "@/lib/types/hac-config"

const hacStore = new Map<string, HACConfig>()

// Initialize with mock data
const initialHACs: HACDefinition[] = [
  {
    hac_id: "1",
    concern_id: "clabsi",
    display_name: "Central Line–Associated Bloodstream Infection",
    description: "Configuration for CLABSI detection and analysis",
    status: "active",
    version: 1,
  },
  {
    hac_id: "2",
    concern_id: "cauti",
    display_name: "Catheter-Associated Urinary Tract Infection",
    description: "Configuration for CAUTI detection and analysis",
    status: "draft",
    version: 1,
  },
  {
    hac_id: "3",
    concern_id: "ssi",
    display_name: "Surgical Site Infection",
    description: "Configuration for SSI detection and analysis",
    status: "draft",
    version: 1,
  },
  {
    hac_id: "4",
    concern_id: "vap",
    display_name: "Ventilator-Associated Pneumonia",
    description: "Configuration for VAP detection and analysis",
    status: "active",
    version: 2,
  },
]

// Initialize store with all initial HAC configs
initialHACs.forEach((definition) => {
  if (!hacStore.has(definition.concern_id)) {
    hacStore.set(definition.concern_id, {
      definition,
      prompts:
        definition.concern_id === "clabsi"
          ? [
              {
                prompt_id: "p1",
                prompt_type: "system",
                version: "1.0.0",
                content: "You are a medical expert analyzing central line infections...",
                status: "stable",
                is_active: true,
              },
            ]
          : [],
      phases: [
        {
          phase_name: "enrichment",
          enabled: true,
          auto_run: true,
          timeout_ms: 120000,
          required_inputs: definition.concern_id === "clabsi" ? ["patient_data", "lab_results"] : [],
        },
        {
          phase_name: "clinical_review",
          enabled: false,
          auto_run: false,
          timeout_ms: 120000,
          required_inputs: [],
        },
        {
          phase_name: "feedback",
          enabled: false,
          auto_run: false,
          timeout_ms: 60000,
          required_inputs: [],
        },
      ],
      config2080: {
        max_findings: 5,
        preferred_signal_types: definition.concern_id === "clabsi" ? ["DEVICE", "LAB"] : [],
        min_confidence: 0.7,
        signal_weighting: definition.concern_id === "clabsi" ? { DEVICE: 1.2, LAB: 1.0, VITAL: 0.8 } : {},
        extraction_strategy: "hybrid",
      },
      questions: {
        generation_mode: "backend",
        max_questions: 5,
        allowed_scopes: ["signal", "criterion", "timeline", "overall"],
        priority_distribution: { high: 2, medium: 2, low: 1 },
        fallback_templates: {},
      },
      fieldMappings: [],
    })
  }
})

export async function GET() {
  // Return list of HAC definitions
  const definitions = Array.from(hacStore.values()).map((config) => config.definition)
  // Include any HACs that don't have full configs yet
  const allDefinitions = [...initialHACs.filter((def) => !hacStore.has(def.concern_id)), ...definitions]
  return NextResponse.json(allDefinitions)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { display_name, description } = body

  // Generate a unique concern_id from display name
  const concern_id = display_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")

  // Create default configuration
  const newConfig: HACConfig = {
    definition: {
      hac_id: `hac_${Date.now()}`,
      concern_id,
      display_name,
      description: description || "",
      status: "draft",
      version: 1,
    },
    prompts: [],
    phases: [
      {
        phase_name: "enrichment",
        enabled: true,
        auto_run: true,
        timeout_ms: 120000,
        required_inputs: [],
      },
      {
        phase_name: "clinical_review",
        enabled: false,
        auto_run: false,
        timeout_ms: 120000,
        required_inputs: [],
      },
      {
        phase_name: "feedback",
        enabled: false,
        auto_run: false,
        timeout_ms: 60000,
        required_inputs: [],
      },
    ],
    config2080: {
      max_findings: 5,
      preferred_signal_types: [],
      min_confidence: 0.7,
      signal_weighting: {},
      extraction_strategy: "hybrid",
    },
    questions: {
      generation_mode: "backend",
      max_questions: 5,
      allowed_scopes: ["signal", "criterion", "timeline", "overall"],
      priority_distribution: { high: 2, medium: 2, low: 1 },
      fallback_templates: {},
    },
    fieldMappings: [],
  }

  // Store the new configuration
  hacStore.set(concern_id, newConfig)

  return NextResponse.json(newConfig)
}

export { hacStore }
