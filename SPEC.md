# Workout Tracker — Version 1 Build Spec

> **For Claude Code:** This file is the complete spec for version 1. Build it **one phase at a time** as described in §11, and stop after each phase so the owner can test it on their iPhone. Read `CLAUDE.md` for the working rules and the `design-*.dc.html` mockups for the intended look. Where this spec is silent, choose the simplest option that fits the goals below and note the choice in `README.md`. Do not add features that are not listed here.
>
> Repository name: **`workout-tracker`**. Live URL: `https://<github-username>.github.io/workout-tracker/`

---

## 1. Goals

- A **personal** workout tracker for one user, focused on functional strength (lifting, carries, sled work, holds, cardio).
- Runs as a **home-screen web app (PWA) on iPhone**, installed from Safari. There is no Mac and no App Store.
- **Offline-first:** every feature works with no signal (gym use).
- **No accounts and no backend.** All data is stored on the device.
- **Imperial units only:** lb, mi, ft and yd.
- Logging mid-workout must be **fast and one-handed**: big tap targets, minimal typing.

Out of scope for v1: calories, hydration, sleep, Apple Health, notifications while the app is closed, multiple users, cloud sync.

---

## 2. Tech stack

| Concern | Choice |
|---|---|
| Build | Vite + React 18 + TypeScript (strict) |
| Routing | React Router (HashRouter, so GitHub Pages deep links work) |
| Storage | IndexedDB through **Dexie** (with `dexie-react-hooks` / `useLiveQuery`) |
| PWA | `vite-plugin-pwa` (Workbox; precache all assets; `registerType: 'autoUpdate'`) |
| Charts | Recharts |
| Styling | Plain CSS with CSS variables (no UI framework) |
| Tests | Vitest for pure logic (metrics, pace, prefill, timer math) |
| Hosting | GitHub Pages, deployed by a GitHub Actions workflow on push to `main` |

Keep dependencies to this list unless something is truly required.

---

## 3. Exercise types (core concept)

Each exercise has exactly one **type**, and the type decides which fields a set logs. One logging component renders the right inputs for the type.

| Type key | Label | Set fields | Optional fields | Examples |
|---|---|---|---|---|
| `weighted` | Weighted | `weightLb`, `reps` | — | Squat, deadlift, bench |
| `bodyweight` | Bodyweight | `reps` | `weightLb` (added weight) | Pull-ups, push-ups, dips |
| `timed` | Timed | `timeSec` | `weightLb` | Plank, dead hang, wall sit |
| `carry` | Carry | `weightLb`, `distance` | — | Farmer's carry, sandbag carry |
| `distance` | Distance | `distance` | `weightLb` | Sled push, sled drag |
| `cardio` | Cardio | `timeSec`, `distance` | — | Run, row, bike, ruck |

**Distance units:**
- `carry` and `distance` exercises store distance in a per-exercise unit: `ft` or `yd` (default `yd`).
- `cardio` always uses `mi`, entered with 2 decimals.
- Time is entered as `mm:ss` (or `h:mm:ss` for cardio) and stored as seconds.

**Cardio pace** = `timeSec / distanceMi`, shown as `m:ss /mi`. It's derived and never stored.

---

## 4. Data model (Dexie)

Database name: `workout-tracker`, version 1. All ids are `crypto.randomUUID()`. All timestamps are epoch ms.

