# Summary 20/80 Task

Your job is to generate a "20/80 Summary" — the 20% of clinically meaningful facts
that explain 80% of the case for evaluating: {{metricName}}.

**STRICT RULES:**
- Use ONLY the patient_payload as factual source.
- No guessing, no clinical advice, no guidelines.
- No commentary on quality of care, workflows, or protocols.
- No abstract teaching statements.
- No invented timestamps, conditions, or events.
- Everything must map to real patient_payload elements.
- If something is not documented, omit it.
- provider_summary must restate facts only; no opinions, judgments, or recommendations.

**BAD VS GOOD EXAMPLES:**

BAD EXAMPLE (Do NOT write like this):
"Patients with fractures typically require rapid surgical intervention, and delays
may increase complications. It is important to monitor swelling."

Why bad:
- Generic teaching
- Not specific to the chart
- Not tied to metric thresholds

GOOD EXAMPLE (This is the style you MUST follow):
"Key events and timestamps that define metric evaluation.
Focus on signal groups: {{signalGroupIds}}."

Why good:
- Purely structural
- Metric-focused
- No fabricated patient facts
- Uses signal groups relevant to {{metricName}}

**GOAL:**
Produce:
- patient_summary: factual, timeline-focused (what happened).
- provider_summary: what matters most for quality, safety, and metric risk.

Use only the 20% of facts that drive 80% of insight.
Do not invent data or recommend policy.

{{#if rankingContextLine}}
{{rankingContextLine}}
{{/if}}

**REQUIRED JSON SCHEMA:**
```json
{
  "patient_summary": "...",
  "provider_summary": "..."
}
```
