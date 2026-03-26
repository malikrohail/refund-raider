# RR-11 Script Ideas

Date: 2026-03-25

## Purpose

Create five creative, end-to-end submission-video concepts for Refund Raider without implementing anything yet.

Each concept keeps the same core product truth:

- Firecrawl finds the policy and support path
- ElevenLabs is the live advocate layer
- the app explains eligibility
- the app drafts the refund request
- the app sends it

The difference is the **framing**.

## Shared Production Rule

No matter which script you choose, keep the underlying hero flow narrow:

1. one merchant
2. one damaged, wrong, or missing-item case
3. one clear evidence-backed verdict
4. one generated draft
5. one send moment

## Shared Skills Stack

Use this planning stack later when you move into production:

### Product-facing

- ElevenLabs agent runtime
- Firecrawl Search

### Video-facing

- `find-skills` for last-mile discovery
- `elevenlabs-remotion` for stitched narration and timing
- `text-to-speech` from `elevenlabs/skills` for fallback voice generation
- `elevenlabs-music` for background score
- `mediabunny` for media prep and asset handling
- Remotion for the final composition
- `content-engine` for per-platform hook rewrites
- `video-editing` for the edit pipeline and delivery order

## Concept 1 — The Cleanest Winner

### Name

`Reads the rules. Gets your refund.`

### Best use

This is the safest and strongest default if your top goal is to win the hackathon rather than experiment.

### Hook

`This AI reads the merchant's refund policy, tells you if you qualify, and sends the refund request for you.`

### Why it works

- instantly understandable
- strong sponsor alignment
- easy for judges to score
- easy to cut into a 60-90 second video

### Script flow

#### 0-5 seconds

Show the final state first:

- verdict visible
- draft ready
- send button visible

Voiceover:

`This AI reads the rules, figures out if you qualify, and sends the refund request for you.`

#### 5-20 seconds

Show the problem:

- damaged or wrong item
- receipt or screenshot
- one-line complaint

Voiceover:

`Most people lose money because refund policies are buried and support is annoying.`

#### 20-40 seconds

Show the Firecrawl moment:

- merchant policy
- support email or path
- return deadline
- evidence cards

Voiceover:

`Refund Raider uses Firecrawl to find the actual policy, support path, and evidence, then turns that into a real verdict.`

#### 40-60 seconds

Show the ElevenLabs advocate:

- ask if the user qualifies
- agent explains the verdict in plain English

Voiceover:

`ElevenLabs is the advocate layer. It explains what the rules mean and what the best next action is.`

#### 60-80 seconds

Show the draft.

Voiceover:

`Then it drafts the refund request so the user does not have to write it.`

#### 80-90 seconds

Approve and send. End on the timeline.

Voiceover:

`Evidence in. Refund out.`

### Skills plan

- `elevenlabs-remotion`: main narration
- `elevenlabs-music`: subtle tech-forward score
- `mediabunny`: prep screenshots and exports
- `content-engine`: turn the final cut into platform-native captions and post copy

### Risk

Low

### Platform fit

- excellent for judges
- excellent for X and LinkedIn
- good for TikTok and Reels if cut tightly

## Concept 2 — Frustration To Relief

### Name

`I gave my refund fight to an AI.`

### Best use

Use this if you want more emotion and more shareability without changing the core product.

### Hook

`This company kept making me do the refund work myself, so I gave the whole thing to an AI agent.`

### Why it works

- starts from a human pain point
- makes the product feel personal
- creates a strong before/after transformation

### Script flow

#### 0-8 seconds

Open on messy inputs:

- broken package
- unread support thread
- user visibly annoyed

Voiceover:

`This is what getting a refund usually looks like.`

Cut immediately to:

`This is what it looks like when an agent does it for you.`

#### 8-25 seconds

Open Refund Raider and drop the case in.

#### 25-45 seconds

Show research and evidence.

#### 45-65 seconds

Have the ElevenLabs agent calmly explain:

- yes, you likely qualify
- here is the deadline
- here is the best path

#### 65-85 seconds

Show the draft and send.

#### 85-90 seconds

End on:

`You should not need to become a policy investigator to get your money back.`

### Skills plan

- `elevenlabs-remotion`: more conversational narration
- `text-to-speech`: extra alt takes for emotional opening lines
- `elevenlabs-music`: light build from tension to relief
- `video-editing`: structure the cut around the transformation

### Risk

Low to medium

### Platform fit

- strongest for TikTok and Instagram Reels
- still good for judges if kept clean

## Concept 3 — The Live Voice Magic Cut

### Name

`Talk to your refund advocate.`

### Best use

Use this if the ElevenLabs experience is genuinely strong and you want the voice layer to feel central.

### Hook

`I built a voice agent that can look up the rules behind your refund and take the next step for you.`

