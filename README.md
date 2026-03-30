# Hard Sphere Lab v3.4.0

Hard Sphere Lab is a hard-sphere molecular dynamics simulation platform built with React, Vite, and Capacitor. It provides a browser-based interface for real-time particle motion, statistical observation, 3D interaction, preset management, and built-in report viewing.

This repository contains:

- the web application source code
- the Capacitor Android project used for APK packaging
- public assets such as the PDF report and PWA manifest

## Overview

The project focuses on visualizing hard-sphere gas dynamics under an Andersen thermostat. Users can:

- adjust core simulation parameters
- reset and start the simulation from the UI
- observe temperature, pressure, mean speed, RMS speed, and distributions
- switch between multiple interface languages
- interact with the 3D view on desktop and mobile
- save parameter presets and reuse them later
- open the built-in PDF report directly inside the app

## Main Features

- Real-time hard-sphere simulation
- 3D molecular dynamics view with rotate / pan mode switching
- Progress tracking for equilibration and statistical collection
- Preset creation, selection, rename, delete, and startup-default setting
- Responsive layout for desktop and mobile
- Built-in PDF viewer with zoom support
- Web deployment support and Android APK packaging
- Simplified Chinese, Traditional Chinese, and English UI

## Requirements

- Node.js 18 or newer
- npm
- Android Studio and Android SDK only if you want to build the Android app

No runtime environment variables are required for normal web usage.

## Quick Start

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

## Production Preview

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

## User Guide

### Basic workflow

For the normal simulation flow:

1. Open the settings sidebar.
2. Adjust particle count, radius, box size, and timing parameters.
3. Click `Reset System` after changing parameters.
4. Click `Run` / `Start Simulation`.
5. Observe the 3D view, statistics cards, and distribution charts.

Important:

- If parameters have changed, the app may require a reset before starting.
- On mobile, the native back key can close the sidebar and other transient panels before exiting the app.

### 3D view interaction

The app supports two common 3D interaction modes:

- rotate mode
- pan mode

If you enter the 3D interaction area and do not switch modes for a short time, the interface may show a visual hint guiding you to the view-mode toggle button.

### Presets

The preset section allows you to:

- create a new preset
- load an existing preset
- rename or delete a preset
- set a preset as the startup default

The create action is exposed as a compact icon button in the preset area.

### Theme and language

The top-right floating controls let you:

- switch between light and dark mode
- switch UI language

The language change and theme change both show bottom toast feedback.

### PDF report

The footer includes a `View Report (PDF)` entry. It opens the report inside the built-in modal PDF viewer.

Supported interactions include:

- toolbar zoom in / zoom out
- reset zoom
- mobile pinch zoom
- PDF export / share on supported platforms

### Contact leader

The `Contact Leader` / `联系组长` button intentionally uses a two-step flow:

1. The email address is copied to the clipboard immediately.
2. A bottom toast confirms the copy operation.
3. About 1 second later, the app attempts to open the default mail client through `mailto:`.

This behavior is intentional. It helps in cases where direct email jumps fail on mobile browsers or embedded WebViews. Even if the jump does not succeed, the email address is already copied and can be pasted manually.

Email address:

```text
project-team@users.noreply.github.com
```

For automatic jump success, the device should have a default mail app configured, such as QQ Mail, Outlook, Gmail, or another app that supports `mailto:` links.

## Android Packaging

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

Notes:

- Release signing files such as `android/key.properties` and keystores are intentionally not committed.
- If you want to build a release APK, add your own signing configuration locally first.

## Common Questions

### Why can I not start the simulation after changing parameters?

Because the app requires a reset after parameter changes. Click `Reset System` first, then start the simulation again.

### Why did the email not open automatically?

Common reasons:

- no default mail app is configured
- the current browser blocks `mailto:` jumps
- the app is running inside an embedded WebView without a registered email handler

In those cases, use the copied email address manually.

### Why is the repository missing APK files and build outputs?

This repository is intentionally source-only. Local artifacts such as `dist/`, `output/`, APK files, Android cache files, and local signing materials are ignored so the GitHub repository stays clean and reproducible.

## Repository Layout

- `App.tsx`: main app shell and high-level interaction logic
- `components/`: UI components such as the simulation canvas, footer, stats panel, and PDF modal
- `services/`: physics engine and translation resources
- `public/`: static files, PDF report, icons, and manifest
- `android/`: Capacitor Android project
- `assets/`: project artwork and packaging-related resources

## Development Notes

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
