# CLAUDE.md: Workout Tracker

Personal workout tracker for one user (functional strength: lifts, carries, sled work, holds, cardio). It's a home-screen web app (PWA) for iPhone, hosted on GitHub Pages at `https://<github-username>.github.io/workout-tracker/`. The owner has no Mac and doesn't code, so explain things in plain language.

## Source of truth
- **`SPEC.md`** is the full version 1 spec. Follow it exactly. If something is unclear, pick the simplest option that fits and note it in `README.md`.
- **`design-*.dc.html`** are the screen mockups: home, preset editor, live workout, progress and history. Use them as the visual reference for layout, spacing, colors and sizes. They're reference markup only: don't run them, import them or ship them. All styles are inline, so read the values directly.
- If the spec and a mockup disagree, the spec wins.

## Work in phases
- Build **one phase at a time**, in the order in `SPEC.md` §11. Never start the next phase until the owner says to.
- At the start of a phase, list what you'll build in 5–10 bullets, then build it.
- At the end of a phase:
  1. `npm run lint && npm test && npm run build` must all pass.
  2. Commit with a clear message, then get the work onto `main` so it deploys (merge your branch or PR into `main`; if you can't merge, tell the owner exactly which button to press).
  3. Confirm the GitHub Actions deploy succeeded.
  4. Tell the owner, in plain language: what's new, how to update the app on their phone (close it fully and reopen it), and a short checklist of what to test.

## Rules
- **Imperial units only** (lb, mi, ft, yd). Never show metric.
- **No features beyond the spec.** Suggest ideas in your summary instead of building them.
- **Offline-first:** every feature works in airplane mode. No external API calls, CDNs or analytics.
- **Mobile, one-handed:** tap targets ≥ 48 pt (the ✓ button ≥ 56 pt), inputs ≥ 16px font, and respect safe areas.
- **Color jobs:** orange `#FF6A3D` is for actions and the active set; green `#3DDC84` is for completed sets and positive progress. Type badges are neutral gray. No other accent colors.
- **Never lose data:** save to IndexedDB on every change. Any change to the database schema needs a Dexie version bump with a migration that keeps existing data.
- Keep dependencies to the stack in `SPEC.md` §2.
- Put pure logic (metrics, formatting, prefill, timer) in `src/domain/` and cover it with unit tests.

## Commands
- `npm install`: install dependencies
- `npm run dev`: local dev server
- `npm test`: unit tests (Vitest)
- `npm run lint`: lint
- `npm run build`: production build into `dist/`

## Bug reports from the owner
The owner will describe bugs in plain language (often with screenshots). Reproduce the bug, fix it, add a test if it's logic, and explain the fix in one or two sentences. Bug fixes don't need to wait for a phase boundary.
