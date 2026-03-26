# Refund Raider — Architecture, API, Agent Tools, and Data Model

## Goal

Define the exact technical contract for the MVP described in [REFUND_RAIDER_FINAL_PLAN.md](./REFUND_RAIDER_FINAL_PLAN.md).

This document locks:

- the application stack
- the API routes
- the ElevenAgent tool schema
- the database tables, fields, and relations

## Tech Stack

### Application

- Next.js App Router
- TypeScript
- Tailwind CSS
- `@elevenlabs/react` for the embedded voice/text agent
- ElevenAgents / ConvAI as the conversational layer, using signed sessions when server credentials are available

### Services

- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Firecrawl Search API
- Inngest for durable background workflows
- Resend for outbound email

### Testing

- Vitest for unit and service tests
- Playwright for end-to-end tests

## Architecture Overview

### Frontend Surfaces

- `/`
  - landing page
  - one-line hook
  - start case CTA
- `/cases/new`
  - intake flow
  - file upload
- `/cases/[caseId]`
  - verdict
  - evidence cards
  - agent panel
  - refund draft
  - status timeline

### Backend Layers

- route handlers for request validation and auth
- service layer for business logic
- repository layer for persistence
- Inngest functions for long-running or retried work

### Processing Flow

1. user creates case
2. user uploads proof
3. app triggers research job
4. Firecrawl returns candidate sources
5. system normalizes evidence
6. system writes verdict and strategy
7. agent explains and guides
8. system drafts refund email
9. user approves
10. system sends email and records action

## API Conventions

### Versioning

Use `/api/v1/...` for all app routes.

### Response Envelope

#### Success

```json
{
  "data": {},
  "meta": {
    "requestId": "req_123"
  }
}
```

#### Error

