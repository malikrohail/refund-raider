# Refund Raider Hackathon Tickets

This is the consolidated execution board for winning the hackathon with Refund Raider.

## Operating Rule

Optimize for:

1. one unforgettable demo
2. one narrow but real user problem
3. one repeatable hero path

Do not broaden the product until the hero path is undeniable.

## Parallel Lanes

### Lane A — Product / Workflow

- lock the hero scenario
- replace the generic ElevenLabs flow with the Refund Raider returns flow
- tune the refund advocate behavior
- seed repeatable demo merchants and cases

### Lane B — Design / Demo

- make the case page screenshotable and video-friendly
- make the “talk to Refund Raider” moment feel central
- create the cover frame, script, and submission pack

### Lane C — Engineering / Release

- cut over to real providers
- move persistence off local JSON
- improve release confidence and live-demo safety
- add explicit non-email fallback behavior

## Must-Ship Tickets

### RR-00 — Release hygiene

- **Lane:** C
- **Why:** The repo must be submission-ready, clonable, and understandable.
- **Dependencies:** none
- **Tasks:**
  - clean public README and quickstart
  - confirm `.env.local` setup path
  - ensure build/test commands are reproducible on a clean machine
- **Acceptance criteria:**
  - fresh clone can install, build, and run using the documented steps
  - repo looks intentional for judges and viewers

### RR-01 — Lock the hero scenario

- **Lane:** A
- **Why:** A winning hackathon demo needs one tight story, not broad coverage.
- **Dependencies:** none
- **Tasks:**
  - choose one hero merchant
  - choose one damaged/wrong/missing-item story
  - choose two backup merchants
  - freeze the exact demo sequence
- **Acceptance criteria:**
  - the hero path can be described in one sentence
  - the same scenario can be repeated without improvisation

### RR-02 — Finish the live provider cutover

- **Lane:** C
- **Why:** The judges need to see that Firecrawl, ElevenLabs, and Resend are actually powering the flow.
- **Dependencies:** RR-01
- **Tasks:**
  - verify Firecrawl live evidence against the hero merchant
  - verify ElevenLabs configured mode and signed-session path
  - verify Resend live delivery
- **Acceptance criteria:**
  - all three providers work in configured mode for the hero scenario
  - mock mode still exists as a safe fallback

### RR-03 — Replace the generic ElevenLabs workflow with the Refund Raider returns workflow

- **Lane:** A
- **Why:** The current baseline is too generic and weakens the product story.
- **Dependencies:** RR-01, RR-02
- **Tasks:**
  - apply `refundRaiderWorkflow-v1-returns`
  - remove generic shopping/product-search behavior from the live agent
  - keep the agent focused on qualification, channel choice, and next action
- **Acceptance criteria:**
  - the live agent sounds like a refund advocate, not a generic store bot
  - tool calling still matches the app contract exactly

### RR-04 — Redesign the verdict/evidence area for screenshotability

- **Lane:** B
- **Why:** The verdict screen is the visual proof of the product; it needs to carry the first 5 seconds of the video.
- **Dependencies:** RR-01
- **Tasks:**
  - strengthen visual hierarchy
  - make the verdict card clearer
  - make evidence cards more legible and punchy
  - make the “best path” and deadline obvious
- **Acceptance criteria:**
  - one screenshot of the case page communicates the product clearly
  - the verdict/evidence screen can be used as a cover-image candidate

### RR-05 — Seed one hero merchant scenario and two backups

- **Lane:** A
- **Why:** Live research randomness can ruin the demo if the scenario is not controlled.
- **Dependencies:** RR-01, RR-02
- **Tasks:**
  - document the hero merchant and issue
  - document two backup merchants
  - save the expected evidence and support path notes
- **Acceptance criteria:**
  - demo can be switched to a backup merchant without changing the product story

### RR-06 — Cut over from local JSON persistence to Supabase

- **Lane:** C
- **Why:** Hosted persistence makes the demo safer if judges click around and gives the project more credibility.
- **Dependencies:** RR-02
- **Tasks:**
  - replace file-backed repository with Supabase-backed repository
  - move artifacts to Supabase Storage
  - preserve current route contracts
