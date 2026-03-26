# Refund Raider — Search-First Decisions

## Goal

Build a hackathon-ready product that uses Firecrawl Search and ElevenAgents in a way that is:

- clearly useful
- visually demoable in under 90 seconds
- implementable in a few days
- meaningfully better than a generic "voice assistant that reads search results"

## Product Decision

Build `Refund Raider` as a web app where a user provides a merchant, order details, and supporting proof, then talks to a voice/chat agent that:

1. researches the merchant's refund and cancellation policy with Firecrawl
2. determines the strongest refund path
3. drafts a refund request
4. optionally sends the request by email
5. optionally escalates to a phone call as a stretch feature

## Need Analysis

Required capabilities:

- multimodal user interaction: voice first, text fallback
- structured web research over merchant policies and support pages
- reliable multi-step workflow for research, drafting, and retries
- lightweight auth and persistent case history
- polished UI for the demo video
- low-friction outbound action channel

Constraints:

- hackathon scope, not enterprise scope
- sponsor tech must be central, not decorative
- the first demo must work without brittle phone automation
- the "wow" moment must appear early in the user flow

## Candidate Decisions

### App Shell

#### Candidate A: Next.js App Router

Pros:

- single TypeScript codebase for UI, API routes, and server actions
- easy fit for a polished demo app
- works cleanly with Supabase, Inngest, Playwright, and email providers

Decision: **Adopt**

Rationale:

- fastest path to a polished end-to-end product

### Auth and Database

#### Candidate A: Supabase

Pros:

- fast Next.js setup path
- auth, Postgres, and storage in one place
- good fit for user cases, uploaded receipts, and conversation metadata

Cons:

- another hosted dependency

Decision: **Adopt**

Rationale:

- lower setup overhead than stitching auth, DB, and storage separately

### Voice Agent Integration

#### Candidate A: ElevenAgents widget

Pros:

- fastest embed path
- low-code setup

Cons:

- less control over the surrounding product experience
- docs note widgets currently require public agents with authentication disabled

Decision: **Reject for primary app**

Rationale:

- acceptable for a marketing site, not ideal for a signed-in case workflow

#### Candidate B: `@elevenlabs/react`

Pros:

- custom React integration
- supports `clientTools`, `textOnly`, dynamic overrides, and per-user session starts
- lets the app own the layout, case timeline, and proof panels

Cons:

- slightly more implementation work than the widget

Decision: **Adopt**

Rationale:

- best balance of control and speed for a product demo

### Web Research

#### Candidate A: Firecrawl Search API

Pros:

- search plus optional content retrieval in one operation
- supports structured search parameters, result sources, and scraped markdown
- directly aligned with the sponsor challenge

Cons:

- requires careful prompt/query design to avoid noisy results

Decision: **Adopt**

Rationale:

- sponsor-native and strong enough for policy, support, and complaint discovery

#### Candidate B: Firecrawl Agent

Pros:

- deeper autonomous retrieval

Cons:

- docs mark it as research preview / early access
- more moving parts than needed for the MVP

Decision: **Stretch only**

Rationale:

- good for future depth, not the safest core path for a hackathon demo

### Workflow Orchestration

#### Candidate A: Inngest

Pros:

- durable multi-step execution
- retries, visibility, and background flow support
- fits research -> analysis -> draft -> send pipelines well

Cons:

- another service to configure

Decision: **Adopt**

Rationale:

- cleaner than inventing queueing and retry logic in route handlers

#### Candidate B: plain route handlers plus cron-like polling

Pros:

- fewer dependencies

Cons:

- brittle for long-running or retried flows
- harder to debug during demo prep

Decision: **Reject**

### Outbound Action Channel

#### Candidate A: email send via Resend

Pros:

- simple Node.js path
- enough to show a real action taken on the user's behalf
- lower operational risk than live calling in the MVP

Cons:

- less dramatic than a phone call

Decision: **Adopt**

Rationale:

- best MVP action channel

#### Candidate B: Twilio + ElevenLabs outbound calls

Pros:

- strongest viral "wow" moment
- excellent stretch demo if stable

Cons:

- more integration risk
- harder to test safely and repeatedly
- ElevenLabs docs note the custom server flow is for outbound calls only

Decision: **Stretch**

Rationale:

- use only after the core web + email flow is solid

## Recommended Architecture

- **Frontend:** Next.js + TypeScript + Tailwind
- **Voice/chat layer:** `@elevenlabs/react`
- **Research layer:** Firecrawl Search API with scrape-enabled follow-up
- **Persistence:** Supabase Auth + Postgres + Storage
- **Workflow engine:** Inngest
- **Outbound action:** Resend email
- **Testing:** Playwright for the golden path demo

## Recommended Scope

### MVP

- create a refund case
- upload or paste receipt/order info
- search merchant refund policy and support details with Firecrawl
- show evidence-backed eligibility summary
- let the user talk to an ElevenAgent to refine the case
- generate and send a refund email
- show case status and proof in a timeline UI

### Stretch

- outbound merchant support call through Twilio + ElevenLabs
- browser extension / Gmail ingestion
- automated follow-up cadence
- chargeback or bank escalation suggestions

## Data Model

Core tables:

- `users`
- `cases`
- `artifacts`
- `research_runs`
- `policy_sources`
- `refund_strategies`
- `drafts`
- `messages`
- `actions`

## Main App Surfaces

- `/`: hook, value prop, start case CTA
- `/cases/new`: intake form
- `/cases/[id]`: timeline, policy evidence, draft, agent panel
- `/api/agent-tools/*`: tool endpoints for ElevenAgent
- `/api/inngest`: workflow endpoint

## Tooling Decision Summary

- **Adopt:** Next.js, Supabase, Firecrawl Search, `@elevenlabs/react`, Inngest, Resend
- **Defer:** Twilio outbound calls, Firecrawl Agent, Gmail inbox ingestion
- **Avoid for v1:** browser extension, complex CRM integrations, custom workflow infrastructure

## Official Sources

- Firecrawl Search docs: https://docs.firecrawl.dev/features/search
- Firecrawl Search API reference: https://docs.firecrawl.dev/api-reference/endpoint/search
- ElevenAgents overview: https://elevenlabs.io/docs/eleven-agents/overview
- ElevenAgents React SDK: https://elevenlabs.io/docs/eleven-agents/libraries/react
- ElevenAgents widget docs: https://elevenlabs.io/docs/eleven-agents/customization/widget
- ElevenLabs Twilio guide: https://elevenlabs.io/docs/conversational-ai/guides/conversational-ai-twilio
- Supabase Next.js quickstart: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- Inngest Next.js quick start: https://www.inngest.com/docs/getting-started/nextjs-quick-start
- Resend Node.js docs: https://resend.com/docs/send-with-nodejs
- Next.js App Router install docs: https://nextjs.org/docs/app/getting-started/installation
