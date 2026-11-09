# Prompts to paste into Claude Code

Copy one prompt at a time. Wait until Claude Code says the phase is finished, test it on your phone, then send the next one.

---

## Phase 1: Foundation

```
Read CLAUDE.md and SPEC.md fully, and look at the design-*.dc.html mockups.
Then build Phase 1 (Foundation) from SPEC.md section 11.
Before writing code, list what you'll build. When you're done, make sure it
deploys to GitHub Pages, then stop and tell me exactly what to test on my
iPhone. Also tell me whether I need to turn on GitHub Pages myself, and how.
```

## Phase 2: Exercises and presets

```
Phase 1 tested and working. Build Phase 2 (Exercises and presets) from
SPEC.md section 11. Follow CLAUDE.md. When it's deployed, stop and give me
my test checklist.
```

## Phase 3: Live workout and rest timer

```
Phase 2 tested and working. Build Phase 3 (Live workout and rest timer)
from SPEC.md section 11. Match design-live-workout.dc.html closely: one
exercise per card, swipe left and right. Follow CLAUDE.md. When it's
deployed, stop and give me my test checklist.
```

## Phase 4: Progress and history

```
Phase 3 tested and working. Build Phase 4 (Progress and history) from
SPEC.md section 11, including the sample data tools in Settings. Follow
CLAUDE.md. When it's deployed, stop and give me my test checklist.
```

## Phase 5: Settings, backup and polish

```
Phase 4 tested and working. Build Phase 5 (Settings, backup and polish)
from SPEC.md section 11. At the end, go through every item in the
acceptance checklist in SPEC.md section 10 and tell me which pass and
which need me to check on my phone.
```

---

## Reporting a bug (any time)

```
Bug: [what I did, step by step]
Expected: [what should have happened]
Actually: [what happened instead]
Screen: [Home / Presets / Live workout / Progress / History / Settings]
[attach a screenshot if you can]
Please fix it and redeploy.
```

## Asking for a change

```
Change request: [what you want different and why].
Update SPEC.md to match, then make the change and redeploy.
```

## Starting a new session later

```
Read CLAUDE.md and SPEC.md. We've finished up to Phase [N].
Check the code and git history to confirm, then wait for my next request.
```
