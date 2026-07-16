# Simple Workouts

A fast, minimalist workout logging application that converts free-form text into structured workout data. Fully client-side — built with React and TypeScript, with all data stored in the browser's localStorage.

## Features

- **Text-based workout input**: Log workouts by typing or pasting free-form text
- **Smart parsing**: Automatically converts text to structured exercises, sets, reps, and weights
- **Multiple input formats**: 
  - Aggregate format: `Bench Press 3x5x135`
  - Per-set format: `Lat Pulldown 12x40kg 10x45kg 8x45kg`
  - Bodyweight format: `Push-ups 12 10 8`
- **Live preview**: See parsed results before saving
- **Session history**: View all past workouts with detailed breakdowns
- **Analytics**: Weekly tonnage tracking and trends
- **Exercise aliases**: Support for common abbreviations (BP, OHP, etc.)
- **Import & export**: Back up all workouts to a JSON file and import them
  back (or into another browser), with a review step before anything is saved

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS (no backend)
- **Parsing**: Custom grammar-based text parser, runs in the browser
- **Storage**: Browser localStorage — workout sessions, settings, and custom
  exercises are saved per-browser, with totals cached on each session for
  fast history and analytics views

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd simpleworkouts
   npm install
   ```

2. **Start the application**:
   ```bash
   npm run dev
   ```

3. **Open the app**: Navigate to `http://localhost:3000`

## Usage

### Logging a Workout

1. Go to the main page
2. Choose your unit preference (kg or lb)
3. Enter your workout text using supported formats:

**Strength Training Example**:
```
Bench Press 3x5x135
Squat 5x5x225
Barbell Row 3x5x115
Overhead Press 3x5x95
Deadlift 1x5x275
```

**Bodyweight Example**:
```
Push-ups 12 10 8
Pull-ups 3x8 bw
Plank 3x60
```

**Hypertrophy Example**:
```
Lat Pulldown 12x40kg 10x45kg 8x45kg
Incline DB Press 12x20kg 12x20kg 12x20kg
DB Row 12x30lb 12x30lb 10x30lb
```

4. Click "Parse Workout" to see the preview
5. Review the parsed exercises and totals
6. Click "Save Workout" to log the session

### Supported Exercise Aliases

The app recognizes common exercise abbreviations:
- `BP` → Bench Press
- `OHP` → Overhead Press
- `pullups` → Pull-up
- `curls` → Bicep Curl
- `lat pull` → Lat Pulldown
- And many more...

### Viewing History

- Navigate to "History" to see all past workouts
- Click on any session to view detailed breakdown
- See exercise-by-exercise totals and original text

### Analytics

- Navigate to "Analytics" for weekly tonnage trends
- Choose different time ranges (4w, 8w, 12w, 24w)
- View summary statistics and detailed weekly breakdown

## Development

### Project Structure

```
simpleworkouts/
└── client/                # React app
    └── src/
        ├── components/    # React components (input, history, analytics, settings)
        └── utils/         # Parser, exercise database, localStorage helpers
```

### Scripts

```bash
npm run dev             # Start the dev server (http://localhost:3000)
npm run build           # Build for production
npm test                # Run the parser test suite
```

### Data Storage

All data lives in the browser's localStorage:

- `workout_sessions` — logged workout sessions (with cached totals)
- `user_settings` — unit preference and timezone

Data is per-browser: it doesn't sync across devices, and clearing site data
erases it. Use **Settings → Import & Export** to back up your workouts to a
JSON file or move them to another browser.

### Testing the Parser

The parsing engine supports various input formats. Test with these examples:

**Basic Formats**:
```
Bench Press 3x5x135        # Aggregate: 3 sets of 5 reps at 135 lbs
Squat 5x5                  # Aggregate without weight (bodyweight)
Pull-ups 3x8 bw           # Explicit bodyweight
```

**Per-Set Format**:
```
Curl 10x40kg 10x45kg 8x45kg    # Individual set weights
```

**Reps-Only Format**:
```
Push-ups 12 10 8              # Bodyweight reps only
```

**Mixed Units**:
```
Bench Press 3x5x135lb
Squat 5x5x100kg
```

## Production Deployment

The app is deployed to GitHub Pages at https://jenniferzliang.github.io/simpleworkouts/.

Every push to `main` triggers the `Deploy to GitHub Pages` workflow
(`.github/workflows/deploy-pages.yml`), which builds the client and publishes
`client/build`. The workflow can also be run manually from the Actions tab.

## Contributing

1. Follow the existing code style
2. Add tests for new parsing features
3. Update documentation for new formats
4. Test with various workout inputs

## License

MIT License - see LICENSE file for details.