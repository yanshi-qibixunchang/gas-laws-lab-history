# Hard Sphere Lab v3.4.0

Hard Sphere Lab is a React + Vite simulation app for hard-sphere molecular dynamics with an Andersen thermostat. This repository contains both the web application and the Capacitor Android shell used to package the same interface as a mobile app.

## Highlights

- Real-time hard-sphere gas simulation with adjustable parameters
- 3D interaction mode with mobile onboarding hints
- Statistical cards and distribution charts for temperature, pressure, speed, and energy
- Preset save / load workflow
- Built-in PDF report viewer with mobile zoom handling
- Multi-language UI in Simplified Chinese, Traditional Chinese, and English
- Web preview plus Android packaging support

## Requirements

- Node.js 18 or newer
- npm
- Android Studio + Android SDK only if you want to build the Android app

The web app does not require any runtime environment variables.

## Quick Start

Install dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

Expected local preview URL:

```text
http://127.0.0.1:5173
```

## Production Preview

Build the web bundle:

```powershell
npm run build
```

Preview the production build locally:

```powershell
npm run preview -- --host 127.0.0.1 --port 4173
```

Expected preview URL:

```text
http://127.0.0.1:4173
```

The generated production entry is:

```text
dist/index.html
```

Because the asset paths are absolute, the production bundle should be served by a local HTTP server instead of being opened directly from the filesystem.

## Android Packaging

Sync the latest web build into the Capacitor Android project:

```powershell
npm run build
npx cap sync android
```

Build a debug APK from the Android project:

```powershell
Set-Location android
.\gradlew.bat assembleDebug
```

Expected APK output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Notes:

- Release signing materials such as `android/key.properties` and keystore files are intentionally not committed.
- If you want to generate a release APK, add your own signing config locally before building.

## Contact Leader Behavior

The `Contact Leader` / `联系组长` button intentionally uses a two-step interaction:

1. It copies the email address to the clipboard immediately.
2. A bottom toast confirms that the address has been copied.
3. After about 1 second, the app attempts a `mailto:` jump.

This design reduces failure ambiguity on mobile devices. If the jump does not open successfully, the most common reasons are:

- no default mail app is configured on the device
- the current browser or embedded WebView blocks direct `mailto:` handling
- the system does not have a registered mail handler

If that happens, the copied address can still be pasted manually into your mail client:

```text
project-team@users.noreply.github.com
```

For the jump to work automatically, make sure the device or browser has a default mail client such as QQ Mail, Outlook, Gmail, or another app that has registered `mailto:` links.

## Repository Hygiene

This repository is intentionally kept source-only for GitHub distribution. Local-only files are ignored, including:

- `node_modules/`
- `dist/`
- `output/`
- `.codex/`
- Android build caches and IDE state
- local env files such as `.env.local`
- APK / AAB build artifacts
- local Android signing materials

That means a fresh clone stays clean, while other developers can still install dependencies and build the project normally.

## Project Layout

- `App.tsx` and `components/` contain the main UI and interaction logic
- `services/` contains simulation and translation logic
- `public/` contains static assets such as the PDF report and PWA manifest
- `android/` contains the Capacitor Android project
- `assets/` contains artwork and packaging-related source assets

## Version Alignment

Version `3.4.0` is aligned across:

- `package.json`
- `package-lock.json`
- `App.tsx`
- `services/translations.ts`
- `public/manifest.webmanifest`
- `android/app/build.gradle`
