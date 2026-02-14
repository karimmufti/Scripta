<p align="center">
  <img src="public/favicon.png" alt="Scripta Logo" width="120" />
</p>

<h1 align="center">Scripta</h1>

<p align="center">
  <em>Movie script table reads, without the table.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Three.js-0.160-black?logo=three.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-BaaS-3FCF8E?logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss&logoColor=white" />
</p>

---

## What is Scripta?

**Scripta** is a full-stack web application that turns screenplay table reads into an asynchronous workflow. A screenwriter uploads a script, assigns characters to actors, and shares unique recording links. Each actor records their lines remotely — on their own time, from their own device. Scripta then stitches every recording into a single, cohesive table read with natural pauses and subtle room tone — all entirely in the browser.

No scheduling conflicts. No Zoom calls. No expensive studio time.

---
## Photo:
![Uploading image.png…]()


---
## Features

### Immersive 3D Typewriter Interface
- Full-screen **3D typewriter scene** built with React Three Fiber and Three.js
- Type directly onto the paper — each keystroke plays a realistic typewriter sound effect
- Cinematic dark theme with film grain overlay, vignette, and gold accents
- Carriage return sound plays when the script is parsed

### Smart Script Parsing
- Paste or type a script in standard `CHARACTER: dialogue` format
- **Upload a `.txt` file** to import scripts instantly
- **Load a sample script** (Jack & Rose demo) to try it out
- Automatic extraction of unique characters and ordered dialogue lines

### Actor Assignment & Sharing
- Map each character to a real person (actor name)
- Each actor receives a **unique shareable link** — no accounts needed
- Token-based auth: writers get a `writer_token`, actors get a `share_token`

### Remote Line Recording
- Actors open their personal link and see the full script for context
- Their assigned lines are highlighted; other characters' lines are shown for reference
- **One-click recording** via the browser microphone (MediaRecorder API)
- Playback, re-record, and upload controls for each line
- Real-time progress tracking

### Gender-Aware Text-to-Speech Narration
- Between an actor's lines, the app narrates other characters' dialogue aloud using the **Web Speech Synthesis API**
- **Gender-aware voice selection** — infers male/female from the character name (70+ common names + heuristic fallback)
- Prefers high-quality Siri voices on macOS (Samantha, Daniel, Karen, Alex)
- Separate pitch and rate tuning per gender for natural feel
- Penalizes robotic/novelty voices automatically

### Client-Side Audio Stitching
- **Zero server-side processing** — everything runs in the browser via the Web Audio API
- Loads all recorded clips from Supabase Storage
- Converts to mono, resamples to 44.1 kHz
- Concatenates in script order with configurable pauses (600ms default)
- Overlays subtle **pink noise room tone** (Voss-McCartney algorithm) for studio ambience
- Exports to WAV with proper RIFF headers
- Instant playback + download from the dashboard

### Writer Dashboard
- Track recording progress per actor with visual progress bars
- **"Lines Recorded — X of Y"** label for clarity
- Copy actor invite links with one click
- Generate the final table read and listen/download immediately
- Duration display and download button appear as soon as generation completes

---

## Architecture

```
src/
├── App.tsx                           # Router (5 routes)
├── pages/
│   ├── create.tsx                    # 3D typewriter + script input + parsing
│   ├── WriterPage.tsx                # Alternative 3-step wizard flow
│   ├── DashboardPage.tsx             # Writer dashboard — progress, generate audio
│   ├── ActorPage.tsx                 # Actor recording page — mic, TTS, upload
│   ├── Index.tsx                     # Landing page
│   └── NotFound.tsx                  # 404
├── components/
│   ├── TypewriterScene.tsx           # R3F Canvas — 3D typewriter + paper overlay
│   ├── ScriptInput.tsx               # Script textarea + sample loader
│   ├── ParsedLinesTable.tsx          # Parsed lines review table
│   ├── CharacterActorAssignment.tsx  # Character → actor mapping UI
│   ├── ProgressBar.tsx               # Visual progress bar
│   ├── LineRecorder.tsx              # Per-line recording controls
│   ├── Logo.tsx                      # Brand logo
│   └── ui/                           # shadcn/ui primitives
├── hooks/
│   └── useAudioRecorder.ts           # MediaRecorder hook
├── lib/
│   ├── types.ts                      # Core types (Session, Actor, Line, etc.)
│   ├── scriptParser.ts               # CHARACTER: dialogue parser
│   ├── audioStitcher.ts              # Client-side audio stitching engine
│   └── utils.ts                      # cn() classname helper
├── integrations/
│   └── supabase/
│       ├── client.ts                 # Supabase client init
│       └── types.ts                  # Auto-generated DB types
└── public/
    ├── models/                       # 3D typewriter GLTF model
    └── sfx/                          # Typewriter sound effects (keys + return)
```

