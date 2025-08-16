# Simple Workouts

A fast, minimalist workout logging application that converts free-form text into structured workout data. Built with the MERN stack (MongoDB, Express, React, Node.js).

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

## Architecture

- **Backend**: Node.js + Express + MongoDB (Mongoose)
- **Frontend**: React + TypeScript + Tailwind CSS + React Query
- **Parsing**: Custom grammar-based text parser
- **Data Model**: Optimized for fast queries with cached totals

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd simpleworkouts
   npm run install-all
   ```

2. **Set up environment variables**:
   ```bash
   # Copy environment template
   cp .env.example server/.env
   
   # Edit server/.env with your MongoDB URI
   MONGODB_URI=mongodb://localhost:27017/simpleworkouts
   ```

3. **Start MongoDB** (if running locally):
   ```bash
   mongod
   ```

4. **Seed the database**:
   ```bash
   npm run server
   cd server && npm run seed
   ```

5. **Start the application**:
   ```bash
   npm run dev
   ```

   This starts both the backend (port 5000) and frontend (port 3000) concurrently.

6. **Open the app**: Navigate to `http://localhost:3000`

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
├── server/                 # Backend API
│   ├── models/            # Mongoose schemas
│   ├── routes/            # API endpoints
│   ├── utils/             # Parsing logic
│   └── scripts/           # Database seeding
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── api/          # API client
│   │   └── types/        # TypeScript definitions
└── docs/                  # Product specifications
```

### Scripts

```bash
# Development
npm run dev              # Start both server and client
npm run server          # Start server only
npm run client          # Start client only

# Database
npm run seed            # Seed database with exercises and default user

# Production
npm run build           # Build client for production
npm start              # Start production server
```

### API Endpoints

- `POST /api/parse` - Parse workout text
- `POST /api/sessions` - Create workout session
- `GET /api/sessions` - List workout sessions
- `GET /api/sessions/:id` - Get session details
- `GET /api/analytics/weekly-tonnage` - Get weekly analytics

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

1. **Build the client**:
   ```bash
   cd client && npm run build
   ```

2. **Set environment variables**:
   ```bash
   NODE_ENV=production
   MONGODB_URI=your-production-mongodb-uri
   ```

3. **Deploy to your platform** (Vercel, Railway, Fly.io, etc.)

## Contributing

1. Follow the existing code style
2. Add tests for new parsing features
3. Update documentation for new formats
4. Test with various workout inputs

## License

MIT License - see LICENSE file for details.