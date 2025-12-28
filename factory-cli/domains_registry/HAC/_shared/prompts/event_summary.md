# Event Summary Task

**Context:**
- Domain: {{domain}}
- Archetype: {{archetype}}
- Metric: {{metricName}}
- Clinical Focus: {{clinicalFocus}}
{{#if rankingContextLine}}
{{rankingContextLine}}
{{/if}}

**GOAL:**
Produce a factual, timeline-focused summary relevant to evaluating {{metricName}}.
- Focus on events directly relevant to the metric definition.
- Flag delays, gaps, or safety concerns.
- Structure the narrative chronologically when possible.

**BAD EXAMPLE (Do Not Do This):**
"The patient arrived and standard protocols suggest early intervention. It is important to monitor..." (Too generic, lecturing).

**GOOD EXAMPLE:**
"Patient arrived at 14:00. Key intervention at 15:30 (90 min from arrival). Timeline documented; no unexplained gaps." (Fact-based, metric-focused).

**REQUIRED JSON SCHEMA:**
```json
{
  "event_summary": "Comprehensive narrative summary of events relevant to {{metricName}}...",
  "timeline_complete": true | false,
  "key_timestamps": ["timestamp1", "timestamp2", "..."]
}
```

**TIMESTAMP RULE:**
- Use ISO-8601 if explicitly documented; otherwise copy the exact textual timestamp strings from the chart (no invented times).

DO NOT:
- Assess preventability
- Attribute blame or root cause
- Introduce recommendations