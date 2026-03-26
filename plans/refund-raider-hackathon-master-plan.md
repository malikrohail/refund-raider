# Refund Raider — Hackathon Master Plan

Date: 2026-03-25

## Intent

Win the Firecrawl x ElevenLabs hackathon with a product that feels real, ships reliably, and cuts into a strong viral-style video without forcing a rewrite of the current repo.

This plan assumes the submission deadline in the brief you pasted is **March 26, 2026 at 5:00 PM** and therefore optimizes for a **tight, repeatable hero flow**, not broad product coverage.

## Executive Call

Keep the product name **Refund Raider** for the submission.

Use this positioning:

- public hackathon story: `AI refund assistant`
- product subtitle: `The consumer action agent for refunds, returns, cancellations, and billing fights`

That keeps the repo's broader ambition intact while making the submission instantly legible.

## What The Repo Already Has

The repo is materially ahead of the original MVP docs.

Confirmed working right now:

- unit test suite passes: `48/48`
- production build passes
- Firecrawl-backed research flow exists
- evidence-backed strategy and draft flow exists
- email send flow exists with real/mocked provider handling
- ElevenLabs intake and case-agent runtime inspection exists
- provider-readiness and operator-status UI exists
- submission pack docs already exist

Important repo reality:

- the live product surface has expanded from `refund assistant` to `consumer action agent`
- the landing page and intake already mention cancellations, billing fights, Gmail, and browser runtime
- the hackathon docs consistently recommend a **narrow ecommerce refund wedge**
- browser automation and Gmail are real upside, but they are still demo-risk multipliers if they become required

## Current Risks

### Story risk

The app is currently more ambitious than the winning demo should be. The codebase says `consumer action agent`; the submission wants `refund advocate for one hero case`.

### Demo risk

The more you rely on Gmail, browser extension pairing, or non-email merchant flows, the more brittle the live demo becomes.

### Release risk

The build passes, but there are still cleanup items:

- `middleware.ts` triggers a Next.js deprecation warning
- CSS shadow token warnings appear during build
- `app/api/inngest/route.ts` is still a stub
- root-level repo presentation is still thin compared with how much product work exists

## Strategic Decision

For the hackathon, do **not** sell the whole platform.

Sell one sharp sentence:

> Refund Raider reads the merchant's rules, tells you if you qualify, drafts the refund request, and sends it for you.

Then let the broader ambition appear as a subtle second-order insight:

- yes, the product can grow into cancellations, replacements, billing fights, and portal automation
- no, none of that should be on the critical path for the submission video

## The Winning Wedge

### Hero scenario

Use one of these only:

1. damaged item
2. wrong item
3. missing item

Best shape:

- public merchant policy
- clear return/refund language
- support email exists
- one uploaded proof artifact
- optional Gmail context only if it is absolutely reliable

### Best demo structure

1. User states the problem in voice or one short sentence.
2. Refund Raider opens a case.
3. Firecrawl gathers policy/support evidence.
4. Verdict appears with visible evidence.
5. ElevenLabs explains the verdict in plain English.
6. Draft appears.
7. User approves and sends.
8. Timeline updates.

That is the canonical winning loop.

## Product Positioning

### What judges should understand in 5 seconds

`This app gets your refund for you.`

### What makes it non-generic

- Firecrawl is not decorative; it is the source of the actual policy path.
- ElevenLabs is not decorative; it is the advocate layer that explains and guides.
- The action is real; the email is drafted and sent.
- The verdict is inspectable; every important claim has evidence behind it.

### What not to lead with

- browser extension
- generalized action engine
- subscription cancellations as the main story
- "AI operator platform" language
- infrastructure depth

## Repo-To-Submission Translation

### Keep

- `Refund Raider` name
- evidence cards
- verdict screen
- live voice advocate
- draft and send flow
- status timeline
- provider-readiness surfaces for internal rehearsal

### Downplay

- browser automation
- full Gmail workflow
- generalized action-plan language
- non-refund categories on the landing page

### Reframe

- `consumer action agent` becomes the long-term thesis
- `refund assistant` becomes the hackathon submission wedge

## Skills.sh Stack

This plan should explicitly use the `skills.sh` ecosystem as part of the submission workflow, especially for video production.

### Core skill stack

1. `find-skills`
   - use first to discover adjacent video, caption, thumbnail, and audio skills fast
   - this is the discovery layer before committing to a workflow

2. `elevenlabs-remotion`
   - use for scene-by-scene voiceover generation
   - use request stitching so the narration sounds like one continuous performance
   - use its timing validation to keep voiceover synced to visuals
   - use thumbnail embedding for the final exported MP4

3. `text-to-speech` from `elevenlabs/skills`
   - use when you need smaller fallback audio clips, alt takes, or cleaner isolated narration generation
   - use official ElevenLabs model/voice guidance when the Remotion-specific workflow is not needed

4. `elevenlabs-music`
   - use for the background score
   - generate 10s, 30s, and 60-90s variations so you can test pacing quickly
   - keep the final track understated; narration remains primary

5. `mediabunny` from `remotion-dev/skills`
   - use for media prep: duration checks, extraction, transcoding, and asset cleanup before Remotion render

6. Remotion itself
   - use for the final polished composition
   - render both landscape and vertical variants from the same scene structure