```ts
type ExerciseType = 'weighted' | 'bodyweight' | 'timed' | 'carry' | 'distance' | 'cardio';
type DistUnit = 'ft' | 'yd' | 'mi';

interface Exercise {
  id: string;
  name: string;            // unique, case-insensitive
  type: ExerciseType;
  distUnit?: DistUnit;     // carry/distance: 'ft'|'yd'; cardio: 'mi'
  notes?: string;
  archived: boolean;       // hidden from pickers, history kept
  createdAt: number;
}

interface PresetItem {
  id: string;
  exerciseId: string;
  targetSets: number;      // default 3 (cardio default 1)
  targetReps?: number;
  targetWeightLb?: number;
  targetTimeSec?: number;
  targetDistance?: number;
  restSec?: number;        // override; falls back to settings.defaultRestSec
}

interface Preset {
  id: string;
  name: string;
  items: PresetItem[];     // ordered; lifts and cardio mixed freely
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
  sample?: boolean;        // created by "Load sample data"
}

interface SetLog {
  id: string;
  weightLb?: number;
  reps?: number;
  timeSec?: number;
  distance?: number;       // in the exercise's distUnit
  done: boolean;
  completedAt?: number;
}

interface WorkoutEntry {
  id: string;
  exerciseId: string;
  presetItemId?: string;
  sets: SetLog[];
}

interface Workout {
  id: string;
  name: string;            // preset name, or "Quick workout"
  presetId?: string;
  startedAt: number;
  endedAt?: number;        // undefined = in progress
  entries: WorkoutEntry[];
  notes?: string;
  sample?: boolean;        // created by "Load sample data"
}

interface Settings {       // single row, id = 'settings'
  id: 'settings';
  defaultRestSec: number;  // default 90
  autoStartRest: boolean;  // default true
  restSound: boolean;      // default true
}
```

Tables: `exercises` (indexes: `id, name, type, archived`), `presets` (`id, name, lastUsedAt`), `workouts` (`id, startedAt, endedAt, presetId`), `settings` (`id`).

**Seed on first run** (only if `exercises` is empty): Back Squat, Deadlift, Bench Press, Overhead Press, Barbell Row (weighted); Pull-up, Push-up, Dip (bodyweight); Plank, Dead Hang (timed); Farmer's Carry, Sandbag Carry (carry, yd); Sled Push, Sled Drag (distance, yd); Run, Row, Bike, Ruck (cardio, mi). Also seed settings with the defaults.

Only one workout may be in progress at a time. If one exists on launch, the Home screen shows a **Resume workout** banner.

---

## 5. Screens

Bottom tab bar with 4 tabs: **Home · Presets · Progress · History**. The live workout opens full-screen over the tabs. A gear icon on Home opens **Settings**.

### 5.1 Home
- Header: today's date, gear icon.
- **Resume workout** banner, if a workout is in progress.
- **Start a preset:** cards for presets sorted by `lastUsedAt` desc, each showing the name, exercise count and "Last done: Nov 6". Tapping one starts a workout.
- **Quick workout** button: starts an empty workout and you add exercises as you go.
- **This week:** workout count and the last workout's name and date.

### 5.2 Presets list + Preset editor
- The list shows all presets, with a **+ New preset** button.
- Editor:
  - Name field.
  - Ordered list of items. Each row shows the exercise name, a type badge and a target summary (e.g. "3 × 5 @ 225 lb", "3 × 40 yd @ 70 lb", "1 × 2.00 mi").
  - **Add exercise** opens the exercise picker: search, filter by type, and **+ New exercise** (name, type, distance unit if relevant).
  - Tapping an item edits its targets. Fields shown depend on type, plus an optional rest override.
  - Reorder with up/down buttons (drag is optional), and swipe or a button to delete.
  - Save, delete preset, and **Duplicate** preset.

### 5.3 Live workout (most important screen)
- Top bar: workout name, elapsed time, sets done (e.g. "2 of 17 sets"), **Rest** button and **Finish** button.
- **Horizontal paging, not vertical scrolling:** each exercise is its own full-height card, and you swipe left and right to move between exercises, in preset order.
  - Use a horizontal scroll container with CSS scroll-snap (`scroll-snap-type: x mandatory`). Each card is about 340 pt wide, so the edge of the next card peeks in as a swipe hint.
  - Above the cards: "Exercise 2 of 6 · Deadlift" plus page dots (the active dot is a wider orange pill). Keep these in sync with the scroll position.
  - Tapping the label opens a quick-jump list of all exercises in the workout.
  - When the last set of an exercise is marked done, auto-advance to the next card after the rest timer starts (respect `prefers-reduced-motion`).
  - The workout opens on the first exercise that has sets not yet done.
  - The last card ends with **+ Add exercise**, which appends a new card and scrolls to it.
  - If a card's content is taller than the screen, it scrolls vertically inside the card.
