# Current Architecture Baseline

## What Exists Today

Refund Raider already has a working single-codebase baseline built on:

- Next.js App Router
- TypeScript
- Tailwind CSS
- Next.js route handlers
- a service layer plus repository layer
- local JSON persistence with Supabase-ready fallbacks
- Firecrawl-backed research with demo-safe mock results
- ElevenLabs voice/chat surfaces for intake and case conversation
- Resend-backed outbound email with demo-safe fallback behavior

## Current Working Flow

The existing repo already supports this core path:

1. create a case from voice, paste, Gmail, or upload context
2. extract merchant and issue details
3. run policy research
4. derive an evidence-backed strategy
5. create and approve a draft
6. send the email
7. store the timeline

## Current Limits

- the product is still refund-centric in its naming and main UI
- strategy and draft generation exist, but a generalized action engine did not exist before this implementation pass
- non-email merchant paths were visible in evidence, but not modeled as first-class executable plan steps
- Playwright needed a manual production build before E2E could run from a cold checkout

## What This Implementation Adds

- generalized case metadata: case kind, automation confidence, consent state, and priority
- merchant profile records
- action plan records
- action run records
- approval grant records
- follow-up task records
- new APIs for plan, action execution, approval, and follow-up scheduling

## Compatibility Rule

The existing `/api/v1/cases`, `/research`, `/strategy`, `/drafts`, and `/send` flows remain intact.
The new action-engine layer sits beside them and is now created automatically after strategy generation.
