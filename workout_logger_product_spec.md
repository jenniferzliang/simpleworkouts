# Workout Logger — Product Spec (Draft v0.1)

*Last updated: 2025-08-15*

## 1) Problem & Goal

People want a **fast, minimalist** way to record workouts without tapping through multistep forms. This app lets users paste/type a **free‑form text blob** and converts it into a structured workout (exercises → sets → reps → weight), then tracks **volume** and a simple progress signal.

### Primary goals

- **Capture** a full workout from free text in seconds.
- **Parse** text to structured data reliably with clear error feedback.
- **Track** per‑workout and longitudinal **volume**.
- **Visualize** progress simply with one weekly tonnage chart.

---

## 2) Target Users & Personas

- **Everyday Lifter (Beginner–Intermediate):** Wants quick logging and simple progress signals (volume up/down, weekly frequency). *Out of scope:* 1RM/RPE/tempo/percentage training and coach tooling.

---

## 3) Core User Stories

**MVP (v0)**

1. Paste a text blob and see a **parsed preview** (exercise rows, set × reps × weight) before saving.
2. Fix parser mistakes inline (edit cells, split/merge sets, alias exercise names) and then save.
3. See **workout tonnage** (per exercise & total) immediately after saving.
4. View a **history list** of prior sessions with quick stats.

**v1** 5. View a **weekly tonnage chart** showing total load over time. 6. Define **exercise aliases** (e.g., “BP”, “bench”) that auto‑resolve. 7. Export/import data (CSV/JSON).

---

## 4) Parsing — Input Grammar (MVP)

Input is multi‑line text. Each line represents one exercise followed by one or more set descriptors. The parser is **tolerant** (spaces, commas, semicolons as separators; case‑insensitive).

### Supported formats

- **Aggregate (with shared weight):** `SETS x REPS x WEIGHT` (e.g., `3x5x135`). **Spaces allowed** → `3 x 5 x 135`.
- **Aggregate (weight optional):** `SETS x REPS` with optional `x WEIGHT` or `bw`.
- **Per‑set entries (rep × weight):** multiple tokens like `10x40kg 10x45kg 8x45kg`.
- **Reps‑only bodyweight:** `Push‑ups 12 10 8` (treated as BW sets).

> **No colon and no @weight syntax.** Weight is expressed with `x` only, or bodyweight as `bw`.

### Examples

- `Bench Press 3x5x135`
- `Bench Press 3 x 5 x 135` *(spaces allowed)*
- `Squat 5x5x100kg`
- `Pull‑ups 3x8 bw`
- `Push‑ups 4x12` *(treated as bodyweight)*
- `Curl 10x4 10x5 10x5 10x6` *(rep × weight per set)*
- `Lat Pulldown 12x40kg 10x45kg 8x45kg`
- `Push‑ups 12 10 8` *(BW reps only)*

### Grammar (simplified)

```
LINE := EXERCISE_NAME SET_BLOCK
SET_BLOCK := AGGREGATE_DESC | PERSET_DESC+ | REPS_ONLY_DESC+
AGGREGATE_DESC := SETS 'x' REPS 'x' WEIGHT | SETS 'x' REPS (WEIGHT_SPEC)?
PERSET_DESC := (REPS 'x' WEIGHT) | (REPS 'x' 'bw')
REPS_ONLY_DESC := REPS (no weight specified)
WEIGHT_SPEC := 'x' WEIGHT | 'bw'
SETS := INT
REPS := INT
WEIGHT := NUMBER (UNIT)?
UNIT := 'kg' | 'lb' | 'lbs'
```

### Parsing rules

- **Mode detection** per line:
  - If it matches `SETS x REPS x WEIGHT` → **Aggregate Mode** (shared weight).
  - If it contains ≥2 `REPS x WEIGHT` tokens and no leading `SETS x REPS` → **Per‑set Mode**.
  - If only numbers after exercise name → **Reps‑only Mode** (BW).
- In Aggregate Mode: expand into `SETS` separate set records with same weight (or BW if `bw` or weight omitted in the 2‑token form).
- In Per‑set Mode: create one set per token; parse units when present.
- In Reps‑only Mode: create one set per reps value; set `isBodyweight=true`, `weight=null`.
- BW sets **excluded from tonnage**; still count BW reps.
- Unknown tokens preserved as notes.

---

## 5) Data Model (MVP)

**User**

- id, email, name, unit\_preference (`kg|lb`), timezone, created\_at, deleted\_at

**Exercise**

- id, canonical\_name, category (`push|pull|legs|core|cardio|other`), is\_bodyweight (bool)

**ExerciseAlias**

- id, exercise\_id → Exercise.id, alias (text)

**WorkoutSession**

