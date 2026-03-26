# Refund Raider — Blueprint

## Objective

Build a demo-ready web app that helps a user win refunds faster by combining:

- Firecrawl Search for live merchant policy and support research
- ElevenAgents for voice/chat intake and guided action
- a visible, evidence-backed refund workflow that is easy to understand in video

## Execution Mode

Direct mode. This workspace is not inside a git repository, so this blueprint assumes edit-in-place execution without branch or PR automation.

## Product Thesis

People hate refund fights because the policy is hidden, the support path is annoying, and they do not know what argument will actually work.

`Refund Raider` turns that into a guided flow:

1. user gives merchant + order context
2. app researches policy and support channels
3. agent explains the strongest path in plain English
4. app drafts and sends the refund request
5. user sees status, evidence, and next steps in one place

## Non-Negotiable Invariants

- Firecrawl Search is central to the product, not a box-checking API call
- ElevenAgents is the main interaction surface for intake and explanation
- every recommendation shown to the user links back to evidence
- the MVP works without live calling
- the main demo completes in under 90 seconds

## Architecture

### Frontend

- Next.js App Router
- landing page with strong hook
- intake wizard
- case timeline page
- embedded/refined ElevenAgent panel

### Backend

- Next.js route handlers for core APIs
- tool endpoints callable by ElevenAgent
- Inngest for durable multi-step jobs

### Data

- Supabase Auth
- Supabase Postgres
- Supabase Storage for receipts and attachments

### Research Pipeline

1. take merchant name, URL, and issue type
2. run Firecrawl Search queries for refund policy, cancellation policy, warranty, support channels, and complaint context
3. scrape the strongest pages into markdown
4. normalize evidence into structured case facts
5. generate a refund strategy and draft

### Agent Tooling

Expose these server tools to the ElevenAgent:

- `createCase`
- `lookupPolicyEvidence`
- `summarizeEligibility`
- `createRefundDraft`
- `sendRefundEmail`
- `getCaseStatus`

### Stretch Architecture

- Twilio outbound call escalation through ElevenLabs after the MVP is stable

## Delivery Plan

### Step 1 — Lock the Demo Story

**Depends on:** none

**Context brief:** The hackathon is judged on both product quality and demo clarity. The first job is to define one golden user story that can be shown quickly and repeatedly without brittle live dependencies.

**Tasks:**

1. Choose one refund scenario for the hero demo.
2. Choose one or two merchants with publicly visible policy pages.
3. Define the exact 60-90 second demo path.
4. Write the one-line hook for the landing page and video opener.

**Verification:**

- one-sentence value prop exists
- hero scenario can be described in 3 screens or fewer
- no dependency on live support calls yet

**Exit criteria:**

- frozen MVP story
- frozen stretch story

**Rollback strategy:**

- if the chosen scenario needs too many edge cases, switch to a simpler merchant and keep the same architecture

### Step 2 — Scaffold the App and Persistence

**Depends on:** Step 1

**Context brief:** Build the smallest production-shaped shell that can support the full flow later. Do not over-model. Only add tables needed for the golden path.

**Tasks:**

1. Create the Next.js app shell.
2. Configure Supabase Auth, Postgres, and Storage.
3. Add the initial schema for cases, artifacts, research runs, policy sources, drafts, and actions.
4. Build the landing page and a stub case page.

**Verification:**

- app boots locally
- user can create a case record
- uploaded artifact persists

**Exit criteria:**

- a signed-in user can create and open a case

**Rollback strategy:**

- if auth slows things down, temporarily ship a guest-mode flow and add auth later

### Step 3 — Build the Firecrawl Research Pipeline

**Depends on:** Step 2

**Context brief:** This is the sponsor-critical core. The app must show that it can find the right policy evidence quickly and reliably.

**Tasks:**

1. Define query templates for merchant policy search.
2. Implement Firecrawl search + scrape flow.
3. Normalize results into evidence cards with source URL, title, and snippet.
4. Store research artifacts on the case.
5. Add failure handling for empty or noisy results.

**Verification:**

- the app returns useful policy evidence for the hero merchant
- at least one support contact path is found
- all evidence shown in UI is traceable to a source

**Exit criteria:**

- research run turns raw inputs into a structured evidence bundle

**Rollback strategy:**

- if multi-query orchestration is flaky, narrow to 2-3 highest-yield searches first

### Step 4 — Add the ElevenAgent Experience

**Depends on:** Step 3

**Context brief:** The agent is the user-facing magic. It should feel like a sharp refund advocate, not a generic chatbot.

**Tasks:**

