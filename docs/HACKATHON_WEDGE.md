# Refund Raider Hackathon Wedge

## Goal

Win the hackathon by solving a real refund problem with a demo that is:

- immediately understandable
- visually strong
- repeatable under pressure
- clearly powered by both Firecrawl and ElevenLabs

## Chosen Use Case

Refund Raider should optimize for one narrow wedge first:

- ecommerce
- damaged item
- wrong item
- missing item
- public refund / return policy
- merchant support path available

This is the strongest wedge because it fits the current product and creates a clean demo:

1. upload proof
2. find policy
3. explain qualification
4. generate draft
5. send

## Hero User Story

"I bought something online, it arrived damaged or incorrect, support is annoying, and I want the fastest path to getting my money back."

## Medium Strategy

### 1. Email

Best fit for v1.

Use when:

- a merchant support email is available
- the policy supports a written request
- the user needs a concrete action taken on their behalf

Why it is primary:

- already implemented
- easiest to verify
- easiest to explain in the demo
- lowest operational risk

### 2. Web form / support portal

Secondary path.

Use when:

- the merchant exposes a support form instead of an email
- the policy is clear but the medium is site-specific

How to handle in the product right now:

- still generate the refund message
- still explain the evidence and recommended path
- mark the case as "manual submit required" instead of "sent"

Why it is not primary:

- brittle
- site-dependent
- weaker for the first hackathon demo

### 3. In-app cancellation or account settings flow

Use later for:

- subscriptions
- memberships
- SaaS tools

How to think about it:

- this is a different product shape from ecommerce returns
- it needs different policy extraction and action flows
- it should be treated as a second vertical, not folded into the first one

### 4. Phone support

Use later for:

- complex escalations
- large merchants with phone-first support
- cases where written support fails

Why it is deferred:

- high theatrical upside
- high reliability risk
- not suitable for the first locked demo path

## ElevenLabs' Role

ElevenLabs is not the workflow engine.

It is the **refund advocate layer**:

- asks follow-up questions
- explains whether the user likely qualifies
- explains why
- tells the user what evidence matters
- guides the user to the next action

The app owns:

- case state
- policy evidence
- draft generation
- approval state
- sending state
- timeline

## What the Demo Should Show

The user should feel:

- "this understands my problem"
- "this knows the rules"
- "this is doing the annoying part for me"

The judges should see:

1. a real refund problem
2. live evidence gathering
3. a spoken explanation
4. a generated refund request
5. a real action sent

## Iteration Plan

### Iteration 1

Focus only on:

- ecommerce returns
- damaged/wrong/missing item
- email-first resolution

### Iteration 2

Add:

- better routing for order-status-first conversations
- stronger manual fallback for form-based merchants

### Iteration 3

Explore:

- subscription cancellation vertical
- phone escalation
- merchant-specific playbooks

## Success Criteria

- a user understands the product in under 10 seconds
- the ElevenLabs conversation feels useful, not decorative
- the product can complete the email-first refund path end to end
- the same flow can be repeated live during the submission video

## Submission Pack

Use the RR-11 pack as the locked narrative for submission assets:

- [RR-11 submission pack](./submission/RR-11_SUBMISSION_PACK.md)
