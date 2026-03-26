# Reference Video Breakdown

Date: 2026-03-26

Reference source:

- `https://www.youtube.com/watch?v=cvxR_Ld9KTM&feature=youtu.be`

Local analysis assets:

- video: `/Users/test/Downloads/hahk/.tmp/reference-video/reference.mp4`
- audio: `/Users/test/Downloads/hahk/.tmp/reference-video/reference-audio.mp3`
- captions: `/Users/test/Downloads/hahk/.tmp/reference-video/reference.en.vtt`
- sampled frames: `/Users/test/Downloads/hahk/.tmp/reference-video/frames/`
- contact sheet A: `/Users/test/Downloads/hahk/.tmp/reference-video/contact-sheet-a.jpg`
- contact sheet B: `/Users/test/Downloads/hahk/.tmp/reference-video/contact-sheet-b.jpg`

## Basic Facts

- duration: `114.06s`
- resolution: `562x360`
- frame rate: `30 fps`

## What The Reference Actually Does Well

This video is not visually impressive because of advanced motion design.

It works because it has a clear structure:

1. pain-first hook
2. fast system explanation
3. live demo
4. guided narration over real product behavior
5. concrete end state

The important lesson is not the exact visual style.

The important lesson is:

- open with pain, not product chrome
- explain the system in one breath
- show the thing working immediately after
- keep the voice synchronized to visible changes

## Structure Breakdown

### 0s to 6s — Pain Hook

Observed:

- opens on a real human/productivity pain visual
- first line is a complaint/problem statement
- uses a cinematic insert before the product walkthrough

Takeaway for Refund Raider:

- do not open on the dashboard
- open on broken item / ignored support / refund chaos
- use a generated or captured insert for the first beat

### 6s to 30s — Fast System Explanation

Observed:

- cuts into the product quickly
- explains the agent pipeline in plain English
- shows the browser UI while the narration describes each component
- uses bottom captions as the primary text treatment

Takeaway for Refund Raider:

- one concise line for Firecrawl
- one concise line for ElevenLabs
- one concise line for draft/send
- avoid long feature tours

### 33s to 46s — Demo Setup With Dialogue

Observed:

- switches from “what it is” to “show me”
- short conversational exchange
- the interaction itself becomes the setup

Takeaway for Refund Raider:

- use one short intake or agent moment
- do not make the user watch a long form fill
- one question and one useful answer is enough

### 46s to 74s — Explain The Internal Flow While Showing It

Observed:

- uses a board/flow view to explain what the agent is doing
- narration walks through the logic while the viewer watches the system state

Takeaway for Refund Raider:

- this is where your evidence scene should live
- use a tight crop on the evidence card, deadline, and support path
- if needed, show one compact “research flow” visual, but keep the actual proof visible

### 74s to 110s — Task Execution

Observed:

- shows the target site and concrete actions
- each micro-step is described, then visibly happens
- the video gains trust because the execution is inspectable

Takeaway for Refund Raider:

- show verdict
- show quote
- show draft
- show send
- show timeline

Every narrated claim should correspond to a visible UI moment.

### 110s to End — Wrap

Observed:

- very short ending
- no extra theory

Takeaway for Refund Raider:

- close on sent/timeline state and one sharp line
- no platform vision at the end

## Visual Language Notes

### What to borrow

- bottom-caption style rhythm
- 3-5 second scene cadence
- “say it, then show it” pacing
- quick switch from hook to proof
- one or two non-product inserts to create energy

### What not to copy directly

- the exact product domain
- long architecture-board time
- low-resolution browser footage look
- generic “AI agents” language

## Audio Notes

The narration does most of the work.

What matters:

- short sentence units
- direct language
- visual sync
- no long abstract claims without a matching screen change

For Refund Raider, the voice should do this:

- name the problem
- name the evidence
- name the verdict
- name the action

## Refund Raider Translation

Map the reference shape to this:

### Beat 1

- broken item / ignored support insert
- line: `Getting a refund should not feel like detective work.`

### Beat 2

- upload proof + case intake
- line: `You give Refund Raider the problem and the proof once.`

### Beat 3

- Firecrawl evidence crop
- line: `Firecrawl finds the actual policy, deadline, and support path.`

### Beat 4

- ElevenLabs advocate crop with transcript overlay
- line: `ElevenLabs explains whether you qualify and what to do next.`

### Beat 5

- draft and send
- line: `Then the request is drafted, approved, and sent.`

### Beat 6

- timeline end state
- line: `Reads the rules. Gets your refund.`

## Immediate Editing Implications

Based on this reference, the current Refund Raider videos should change in these ways:

1. Replace the current screenshot-first opening.
2. Use tighter cropped proof scenes instead of full-page browser views.
3. Add bottom-caption or transcript-chip rhythm to the Remotion scenes.
4. Keep scene length closer to 3-8 seconds instead of letting screenshots sit.
5. Use one live ElevenLabs moment, but keep it short and high-signal.
6. Land on the send/timeline state without extra explanation afterward.

## Recommended Next Build

Rebuild `v01-clean-winner` first using this pacing model:

- 0-5s: pain hook
- 5-12s: intake
- 12-22s: evidence
- 22-32s: agent explanation
- 32-42s: draft
- 42-50s: send + timeline
- 50-60s: optional branded close or challenge compression

That will get much closer to the energy of the reference without drifting away from the actual Refund Raider proof loop.