1. Configure an ElevenAgent prompt around refund advocacy.
2. Integrate the React SDK into the case page.
3. Add blocking server tools for case lookup, evidence summary, and draft generation.
4. Add text fallback mode for precise inputs like order IDs and amounts.
5. Pass dynamic case variables into the agent session.

**Verification:**

- user can talk or type to the agent
- the agent can read case context
- tool calls return visible updates in the UI

**Exit criteria:**

- the agent can explain policy evidence and propose the next action

**Rollback strategy:**

- if voice is unstable, keep the same agent flow in text mode and restore voice after the core flow is stable

### Step 5 — Generate the Refund Strategy and Draft

**Depends on:** Step 4

**Context brief:** The core product outcome is not "search results found." It is "a refund request ready to send with evidence-backed reasoning."

**Tasks:**

1. Build a strategy generator that classifies refund strength and fallback paths.
2. Generate the draft email with evidence references.
3. Add editable draft UI.
4. Track action state on the case timeline.

**Verification:**

- each draft clearly states the ask
- evidence cited in the draft exists in the case
- the user can edit before sending

**Exit criteria:**

- the app can produce a sendable draft for the hero flow

**Rollback strategy:**

- if auto-generation quality is inconsistent, keep a structured template with inserted evidence instead of free-form generation

### Step 6 — Add Real Action: Send the Email

**Depends on:** Step 5

**Context brief:** The product needs a concrete action taken on the user's behalf. Email is the lowest-risk MVP action channel.

**Tasks:**

1. Integrate Resend.
2. Add merchant support address capture and validation.
3. Send the refund draft from the app.
4. Record delivery action in the case timeline.
5. Add optional CC-to-user behavior.

**Verification:**

- email can be sent from a test environment
- send failures surface clearly
- timeline records sent state

**Exit criteria:**

- the demo can end with a real action, not just a draft preview

**Rollback strategy:**

- if live send is blocked, fall back to "copy to clipboard + mailto + downloadable draft" while preserving the rest of the demo

### Step 7 — Polish the Demo Surface

**Depends on:** Steps 3-6

**Context brief:** The product must be legible in a viral-style video. That means fewer screens, bigger state changes, and highly visual evidence.

**Tasks:**

1. Design the case page around a visible before/after transformation.
2. Add a timeline with evidence, draft, and action states.
3. Add a "money saved" or "refund chance" moment only if honest and well-supported.
4. Create seed demo cases and polished screenshots.
5. Prepare a cover image frame and social crops.

**Verification:**

- a viewer understands the product with the sound off
- the hero flow can be recorded in under 90 seconds
- every screen change does real narrative work

**Exit criteria:**

- submission-ready UI and media assets

**Rollback strategy:**

- remove low-signal screens and keep only the hero flow

### Step 8 — Stretch: Live Call Escalation

**Depends on:** Steps 1-7 complete and stable

**Context brief:** This is the viral bonus feature. It should not jeopardize the MVP.

**Tasks:**

1. Integrate Twilio outbound calling with ElevenLabs.
2. Create a merchant escalation agent or a guided call mode.
3. Record call events on the case timeline.
4. Test with safe targets and a repeatable sandbox flow.

**Verification:**

- outbound call flow works consistently
- failures do not break the core case flow

**Exit criteria:**

- optional live escalation demo exists

**Rollback strategy:**

- cut this whole step if it risks the main demo

## Parallelism

After Step 2:

- research pipeline work and case-page UI scaffolding can move in parallel

After Step 4:

- draft generation and timeline polish can move in parallel

Stretch:

- Twilio escalation should remain isolated from the MVP path

## Anti-Patterns

- building an open-ended general support assistant instead of a focused refund workflow
- spending time on inbox integrations before the core flow works
- making live phone calls part of the MVP critical path
- hiding the Firecrawl evidence behind vague AI summaries
- shipping a terminal demo instead of a clear product surface

## Definition of Done

The MVP is done when:

1. a user can create a case
2. Firecrawl gathers relevant refund evidence
3. ElevenAgent explains the strategy
4. the app generates a refund request
5. the app sends the request or performs a credible fallback action
6. the entire flow is demoable in under 90 seconds

## Suggested Verification Commands

Replace with the actual project commands once the repo exists:

```bash
pnpm lint
pnpm test
pnpm exec playwright test
pnpm build
```

## Next Build Slice

If you want to start implementation immediately, the first executable slice is:

1. Next.js app shell
2. Supabase schema for `cases` and `artifacts`
3. Firecrawl search route
4. case page showing evidence cards

That slice proves the sponsor value before any agent work.
