# Design System — Refund Raider

## Product Context
- **What this is:** A voice-first consumer action app that helps users cancel memberships, pursue refunds, request replacements, and navigate support flows.
- **Who it's for:** Consumers who want an agent to handle the annoying support work for them.
- **Space/industry:** Consumer fintech-adjacent support automation / operator tooling.
- **Project type:** Web app with conversational shell plus operational workspace.

## Aesthetic Direction
- **Direction:** Signal desk editorial
- **Decoration level:** Intentional
- **Mood:** Calm, sharp, and high-agency. It should feel like a serious operator console, not a friendly beige template or a neon cyberpunk toy.
- **Reference style:** Editorial tech + control room product UI rather than consumer SaaS starter kits.

## Typography
- **Display/Hero:** Instrument Serif — used sparingly for authority and memorability.
- **Body:** Plus Jakarta Sans — clear, contemporary, and dense enough for operational UI.
- **UI/Labels:** Plus Jakarta Sans
- **Data/Tables:** Plus Jakarta Sans with tabular-friendly usage where needed
- **Code:** Existing monospace fallback
- **Scale:** Hero 56-72px, h1 44-56px, h2 30-36px, h3 22-26px, body 16-18px, labels 12-13px

## Color
- **Approach:** Balanced
- **Primary:** `#ff6a3d` — action and urgency
- **Secondary:** `#14646d` — control, trust, system state
- **Background:** `#edf3f7` — cool paper, not beige
- **Foreground:** `#101826` — deep ink
- **Neutrals:** cool slate-based border and muted text values
- **Dark mode:** not implemented yet; if added later, reduce saturation and keep surfaces layered rather than pure black

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable, but not airy
- **Scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64

## Layout
- **Approach:** Hybrid
- **Grid:** Strong outer frame with dense operational cards inside
- **Max content width:** 7xl shell, with narrower text blocks where reading matters
- **Border radius:** Large shells (28-32px), card radius (18-22px), pills/buttons (9999px)

## Motion
- **Approach:** Minimal-functional
- **Easing:** standard ease-out / ease-in-out
- **Duration:** 150-250ms for most interactions
- **Rule:** Motion should clarify control and status, never decorate empty space

## Rules
- Do not reintroduce the warm pale yellow background system.
- Do not use purple gradients or generic SaaS feature-grid aesthetics.
- Voice, automation, and action-plan surfaces should feel like parts of one system, not stacked demos.
- Primary CTAs should be deep-ink buttons or strong accent buttons, never washed-out pastel pills.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-23 | Replaced warm beige visual system with cooler signal-desk palette | The old palette made the product feel passive and generic instead of high-agency and operational |
| 2026-03-23 | Switched to Instrument Serif + Plus Jakarta Sans | Needed stronger hierarchy and a less starter-template feel |