- Each exercise card has:
  - The exercise name, type badge and a **Last time** line with the previous session's sets (e.g. "Last: 225×5, 225×5, 225×4").
  - Set rows: set number, the type's inputs, and a large **✓** button.
  - **Prefill:** each new set pre-fills from (1) the same set number last session for this exercise, else (2) the previous set in this workout, else (3) the preset targets.
  - Inputs are steppers with big − / + buttons. Weight steps by 5 lb, reps by 1, time by 5 s and distance by 5 (ft/yd) or 0.05 mi. Tapping a value lets you type it with the numeric keyboard.
  - **+ Add set** and remove set (swipe or long-press).
  - Cardio cards show live pace once time and distance are filled in.
- Tapping ✓ marks the set done, stamps `completedAt` and, if `autoStartRest` is on, starts the rest timer.
- **Finish:** confirm, set `endedAt`, show a summary (duration, sets done, any new maxes), then return to Home. Sets that weren't done are discarded on finish, and exercises with no done sets are dropped.
- **Discard workout** is in an overflow menu, with a confirm.
- Persist to IndexedDB on every change, so closing the app never loses data.
- Request a **Screen Wake Lock** while the workout is open. Wrap it in try/catch and fail silently.

### 5.4 Rest timer
- A sticky bar at the bottom of the live workout showing a large countdown and the buttons **−15s**, **+15s**, **Skip**, plus a ring or bar for progress.
- Duration = item `restSec` ?? `settings.defaultRestSec` (90).
- A manual **Rest** button in the top bar starts it any time. Tapping the countdown lets you type a custom length for this rest.
- **Timing must be timestamp-based:** store `endsAt` and compute the remaining time from `Date.now()` each tick, so it stays accurate if the screen locks or the app is backgrounded. Store timer state in memory and `localStorage`, so it survives a reload.
- When it ends: show a full-width flash and play a short beep through Web Audio (unlock the AudioContext on the first user tap). There's no vibration API on iOS, so don't rely on it.

### 5.5 Progress
- Exercise picker at the top (search, recent first; only exercises with done sets).
- **One line chart per exercise**, showing the **session max** for each workout, oldest to newest:

| Type | Y-axis (session max) | Tooltip extra |
|---|---|---|
| weighted | max `weightLb` among done sets | reps at that weight |
| bodyweight | max `reps` in one set | added weight if any |
| timed | max `timeSec` (shown as m:ss) | weight if any |
| carry | max `weightLb` | distance of that set |
| distance | max `distance` | weight if any |
| cardio | max `distance` (mi); **toggle** to max `timeSec` | pace |

- Above the chart: a **current best** card (all-time max and its date) and a "first → now" change (e.g. "+40 lb since Sep 3").
- Range filter: 1M · 3M · 6M · 1Y · All.
- Below the chart: a list of sessions with the date and that session's max.

### 5.6 History
- Reverse-chronological list of finished workouts, grouped by week. Each shows the name, date, duration and sets done.
- Tap a workout for its detail: every exercise and its sets, with **Edit** (change or delete set values) and **Delete workout** (with a confirm).

### 5.7 Settings
- Default rest time (default 90 s), auto-start rest after a set (on), rest sound (on).
- **Manage exercises:** rename, change the distance unit, archive. The type can't be changed once an exercise has logged sets.
- **Export data:** downloads `workout-tracker-backup-YYYY-MM-DD.json` with all tables.
- **Import data:** pick a JSON file, validate it, confirm, then replace all data.
- Show "Last backup: …" and a gentle reminder if it's been more than 14 days.
- App version.
- **Sample data** (for testing): **Load sample data** creates about 12 weeks of realistic finished workouts using the seed exercises and two or three presets, with gradual progress so the graphs have shape. **Clear all data** wipes everything and re-seeds the defaults. Both ask for confirmation. Sample workouts are tagged `sample: true` (add an optional `sample?: boolean` to `Workout` and `Preset`), so **Remove sample data** can delete only those and keep real workouts.

