# Hard Sphere Lab v3.5.0

[简体中文说明](./README.zh-CN.md)

Hard Sphere Lab is a desktop-first engineering workbench for hard-sphere molecular dynamics and ideal-gas relation verification. It is built with React and Vite, and is intended to run in a desktop browser as an interactive simulation, data inspection, and reporting tool.

## Design Purpose

The project is designed for physics teaching, experiment preparation, and engineering-style exploration of gas simulation data. It combines a controllable molecular dynamics scene, parameter history, experiment files, live diagnostics, and result windows so users can run repeatable simulation studies instead of only watching a single animation.

The current product direction is desktop Web usage. Mobile packaging material is kept only as a frozen legacy archive and is not part of the active release workflow.

## Main Features

- Standard hard-sphere gas simulation with Andersen thermostat parameters.
- Ideal-gas workbench for `P-T`, `P-V`, and `P-N` relation studies.
- File-style workbench with standard simulation files and ideal-gas study files.
- 3D particle view with desktop pointer interaction.
- Real-time temperature, pressure, speed, and diagnostic chart panels.
- Results windows with tabs for summaries, tables, figures, points, and verification views.
- Editable current-parameter sidebar, reset/start flow, undo/redo, and saved workbench state.
- Built-in PDF report viewer.
- Simplified Chinese, Traditional Chinese, and English UI strings.

## Requirements

- Node.js 18 or newer
- npm
- A modern desktop browser

No runtime environment variables are required for normal local use.

## Local Development

Clone the repository:

```powershell
git clone https://github.com/yanshi-qibixunchang/gas-laws-lab-history.git
cd hard-sphere-lab-1
```

Install dependencies:

```powershell
npm.cmd install
```

Start the fixed-port development preview:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Preview URL:

```text
http://127.0.0.1:5174/
```

Use `npm.cmd` on Windows PowerShell to avoid script-execution policy issues with `npm.ps1`.

## Build And Deployment

Create a production build:

```powershell
npm.cmd run build
```

Preview the production bundle locally:

```powershell
npm.cmd run preview -- --host 127.0.0.1 --port 4173
```

Production entry point:

```text
dist/index.html
```

The production bundle should be served through HTTP. Do not open `dist/index.html` directly from the filesystem.

Netlify deployment uses the checked-in `netlify.toml`:

```toml
[build]
command = "npm run build"
publish = "dist"
```

## Usage Guide

1. Open the workbench in a desktop browser.
2. Create or select a simulation file from the left file area.
3. Adjust the current parameters in the right sidebar.
4. Use Reset before starting when parameters have changed.
5. Start the simulation and inspect the 3D view, real-time charts, and status values.
6. Open Results to review summaries, tables, figures, point data, or verification charts.
7. Use the PDF report viewer when you need the bundled project report.

For ideal-gas studies, choose the target relation, select the scan variable, run points, and review the verification tab. For standard simulations, use the Results tabs to inspect final statistics and exported analysis views.

## Repository Layout

- `App.tsx`: application shell and legacy standard-mode entry point.
- `components/`: workbench UI, canvas, charts, results, footer, and PDF viewer components.
- `services/`: physics engine, translations, and legacy APK path constants for future Help integration.
- `utils/`: ideal-gas analysis, diagnostics, and number-format helpers.
- `scripts/`: targeted regression tests for workbench behavior.
- `public/`: static runtime assets, icons, manifest, and report PDF.
- `legacy-apk/`: frozen legacy mobile packaging archive; not part of the active desktop release path.

## Verification Commands

```powershell
npm.cmd run build
```

Optional local preview:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Ignored local-only content includes dependency folders, build outputs, caches, logs, local environment files, and generated package artifacts.
