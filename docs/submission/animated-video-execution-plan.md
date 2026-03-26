# Animated Submission Video Execution Plan

Date: 2026-03-26

## Goal

Turn the current submission videos from screenshot-led product explainers into a tighter, more animated submission package where:

- Remotion owns the master timeline, motion system, typography, and exports
- ElevenLabs owns voice, music, and selected generated visual inserts
- the product UI remains the proof layer, not the entire visual language

This plan assumes the current folders stay in place:

- `submission-videos/v01-clean-winner`
- `submission-videos/v02-frustration-to-relief`
- `submission-videos/v03-voice-magic`
- `submission-videos/v04-challenge-format`

## Current Diagnosis

The existing cuts are structurally clean but visually too static.

What is working:

- the hero refund loop is correct
- the repo already has a repeatable capture, audio, and render pipeline
- the voiceovers and music prompts are usable starting points
- the four concepts already map well to different audiences

What is not working:

- the current Remotion composition is mostly `screenshot + text card`
- too much frame area is occupied by full-page UI
- motion is limited to a slow image scale
- ElevenLabs feels narrated, not visibly central
- the submission risks feeling like a dashboard walkthrough instead of a product story

## Strategic Call

Use a hybrid structure.

Do not try to generate the whole video with ElevenLabs.

Do not keep the whole video as raw dashboard capture.

Instead:

1. Keep `v01-clean-winner` as the judged master submission.
2. Keep `v04-challenge-format` as the short-form derivative.
3. Keep `v03-voice-magic` as an optional branch only if the live agent clip is genuinely excellent.
4. Rebuild the master composition so each scene mixes:
   - cropped live product proof
   - animated text or callouts
   - a small number of ElevenLabs-generated visual inserts
   - stronger transitions and scene-local timing

## Tool Roles

### Remotion

Use Remotion as the master composition layer for:

- scene sequencing
- transitions
- kinetic text
- quote highlights
- progress/timer overlays
- waveform or transcript overlays
- final 16:9 and 9:16 exports

The composition should move from one reusable scene system to a scene-specific system.

### ElevenLabs Text-to-Speech

Use ElevenLabs TTS for:

- stitched narration
- alternate takes for the hook line
- short replacement lines for scene-specific pacing fixes

Prefer scene-level generation with stitched context rather than one monolithic block of narration.

### ElevenLabs Music

Use ElevenLabs Music for:

- one restrained 60-70 second bed for the judged video
- one more urgent 45-55 second bed for `v04-challenge-format`

The music should stay underneath the narration. Do not let it carry the emotion by itself.

### ElevenLabs Image & Video

Use ElevenLabs generated visuals only for short inserts:

- opening problem-state visual
- one transition insert between evidence and advocate
- one payoff insert near send/timeline completion

These inserts should be 4-8 seconds each and should support the story, not replace product proof.

Good uses:

- broken-package cold open
- stylized “policy maze” transition
- short lipsynced or audio-reactive advocate moment

Bad uses:

- full UI replacement
- main proof scenes
- entire 60-second video generation

### Product Capture

Use actual product capture for:

- intake
- evidence card
- ElevenLabs conversation panel
- draft
- send state
- timeline completion

The app must remain the evidence layer.

## Skills Plan

### Already installed locally

- `skills/remotion-best-practices/SKILL.md`
- `skills/agents/SKILL.md`
- `skills/music/SKILL.md`
- `skills/text-to-speech/SKILL.md`

### Use from the repo skill inventory

- `repo/skills/video-editing/SKILL.md`

### Optional additions from skills.sh

Install only if you want more automation around stitched voiceover or media prep:

```bash
npx skills update
npx skills add https://github.com/maartenlouis/elevenlabs-remotion-skill --skill elevenlabs-remotion
npx skills add https://github.com/remotion-dev/skills --skill mediabunny
```

Use `elevenlabs-remotion` for scene-by-scene narration helpers and `mediabunny` for duration checks, trims, and cleanup.

## Recommended Story Shape

Use this 6-scene spine for the judged submission.

### Scene 1 — Hook: 5-7s

Objective:

- make the pain legible immediately
- avoid opening on a dashboard

Visual:

- ElevenLabs-generated broken-package or refund-chaos insert
- large title treatment
- fast cut into product proof

Line:

- `You should not need to become a policy investigator just to get your money back.`

### Scene 2 — Intake: 8-10s

Objective:

- show the user gives the problem and proof once

Visual:

- cropped intake surface
- file upload reveal
- typed complaint summary
- animated highlight around the proof block

### Scene 3 — Firecrawl Evidence: 10-12s

Objective:

- prove that Firecrawl is not decorative

Visual:

- evidence card crop, not full page
- animated zoom to quote
- deadline badge
- support path callout
- source URL emphasis

This is one of the most important scenes in the whole video.

### Scene 4 — ElevenLabs Advocate: 10-12s

Objective:

- make ElevenLabs feel like the explanation layer

Visual:

- product agent panel or controlled live clip
- waveform/transcript overlay in Remotion
- one highlighted answer:
  - qualification
  - deadline
  - next action

If the live clip is weak, recreate the moment with captured UI plus animated transcript instead of relying on raw session footage.

### Scene 5 — Draft and Send: 10-12s