---

## 6. Visual design

- **Dark theme by default** (gym lighting, battery): background `#0E0F11`, surfaces `#17191C` / `#1F2226`, text `#F2F3F5` / muted `#9AA0A6`, accent `#FF6A3D` (orange) for primary actions, done/success `#3DDC84`.
- **Color has strict jobs:** orange accent = primary actions and the active set only; green = completed sets and positive progress only.
- **Type badges are neutral, not color-coded:** small uppercase label (11px, bold) in muted gray `#9AA0A6` on `#24272B`, 6px radius. No per-type colors anywhere.
- Chart lines use the accent orange.
- System font stack (`-apple-system, …`). Numbers use `font-variant-numeric: tabular-nums`.
- Minimum tap target 48×48 pt, and the ✓ button at least 56 pt. Respect `env(safe-area-inset-*)` for the notch and home bar.
- Avoid accidental zoom: inputs use font-size ≥ 16px.

---

## 7. PWA and iPhone requirements

- `manifest.webmanifest`: name "Workout Tracker", short_name "Workouts", `display: standalone`, dark theme/background colors, icons 192/512 plus a maskable icon. Also include `apple-touch-icon` (180×180) and `apple-mobile-web-app-capable` meta tags. Generate a simple icon (a dumbbell or "W" on the accent color).
- The service worker precaches everything, so the app fully works offline after the first load.
- Call `navigator.storage.persist()` on first launch to reduce the risk of iOS clearing data.
- When a new version is deployed, it should auto-update on the next launch (show a small "Updated" toast).

---

## 8. Deployment (GitHub Pages)

- Set Vite `base` to `/workout-tracker/`.
- Add `.github/workflows/deploy.yml`: on push to `main`, run `npm ci`, `npm test`, `npm run build`, then deploy `dist/` with `actions/deploy-pages`.
- In `README.md`, give plain-language steps for a non-developer:
  1. In the GitHub repo, open Settings → Pages and set Source to "GitHub Actions".
  2. Wait for the deploy to finish, then open `https://<username>.github.io/workout-tracker/` in **Safari** on iPhone.
  3. Tap Share → **Add to Home Screen**.
  4. Open it from the home screen. It works offline from then on.
  5. Back up regularly with Settings → Export.

---

## 9. Code structure (suggested)

```
src/
  db/         schema.ts, seed.ts, queries.ts
  domain/     types.ts, metrics.ts (session max per type), format.ts (time, pace, units), prefill.ts, timer.ts
  components/ ExerciseCarousel.tsx, ExerciseCard.tsx, SetRow.tsx, Stepper.tsx, ExercisePicker.tsx, TypeBadge.tsx, RestTimerBar.tsx, Chart.tsx
  screens/    Home.tsx, Presets.tsx, PresetEditor.tsx, LiveWorkout.tsx, Progress.tsx, History.tsx, WorkoutDetail.tsx, Settings.tsx
  App.tsx, main.tsx, styles.css
```

---

## 10. Acceptance criteria (v1 is done when all pass)

