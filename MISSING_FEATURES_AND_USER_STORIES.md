# Missing Features & User Stories
## Model-Forward Clinical Abstraction Platform

**Date:** 2025-11-15
**Status:** Gap Analysis & Implementation Roadmap

---

## Executive Summary

The current reference implementation has the **foundational architecture** in place but is missing **critical interactive and trust-building features** that transform it from a static report viewer to an intelligent clinical assistant.

**Current State:**
- ✅ Basic 3-column layout with patient overview, timeline, signals, QA, feedback
- ✅ Python agents (data agent, abstraction agent) with stub data
- ✅ REST API with CORS support
- ✅ React TypeScript UI with routing
- ✅ Hardcoded for CLABSI domain

**Missing (High Priority):**
- ❌ 80/20 Summary Strip (quick overview)
- ❌ Signal Groups with drill-down
- ❌ Evidence linking (signal → underlying events)
- ❌ Follow-Up Questions Panel
- ❌ "Ask the Case" LLM interaction
- ❌ Payload/Context Explorer
- ❌ Domain configuration system (template approach)
- ❌ Q&A status tracking

---

## Gap Analysis by Component

### 1. **Case Detail Page**
**Current:** Basic 3-column grid, hardcoded labels
**Missing:**
- 80/20 summary strip at top
- Domain-agnostic configuration
- Payload inspector toggle
- "Ask the Case" panel

### 2. **Signals Panel**
**Current:** Flat list grouped only by severity (CRITICAL/WARNING/INFO)
**Missing:**
- Configurable signal groups (Device, Labs, Clinical, Rules)
- Expand/collapse per group
- "View Evidence" link per signal
- Evidence drawer/modal component

### 3. **Follow-Up Questions**
**Current:** Shows `unresolved_questions` in summary only
**Missing:**
- Dedicated Follow-Up Questions panel
- Q&A status tracking (answered/unanswered)
- Clinician response capture
- Q&A completion percentage
- Link questions to signals/evidence

### 4. **LLM Interaction**
**Current:** None
**Missing:**
- "Ask the Case" conversational interface
- Query scoped to current case payload
- Evidence citations in responses
- Conversation history per case
- Backend API endpoint for queries

### 5. **Evidence & Transparency**
**Current:** No drill-down capability
**Missing:**
- Evidence data model (linking signals to events/labs/notes)
- Evidence drawer component
- Payload inspector (debug view of GOLD_AI JSON)
- Rule evaluation → evidence linking

### 6. **Domain Configuration**
**Current:** Hardcoded "CLABSI" everywhere
**Missing:**
- DomainConfig type and provider
- Configurable labels, phases, signal groups
- Template system for new domains
- Example configs for CLABSI, CAUTI, SSI

### 7. **Backend APIs**
**Current:** Basic CRUD endpoints
**Missing:**
- `POST /api/cases/{id}/ask` - LLM query endpoint
- `GET /api/cases/{id}/evidence/{signal_id}` - Evidence retrieval
- `GET /api/cases/{id}/payload` - Full payload view
- `POST /api/cases/{id}/questions/{q_id}/answer` - Answer follow-up question
- `GET /api/domains/{domain}/config` - Domain configuration

---

## User Stories by Epic

---

## **EPIC 1: 80/20 Summary Strip**
**Goal:** Give clinicians a fast overview before diving into details

### Story 1.1: Display Case Summary Strip
**As a** clinical abstractor
**I want** to see a compact summary at the top of the case page
**So that** I can quickly assess risk, determination, and critical signals before reviewing details

**Acceptance Criteria:**
- [ ] Summary strip appears at top of case detail page, above 3-column layout
- [ ] Shows risk level badge with color coding (LOW=green, MODERATE=yellow, HIGH=orange, CRITICAL=red)
- [ ] Shows primary determination (e.g., "Likely CLABSI - 85% confidence")
- [ ] Shows episode status (POTENTIAL / CONFIRMED / RULED_OUT)
- [ ] Shows top 2-3 critical signals as chips/badges
- [ ] Shows Q&A completion status (e.g., "4/5 questions answered")
- [ ] Responsive design - stacks vertically on mobile
- [ ] Uses domain-agnostic labels from config

**Technical Notes:**
- Component: `<CaseSummaryStrip />`
- Props: `summary`, `signals`, `qaStatus`, `domainConfig`
- Extract top signals by severity and confidence
- Calculate Q&A completion from follow-up questions

