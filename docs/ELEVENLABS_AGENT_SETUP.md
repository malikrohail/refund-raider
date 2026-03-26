# ElevenLabs Agent Setup

This project uses **ElevenAgents / ConvAI** for the conversational layer.

## Decision

Use an **ElevenLabs prebuilt support-style template as the starting point**, then customize it for Refund Raider.

Do **not** move the actual refund workflow into ElevenLabs.

Refund Raider itself owns:

- case creation
- policy research
- strategy generation
- draft creation
- approval and send
- timeline state

ElevenLabs owns:

- the voice/text conversational surface
- prompt behavior
- tool invocation

## Recommended Starting Template

Pick the closest support / customer-service / assistant-style template available in the ElevenLabs UI.

What matters:

- it should already handle conversational turn-taking well
- it should feel service-oriented, not entertainment-oriented
- it should be easy to constrain with tool-first behavior

## Required Customization

### Agent identity

- name: `Refund Raider`
- role: refund advocate
- voice goal: trustworthy, practical, not robotic

### First message

Use the repo source of truth:

- [refundRaiderAgentConfig.ts](/Users/test/Downloads/hahk/src/lib/agent/refundRaiderAgentConfig.ts)

### Prompt

Use the repo source of truth:

- [refundRaiderAgentConfig.ts](/Users/test/Downloads/hahk/src/lib/agent/refundRaiderAgentConfig.ts)

### Tool names

The live ElevenLabs agent must have the repo tool contract attached before the custom
voice UI can be considered real. The required tool surface is larger than the original
hackathon list and now includes:

- intake tools:
  - `get_intake_state`
  - `update_intake_fields`
  - `capture_user_problem`
  - `connect_gmail`
  - `search_gmail_messages`
  - `select_gmail_message`
  - `create_case`
- case tools:
  - `lookup_policy_evidence`
  - `summarize_eligibility`
  - `create_refund_draft`
  - `send_refund_email`
  - `get_case_status`
  - `build_action_plan`
  - `request_user_consent`
  - `execute_case_action`
  - `schedule_follow_up`
- browser tools:
  - `start_browser_session`
  - `browser_snapshot`
  - `browser_navigate`
  - `browser_click`
  - `browser_type`
  - `browser_scroll`
  - `browser_wait_for_text`
  - `browser_extract`
  - `browser_press_key`

## Tool Configuration Notes

- make `lookup_policy_evidence` blocking
- make `summarize_eligibility` blocking
- make `create_refund_draft` blocking
- make `send_refund_email` blocking
- make `get_case_status` blocking if the agent depends on the response before answering

Blocking is important because Refund Raider wants the agent to wait for the app’s result and then explain it.

## Runtime Strategy

The app should prefer:

1. signed URL / private agent flow when server credentials are configured
2. plain `agentId` flow when the agent is public
3. mock mode only when ElevenLabs is not configured

## API Sync Path

If the ElevenLabs UI is unreliable or you want a repeatable way to push the repo-owned prompt and workflow to the live agent, use:

```bash
npm run sync:elevenlabs-agent:dry
npm run sync:elevenlabs-agent
```

What it does:

- fetches the current live agent from ElevenLabs
- creates any missing client tools from `workflow/refundRaiderToolManifest.json`
- attaches all required tool IDs to the live agent
- preserves the existing conversation config shape
- replaces the base system prompt and first message from the repo
- replaces the live workflow with `workflow/refundRaiderWorkflow-v1-returns.json`

This is the preferred path when you want the repo to stay the source of truth.

## Workflow Baseline Tracking

The current template-derived workflow baseline is tracked in:

- [refundRaiderBaseWorkflow.mmd](/Users/test/Downloads/hahk/workflow/refundRaiderBaseWorkflow.mmd)
- [refundRaiderBaseWorkflow.json](/Users/test/Downloads/hahk/workflow/refundRaiderBaseWorkflow.json)
- [refundRaiderWorkflow-v1-returns.mmd](/Users/test/Downloads/hahk/workflow/refundRaiderWorkflow-v1-returns.mmd)
- [refundRaiderWorkflow-v1-returns.json](/Users/test/Downloads/hahk/workflow/refundRaiderWorkflow-v1-returns.json)

## Repo-vs-Live Sync

ElevenLabs is the live editing surface. This repo stores the reviewed export snapshots.

Sync process:

1. make the workflow change in ElevenLabs
2. export the workflow as both `.mmd` and `.json`
3. replace the matching files in `workflow/`
4. update `src/lib/agent/refundRaiderAgentConfig.ts` if the prompt, first message, or tool contract changes
5. commit the repo export only after the live workflow and the repo snapshot match

Rules:

- `refundRaiderBaseWorkflow.*` is the captured template baseline
- `refundRaiderWorkflow-v1-returns.*` is the active Refund Raider returns workflow snapshot
- if the live workflow and repo snapshot differ, the repo copy is stale until re-exported
- keep the exported workflow and the agent config aligned in the same change whenever possible

## Non-Goals

Do not use ElevenLabs as:

- the case database
- the workflow engine
- the source of truth for refund state
- the place where draft approval happens

Those responsibilities stay in the app.
