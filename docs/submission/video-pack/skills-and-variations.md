# Skills And Variations

This file makes the full skill coverage explicit so the planning pack does not rely on implied workflow knowledge.

## Planning Skills

### `blueprint`

Use for:

- the overall pack structure
- the per-folder execution shape
- cold-start readability for whichever concept gets chosen

### `search-first`

Use for:

- researching tools before implementation
- checking whether a new helper, template, or workflow already exists
- discovering adjacent skills before building custom glue

### `skill-creator`

Use only if:

- a required skill is actually missing
- you need a project-specific execution skill later

For this planning pass, it is not required because the relevant skills already exist.

## Core Video Production Skills

### `elevenlabs-remotion`

Use for:

- stitched narration
- scene timing
- voiceover generation tied to visual structure

### `text-to-speech`

Use for:

- alternate narration takes
- emergency fallback voice generation
- short inserts where the Remotion pipeline is overkill

### `elevenlabs-music`

Use for:

- background score generation
- testing multiple pacing moods
- creating a quieter judged-submission bed and a punchier short-form bed

### `mediabunny`

Use for:

- asset prep
- media cleanup
- duration checks
- export hygiene

### Remotion

Use for:

- final composition
- overlays
- timers
- transcript treatment
- end cards

### `video-editing`

Use for:

- edit decision list creation
- pacing decisions
- platform reframing rules
- keeping the production workflow disciplined

## Content And Distribution Skills

### `content-engine`

Use for:

- concept-level hooks
- rewriting the same proof loop for different platform-native openings
- short-form caption framing

### `crosspost`

Use for:

- adapting the final launch copy across X, LinkedIn, Threads, and Bluesky
- ensuring the same cut is not described the same way everywhere

### `article-writing`

Use for:

- longer submission copy
- launch notes
- LinkedIn/founder-style framing

## Optional Polish Skills

### `design-consultation`

Use only if:

- you want a more deliberate visual identity for the video system itself
- you decide to build branded cover frames, title cards, or asset kits

### `design-review`

Use only when:

- actual frames and exports exist
- you want a visual QA pass on the cover image, opening shot, typography, spacing, and motion

## Variation Set

Each concept should support these variations:

### Variation A — Judged submission

- 60-90 seconds
- cleanest explanation
- strongest sponsor clarity
- lowest gimmick factor

### Variation B — TikTok / Reels

- 20-45 seconds
- hardest hook
- faster cuts
- more visual tension

### Variation C — X native video

- 30-60 seconds
- punchy first line
- dense proof loop
- end on one crisp thesis

### Variation D — LinkedIn

- 45-90 seconds
- slightly more framing
- more credibility and product thesis
- less gimmick, more practical value

## Variation Ownership By Skill

| Variation | Primary skill(s) |
|---|---|
| Judged submission | `blueprint`, `video-editing`, `elevenlabs-remotion`, Remotion |
| TikTok / Reels | `content-engine`, `video-editing`, `elevenlabs-music`, Remotion |
| X native video | `content-engine`, `crosspost`, `elevenlabs-remotion` |
| LinkedIn | `article-writing`, `content-engine`, `crosspost` |

## Recommended Full Stack By Phase

### Phase 1 — Choose concept

- `blueprint`
- `content-engine`
- `search-first`

### Phase 2 — Prepare production plan

- `video-editing`
- `elevenlabs-remotion`
- `mediabunny`

### Phase 3 — Create supporting audio

- `text-to-speech`
- `elevenlabs-music`

### Phase 4 — Build exports

- Remotion
- `mediabunny`
- `design-review` if polishing is needed

### Phase 5 — Publish and adapt

- `content-engine`
- `crosspost`
- `article-writing`

## Practical Default

If you want the most complete and disciplined stack for the strongest default concept:

- concept: `v01-clean-winner`
- planning: `blueprint` + `content-engine`
- production: `video-editing` + `elevenlabs-remotion` + `mediabunny`
- audio: `text-to-speech` + `elevenlabs-music`
- publish: `crosspost` + `article-writing`
