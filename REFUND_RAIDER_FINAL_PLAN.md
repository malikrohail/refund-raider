# Refund Raider — Finalized Plan

## One-Line Hook

Refund Raider is an aggressive AI refund assistant that reads the rules, figures out whether you qualify, drafts the exact refund request, and sends it for you.

## Why This Can Win

- Real pain: people lose money because refund policies are hidden, confusing, or ignored.
- Strong sponsor fit: Firecrawl Search is used to find the actual policy, support path, and evidence; ElevenAgents is the user-facing assistant that turns that research into action.
- Strong demo shape: messy refund problem in, plain-English verdict and real action out.
- Strong visual story: evidence cards, clear eligibility verdict, generated refund draft, send action, and status timeline.

## Product Thesis

The user should not feel like they are doing research with AI. They should feel like they handed a refund fight to a sharp assistant that came back with:

- what the rules are
- whether they qualify
- what to send
- where to send it
- what happens next

## Core User Flow

1. The user opens Refund Raider.
2. They paste or say the problem: “My headphones arrived damaged and the seller is ignoring me.”
3. They upload proof: receipt, screenshots, product photos, or prior support emails.
4. Refund Raider asks only the missing follow-ups: merchant, purchase date, payment method, issue type, and desired outcome.
5. Firecrawl searches the merchant’s refund policy, warranty page, support channels, and other useful evidence.
6. The app returns a plain-English verdict: “You are still inside the 30-day return window. Best path is support email first, then card dispute fallback.”
7. The app shows the evidence behind that verdict: quoted policy language, source URL, return deadline, required proof, and support contact path.
8. The ElevenAgent explains the result, answers questions, and proposes the next action.
9. Refund Raider drafts the refund email.
10. The user reviews and approves it.
11. Refund Raider sends it.
12. The case moves into tracking: `research done -> draft ready -> sent -> waiting -> follow-up needed`.
13. If the merchant ignores the request, the app suggests the next escalation path.

## Judge-Facing MVP Flow

Keep the hackathon loop extremely tight:

1. Paste merchant + issue.
2. Upload proof.
3. Click `Find my refund path`.
4. See the evidence-backed verdict.
5. Talk to the voice agent for 15-20 seconds.
6. Approve the refund email.
7. Watch it get sent.

Mental model:

`intake -> research -> verdict -> draft -> approve -> send -> track`

## Scope Decisions

### In MVP

- one polished ecommerce refund flow
- Firecrawl-powered policy and support discovery
- evidence-backed verdict screen
- ElevenAgent voice/text explanation
- generated refund email
- real email send
- simple case status tracker

### Out of MVP

- Gmail inbox integration
- automatic support form filling
- browser extension
- live outbound calls
- chargeback automation
- support for every refund category

## Why Gmail Moves Out of MVP

Gmail import is useful, but it adds OAuth, parsing edge cases, privacy concerns, and demo fragility. It is a strong stretch feature, not a good MVP dependency. The MVP should work perfectly with manual proof upload and pasted merchant details.

## Architecture

### Frontend

- Next.js App Router
- strong landing page hook
- intake form
- case page with verdict, evidence cards, draft, and timeline
- embedded ElevenAgent panel

### Backend

- Next.js route handlers for app APIs
- server tool endpoints callable by ElevenAgent
- background workflow layer for research and draft generation

### Research Pipeline

1. normalize merchant name, issue type, and product context
2. run Firecrawl Search for refund policy, warranty policy, support channels, and complaint context
3. scrape the highest-value pages
4. extract deadline, proof requirements, support destination, and likely refund path
5. produce a structured verdict plus supporting evidence

### Agent Tooling

Expose these tools to the ElevenAgent:

- `createCase`
- `lookupPolicyEvidence`
- `summarizeEligibility`
- `createRefundDraft`
- `sendRefundEmail`
- `getCaseStatus`

### Data Model

Core entities:

- `cases`
- `artifacts`
- `research_runs`
- `policy_sources`
- `refund_strategies`
- `drafts`
- `actions`
- `messages`

## Key Screens

### 1. Landing

- one-sentence hook
- start case CTA
- visual promise of “problem in, refund action out”

### 2. Intake

- merchant name
- issue summary
- optional attachments
- desired outcome

### 3. Verdict + Evidence

- refund qualification status
- return deadline
- best path
- fallback path
- evidence cards with quotes and URLs

### 4. Draft + Approval

- generated refund email
- editable message body
- cited supporting evidence
- approve and send CTA

### 5. Status Tracker

- timeline of actions taken
- current waiting state
- suggested next escalation step

## End-to-End Backend Actions

- parse uploaded files into structured case context
- normalize merchant, order date, item, and issue type
- query Firecrawl for policy, support, and complaint context
- extract deadlines, proof requirements, and contact paths
- generate a verdict and recommended path
- generate a refund draft
- send the draft by email
- persist action history and next-step state

## What To Build First

1. Intake form plus file upload
2. Firecrawl research pipeline
3. Verdict and evidence UI
4. Draft generation
5. Approve and send flow
6. Status tracker
7. Voice agent polish

## Build Order

### Phase 1 — Lock the Demo Story

- choose the hero refund scenario
- choose one or two merchants with public policy pages
- freeze the 60-90 second demo path
- lock the one-line hook

### Phase 2 — Build the Shell

- scaffold the app
- create the core schema
- create landing, intake, and case pages

### Phase 3 — Build Sponsor-Critical Research

- implement Firecrawl search and scrape
- turn search results into evidence cards
- store research artifacts on the case

### Phase 4 — Build the Agent Experience

- integrate ElevenAgent
- wire server tools
- support voice plus text fallback

### Phase 5 — Build the Action Layer

- generate the refund draft
- let the user edit it
- send it by email

### Phase 6 — Build the Storytelling Surface

- improve evidence clarity
- improve before/after visuals
- polish the timeline and final state

## Stretch Features

- Gmail import and auto-parsing
- chargeback guidance pack
- live call mode with ElevenAgent
- merchant-specific playbooks
- automatic follow-up after no response
- support portal autofill

## 90-Second Demo Flow

1. Hook: “I built an AI that reads the fine print and gets your refund for you.”
2. Show the messy problem: damaged product, ignored merchant, unclear policy.
3. Paste the merchant and upload the proof.
4. Click `Find my refund path`.
5. Show the Firecrawl evidence: policy quote, deadline, and support destination.
6. Let the voice agent explain the verdict in plain English.
7. Show the drafted refund email.
8. Click approve and send.
9. End on the case timeline and next-step fallback.

## Success Criteria

- a user understands the product in under 10 seconds
- the verdict feels trustworthy because evidence is visible
- the app reduces user work instead of adding another research task
- both sponsor technologies are central to the experience
- the demo ends with a concrete action sent, not just a summary

## Final Recommendation

Ship the narrowest strong version first:

`manual intake + Firecrawl research + evidence-backed verdict + ElevenAgent explanation + refund draft + real email send`

That is the best balance of usefulness, clarity, build speed, and judge appeal.