---

## Database Schema

Three Postgres tables managed by Supabase:

### `sessions`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `title` | text | e.g. "Table Read — 2/7/2026" |
| `script_text` | text | Full raw script |
| `status` | text | `draft` → `recording` → `generated` |
| `writer_token` | text | Auto-generated, used in dashboard URL |
| `result_file_path` | text | Path to final stitched audio |
| `created_at` | timestamp | Auto |

### `actors`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `session_id` | uuid (FK → sessions) | |
| `name` | text | Actor's real name |
| `character_name` | text | Character they play |
| `share_token` | text | Auto-generated, used in actor recording URL |

### `lines`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `session_id` | uuid (FK → sessions) | |
| `actor_id` | uuid (FK → actors) | |
| `line_index` | int | Order in script |
| `character_name` | text | |
| `dialogue_text` | text | |
| `audio_file_path` | text | Path in Supabase Storage bucket |
| `audio_uploaded_at` | timestamp | |

**Storage:** A `recordings` bucket holds uploaded audio files (`.webm` / `.mp4`).

---

## User Flow

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐     ┌──────────────┐
│  1. Writer   │────▶│  2. Parse &  │────▶│  3. Actors     │────▶│  4. Generate │
│  uploads     │     │  assign      │     │  record lines  │     │  table read  │
│  script      │     │  actors      │     │  remotely      │     │  (WAV)       │
└─────────────┘     └──────────────┘     └────────────────┘     └──────────────┘
```

1. **Writer** pastes/uploads a script on the typewriter page → clicks **Parse Script**
2. Reviews parsed lines → assigns actor names to characters → **Create Session**
3. Copies unique links and sends them to actors
4. **Actors** open their link → see the full script → record their lines one-by-one with TTS narration for context
5. **Writer** returns to the dashboard → sees progress → clicks **Generate Audio**
6. Audio stitcher runs in-browser → final WAV is ready to play and download

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript | UI framework |
| **Build** | Vite 5 (SWC) | Fast dev server & builds |
| **3D** | Three.js + React Three Fiber + Drei | Typewriter scene |
| **Styling** | TailwindCSS + shadcn/ui (Radix) | Components & design system |
| **Backend** | Supabase | Postgres DB + file storage + auto tokens |
| **Recording** | MediaRecorder API | Browser mic capture |
| **Stitching** | Web Audio API | Client-side audio processing |
| **TTS** | Web Speech Synthesis API | Gender-aware narration |
| **Icons** | Lucide React | UI icons |
| **Toasts** | Sonner | Notifications |
| **Testing** | Vitest + Testing Library | Unit tests |

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** or **yarn**
- A **Supabase** project (free tier works)

### 1. Clone the repo

```bash
git clone [https://github.com/karimmufti/Scripta.git](https://github.com/karimmufti/Scripta.git)
cd Scripta
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=[https://your-project.supabase.co](https://your-project.supabase.co)
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### 4. Set up Supabase

In your Supabase dashboard:

1. **Create the tables** (`sessions`, `actors`, `lines`) with the schema described above
2. **Create a storage bucket** called `recordings` with public access enabled
3. **Enable RLS policies** as needed (or disable for development)

### 5. Run the dev server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Other commands

```bash
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint
npm run test         # Run tests (Vitest)
npm run test:watch   # Watch mode tests
```

---

## Design

- **Cinematic dark theme** — deep radial gradient background
- **Film grain overlay** — subtle texture with overlay blend mode
- **Vignette** — radial gradient darkening at edges
- **Gold accent** — `#F5C542` for branding, headings, and CTAs
- **Glassmorphism** — panels with `backdrop-filter: blur(16px)` and semi-transparent backgrounds
- **Pill-shaped buttons** — with hover glow effects and smooth transitions

---

## Script Format

Scripts should follow standard screenplay dialogue format:

```
CHARACTER_NAME: Line of dialogue here.
ANOTHER_CHARACTER: Their response goes here.
CHARACTER_NAME: And so on...
```

- One line per dialogue entry
- Character name before the colon (auto-uppercased)
- Blank lines and lines without colons are ignored

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---


<p align="center">
  Built with ☕ and 🎬 at <strong>SparkHacks 2026</strong>
</p>