Objective:

- show the action becomes real

Visual:

- draft crop with subject/body focus
- type-on animation for the strongest line
- send CTA
- confirmation state

### Scene 6 — Timeline / Payoff: 6-8s

Objective:

- land the loop

Visual:

- timeline update
- sent state
- strong closing line

Line:

- `Reads the rules. Gets your refund.`

## Variant Rules

### `v01-clean-winner`

Primary judged submission.

- most product-legible
- least risky
- best place for the hybrid animated system

### `v02-frustration-to-relief`

Use the same rebuilt scene system, but swap:

- colder opening visuals
- slightly more emotional VO
- more contrast between before and after

### `v03-voice-magic`

Only use as a serious branch if the ElevenLabs clip is excellent.

- the voice moment must be fast
- the answer must sound sharp
- the UI must remain readable while voice is happening

If not, keep this as a secondary export only.

### `v04-challenge-format`

Derive from the same scene system.

- add countdown or timer overlays
- compress the setup aggressively
- keep it under 55 seconds

## Required Pipeline Changes

### 1. Better asset capture

Upgrade `scripts/capture-submission-assets.mjs` so it captures more targeted proof assets instead of only full-page screenshots.

Add captures for:

- isolated verdict card
- isolated evidence quote
- isolated deadline / support path area
- tighter agent panel crop
- tighter draft crop
- tighter timeline crop

The existing full-page screenshots can stay as backups.

### 2. Scene-level audio generation

Upgrade `scripts/generate-submission-audio.mjs` so narration can be generated per scene instead of one long `voiceover.mp3` per cut.

Target output shape:

- `public/submission-videos/audio/<video-id>/scene-01.mp3`
- `public/submission-videos/audio/<video-id>/scene-02.mp3`
- ...

Benefits:

- easier pacing
- easier retakes
- easier sync in Remotion
- easier dynamic duration calculation

### 3. Generated visual inserts

Add a new script for ElevenLabs image/video generation.

Suggested file:

- `scripts/generate-submission-video-inserts.mjs`

Target output shape:

- `public/submission-videos/generated/<video-id>/hook.mp4`
- `public/submission-videos/generated/<video-id>/transition.mp4`
- `public/submission-videos/generated/<video-id>/payoff.mp4`

Keep these inserts short and optional.

### 4. Rebuild the Remotion scene system

Refactor `submission-videos/studio/src/SubmissionCut.tsx` from one generic scene renderer into specialized scene components.

Suggested structure:

- `HookScene`
- `IntakeScene`
- `EvidenceScene`
- `AgentScene`
- `DraftScene`
- `TimelineScene`

Each scene should own:

- its own motion
- its own overlay layout
- its own caption / text behavior
- its own crop strategy

### 5. Dynamic timing

Add Remotion metadata calculation so composition duration follows audio duration instead of hard-coded scene seconds.

Use the Remotion voiceover guidance for:

- audio-duration-based scene timing
- scene duration arrays
- total duration calculation

### 6. Transition system

Introduce a real transition layer.

Recommended:

- short fade or slide between proof scenes
- one stronger branded transition near the ElevenLabs scene
- optional overlay effect instead of heavy transition spam

## File Plan

Most likely files to change:

- `scripts/capture-submission-assets.mjs`
- `scripts/generate-submission-audio.mjs`
- `scripts/render-submission-videos.mjs`
- `submission-videos/studio/src/videoConfigs.ts`
- `submission-videos/studio/src/SubmissionCut.tsx`

Most likely new files:

- `scripts/generate-submission-video-inserts.mjs`
- `submission-videos/studio/src/scenes/HookScene.tsx`
- `submission-videos/studio/src/scenes/IntakeScene.tsx`
- `submission-videos/studio/src/scenes/EvidenceScene.tsx`
- `submission-videos/studio/src/scenes/AgentScene.tsx`
- `submission-videos/studio/src/scenes/DraftScene.tsx`
- `submission-videos/studio/src/scenes/TimelineScene.tsx`
- `submission-videos/studio/src/lib/audioDurations.ts`

## Command Flow

Base local flow:

```bash
npm run dev
npm run video:capture
npm run video:audio
npm run video:render
```

Extended flow with generated inserts:

```bash
npm run dev
npm run video:capture
node scripts/generate-submission-video-inserts.mjs
npm run video:audio
npm run video:render
```

If you add skill-based helpers from `skills.sh`, place them before final render, not after.

## Acceptance Criteria

The rebuilt judged submission is good enough when:

- the first 5 seconds do not open on a dashboard
- Firecrawl visibly produces evidence, not just branding
- ElevenLabs visibly explains a real case moment
- the draft/send step feels like a real action, not a mockup
- at least 3 scenes have meaningful motion beyond simple zoom
- the final cut still exports repeatably from Remotion CLI
- `v01` remains the master and `v04` can be derived quickly from the same system

## Immediate Next Step

Implement in this order:

1. recapture tighter proof assets
2. refactor the Remotion scene architecture
3. switch narration to scene-level audio
4. add one ElevenLabs-generated hook insert
5. render `v01` again before touching the other variants

## Final Rule

The submission should feel like:

- problem
- proof
- explanation
- action

Not:

- dashboard
- dashboard
- dashboard
- narration
