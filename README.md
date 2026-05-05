# Hard Sphere Lab v3.5.1

[简体中文说明](./README.zh-CN.md)

Hard Sphere Lab is a Windows desktop engineering workbench for hard-sphere molecular dynamics and ideal-gas relation verification. The active release path is the Electron desktop app, not the older browser-only workflow and not the frozen Android/APK archive.

The GitHub default branch `main` is the source of truth for current desktop packaging. Clone or package from `main` unless a maintainer explicitly asks you to test another branch.

## Current Product Direction

- Windows desktop engineering software built with React, Vite, Electron, and a local Python exporter.
- Standard hard-sphere simulation and ideal-gas `P-T`, `P-V`, `P-N` study templates.
- Local high-quality export for PDF reports, figures, and CSV data.
- System Python is used first when available; the packaged PyInstaller exporter is used as the fallback.
- Simplified Chinese, Traditional Chinese, and English UI copy.
- Legacy Android/APK material is preserved under `legacy-apk/` only as a frozen archive.

## Install And Package

Install dependencies:

```powershell
npm.cmd install
```

Build the bundled exporter before creating distributable desktop packages:

```powershell
npm.cmd run exporter:bundle
```

Create the official Windows installer:

```powershell
npm.cmd run desktop:installer
```

Create the portable build:

```powershell
npm.cmd run desktop:portable
```

The generated files are written to `release/`. For normal user distribution, use:

```text
release/Hard Sphere Lab Setup 3.5.1.exe
```

## Release Folder Guide

- `Hard Sphere Lab Setup 3.5.1.exe`: official Windows installer. Use this for the full install, use, and uninstall workflow.
- `Hard Sphere Lab 3.5.1.exe`: portable no-install app. Double-click to run; close it before running the installer.
- `win-unpacked/`: unpacked application folder for developer inspection.
- `Hard Sphere Lab Setup 3.5.1.exe.blockmap`: update metadata for differential update flows.
- `latest.yml`: update metadata.
- `builder-debug.yml`: local electron-builder debug output.

Only the `Setup` executable is the formal installer.

## Desktop Development

Run the local desktop preview:

```powershell
npm.cmd run desktop:dev
```

The browser-only Vite command is available for low-level UI debugging, but it is not the main acceptance path for this desktop release:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

## Main Features

- File-style workbench for standard simulation and ideal-gas studies.
- Interactive 3D particle preview and live chart panels.
- Editable current-parameter sidebar with immediate runtime refresh after Save.
- Results windows with tabs for summaries, data tables, figures, points, and verification views.
- Desktop bridge for report, figure, and CSV export.
- Default export archive under `Documents\Hard Sphere Lab Exports\<study-name>_<YYYYMMDD-HHmmss>\`.
- Local PDF/PNG/CSV export with system Python first and bundled exporter fallback.
- Persistent workbench session, layout defaults, theme, and language settings.

## Verification Commands

```powershell
node scripts\workbenchRemoveApplyAction.test.ts
node scripts\workbenchStartAutoApplyScanControls.test.ts
node scripts\workbenchRunningParamsLock.test.ts
node scripts\workbenchExportButtonReadiness.test.ts
node scripts\workbenchLanguageMode.test.ts
npm.cmd run build
```

Before publishing a Windows installer, also run:

```powershell
npm.cmd run exporter:bundle
npm.cmd run desktop:installer
```

Then install `release/Hard Sphere Lab Setup 3.5.1.exe` into a clean test directory, launch the app, verify local export, and uninstall it through Windows Apps or `Uninstall Hard Sphere Lab.exe`.

## Repository Layout

- `components/`: workbench UI, canvas, results, export payload, and session helpers.
- `electron/`: desktop main and preload bridge for local export.
- `tools/exporter/`: Python PDF, figure, and CSV exporter.
- `scripts/`: targeted regression checks and exporter bundling script.
- `resources/exporter/`: ignored local PyInstaller fallback executable output.
- `legacy-apk/`: frozen mobile packaging archive, not an active development path.

Generated packages, build outputs, exporter examples, logs, and local installation test directories are intentionally ignored.