- **Acceptance criteria:**
  - state survives refresh/restart in hosted mode
  - local JSON is no longer the live store for the hosted demo

### RR-07 — Add explicit non-email fallback handling

- **Lane:** C
- **Why:** Merchants without support email should lead to a smart manual path, not a dead end.
- **Dependencies:** RR-02, RR-05
- **Tasks:**
  - detect no-email cases
  - surface “manual support path required”
  - distinguish email, form, in-app, and phone-style fallback
- **Acceptance criteria:**
  - the UI always shows one clear next action even when email is unavailable

### RR-08 — Expand verification from mock-smoke to release-grade checks

- **Lane:** C
- **Why:** The demo path has to work in both mock-safe mode and configured live mode.
- **Dependencies:** RR-02, RR-06
- **Tasks:**
  - keep current mock e2e green
  - add live-provider smoke coverage behind env flags
  - add persistence/reload coverage
  - add failure-mode coverage for broken provider paths
- **Acceptance criteria:**
  - mock-mode suite passes
  - live-mode smoke suite passes when credentials are present

### RR-09 — Add demo-safety guardrails

- **Lane:** C
- **Why:** During a hackathon demo, ambiguity kills confidence.
- **Dependencies:** RR-02, RR-06, RR-08
- **Tasks:**
  - show configured vs mock vs live provider state clearly
  - fail loudly on broken provider configuration
  - make the hero path reproducible every run
- **Acceptance criteria:**
  - operator can instantly tell whether the app is in real mode or fallback mode
  - provider failures do not silently degrade the demo

### RR-10 — Make “talk to Refund Raider” the centerpiece

- **Lane:** B
- **Why:** ElevenLabs must feel central to the product, not bolted on.
- **Dependencies:** RR-03, RR-04
- **Tasks:**
  - improve placement and prominence of the voice agent
  - tighten the first spoken exchange
  - make voice + text fallback feel intentional
- **Acceptance criteria:**
  - the voice moment reads as the product’s advocate layer, not a sidebar gadget

### RR-11 — Build the submission pack

- **Lane:** B
- **Why:** The video and submission assets are part of the product surface for the hackathon.
- **Dependencies:** RR-01, RR-03, RR-04, RR-10
- **Tasks:**
  - record the 60-90 second video script
  - create the cover image
  - write the final submission description
  - prepare X / LinkedIn / Instagram / TikTok post copy
- **Acceptance criteria:**
  - the first 5 seconds communicate the product clearly
  - the submission copy complements the video

## Strongly Recommended If Time

### RR-12 — Add provider/config state indicators in the UI

- **Lane:** B/C
- **Why:** Makes demo troubleshooting and judge clicks much safer.
- **Dependencies:** RR-02
- **Acceptance criteria:**
  - case page or settings area shows whether Firecrawl, ElevenLabs, and Resend are live or mocked

### RR-13 — Version the ElevenLabs workflow as a true release artifact

- **Lane:** A/C
- **Why:** The repo should always reflect the live agent workflow in ElevenLabs.
- **Dependencies:** RR-03
- **Tasks:**
  - keep sequential revisions in `workflow/`
  - note which revision is currently live
- **Acceptance criteria:**
  - repo workflow revision matches the live ElevenLabs workflow in use

## Deferred On Purpose

- Gmail ingest
- browser extension
- chargeback automation
- live phone escalation
- subscription cancellation vertical
- merchant-specific playbooks beyond the hero set
- large Inngest workflow refactor

## Recommended Execution Order

1. RR-00
2. RR-01
3. RR-02 and RR-03 in close sequence
4. RR-04 and RR-10
5. RR-05
6. RR-06
7. RR-07
8. RR-08 and RR-09
9. RR-11
10. RR-12 and RR-13 if time remains

## Definition of “Ready to Record”

The project is ready for the hackathon video when:

- the hero merchant scenario works in live mode
- the case page looks screenshotable
- the voice advocate works and feels purpose-built
- the draft/send loop succeeds
- the fallback story is clear when email is unavailable
- the same full demo can be repeated without improvisation