- [ ] Installs to the iPhone home screen from Safari and opens full-screen with no browser bars.
- [ ] With airplane mode on, every screen works and data saves.
- [ ] I can create a preset mixing weighted, bodyweight, timed, carry, distance and cardio exercises, reorder it, and save it.
- [ ] Starting a preset shows one exercise per card, and swiping left or right moves between them, with the counter and dots staying in sync.
- [ ] Each card shows the correct inputs for its exercise type.
- [ ] Sets pre-fill from my last session, and "Last time" shows it.
- [ ] Tapping ✓ starts a 90 s rest timer by default. I can change the default in Settings, override it per preset item, adjust ±15 s, skip it, and set a custom time.
- [ ] The rest timer stays accurate after locking the phone for 60 s, and alerts when the time is up while the app is open.
- [ ] Force-quitting mid-workout and reopening shows **Resume workout**, with nothing lost.
- [ ] Cardio logs time and distance in miles and shows pace.
- [ ] Progress shows one graph per exercise, plotting the session max (weight, reps, time or distance by type). Cardio toggles between distance and time.
- [ ] History lists past workouts, and I can edit or delete one.
- [ ] All units are imperial. No metric appears anywhere.
- [ ] Export, then a wipe, then import restores everything exactly.
- [ ] Unit tests cover the session-max metric for every type, pace formatting, prefill order and timer remaining-time math.
- [ ] Pushing to `main` deploys automatically to GitHub Pages.
- [ ] Load sample data, then Remove sample data, leaves my real workouts untouched.

---

## 11. Build phases

Build in this order. **At the end of every phase:** run tests and the build, commit, push or merge to `main` so it deploys, then stop and give the owner a short plain-language list of what to test on their phone. Don't start the next phase until the owner says so. Every phase must leave the app working and installable.

### Phase 1: Foundation
- Vite + React + TS project, lint/format, Vitest set up.
- Dark theme CSS variables, the system font, and safe-area handling.
- Tab bar with the four tabs (Home, Presets, Progress, History) showing simple placeholder screens, plus a Settings screen showing just the app version.
- Dexie database with the full schema from §4, plus first-run seeding of exercises and settings.
- PWA: manifest, icons, apple-touch-icon, service worker for offline use, `navigator.storage.persist()`.
- GitHub Actions deploy to Pages, and `README.md` with the install steps.
- **Owner tests:** installs to the home screen, opens full-screen, works in airplane mode, the tabs switch.

### Phase 2: Exercises and presets
- Exercise picker (search, filter by type, create a new exercise).
- Presets list and the preset editor (§5.2): targets by type, rest override, reorder, delete, duplicate.
- Home screen preset cards and the Quick workout button (it can open a placeholder until Phase 3).
- `TypeBadge` (neutral style) and the target-summary formatting, with unit tests.
- **Owner tests:** builds their real presets, mixing every exercise type; edits, reorders and duplicates; data survives closing the app.

### Phase 3: Live workout and rest timer
- Live workout (§5.3): swipeable exercise cards with scroll-snap, the counter and dots, quick-jump, and set rows for every type with steppers.
- Prefill order and the "Last time" line, cardio pace, add/remove sets, add an exercise.
- Rest timer (§5.4): default from settings, per-item override, ±15 s, skip, custom length, timestamp-based timing, sound, and the screen flash.
- Auto-advance after an exercise's last set, Wake Lock, save on every change, the Resume banner, Finish with a summary, and Discard.
- Unit tests for prefill and timer math.
- **Owner tests:** a real gym session; lock the phone mid-rest; force-quit and resume; finish and see the summary.

### Phase 4: Progress and history
- Session-max metrics for every type (§5.5), with unit tests.
- Progress screen: exercise picker, best and "first → now" cards, range filter, chart (cardio distance/time toggle), session list.
- History list grouped by week, plus workout detail with edit and delete (§5.6).
- Settings → **Sample data** section (load, remove, clear all), so graphs can be checked before there's real history.
- **Owner tests:** load sample data and check every graph type, edit a past workout and see the graph update, remove sample data.

### Phase 5: Settings, backup and polish
- Full Settings (§5.7): rest defaults, auto-start toggle, sound, and manage exercises (rename, archive, type locked once used).
- Export and import JSON, "Last backup" display and a 14-day reminder.
- An "Updated" toast after auto-update.
- An accessibility pass (labels, tap target sizes, contrast) and a final pass through every item in the acceptance checklist (§10). Report any that fail.
- **Owner tests:** the full acceptance checklist; export, clear and import.
