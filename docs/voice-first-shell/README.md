# Voice-First Shell

## Product Principle

Refund Raider should feel like a live operator, not a form with a chatbot bolted on.

Voice or chat is the primary shell.
Structured fields, evidence cards, and drafts are secondary inspection surfaces.

## UX Shape

### Landing

- primary CTA: talk to Refund Raider
- headline focuses on fixes, cancellations, replacements, refunds, and billing fights
- the visual story is `talk -> plan -> approve -> execute`

### Intake

- start with the live intake agent
- gather facts in conversation first
- use Gmail, paste mode, and uploads as evidence enrichers
- keep editable fields visible for correction, but not as the main interaction mode

### Case Workspace

- top-level surfaces:
  - conversation
  - evidence and verdict
  - action plan
  - approvals
  - execution state
  - follow-up queue
- the user should always know:
  - what the system believes
  - what it plans to do
  - what needs approval
  - what already ran
  - what happens next

## Approval Boundary

Voice-first does not mean permissionless.

Sensitive actions still require explicit approval:

- outbound sends
- portal or account-changing actions
- anything that could commit on the user's behalf

The shell should make those approvals feel like part of the conversation, not a context switch.
