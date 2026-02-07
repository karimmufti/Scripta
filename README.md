# Scripta — TableRead.io

Async table reads for screenwriters. Upload your script, assign actors, and let them record their lines remotely. We stitch everything together into one cohesive table read.

## Features

- **Cinematic typewriter homepage** — immersive 3D typewriter scene built with Three.js / React Three Fiber
- **Script input** — type directly onto the typewriter paper with realistic ink rendering and typewriter sound effects
- **Script parsing** — automatically extracts characters and dialogue lines from screenplay format
- **Actor assignment** — assign real people to each character role with email invite support
- **Remote recording** — actors record their lines from their own devices
- **Audio stitching** — combines all recordings into one cohesive table read
- **Writer dashboard** — track progress, manage actors, and generate the final audio

## Tech Stack

- **React** + **TypeScript**
- **Vite** — build tooling
- **Three.js** / **React Three Fiber** / **Drei** — 3D typewriter scene
- **Postprocessing** — cinematic bloom, tone mapping, brightness/contrast
- **Tailwind CSS** — styling
- **shadcn/ui** — UI components
- **Supabase** — backend (auth, database, storage)

## Getting Started

```sh
git clone https://github.com/karimmufti/Scripta.git
cd Scripta
npm install
npm run dev
```

Requires Node.js 18+.


## Author:

Kareem Muftee
Youssef Elghawabi
Dominic Aidoo
