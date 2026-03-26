# Workflow Baselines

This folder stores exported ElevenLabs workflow baselines and active workflow snapshots so changes can be tracked in the repo.

Current files:

- `refundRaiderBaseWorkflow.mmd`
- `refundRaiderBaseWorkflow.json`
- `refundRaiderWorkflow-v1-returns.mmd`
- `refundRaiderWorkflow-v1-returns.json`

Important:

- `refundRaiderBaseWorkflow.*` is the template-derived baseline captured from ElevenLabs
- `refundRaiderWorkflow-v1-returns.*` is the active Refund Raider returns workflow snapshot
- Refund Raider's real application workflow still lives in the app and service layer
- ElevenLabs is the live editing surface; this folder is the repo snapshot of that live workflow
- when the live workflow changes, export both files here and keep them in lockstep with `src/lib/agent/refundRaiderAgentConfig.ts`
- if the live workflow and the repo snapshot disagree, treat the repo files as stale until the next export lands here
