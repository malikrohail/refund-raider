# Consumer Action Engine

## Goal

Generalize Refund Raider from a refund-only flow into a consumer action engine that can support:

- refunds
- replacements
- cancellations
- billing fixes
- escalation and follow-up

## Core Records

### Case

Holds the user problem, merchant context, and current state.

### Merchant Profile

Stores the best-known merchant execution path:

- host
- support email
- support URL
- policy URL
- portal or in-app clue
- preferred execution channel

### Action Plan

Stores the evidence-backed execution strategy:

- summary
- recommended outcome
- primary channel
- fallback channel
- automation confidence
- whether consent is required
- whether the case must fall back to ops

### Action Runs

Each plan expands into concrete runnable steps.

Current supported behavior:

- email execution path can run automatically after approval
- non-email paths can be routed into the ops fallback lane

### Approval Grants

Stores user consent for sensitive steps.

### Follow-Up Tasks

Stores post-send or post-handoff work that should happen later.

## Current Execution Policy

- `email` is the strongest automated path
- `support_form`, `in_app`, `portal`, and `phone` cases currently map to `ops_queue` for coherent fallback handling
- follow-ups are created as first-class tasks, not only implied by a timeline note

## API Surface

- `POST /api/v1/cases/:caseId/plan`
- `GET /api/v1/cases/:caseId/plan`
- `GET /api/v1/cases/:caseId/actions`
- `POST /api/v1/actions/:actionId/approve`
- `POST /api/v1/actions/:actionId/run`
- `GET /api/v1/cases/:caseId/follow-ups`
- `POST /api/v1/cases/:caseId/follow-ups`

## Near-Term Extensions

- browser-driven support-form and portal execution
- Inngest-backed delayed follow-ups
- merchant-specific playbooks that lower ops fallback rates
