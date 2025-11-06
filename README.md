# ShortForge Agent

ShortForge Agent is a Next.js experience that scouts viral short-form scripts and converts them into narrated, vertical videos ready for YouTube Shorts drops. The interface lets you filter trending hooks, tweak the copy, pick an AI voice profile, and output a WebM clip with animated captions and synthesized speech directly in the browser.

## Features

- 🔎 **Viral Script Scout** – curated dataset of high-performing hooks with tag and keyword filters.
- 🎙️ **AI Voice Profiles** – meSpeak-based speech synthesis with adjustable pitch/speed and quick persona presets.
- 🎨 **Dynamic Visuals** – vertical 9:16 canvas renderer with gradient palettes, motion overlays, and progress indicators.
- 🎬 **One-Click Video** – MediaRecorder pipeline that fuses the generated narration with animated captions into a downloadable WebM short.

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and enable autoplay permissions if prompted so the browser can play the generated audio during rendering.

## Production Build

```bash
npm run build
npm start
```

## Deployment

The project is ready for Vercel deployment. After running a local build check, deploy with:

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-d982905a
```

Verify the live site once DNS updates:

```bash
curl https://agentic-d982905a.vercel.app
```

## Notes

- Video and audio rendering uses browser APIs (`MediaRecorder`, `CanvasCaptureMediaStream`, and Web Audio). Ensure you generate videos from a Chromium-based browser for best compatibility.
- Downloaded files are WebM (VP9 + Opus). Convert to MP4 with a desktop tool if a platform requires it.
- The speech engine loads client-side; the first synthesis may take a second while assets initialize.
