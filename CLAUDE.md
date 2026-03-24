# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Shift 8 — A Framework for Existence** is an interactive philosophical React application exploring consciousness, observation, and the space between zero and infinity. It visualizes mathematical concepts (π, sign bits, wave collapse, fractals) through 19 navigable sections with canvas animations and keyboard-driven interactions.

The project has a companion research track: **Nativ3**, a quantum computing notation system with novel theorems about controlled-unitary circuit topology. Research docs live in `docs/`.

## Build & Development

All build tooling is in `build-temp/` (git-ignored). The root `shift8.jsx` is the canonical source.

```bash
# Build (produces single-file dist/index.html)
cd build-temp && npm install && npm run build

# The build copies shift8.jsx into build-temp/src/ before bundling
# Output: build-temp/dist/index.html → copied to root dist/index.html
```

**No dev server, linter, or test framework is configured.** The project is a single React component built via Vite into a self-contained HTML file.

## Architecture

### Single-Component Monolith

Everything lives in **`shift8.jsx`** (~1,560 lines). It contains:

- **7 function components**: `QueryExperience`, `PiStream`, `WaveCollapse`, `ZeroZoom`, `SignBitVisual`, `JourneyView`, `Shift8` (main export)
- **State**: Plain React hooks (useState, useEffect, useRef, useCallback) — no external state library
- **Styling**: All inline React style objects — no CSS files, no Tailwind
- **Animations**: 13 CSS keyframes injected via `<style>` tag, plus canvas-based visualizations

### Key State in `Shift8` Component

- `sec` — Current section index (0–18, drives all content)
- `shifted` — Whether Shift key is held (toggles visual modes)
- `precision` — π digit display precision
- `queryMode` — Shift+8 easter egg modal active
- `journeyMode` — Guided narrative mode active

### Content Model

`SECTIONS` array (19 entries) with `id`, `title`, `subtitle`, `insight` drives navigation. Right-side dot nav + prev/next buttons + keyboard for movement.

## Tech Stack

- **React 19** + **React DOM 19**
- **Vite 8** with `vite-plugin-singlefile` (bundles everything into one HTML file)
- **Google Fonts**: Cormorant Garamond (serif), IBM Plex Mono (monospace)
- **Canvas API**: Used directly for WaveCollapse, ZeroZoom, SignBitVisual

## Deployment

Deployed to **Vercel** as a static site. The `dist/` directory contains the compiled `index.html`.

```
vercel.json         → { "outputDirectory": "dist" }
.vercel/project.json → project + org IDs
```

## Key Conventions

- The root `shift8.jsx` is the single source of truth — `build-temp/src/shift8.jsx` may lag behind
- `docs/` contains Nativ3 research: papers (.docx), proofs (.jsx), experiments (.py), and progress tracking
- Color palette: `#0a0a0c` (bg), `#d4af37` (gold), `#c8b88a` (tan), `#648cdc` (blue)
- The Shift key is thematically central — holding it transforms visuals throughout the app
