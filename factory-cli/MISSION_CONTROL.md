# Mission Control

> **9 core missions** for the Model-Forward Clinical Abstraction Factory

---

## Quick Start

```bash
# List all missions
npm run missions -- list

# Filter by factory owner
npm run missions -- list --owner Evals

# Show mission details
npm run missions -- show plan:scaffold

# Run with predefined example
npm run missions -- run ops:demo --example "Emily I32a"
```

---

## Factory Owners

| Owner | Prefix | Phase | Responsibility |
|-------|--------|-------|----------------|
| **Planning** | `plan:` | Inception | Seed configs & manifests for new metrics |
| **Evals** | `eval:` | Refinement | Battle-test & harden prompts |
| **Schema** | `schema:` | Materialization | Compile contracts & certify releases |
| **Ops** | `ops:` | Operations | Demo, validate & run campaigns |

---

## The 9 Core Missions

### Planning Factory (Inception)

| Mission | Purpose |
|---------|---------|
| `plan:scaffold` | Initialize a new domain workspace in the registry |
| `plan:generate` | Generate a plan.json manifest for a metric |

### Evals Factory (Refinement)

| Mission | Purpose |
|---------|---------|
| `eval:strategize` | Derive BatchStrategy from signal definitions |
| `eval:generate` | Generate test cases from BatchStrategy |
| `eval:refine` | Run the refinery loop to battle-test prompts |

### Schema Factory (Materialization)

| Mission | Purpose |
|---------|---------|
| `schema:synthesize` | Compile hydrated prompts into Zod validators |
| `schema:certify` | Freeze logic into versioned release in certified/ |

### Ops (Operations)

| Mission | Purpose |
|---------|---------|
| `ops:demo` | Run a clinical case through the full pipeline (Emily) |
| `ops:launch` | Launch a multi-metric campaign via Conductor |

---

## End-to-End Workflow

```
Planning                    Evals                           Schema
    │                         │                                │
plan:scaffold             eval:strategize                schema:synthesize
    │                         │                                │
plan:generate ──────────▶ eval:generate ──────────▶      schema:certify
                              │                                │
                          eval:refine ─────────────────────────┘
                         (HITL loop)
                              │
                              ▼
                           ops:demo ←── Validate with Emily case
                              │
                           ops:launch ←── Production campaigns
```

### Phase 1: Inception (Planning)
```bash
# Initialize workspace for new domain
npm run missions -- run plan:scaffold --example Cardiology

# Generate manifest
npm run missions -- run plan:generate --example "I25 Ortho"
```

### Phase 2: Refinement (Evals)
```bash
# Define test strategy
npm run missions -- run eval:strategize --example I25

# Generate test cases
npm run missions -- run eval:generate --example I25

# Battle test & refine (HITL loop)
npm run missions -- run eval:refine --example "Signal Enrichment"

# Edit prompts at: domains_registry/USNWR/{Domain}/_shared/prompts/*.md
```

### Phase 3: Materialization (Schema)
```bash
# Synthesize contracts
npm run missions -- run schema:synthesize --example "I32a Ortho"

# Certify release
npm run missions -- run schema:certify --example "I32a Ortho"
```

### Phase 4: Operations
```bash
# Validate with demo case
npm run missions -- run ops:demo --example "Emily I32a"

# Launch production campaign
npm run missions -- run ops:launch --example "USNWR Ortho 2025"
```

---

## CLI Reference

```
Mission Control - 9 Core Missions

Commands:
  list [--owner <owner>]      List missions (optionally filter by owner)
  show <id>                   Show mission details
  run <id> [--example <name>] Run a mission

Owners:
  Planning  Seed configs & manifests for new metrics (Inception)
  Evals     Battle-test & harden prompts (Refinement)
  Schema    Compile contracts & certify releases (Materialization)
  Ops       Demo, validate & run campaigns (Operations)
```

---

## File Structure

```
MissionControl/
├── browse-and-run.ts    # CLI for listing/running missions
├── mission-catalog.ts   # The 9 mission definitions
└── process-case.ts      # Pipeline executor for ops:demo
```

---

## Adding New Missions

Edit `MissionControl/mission-catalog.ts`:

```typescript
{
  id: 'owner:verb',           // e.g., 'eval:score'
  owner: 'Evals',             // Planning | Evals | Schema | Ops
  title: 'Short Title',
  purpose: 'One-line description',
  command: 'npx',
  args: ['ts-node', 'path/to/script.ts', '{{param}}'],
  examples: [
    { name: 'Example Name', args: ['ts-node', 'path/to/script.ts', 'value'] },
  ],
}
```

Convention: `{owner}:{verb}` where owner prefix matches the factory.