**Effort:** 3-5 days
**Priority:** HIGH

---

## **EPIC 2: Signal Groups & Evidence Linking**
**Goal:** Organize signals logically and enable drill-down to evidence

### Story 2.1: Group Signals by Category
**As a** clinical abstractor
**I want** signals organized into logical groups (Device, Labs, Clinical, Rules)
**So that** I can quickly find relevant information by type

**Acceptance Criteria:**
- [ ] Signals grouped by `signal_type` or `category` field
- [ ] Each group shows count badge (e.g., "Laboratory Signals (4)")
- [ ] Groups are collapsible/expandable (accordion style)
- [ ] All groups expanded by default
- [ ] Empty groups hidden
- [ ] Groups configurable via domain config
- [ ] Maintains severity color coding within groups

**Technical Notes:**
- Update `Signal` interface to include `category` field
- Component: `<SignalsPanel />` with grouped accordion
- Use domain config for group definitions
- Add expand/collapse state management

**Effort:** 2-3 days
**Priority:** HIGH

---

### Story 2.2: Link Signals to Evidence
**As a** clinical abstractor
**I want** to click "View Evidence" on a signal
**So that** I can see the underlying events, labs, or notes that triggered it

**Acceptance Criteria:**
- [ ] Each signal shows "View Evidence" link/button
- [ ] Click opens evidence drawer (side panel)
- [ ] Evidence drawer shows:
  - Evidence type (LAB, EVENT, NOTE, DEVICE)
  - Timestamp
  - Description
  - Source system
  - Raw data (if available)
- [ ] Evidence items grouped by type
- [ ] Drawer closable via X button or overlay click
- [ ] Multiple evidence items per signal supported
- [ ] No evidence = show "No evidence linked" message

**Technical Notes:**
- New interface: `Evidence`
- Update `Signal` to include `evidence_refs: string[]`
- Component: `<EvidenceDrawer />`
- Backend: `GET /api/cases/{id}/evidence/{signal_id}`
- Update stub data to include evidence linking

**Effort:** 5-7 days
**Priority:** HIGH

---

## **EPIC 3: Follow-Up Questions Panel**
**Goal:** Guide abstractors through required clinical clarifications

### Story 3.1: Display Follow-Up Questions
**As a** clinical abstractor
**I want** to see AI-generated follow-up questions
**So that** I know what additional information is needed for this case

**Acceptance Criteria:**
- [ ] New panel in right column: "Follow-Up Questions"
- [ ] Shows list of questions with status badges (ANSWERED / UNANSWERED / PENDING)
- [ ] Each question shows:
  - Question text
  - Category (Clinical, Temporal, Contextual)
  - Required indicator (if mandatory)
  - Linked signals (if applicable)
- [ ] Questions ordered by priority (required first)
- [ ] Empty state: "No follow-up questions for this case"
- [ ] Q&A summary at top: "3/5 answered" with progress bar

**Technical Notes:**
- New interface: `FollowUpQuestion`
- Component: `<FollowUpQuestionsPanel />`
- Update `CaseView` to include `followup_questions: FollowUpQuestion[]`
- Add `qa_status: QAStatus` to CaseView
- Update stub data with sample questions

**Effort:** 3-4 days
**Priority:** HIGH

---

### Story 3.2: Answer Follow-Up Questions
**As a** clinical abstractor
**I want** to provide answers/notes for follow-up questions
**So that** my clinical judgment is captured and the case can progress

**Acceptance Criteria:**
- [ ] Each unanswered question has "Add Response" button/area
- [ ] Click expands textarea for clinician notes
- [ ] Save button updates question status to ANSWERED
- [ ] Shows timestamp and clinician ID when answered
- [ ] Can edit existing answers
- [ ] Q&A summary updates in real-time
- [ ] Required questions block case finalization if unanswered

**Technical Notes:**
- Backend: `POST /api/cases/{id}/questions/{q_id}/answer`
- Request body: `{ response: string, clinician_id?: string }`
- Update ledger table: `LEDGER.FOLLOWUP_QUESTIONS`
- UI state management for editing/saving

**Effort:** 4-5 days
**Priority:** MEDIUM

---

## **EPIC 4: "Ask the Case" LLM Interaction**
**Goal:** Enable conversational queries about the case

### Story 4.1: Ask Questions About the Case
**As a** clinical abstractor
**I want** to ask natural language questions about the case
**So that** I can get clarification on risk, evidence, or determinations