```json
{
  "error": {
    "code": "validation_error",
    "message": "merchantName is required",
    "details": {
      "field": "merchantName"
    }
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

### Auth Model

- public routes: landing page only
- authenticated routes: all case APIs
- auth provider: Supabase Auth
- route handlers read the authenticated user from the server session

## Exact API Routes

### Cases

#### `POST /api/v1/cases`

Create a case.

Request:

```json
{
  "merchantName": "Best Buy",
  "merchantUrl": "https://www.bestbuy.com",
  "issueSummary": "Headphones arrived damaged and support has not replied",
  "issueType": "damaged_item",
  "desiredOutcome": "full_refund",
  "purchaseDate": "2026-03-18",
  "paymentMethod": "credit_card"
}
```

Response:

```json
{
  "data": {
    "case": {
      "id": "case_123",
      "status": "intake",
      "merchantName": "Best Buy"
    }
  }
}
```

#### `GET /api/v1/cases/:caseId`

Return the full case detail page payload.

Response includes:

- case summary
- latest verdict
- evidence cards
- draft
- action timeline

#### `PATCH /api/v1/cases/:caseId`

Update editable intake fields.

Request:

```json
{
  "issueSummary": "Updated summary",
  "desiredOutcome": "refund_or_replacement"
}
```

### Artifacts

#### `POST /api/v1/cases/:caseId/artifacts`

Create an upload record and attach evidence metadata.

Request:

```json
{
  "kind": "receipt",
  "fileName": "receipt.png",
  "mimeType": "image/png",
  "storagePath": "cases/case_123/receipt.png"
}
```

Response:

```json
{
  "data": {
    "artifact": {
      "id": "artifact_123",
      "kind": "receipt"
    }
  }
}
```

#### `GET /api/v1/cases/:caseId/artifacts`

List artifacts for the case.

### Research

#### `POST /api/v1/cases/:caseId/research`

Kick off the Firecrawl research workflow.

Request:

```json
{
  "forceRefresh": false
}
```

Response:

```json
{
  "data": {
    "researchRun": {
      "id": "research_123",
      "status": "queued"
    }
  }
}
```

#### `GET /api/v1/cases/:caseId/research`

Return research run status and normalized evidence.

Response includes:

- run status
- evidence sources
- extracted deadlines
- support channels

### Verdicts and Strategy

#### `POST /api/v1/cases/:caseId/strategy`

Generate or refresh the refund strategy from normalized evidence.

Response:

```json
{
  "data": {
    "strategy": {
      "id": "strategy_123",
      "eligibility": "likely_eligible",
      "recommendedPath": "support_email_first",
      "fallbackPath": "card_dispute"
    }
  }
}
```

#### `GET /api/v1/cases/:caseId/strategy`

Return the current strategy and verdict.

### Drafts

#### `POST /api/v1/cases/:caseId/drafts`

Create a refund draft from the active strategy.

Request:

```json
{
  "tone": "firm_polite"
}
```

Response:

```json
{
  "data": {
    "draft": {
      "id": "draft_123",
      "subject": "Refund request for damaged order",
      "body": "Hello..."
    }
  }
}
```

#### `PATCH /api/v1/drafts/:draftId`

Edit the current draft before approval.

Request:

```json
{
  "subject": "Updated subject",
  "body": "Updated body"
}
```

#### `POST /api/v1/drafts/:draftId/approve`

Mark a draft as user-approved.

### Email Sending

#### `POST /api/v1/drafts/:draftId/send`

Send the approved draft via Resend.

Request:

```json
{
  "to": ["support@example.com"],
  "ccUser": true
}
```

Response:

```json
{
  "data": {
    "action": {
      "id": "action_123",
      "type": "email_sent",
      "status": "completed"
    }
  }
}
```

### Timeline

#### `GET /api/v1/cases/:caseId/timeline`

Return a normalized list of actions, statuses, and timestamps for the case.

### ElevenAgent Session

#### `POST /api/v1/agent/session`

Create a server-approved agent session for the case page.

Request:

```json
{
  "caseId": "case_123"
}
```

Response:

```json
{
  "data": {
    "agent": {
      "agentId": "agent_123",
      "caseId": "case_123",
      "variables": {
        "merchantName": "Best Buy",
        "caseStatus": "verdict_ready"
      }
    }
  }
}
```

## ElevenAgent Tool Schema

These are the exact tools exposed to the agent.

### `create_case`

Purpose:

- create a case from voice or text intake

Input schema:

```json
{
  "type": "object",
  "properties": {
    "merchantName": { "type": "string" },
    "merchantUrl": { "type": "string" },
    "issueSummary": { "type": "string" },
    "issueType": {
      "type": "string",
      "enum": [
        "damaged_item",
        "missing_item",
        "wrong_item",
        "late_delivery",
        "service_not_rendered",
        "subscription_cancellation",
        "other"
      ]
    },
    "desiredOutcome": {
      "type": "string",
      "enum": [
        "full_refund",
        "partial_refund",
        "replacement",
        "refund_or_replacement"
      ]
    },
    "purchaseDate": { "type": "string" },
    "paymentMethod": {
      "type": "string",
      "enum": [
        "credit_card",
        "debit_card",
        "paypal",
        "apple_pay",
        "shop_pay",
        "other",
        "unknown"
      ]
    }
  },
  "required": ["merchantName", "issueSummary", "issueType", "desiredOutcome"]
}
```

Output schema:

```json
{
  "type": "object",
  "properties": {
    "caseId": { "type": "string" },
    "status": { "type": "string" }
  },
  "required": ["caseId", "status"]
}
```

### `lookup_policy_evidence`

Purpose:

- trigger or refresh policy and support research for a case

Input schema:

```json
{
  "type": "object",
  "properties": {
    "caseId": { "type": "string" },
    "forceRefresh": { "type": "boolean" }
  },
  "required": ["caseId"]
}
```

Output schema:

```json
{
  "type": "object",
  "properties": {
    "researchRunId": { "type": "string" },
    "status": { "type": "string" },
    "sourceCount": { "type": "number" }
  },
  "required": ["researchRunId", "status"]
}
```

### `summarize_eligibility`

Purpose:

- return a plain-English verdict and recommended path

Input schema:

```json
{
  "type": "object",
  "properties": {
    "caseId": { "type": "string" }
  },
  "required": ["caseId"]
}
```

Output schema:

```json
{
  "type": "object",
  "properties": {
    "eligibility": {
      "type": "string",
      "enum": [
        "eligible",
        "likely_eligible",
        "unclear",
        "likely_ineligible"
      ]
    },
    "recommendedPath": { "type": "string" },
    "fallbackPath": { "type": "string" },
    "deadlineText": { "type": "string" },
    "plainEnglishSummary": { "type": "string" }
  },
  "required": ["eligibility", "recommendedPath", "plainEnglishSummary"]
}
```

### `create_refund_draft`

Purpose:

- generate the draft refund request

Input schema:

```json
{
  "type": "object",
  "properties": {
    "caseId": { "type": "string" },
    "tone": {
      "type": "string",
      "enum": ["firm_polite", "neutral", "escalation_ready"]
    }
  },
  "required": ["caseId"]
}
```

Output schema:

```json
{
  "type": "object",
  "properties": {
    "draftId": { "type": "string" },
    "subject": { "type": "string" },
    "body": { "type": "string" }
  },
  "required": ["draftId", "subject", "body"]
}
```

### `send_refund_email`

Purpose:

- send the approved refund request

Input schema:

```json
{
  "type": "object",
  "properties": {
    "caseId": { "type": "string" },
    "draftId": { "type": "string" },
    "to": {
      "type": "array",
      "items": { "type": "string" }
    },
    "ccUser": { "type": "boolean" }
  },
  "required": ["caseId", "draftId", "to"]
}
```

Output schema:

```json
{
  "type": "object",
  "properties": {
    "actionId": { "type": "string" },
    "deliveryStatus": { "type": "string" }
  },
  "required": ["actionId", "deliveryStatus"]
}
```

### `get_case_status`

Purpose:

- return the current state of the case for conversational continuity

Input schema:

```json
{
  "type": "object",
  "properties": {
    "caseId": { "type": "string" }
  },
  "required": ["caseId"]
}
```

Output schema:

```json
{
  "type": "object",
  "properties": {
    "caseStatus": { "type": "string" },
    "latestStep": { "type": "string" },
    "nextRecommendedAction": { "type": "string" }
  },
  "required": ["caseStatus", "latestStep"]
}
```

## Exact Database Tables

All IDs are `uuid`. All timestamps are `timestamptz`.

### `profiles`

Extends Supabase auth users.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | primary key, references auth user |
| `email` | `text` | unique |
| `full_name` | `text` | nullable |
| `created_at` | `timestamptz` | default now() |
| `updated_at` | `timestamptz` | default now() |

### `cases`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | primary key |
| `user_id` | `uuid` | references `profiles.id` |
| `merchant_name` | `text` | required |
| `merchant_url` | `text` | nullable |
| `issue_summary` | `text` | required |
| `issue_type` | `text` | enum-like check |
| `desired_outcome` | `text` | enum-like check |
| `purchase_date` | `date` | nullable |
| `payment_method` | `text` | nullable |
| `status` | `text` | `intake`, `researching`, `verdict_ready`, `draft_ready`, `sent`, `waiting`, `follow_up_needed`, `closed` |
| `currency` | `text` | default `USD` |
| `order_total_amount` | `numeric(10,2)` | nullable |
| `merchant_contact_email` | `text` | nullable |
| `created_at` | `timestamptz` | default now() |
| `updated_at` | `timestamptz` | default now() |

Indexes:

- `cases_user_id_created_at_idx`
- `cases_status_idx`

### `artifacts`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | primary key |
| `case_id` | `uuid` | references `cases.id` |
| `kind` | `text` | `receipt`, `order_email`, `screenshot`, `product_photo`, `support_thread`, `other` |
| `file_name` | `text` | nullable |
| `mime_type` | `text` | nullable |
| `storage_path` | `text` | nullable |
| `source_text` | `text` | nullable, extracted text |
| `metadata` | `jsonb` | optional OCR or parser metadata |
| `created_at` | `timestamptz` | default now() |

Indexes:

- `artifacts_case_id_idx`

### `research_runs`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | primary key |
| `case_id` | `uuid` | references `cases.id` |
| `status` | `text` | `queued`, `running`, `completed`, `failed` |
| `query_bundle` | `jsonb` | original Firecrawl search queries |
| `result_summary` | `jsonb` | aggregate counts and extracted facts |
| `error_message` | `text` | nullable |
| `started_at` | `timestamptz` | nullable |
| `completed_at` | `timestamptz` | nullable |
| `created_at` | `timestamptz` | default now() |

Indexes:

- `research_runs_case_id_idx`
- `research_runs_status_idx`

### `policy_sources`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | primary key |
| `case_id` | `uuid` | references `cases.id` |
| `research_run_id` | `uuid` | references `research_runs.id` |
| `source_type` | `text` | `refund_policy`, `warranty_policy`, `support_page`, `complaint_context`, `faq`, `other` |
| `url` | `text` | required |
| `title` | `text` | nullable |
| `quote_text` | `text` | nullable |
| `normalized_facts` | `jsonb` | extracted deadline, conditions, proof requirements |
| `confidence_score` | `numeric(4,3)` | nullable |
| `created_at` | `timestamptz` | default now() |

Indexes:

- `policy_sources_case_id_idx`
- `policy_sources_research_run_id_idx`

### `refund_strategies`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | primary key |
| `case_id` | `uuid` | references `cases.id` |
| `eligibility` | `text` | `eligible`, `likely_eligible`, `unclear`, `likely_ineligible` |
| `recommended_path` | `text` | `support_email_first`, `support_form_first`, `replacement_first`, `card_dispute`, `manual_review` |
| `fallback_path` | `text` | nullable |
| `deadline_at` | `timestamptz` | nullable |
| `plain_english_summary` | `text` | required |
| `reasoning_notes` | `jsonb` | evidence references and structured rationale |
| `created_at` | `timestamptz` | default now() |
| `updated_at` | `timestamptz` | default now() |

Indexes:

- `refund_strategies_case_id_idx`

### `drafts`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | primary key |
| `case_id` | `uuid` | references `cases.id` |
| `strategy_id` | `uuid` | references `refund_strategies.id` |
| `status` | `text` | `draft`, `approved`, `sent`, `failed` |
| `subject` | `text` | required |
| `body` | `text` | required |
| `tone` | `text` | `firm_polite`, `neutral`, `escalation_ready` |
| `approved_at` | `timestamptz` | nullable |
| `sent_at` | `timestamptz` | nullable |
| `created_at` | `timestamptz` | default now() |
| `updated_at` | `timestamptz` | default now() |

Indexes:

- `drafts_case_id_idx`

### `actions`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | primary key |
| `case_id` | `uuid` | references `cases.id` |
| `draft_id` | `uuid` | nullable, references `drafts.id` |
| `action_type` | `text` | `research_started`, `research_completed`, `strategy_created`, `draft_created`, `draft_approved`, `email_sent`, `email_failed`, `follow_up_recommended` |
| `status` | `text` | `pending`, `completed`, `failed` |
| `external_id` | `text` | nullable, email provider ID |
| `details` | `jsonb` | provider payload or timeline metadata |
| `created_at` | `timestamptz` | default now() |

Indexes:

- `actions_case_id_idx`
- `actions_action_type_idx`

### `messages`

Stores agent-visible conversation history references if persisted.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | primary key |
| `case_id` | `uuid` | references `cases.id` |
| `role` | `text` | `user`, `assistant`, `tool` |
| `message_text` | `text` | required |
| `tool_name` | `text` | nullable |
| `tool_payload` | `jsonb` | nullable |
| `created_at` | `timestamptz` | default now() |

Indexes:

- `messages_case_id_created_at_idx`

## Relationships

- one `profile` has many `cases`
- one `case` has many `artifacts`
- one `case` has many `research_runs`
- one `research_run` has many `policy_sources`
- one `case` has many `refund_strategies`, but only one current strategy is active in the UI
- one `case` has many `drafts`, but only one current draft is editable in the UI
- one `case` has many `actions`
- one `case` has many `messages`

## Recommended SQL Enums or Check Constraints

Lock these value sets with either Postgres enums or check constraints:

- `cases.status`
- `cases.issue_type`
- `cases.desired_outcome`
- `artifacts.kind`
- `research_runs.status`
- `policy_sources.source_type`
- `refund_strategies.eligibility`
- `refund_strategies.recommended_path`
- `drafts.status`
- `drafts.tone`
- `actions.action_type`
- `actions.status`

## Initial MVP Inngest Jobs

- `case/research-requested`
  - runs Firecrawl queries
  - writes `research_runs` and `policy_sources`
- `case/strategy-requested`
  - converts evidence into verdict and strategy
- `case/draft-requested`
  - creates the refund draft
- `draft/send-requested`
  - sends email and records delivery action

## Exact MVP Recommendation

Implement these routes first:

1. `POST /api/v1/cases`
2. `POST /api/v1/cases/:caseId/artifacts`
3. `POST /api/v1/cases/:caseId/research`
4. `GET /api/v1/cases/:caseId`
5. `POST /api/v1/cases/:caseId/strategy`
6. `POST /api/v1/cases/:caseId/drafts`
7. `POST /api/v1/drafts/:draftId/send`

Implement these agent tools first:

1. `lookup_policy_evidence`
2. `summarize_eligibility`
3. `create_refund_draft`
4. `get_case_status`

Defer `create_case` to agent usage only after the manual intake form is stable.
