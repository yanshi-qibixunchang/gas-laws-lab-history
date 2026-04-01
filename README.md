# Hard Sphere Lab v3.4.3

[中文说明](./README.zh-CN.md)

Hard Sphere Lab is a hard-sphere molecular dynamics simulation platform built with React, Vite, and Capacitor. It combines a browser-based simulation UI, a 3D particle view, statistical diagnostics, preset management, and a built-in PDF report viewer in one project.

## Release highlights in v3.4.3

- rebuilt the real-time and final-result charts with a more scientific plotting style
- replaced the old stacked final-results flow with a fixed analysis board for desktop and a cleaner mobile layout
- added a statistical summary block below the semi-log distribution plot to remove dead space and expose fit / stability metrics
- tuned container sizing, fullscreen behavior, and short-height responsiveness so chart headers and controls do not clip
- unified window-level corner radii across cards, analysis panels, modals, and chart shells

## What this repository contains

- the web application source code
- the Capacitor Android project used for APK packaging
- public assets such as the PDF report and PWA manifest

## Main features

- hard-sphere gas simulation under an Andersen thermostat
- 3D molecular dynamics view with rotate / pan interaction
- real-time temperature, pressure, mean-speed, and RMS-speed monitoring
- scientific-style velocity, energy, semi-log, and diagnostic charts
- preset creation, loading, rename, delete, and startup-default selection
- built-in PDF viewer with zoom and export / share support
- Simplified Chinese, Traditional Chinese, and English UI
- web preview workflow and Android packaging path

## Requirements

- Node.js 18 or newer
- npm
- Android Studio and Android SDK only if you want to build the Android app

No runtime environment variables are required for normal web usage.

## Quick start

### 1. Clone the repository

```powershell
git clone https://github.com/yanshi-qibixunchang/gas-laws-lab-history.git
cd hard-sphere-lab
```

### 2. Install dependencies

```powershell
npm install
```

### 3. Start the development server

```powershell
npm run dev
```

Expected local preview URL:

```text
http://127.0.0.1:5173
```

## Production preview

Build the project:

```powershell
npm run build
```

Preview the production bundle locally:

```powershell
npm run preview -- --host 127.0.0.1 --port 4173
```

Expected preview URL:

```text
http://127.0.0.1:4173
```

The generated production entry file is:

```text
dist/index.html
```

The production bundle should be served through HTTP instead of being opened directly from the filesystem.

## Usage notes

### Basic workflow

1. Open the settings sidebar.
2. Adjust particle count, radius, box size, and timing parameters.
3. Click `Reset System` after changing parameters.
4. Click `Start Simulation`.
5. Observe the 3D view, statistics panel, and analysis charts.

Important:

- after parameter changes, the app may require a reset before starting
- on mobile, the native back key closes transient UI in order, including the PDF viewer, before exiting the app

### Charts and diagnostics

The analysis area now includes:

- velocity distribution
- energy distribution
- semi-log energy distribution
- total-energy trace
- temperature-error trace
- statistical summary metrics for fit quality and stability

### Presets

The preset section supports:

- creating a new preset
- loading an existing preset
- renaming and deleting custom presets
- setting a preset as the startup default

### Theme and language

The floating controls in the top-right corner let you:

- switch between light and dark mode
- change UI language

### PDF report

The footer includes a `View Report (PDF)` entry. It opens the report inside the built-in modal PDF viewer with:

- zoom in / zoom out
- reset zoom
- mobile pinch zoom
- export / share on supported platforms

## Android packaging

Sync the latest web build into the Capacitor Android project:

```powershell
npm run build
npx cap sync android
```

Build a debug APK:

```powershell
Set-Location android
.\gradlew.bat assembleDebug
```

Expected APK output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Repository layout

- `App.tsx`: main app shell and high-level interaction logic
- `components/`: UI components such as the simulation canvas, charts, footer, stats panel, and PDF modal
- `services/`: physics engine and translation resources
- `public/`: static files, PDF report, icons, and manifest
- `android/`: Capacitor Android project
- `assets/`: project artwork and packaging-related resources

## Development notes

Useful commands:

```powershell
npm run dev
npm run build
npm run preview
```

Ignored local-only content includes:

- `node_modules/`
- `dist/`
- `output/`
- `.codex/`
- `.env.local`
- Android build caches and IDE state
- APK / AAB artifacts
- local Android signing materials