**Acceptance Criteria:**
- [ ] New panel: "Ask the Case" (bottom dock or right panel toggle)
- [ ] Text input: "Ask a question about this case..."
- [ ] Shows example queries on empty state:
  - "Why is the risk level HIGH?"
  - "Show me the blood culture timeline"
  - "What evidence supports S. aureus infection?"
- [ ] Submit query button
- [ ] Loading indicator during API call
- [ ] Response shown with:
  - Natural language answer
  - Evidence citations (linked to signals/events)
  - Confidence indicator
- [ ] Conversational history (per case session)
- [ ] Can expand/collapse conversation threads

**Technical Notes:**
- Component: `<AskTheCasePanel />`
- Backend: `POST /api/cases/{id}/ask`
- Request: `{ query: string, history?: Message[] }`
- Response: `{ answer: string, evidence_refs: string[], confidence: number }`
- Integration with vector store for context retrieval
- LLM prompt engineering for case-specific queries

**Effort:** 8-10 days
**Priority:** MEDIUM

---

### Story 4.2: Navigate to Evidence from Chat
**As a** clinical abstractor
**I want** to click on evidence citations in chat responses
**So that** I can jump directly to the relevant signals or timeline events

**Acceptance Criteria:**
- [ ] Evidence citations in responses are clickable links
- [ ] Click scrolls to and highlights the referenced signal/event
- [ ] Visual indication of highlighted item (border, background)
- [ ] Highlight fades after 3 seconds
- [ ] Works across all tabs/panels

**Technical Notes:**
- Use React refs for scroll-to behavior
- Add `ref` to signal and timeline items
- Implement smooth scroll with offset for headers
- CSS animation for highlight effect

**Effort:** 2-3 days
**Priority:** LOW

---

## **EPIC 5: Payload/Context Explorer**
**Goal:** Provide transparency into underlying data

### Story 5.1: View Complete Case Payload
**As a** developer or QA analyst
**I want** to view the complete GOLD_AI payload
**So that** I can debug issues and understand what data the AI is processing

**Acceptance Criteria:**
- [ ] Toggle button in page header: "Show Payload Inspector"
- [ ] Collapsible panel (hidden by default)
- [ ] Shows complete GOLD_AI JSON payload with:
  - Signals
  - Timeline
  - Rule Evaluations
  - Note Bundles (if applicable)
  - Metadata
- [ ] Pretty-formatted JSON with syntax highlighting
- [ ] Collapsible JSON sections
- [ ] Copy to clipboard button
- [ ] Only visible in TEST/DEV modes (hidden in PROD)

**Technical Notes:**
- Component: `<PayloadInspector />`
- Backend: `GET /api/cases/{id}/payload`
- Use `react-json-view` or similar library
- Mode check: only render if `mode !== 'PROD'`

**Effort:** 2-3 days
**Priority:** LOW

---

## **EPIC 6: Domain Configuration System**
**Goal:** Make UI reusable across clinical domains (CLABSI, CAUTI, SSI, etc.)

### Story 6.1: Define Domain Configuration Interface
**As a** developer
**I want** a domain configuration system
**So that** the same UI components work for CLABSI, CAUTI, SSI, and future domains

**Acceptance Criteria:**
- [ ] `DomainConfig` interface defined with:
  - `domain_name`, `display_name`, `episode_label`, `determination_label`
  - `timeline_phases: string[]`
  - `signal_groups: SignalGroup[]`
  - `followup_question_templates: QuestionTemplate[]`
  - `feedback_options: FeedbackOption[]`
  - `ask_examples: string[]`
  - `primary_color?: string`
- [ ] Config files for CLABSI, CAUTI, SSI in `/reference-implementation/configs/domains/`
- [ ] Domain provider context in React
- [ ] All hardcoded "CLABSI" labels removed from UI
- [ ] Labels pulled from active domain config

**Technical Notes:**
- TypeScript interface: `DomainConfig`
- React context: `DomainConfigProvider`
- Config loader: reads JSON from `/configs/domains/{domain}.json`
- Update all components to use `domainConfig` from context

**Effort:** 5-7 days
**Priority:** HIGH

---

### Story 6.2: Switch Between Domains
**As a** user
**I want** to switch between clinical domains (CLABSI, CAUTI, SSI)
**So that** I can review cases from different surveillance programs