- id, user\_id, performed\_at\_local, performed\_date, source\_text, notes, device,
- totals (cached): `total_tonnage` (excl. BW), `total_sets`, `total_reps`, `total_bw_reps`,
- created\_at, updated\_at, deleted\_at

**WorkoutSet**

- id, session\_id, exercise\_id, set\_number, reps, weight (nullable), unit (`kg|lb|null`), is\_bodyweight (bool)

**MetricsSnapshot**

- id, user\_id, bucket\_start (date), granularity (`day|week`), total\_tonnage, total\_sets, total\_reps, total\_bw\_reps

**Derived rules**

- If `is_bodyweight=true` then `weight=null` and `unit=null`.
- **Tonnage (exercise)** = sum(weight × reps) over non‑BW sets.
- **Total tonnage (session)** = sum of exercise tonnage.

---

## 6) Analytics (MVP → v1)

- **Per‑workout tonnage** (excludes BW) and BW reps count.
- **Weekly tonnage trend** (single chart; 7‑day buckets; optional 4‑week rolling avg).

---

## 7) Product Flow / UX (Minimalist)

1. **Home**: Paste or type workout → **Parse** → live table preview.
2. **Parse Preview**: Editable table (Exercise | Set | Reps | Weight | Notes) with inline warnings and quick‑fix chips.
3. **Save**: Toast showing **tonnage (excl. BW)** + BW reps.
4. **History**: Sessions list (date, tonnage, set count). Tap → detail.
5. **Analytics**: One line chart (**weekly tonnage**).

**Design cues**: neutral background, sans + mono type, sparse borders, keyboard‑first, dark mode v1.

---

## 8) Architecture

- **Frontend**: React (MERN stack) + TypeScript; TanStack Query; Tailwind.
- **Backend**: Node.js + Express (MERN stack). Parsing is a pure library with unit tests.
- **DB**: MongoDB (MERN stack) hosted on Atlas. Auth: passwordless/magic link.
- **Infra**: Vercel (FE), Railway/Fly/Render (BE).

---

## 9) API (MVP)

`POST /parse`

- body: `{ text: string, unitPreference?: 'kg'|'lb' }`
- resp: `{ exercises: [...], warnings: [...], tokens: [...] }`

`POST /sessions`

- body: `{ date?: ISO, text: string, parsed: ParsedSession }`
- resp: `{ sessionId, totals: { tonnage, bwReps, totalSets, totalReps } }`

`GET /sessions?limit=20&cursor=...`

- list user sessions with totals

`GET /sessions/:id`

- detail (exercises, sets, totals)

`GET /analytics/weekly-tonnage?range=12w`

- returns buckets for the single tonnage chart

---

## 10) Non‑Functional Requirements

- **Perf**: parse ≤100 ms for typical 3–10 lines; TTI < 2s on mid‑range mobile.
- **Reliability**: 99.9% target; idempotent session saves.
- **Security**: JWT auth; RLS; encrypted at rest.
- **Privacy**: user owns data; export and delete self‑serve.

---

## 11) Testing Strategy

- **Parser unit tests**: fixtures for each grammar path + edge cases.
- **Golden tests**: snapshot token streams for tricky lines.
- **API tests**: contract (Zod) + integration.
- **E2E**: paste → parse → edit → save → analytics.

---

## 12) Edge Cases & Rules of Thumb

- Mixed units in one session (normalize to user preference on read).
- Supersets/Giant sets (`A1/A2`) → capture as notes (MVP); better UX later.
- Percent‑only entries (e.g., `5x5x80%`) not supported in MVP.
- Fuzzy exercise match: suggest top 3 canonical names; user confirms.

---

## 13) Roadmap

**v0 (1–2 weeks)**

- Textarea → parse → preview → save
- Session list + per‑session **tonnage** (excl. BW) and BW reps

**v1 (3–6 weeks)**

- **Weekly tonnage chart** (single chart)
- Exercise aliases, dark mode
- CSV export/import

**v2**

- Superset UX
- Mobile PWA offline capture
- Coach view (maybe later)

---

## 14) Open Questions

1. Unit conversion strategy for mixed inputs in one line (e.g., `40kg`, `45lb`).
2. Minimal alias seed list and how users add new ones.
3. History UI: group by week vs. infinite scroll?

---

## 15) Sample Fixtures

```
# LP Day A
Squat 5x5x225
Bench Press 3x5x135
Deadlift 1x5x275
Pull‑ups 3x8 bw
```

```
# Hypertrophy
OHP 8x40kg 8x40kg 8x40kg
DB Row 12x30lb 12x30lb 10x30lb
Incline DB Press 12x20kg 12x20kg 12x20kg 12x20kg
```

