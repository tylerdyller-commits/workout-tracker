# Workout Tracker

A personal workout tracker that runs as a home-screen web app on iPhone. It works fully offline and keeps all data on your phone (no account, no server).

- `SPEC.md`: what to build (version 1), in 5 phases
- `CLAUDE.md`: working rules for Claude Code
- `PROMPTS.md`: the messages to paste into Claude Code, phase by phase
- `design-*.dc.html`: screen mockups (visual reference only)

## Put it on your iPhone

1. In the GitHub repo, open **Settings → Pages** and set **Source** to **"GitHub Actions"**. (One time only.)
2. Wait for the deploy to finish: open the **Actions** tab in the repo and wait for the latest "Deploy to GitHub Pages" run to show a green check. Then open `https://<username>.github.io/workout-tracker/` in **Safari** on your iPhone (replace `<username>` with your GitHub username).
3. Tap the **Share** button (square with an up arrow) → **Add to Home Screen** → **Add**.
4. Open it from the home screen icon. It works offline from then on.
5. Back up regularly with **Settings → Export** (available from Phase 5).

## Getting updates

Every time new code is pushed to `main`, GitHub rebuilds and publishes the app automatically (takes 1–2 minutes). To get the new version on your phone: swipe the app away completely in the app switcher, then open it again. If you don't see the change, close and reopen it once more (the first launch downloads the update in the background).

Your workout data is not affected by updates.

## For developers

- `npm install`: install dependencies
- `npm run dev`: local dev server (open the URL it prints, with `/workout-tracker/` on the end)
- `npm test`: unit tests (Vitest)
- `npm run lint`: ESLint + Prettier check (`npm run format` fixes formatting)
- `npm run build`: production build into `dist/`
- `npm run icons`: regenerate the PNG app icons in `public/` (dumbbell on the accent color)

## Choices made where the spec was silent

- **Lint/format:** ESLint (typescript-eslint, react-hooks) and Prettier. The deploy workflow runs lint as well as tests and build.
- **Testing the database:** `fake-indexeddb` is a dev-only dependency so the first-run seed can be unit tested. It is not shipped in the app.
- **`archived` index:** IndexedDB can't index boolean values, so the `archived` index from the spec is declared but never used for queries; archived exercises are filtered in code.
- **Storage persistence:** `navigator.storage.persist()` is requested on every launch until the browser grants it (it is a no-op once granted).
- **Settings screen:** opens from the gear on Home as its own page with a back button; the tab bar stays visible.
- **Typing times:** the iPhone number pad has no ":" key, so typed times work like a microwave timer: the last two digits are seconds, the two before are minutes (`130` = 1:30, `4500` = 45:00, `13000` = 1:30:00). Typing with a colon also works.
- **Preset saving:** every change in the preset editor is saved immediately (nothing is lost if the app closes). **Save** just returns to the list. A brand-new preset isn't stored until it has a name or an exercise, so backing out of an empty one leaves nothing behind. An empty name is stored as "Untitled preset".
- **Preset item targets:** everything except the number of sets is optional. The rest override is a switch; when off, the item uses the default rest from Settings.
- **Reorder and delete in the preset editor:** ▲/▼ buttons on each row (48 pt, larger than the mockup's, to meet the tap-size rule). Removing an exercise is done from its targets sheet ("Remove from preset") to keep rows uncluttered and avoid accidental deletes.
- **Duplicate preset:** named "<name> (copy)"; it copies the exercises and targets but not the "last done" date.
- **Presets list order:** alphabetical. Home orders by most recently used, then never-used presets by latest edit.
- **Exercise names:** unique ignoring upper/lower case and extra spaces, including archived exercises.
- **Live workout set rows:** the active set (first one not done, or the one you tap) is expanded with big steppers; other sets show a one-line summary. Tapping a green ✓ un-does a set. To remove a set, long-press its row or use **Remove** on the expanded set (both ask to confirm).
- **Prefill timing:** sets are pre-filled when they're created (at workout start, or with + Add set). Editing set 1 doesn't change sets 2 and 3 that were already created.
- **Sets per exercise:** from the preset's target sets. Exercises added during a workout get as many sets as last time (or 3, cardio 1).
- **Manual Rest button:** uses the rest length of the exercise on screen (its preset override, else the default).
- **Custom rest:** tapping the countdown opens a box to type a length; it starts a fresh rest of that length.
- **Rest alert:** a full-screen "Rest over" flash plus three beeps. iPhone mutes these beeps when the ring/silent switch is on silent. If the rest ended more than 15 s before you reopen the app, there's no alert. The rest timer lives at the app level, so it still alerts if you step out to Home.
- **New maxes in the summary:** compared with all earlier sessions of the same exercise using the session-max rule from the spec (§5.5). The first time you log an exercise doesn't count as a new max.
- **Finishing with no sets done:** nothing is saved (an empty workout isn't useful in History).
- **Starting a preset while a workout is in progress:** offers to resume the current one instead (only one at a time).
- **Icons:** generated by `scripts/gen-icons.mjs` (no image tools needed). The maskable icon shrinks the dumbbell to stay inside the safe zone.