**Acceptance Criteria:**
- [ ] Domain selector in app header
- [ ] Dropdown shows available domains (CLABSI, CAUTI, SSI)
- [ ] Switching domain:
  - Updates all labels in UI
  - Filters case list to that domain
  - Updates signal groups, timeline phases
  - Preserves user session
- [ ] Domain persisted in local storage
- [ ] Default domain: CLABSI

**Technical Notes:**
- Domain selector component
- Update API: `GET /api/cases?domain=CLABSI`
- Context provider manages active domain
- localStorage: `preferred_domain`

**Effort:** 3-4 days
**Priority:** MEDIUM

---

## **EPIC 7: Backend API Enhancements**
**Goal:** Support new interactive features with robust APIs

### Story 7.1: Implement "Ask the Case" API
**As a** backend developer
**I want** an API endpoint for case-specific LLM queries
**So that** users can ask natural language questions about cases

**Acceptance Criteria:**
- [ ] Endpoint: `POST /api/cases/{patient_id}/ask`
- [ ] Request body: `{ query: string, history?: Message[] }`
- [ ] Response: `{ answer: string, evidence_refs: string[], confidence: number, sources: Source[] }`
- [ ] Query uses vector store to retrieve relevant case chunks
- [ ] LLM prompt includes case payload + retrieved context
- [ ] Response includes citations to signals/events
- [ ] Rate limiting: 10 queries per case per hour
- [ ] Logged to ledger: `LEDGER.ASK_QUERIES`

**Technical Notes:**
- Python endpoint in `simple_api.py`
- Integration with `VectorStore.search()`
- LLM prompt template with case context
- For TEST mode: stub responses with realistic answers
- For PROD mode: actual LLM API call (OpenAI, Writer, etc.)

**Effort:** 8-10 days
**Priority:** MEDIUM

---

### Story 7.2: Implement Evidence Retrieval API
**As a** backend developer
**I want** an API to fetch evidence for a specific signal
**So that** users can drill down into underlying events

**Acceptance Criteria:**
- [ ] Endpoint: `GET /api/cases/{patient_id}/evidence/{signal_id}`
- [ ] Response: `{ evidence: Evidence[], signal_info: Signal }`
- [ ] Evidence includes: type, timestamp, description, source_system, raw_data
- [ ] Queries SILVER tables to get original events/labs
- [ ] Links via `evidence_refs` in signal payload
- [ ] Returns 404 if signal not found
- [ ] Returns empty array if no evidence linked

**Technical Notes:**
- Add evidence linking to data agent
- Update `generate_signals()` to include `evidence_refs`
- For TEST mode: stub evidence data
- For PROD mode: query SILVER.LABS, SILVER.EVENTS, etc.

**Effort:** 5-7 days
**Priority:** HIGH

---

### Story 7.3: Follow-Up Question Management API
**As a** backend developer
**I want** APIs to manage follow-up questions and answers
**So that** clinicians can respond to AI-generated questions

**Acceptance Criteria:**
- [ ] Endpoint: `GET /api/cases/{patient_id}/questions` - list all questions
- [ ] Endpoint: `POST /api/cases/{patient_id}/questions/{q_id}/answer` - submit answer
- [ ] Request: `{ response: string, clinician_id?: string }`
- [ ] Updates question status to ANSWERED
- [ ] Saves to: `LEDGER.FOLLOWUP_QUESTIONS`
- [ ] Returns updated question with timestamp
- [ ] Validates required questions before case finalization

**Technical Notes:**
- New ledger table: `FOLLOWUP_QUESTIONS`
- Columns: question_id, patient_id, question_text, status, response, clinician_id, answered_at
- Generate questions in abstraction agent
- Include in CaseView payload

**Effort:** 4-5 days
**Priority:** MEDIUM

---

## **EPIC 8: Testing & Quality**
**Goal:** Ensure all features work correctly across domains

### Story 8.1: End-to-End Test Suite
**As a** QA engineer
**I want** comprehensive E2E tests
**So that** all user workflows are validated

**Acceptance Criteria:**
- [ ] Test: Load case list and navigate to case detail
- [ ] Test: View signals grouped by category
- [ ] Test: Click "View Evidence" and see evidence drawer
- [ ] Test: Answer follow-up questions and verify status update
- [ ] Test: Submit "Ask the Case" query and verify response
- [ ] Test: Toggle payload inspector in TEST mode
- [ ] Test: Switch domains and verify label changes
- [ ] Test: Submit clinician feedback
- [ ] All tests pass in TEST mode with stub data
- [ ] Tests run in CI/CD pipeline

