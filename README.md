# Refund Raider

![Refund Raider logo](./public/refund-raider-logo.svg)

Refund Raider is a voice-first refund assistant built for the Firecrawl x ElevenLabs hackathon.
It turns a messy complaint into a structured case, gathers policy evidence, explains whether the user likely qualifies, drafts the refund request, and helps send the first merchant touchpoint fast.

## What It Does

- lets the user explain the problem by voice or chat
- structures that input into a live case
- researches merchant policy and support evidence with Firecrawl
- explains eligibility in plain English
- drafts the refund email
- supports approval and sending from the case page
- keeps a simple timeline and follow-up state

## Current Demo Focus

This repo is currently optimized for the hackathon demo path:

- voice-first intake
- evidence-backed verdict
- email-first execution
- manual fallback when email is weak or unavailable

The active demo path is intentionally email-first. The repo is focused on the voice intake, evidence, draft, and send loop rather than account-bound browser automation.

## Why It Exists

Most refund fights fail for boring reasons:

- the policy is hard to find
- the real support path is unclear
- the user does not know if they qualify
- the user does not know what to say

Refund Raider fixes that by turning “I got charged and support ignored me” into one visible action loop:

`intake -> research -> verdict -> draft -> approve -> send -> follow up`

## Sponsor Use

### ElevenLabs

ElevenLabs powers the live agent layer.
The intake surface is designed so the user can speak naturally, let the agent gather missing facts, fill the form state, and open the case without treating the voice assistant like decoration.

### Firecrawl

Firecrawl powers the evidence layer.
It is used to discover refund policies, support pages, and source material so the verdict and draft are grounded in actual merchant evidence instead of vague LLM guesses.

## Stack

### Frontend

- Next.js App Router
- React
- TypeScript
- Tailwind CSS

### Backend

- Next.js route handlers
- service layer + repository layer
- Inngest hooks/scaffolding for workflow handling

### Data and Auth

- Supabase Auth
- Supabase Postgres
- local JSON fallback when hosted persistence is not available

### External Services

- Firecrawl Search API
- ElevenLabs / `@elevenlabs/react`
- Resend

## Repo Layout

```text
app/                  Next.js app routes and pages
src/components/       UI surfaces for intake, case workspace, voice, and status
src/server/           services, providers, repositories, auth, storage
src/lib/              contracts, validation, presentation helpers, intake helpers
docs/                 hackathon, architecture, and submission docs
plans/                planning docs and execution notes
qa/                   unit tests, e2e tests, and fixtures
supabase/             schema and migration files
workflow/             workflow manifests and diagrams
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the env template and fill in the values you actually have:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
npm run dev
```

4. Open:

```text
http://localhost:3000
```

## Environment Variables

The repo includes `.env.example` with the expected keys:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `SUPABASE_DB_PASSWORD`
- `FIRECRAWL_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_AGENT_ID`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`
- `NEXT_PUBLIC_APP_URL`

If some providers are not configured, the app falls back to mock-safe behavior in several paths so the product can still be demoed locally.

## Useful Scripts

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm test
npm run test:e2e
npm run test:voice-smoke
npm run sync:elevenlabs-agent:dry
npm run sync:elevenlabs-agent
```

## QA

Automated tests live under `qa/`.

- `qa/unit/` contains Vitest coverage for services, routes, and agent tooling
- `qa/e2e/` contains Playwright coverage for the golden-path smoke flow
- `qa/fixtures/` contains small fixture inputs used by the tests

Run the core checks with:

```bash
npm run typecheck
npm test
npm run test:e2e
```

## Product Surfaces

### Landing page

- explains the wedge clearly
- pushes the user straight into the live intake

### Intake

- voice-first
- optional pasted context
- optional Gmail retrieval
- visible fallback form that stays in sync with the agent

### Case workspace

- verdict and evidence
- draft and approval
- action plan
- follow-up queue
- timeline

## Notes For Hackathon Judges

The intended demo story is simple:

1. tell Refund Raider what happened
2. let the agent structure the case
3. show policy evidence
4. show the verdict
5. generate the draft
6. approve and send the merchant email

The strongest story is not “general automation platform.”
It is “this app gets your refund case into motion fast, with real evidence.”