### Skills install list

Use this as the planned install/update sequence:

```bash
npx skills update
npx skills add https://github.com/maartenlouis/elevenlabs-remotion-skill --skill elevenlabs-remotion
npx skills add https://github.com/elevenlabs/skills --skill text-to-speech
npx skills add https://github.com/inferen-sh/skills --skill elevenlabs-music
npx skills add https://github.com/remotion-dev/skills --skill mediabunny
```

### Skills-driven video workflow

1. Lock the 60-90 second script.
2. Break it into scene JSON.
3. Generate stitched narration with `elevenlabs-remotion`.
4. Generate a subtle music bed with `elevenlabs-music`.
5. Prepare screenshots, crops, and any extracted stills with `mediabunny`.
6. Assemble the master video in Remotion.
7. Export:
   - 16:9 submission version
   - 9:16 TikTok/Reels version
   - thumbnail still
8. Embed the thumbnail into the MP4 for cleaner social previews.

## Required Narrative Assets

You already have strong raw material in `docs/submission/`.

The missing job is to turn those docs into a single locked production workflow:

- hero scenario
- backup scenario 1
- backup scenario 2
- voiceover script
- shot list
- final thumbnail
- platform-specific captions

## Workstreams

## Lane 1 — Story Lock

### Goal

Make the submission instantly understandable and impossible to misread.

### Tasks

- freeze one hero merchant and issue
- pick two backup merchants
- rewrite any visible UI copy that broadens the story too early
- keep all verbal and visual language anchored in `refund`, `evidence`, `draft`, `send`

### Exit criteria

- one-sentence hook
- one repeatable hero flow
- no critical demo dependency on browser runtime

## Lane 2 — Product Lock

### Goal

Turn the existing repo from `many promising surfaces` into `one undeniable path`.

### Tasks

- ensure hero flow works in configured mode
- rehearse the exact research -> verdict -> draft -> send path end to end
- reduce UI distraction on the landing page and intake if needed
- make the case page the obvious visual centerpiece

### Exit criteria

- no dead-end in hero flow
- no confusing alternative paths visible in the video
- one screenshot of the case page explains the product

## Lane 3 — ElevenLabs Lock

### Goal

Make the agent feel like a refund advocate, not a generic support bot.

### Tasks

- keep the repo-owned prompt and first message as source of truth
- sync the live agent to the repo workflow if needed
- tune the first spoken exchange so it lands fast
- ensure the agent explains evidence, deadline, and next action clearly

### Exit criteria

- first agent response is specific
- no generic chitchat
- tool calls match the case workflow cleanly

## Lane 4 — Firecrawl Lock

### Goal

Make the evidence feel authoritative and visual.

### Tasks

- verify the hero merchant returns useful search results consistently
- pre-test the exact policy/support queries
- make sure quotes, deadlines, and support path are visible on-screen
- cache or pre-stage the hero case if live variability becomes risky

### Exit criteria

- evidence is legible in the video
- at least one support path is extracted cleanly
- no ambiguous verdict during the hero run

## Lane 5 — Submission Video

### Goal

Produce a short, punchy, social-native video that wins attention before the viewer understands the architecture.

### Tasks

- open with the outcome, not the stack
- show product motion in the first 3-5 seconds
- show voice and evidence early
- keep narration tight and high-agency
- cut any step that only matters to builders, not judges

### Exit criteria

- 60-90 second master cut
- 30-45 second social cut
- 9:16 export
- captioned version
- clean cover image

## Triage: What To Build, What To Cut

## Must do before submission

- lock the hero merchant
- verify live provider path
- polish verdict/evidence area for screenshotability
- tune the first ElevenLabs interaction
- record and edit the video
- prepare social copy for X, LinkedIn, Instagram, and TikTok

## Only do if already stable

- Gmail-assisted lookup
- backup merchant switching
- secondary non-email fallback state

## Do not add now

- live outbound calls
- browser portal automation as a required step
- broad cancellation marketing as the primary hook
- new verticals
- major architecture migrations unless they directly unblock the demo

## Recommended Next 24-Hour Sequence

### Block 1 — Product narrowing

- freeze the public story
- freeze the hero merchant
- freeze the exact demo script

### Block 2 — Reliability

- run the hero case repeatedly in configured mode
- resolve any evidence or send-path instability
- verify backup cases

### Block 3 — Visual polish

- tighten the verdict screen
- tighten the draft screen
- tighten the send-state timeline

### Block 4 — Video production

- generate narration
- generate music
- cut the Remotion composition
- export horizontal and vertical variants

### Block 5 — Distribution

- upload submission
- post natively on X
- post natively on LinkedIn
- crop and post on Instagram Reels
- crop and post on TikTok

## Success Gates

The submission is ready when all of this is true:

- a cold viewer understands the product within 5 seconds
- the hero flow completes without improvisation
- the video shows both Firecrawl and ElevenLabs doing meaningful work
- the verdict is visibly evidence-backed
- the send moment is real
- the social cuts look native, not like a screen recording dump

## After The Hackathon

Once the submission is shipped, the broader thesis is strong:

- refunds
- returns
- cancellations
- billing disputes
- account-bound support flows
- browser-assisted execution

But that is phase two.

For this hackathon, the winning move is discipline:

**one wedge, one proof loop, one killer video.**