### Why it works

- makes ElevenLabs feel core, not bolted on
- gives the demo a more unusual angle
- sounds more magical than a standard web app walkthrough

### Script flow

#### 0-6 seconds

Start on voice, not UI.

User says:

`My order arrived damaged and support is ignoring me. Can you handle it?`

#### 6-25 seconds

Show the agent starting the case and asking one tight follow-up.

#### 25-45 seconds

Show Firecrawl evidence loading in behind the conversation.

#### 45-65 seconds

Show the agent answering:

- whether the user qualifies
- which channel is best
- what will happen next

#### 65-85 seconds

Show draft creation and send.

#### 85-90 seconds

End with:

`The voice agent explains it. The app proves it.`

### Skills plan

- ElevenLabs live agent is the star
- `elevenlabs-remotion`: stitch narration around captured live agent audio
- `elevenlabs-music`: minimal score so voice remains dominant
- `mediabunny`: isolate and prep captured live voice clips

### Risk

Medium

### Platform fit

- excellent for judges if the voice is stable
- good for X
- good for TikTok if the voice exchange is fast

## Concept 4 — The Challenge Format

### Name

`Can AI beat the refund maze in under a minute?`

### Best use

Use this if you want a more viral, challenge-style frame.

### Hook

`Can an AI go from broken package to sent refund request in under 60 seconds?`

### Why it works

- creates built-in tension
- feels more native to short-form video
- gives the viewer a reason to keep watching

### Script flow

#### 0-5 seconds

Show countdown timer.

#### 5-15 seconds

Drop in:

- merchant
- problem
- proof

#### 15-35 seconds

Show Firecrawl pulling policy evidence.

#### 35-50 seconds

Show ElevenLabs explaining the verdict.

#### 50-60 seconds

Show the draft.

#### 60-70 seconds

Approve and send.

#### 70-80 seconds

Reveal outcome:

- evidence found
- verdict made
- draft sent

#### 80-90 seconds

Fast recap:

`Policy found. Verdict made. Email sent.`

### Skills plan

- `elevenlabs-remotion`: timer-synced narration
- `elevenlabs-music`: higher-tempo track
- Remotion: timer and split-screen overlays
- `video-editing`: pacing and compression

### Risk

Medium

### Platform fit

- strongest for TikTok and Reels
- very good for X
- slightly riskier for judges if it feels gimmicky

## Concept 5 — The Bigger Vision, Controlled

### Name

`Today refunds. Tomorrow every support fight.`

### Best use

Use this only if you want to plant the startup vision while still landing the hackathon wedge.

### Hook

`I started with refunds, but this could become the agent that handles every annoying consumer support fight.`

### Why it works

- gives the project more ambition
- makes the product feel like a company, not a one-off demo
- still grounds the demo in one repeatable refund case

### Script flow

#### 0-8 seconds

Open with:

`Refunds are the wedge. The real product is a consumer action agent.`

#### 8-30 seconds

Run the standard refund hero flow:

- problem
- evidence
- verdict

#### 30-60 seconds

Show the advocate layer and draft/send flow.

#### 60-80 seconds

Briefly widen the lens:

- returns
- cancellations
- billing fights

Do this as a closing statement, not a second demo.

#### 80-90 seconds

End with:

`Refund Raider starts with one painful problem and turns it into one clean action loop.`

### Skills plan

- `content-engine`: strongest here because the positioning has to stay disciplined
- `elevenlabs-remotion`: high-clarity narration
- `elevenlabs-music`: restrained score
- Remotion: end-card vision montage

### Risk

Medium to high

### Platform fit

- best for LinkedIn and investor-style posts
- less ideal for the core judged submission unless the ending stays short

## Recommendation

If the goal is to maximize the odds of winning:

1. choose **Concept 1**
2. keep **Concept 2** as the emotional alternate
3. use **Concept 4** for a short social cut

That gives you:

- one clean judge-facing story
- one slightly more emotional version
- one viral-style derivative cut

## Production Decision Tree

### If voice is extremely strong

Choose:

- Concept 3 for the main cut
- Concept 4 for the short cut

### If the safest path matters most

Choose:

- Concept 1 for the main cut
- Concept 2 for the social cut

### If you want to hint at startup scale

Choose:

- Concept 1 for the main cut
- Concept 5 only as a short closing variation

## What Not To Do

- do not make Gmail the required star of the script
- do not make browser automation mandatory
- do not broaden into cancellations too early
- do not start with the tech stack
- do not make the video a narrated product tour with no tension

## Next Planning Step

Once you choose one of the five concepts, the next planning artifact should be:

- a locked 60-90 second script
- a shot list
- a scene-by-scene Remotion plan
- a skills execution checklist

Do not implement that yet until the concept is chosen.
