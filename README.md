# Hard Sphere Lab v3.2.1

Hard Sphere Lab is a React + Vite simulation app for hard-sphere molecular dynamics with an Andersen thermostat. The current release packages the web app and a Capacitor Android shell under the product name `硬球模拟3`.

## What is included

- Real-time hard-sphere simulation with adjustable particle and box parameters
- Statistical panels and distribution charts for temperature, pressure, speed, and energy
- Preset save/load workflow inside the UI
- Built-in PDF report viewing
- Responsive web layout plus Android packaging via Capacitor
- Multi-language UI content in Simplified Chinese, Traditional Chinese, and English

## Requirements

- Node.js 18 or newer
- npm
- Android Studio and an Android SDK only if you want to build the Android app

No runtime environment variables are currently required for the web app.

## Local preview

Install dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

Expected preview URL:

```text
http://127.0.0.1:5173
```

## Production-like preview

Build the app:

```powershell
npm run build
```

Serve the production bundle locally:

```powershell
npm run preview -- --host 127.0.0.1 --port 4173
```

Expected preview URL:

```text
http://127.0.0.1:4173
```

The production entry file is generated at `dist/index.html`, but it must be served by a local HTTP server because the asset paths are absolute.

## Android packaging

Sync the web bundle into the Capacitor Android project:

```powershell
npm run build
npx cap sync android
```

Build a debug APK:

```powershell
Set-Location android
.\gradlew.bat assembleDebug
```

Expected artifact:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Project layout

- `App.tsx` and `components/` contain the main web UI
- `services/` contains the simulation and translation logic
- `public/` contains static assets such as the report PDF, icons, and web manifest
- `assets/` contains source artwork used for platform packaging
- `android/` contains the Capacitor Android project

## Version alignment

The current repository state is aligned to version `3.2.1` across:

- `package.json`
- Android app metadata
- in-app footer translations
- web manifest and app naming