**Technical Notes:**
- Framework: Playwright or Cypress
- Test data: Use existing 6 test patients (PAT001-PAT006)
- Mock API responses for deterministic tests

**Effort:** 8-10 days
**Priority:** MEDIUM

---

## **EPIC 9: Documentation & Templates**
**Goal:** Enable easy instantiation for new domains

### Story 9.1: Domain Template Guide
**As a** developer adding a new domain
**I want** step-by-step instructions and templates
**So that** I can quickly build CAUTI, SSI, or other domains

**Acceptance Criteria:**
- [ ] Document: `DOMAIN_TEMPLATE_GUIDE.md` with:
  - Checklist for new domain
  - DomainConfig JSON template
  - Signal group recommendations
  - Timeline phase examples
  - Follow-up question examples
- [ ] Template: `configs/domains/TEMPLATE.json` with TODOs
- [ ] Example configs: CLABSI, CAUTI, SSI
- [ ] Estimated time: 2-4 hours per domain

**Technical Notes:**
- Include SQL schema considerations
- Python agent customization points
- UI testing checklist

**Effort:** 2-3 days
**Priority:** LOW

---

## Implementation Roadmap

### **Phase 1: Foundation (Weeks 1-2)**
- ✅ 80/20 Summary Strip
- ✅ Signal Groups (collapsible)
- ✅ Domain Configuration System
- ✅ Update stub data with new fields

### **Phase 2: Evidence & Transparency (Weeks 3-4)**
- ✅ Evidence linking (signal → events)
- ✅ Evidence drawer component
- ✅ Evidence retrieval API
- ✅ Payload inspector

### **Phase 3: Interactive Features (Weeks 5-7)**
- ✅ Follow-Up Questions panel
- ✅ Follow-Up Questions API
- ✅ Q&A status tracking
- ✅ "Ask the Case" UI component
- ✅ "Ask the Case" API (with vector store)

### **Phase 4: Multi-Domain Support (Week 8)**
- ✅ Domain switcher
- ✅ CAUTI and SSI configs
- ✅ Template documentation
- ✅ Migration guide

### **Phase 5: Testing & Polish (Weeks 9-10)**
- ✅ E2E test suite
- ✅ UI polish and accessibility
- ✅ Performance optimization
- ✅ Documentation updates

---

## Success Metrics

**Feature Completeness:**
- [ ] All 9 epics completed
- [ ] 3+ domains supported (CLABSI, CAUTI, SSI)
- [ ] Zero hardcoded domain labels in UI
- [ ] E2E test coverage >80%

**User Experience:**
- [ ] 80/20 summary visible within 1 second of page load
- [ ] Evidence drill-down <2 clicks from any signal
- [ ] "Ask the Case" response time <5 seconds
- [ ] Domain switch <1 second

**Developer Experience:**
- [ ] New domain setup in <4 hours
- [ ] All components reusable without modification
- [ ] Clear documentation and templates

---

## Priority Classification

**HIGH (Must Have for MVP):**
- 80/20 Summary Strip
- Signal Groups
- Evidence Linking
- Domain Configuration System

**MEDIUM (Should Have for V1):**
- Follow-Up Questions Panel
- "Ask the Case" LLM Interaction
- Domain Switcher

**LOW (Nice to Have):**
- Payload Inspector
- Navigate to evidence from chat
- Advanced testing

---

## Technical Debt to Address

1. **Hardcoded CLABSI labels** - everywhere in UI
2. **No error boundaries** - app crashes on API errors
3. **No loading skeletons** - blank screen during fetch
4. **No retry logic** - API failures are terminal
5. **No caching** - re-fetch on every navigation
6. **No optimistic updates** - slow feedback submission
7. **No websockets** - no real-time updates
8. **No analytics** - can't track user behavior
9. **No LLM integration** - all responses are stubs
10. **No actual Snowflake connection** - all stub data

---

## Notes

- All stories assume TEST mode with stub data as baseline
- PROD mode integration requires Snowflake setup
- LLM integration requires API keys (OpenAI, Writer, etc.)
- Vector store requires embedding generation setup
- Estimated total effort: **50-70 engineering days**
- Recommended team: 2 frontend + 1 backend + 1 QA = **10-14 calendar weeks**
