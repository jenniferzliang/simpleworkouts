# Workout Logger — Product Spec (Draft v0.1)

*Last updated: 2025-08-15*

## 5) Data Model (MVP)

This schema is optimized for the **Everyday Lifter** (no 1RM/RPE). It captures workouts from free text, normalizes exercises, and precomputes light totals for fast UI.

### Entity Overview

- **User** — account, preferences.
- **Exercise** — canonical exercises (e.g., "Bench Press").
- **ExerciseAlias** — fuzzy/short names mapping to `Exercise`.
- **WorkoutSession** — a single logged workout (includes raw source text and cached totals).
- **WorkoutExercise** — represents all sets of a single exercise within a `WorkoutSession`.
- **MetricsSnapshot** — denormalized daily/weekly totals for charts.
- **ParsingAudit** — optional debug record of the token stream and warnings.

---

### Tables & Fields

#### User

- `id` (uuid, pk)
- `email` (text, unique, indexed)
- `name` (text, nullable)
- `unitPreference` (enum: `kg` | `lb`, default `lb`)
- `timezone` (text, IANA like `America/Detroit`, default from signup)
- `createdAt` (timestamptz, default now)
- `deletedAt` (timestamptz, null)

#### Exercise

- `id` (uuid, pk)
- `canonicalName` (text, unique, e.g., "Bench Press")
- `category` (enum: `push` | `pull` | `legs` | `core` | `cardio` | `other`, default `other`)
- `isBodyweight` (bool)

#### ExerciseAlias

- `id` (uuid, pk)
- `exerciseId` (uuid, fk → Exercise.id, on delete cascade)
- `alias` (text, indexed)

**Misc Notes:** Aliases should cover common abbreviations, plural/singular variants, and alternate names. Example mappings:

- Bench Press → ["BP", "bench"]
- Overhead Press → ["OHP", "shoulder press", "military press"]
- Pull-up → ["pullups", "chin-up", "chins"]
- Lat Pulldown → ["lat pull", "pulldown"]
- Biceps Curl → ["curls", "bicep curls", "db curl"]

#### WorkoutSession

- `id` (uuid, pk)
- `userId` (uuid, fk → User.id)
- `performedAtLocal` (timestamptz)
- `performedDate` (date)
- `sourceText` (text)
- `notes` (text, nullable)
- `device` (text, nullable)
- `totalSets` (int, cached)
- `totalReps` (int, cached)
- `totalTonnage` (numeric(12,2))
- `totalBwReps` (int)
- `createdAt` (timestamptz, default now)
- `updatedAt` (timestamptz, default now)
- `deletedAt` (timestamptz, null)

#### WorkoutExercise

- `id` (uuid, pk)
- `sessionId` (uuid, fk → WorkoutSession.id, on delete cascade)
- `exerciseId` (uuid, fk → Exercise.id)
- `sequence` (int) — order of appearance in workout
- `sets` (jsonb) — array of set objects `{ setNumber, reps, weight, unit, isBodyweight }`
- `totalSets` (int)
- `totalReps` (int)
- `totalTonnage` (numeric(12,2)) — excludes BW sets
- `totalBwReps` (int)

#### MetricsSnapshot

- `id` (uuid, pk)
- `userId` (uuid, fk → User.id)
- `bucketStart` (date)
- `granularity` (enum: `day` | `week`, default `week`)
- `totalTonnage` (numeric(12,2))
- `totalSets` (int)
- `totalReps` (int)
- `totalBwReps` (int)

#### ParsingAudit (optional)

- `id` (uuid, pk)
- `sessionId` (uuid, fk → WorkoutSession.id, on delete cascade)
- `tokensJson` (jsonb)
- `warnings` (jsonb)
- `durationMs` (int)

---

### Relationships

- `User 1—N WorkoutSession`
- `WorkoutSession 1—N WorkoutExercise`
- `Exercise 1—N WorkoutExercise`
- `Exercise 1—N ExerciseAlias`
- `User 1—N MetricsSnapshot`

---

### Benefits of WorkoutExercise model

- Groups all sets for the same exercise in a session for simpler queries.
- Reduces table size vs. one row per set.
- Easier to fetch full workout structure in a single query.
- Still allows per-set details via `sets` JSON array.

---

### Data Invariants & Constraints

- BW sets in `sets` array must have `weight=NULL`, `unit=NULL`, `isBodyweight=true`.
- Session and exercise totals recalculated on any change to `sets`.
- Enforce `sequence` uniqueness per `sessionId`.

---

### Minimal Seed Data (Exercises)

["Bench Press", "Squat", "Deadlift", "Overhead Press", "Barbell Row", "Pull-up", "Push-up", "Lat Pulldown", "Leg Press", "Plank"]

---

### WorkoutExercise JSON set format

```
{
  setNumber: number,
  reps: number,
  weight: number | null,
  unit: 'kg' | 'lb' | null,
  isBodyweight: boolean
}
```

