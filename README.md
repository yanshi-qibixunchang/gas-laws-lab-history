# Hard Sphere Lab v4.0.1

[Simplified Chinese README](./README.zh-CN.md)

Hard Sphere Lab is a Windows desktop engineering workbench for hard-sphere molecular dynamics, ideal-gas relation verification, and the FD-NCD-C air heat-capacity-ratio experiment. The active release path is the Electron desktop app, not the older browser-only workflow and not the frozen Android/APK archive.

The GitHub default branch `main` is the source of truth for general desktop packaging. The frozen heat-capacity model-contract release `v4.0.1` is published from `codex/heat-capacity-ui-baseline`.

## Current Product Direction

- Windows desktop engineering software built with React, Vite, Electron, and a local Python exporter.
- Standard hard-sphere simulation and ideal-gas `P-T`, `P-V`, `P-N` study templates.
- FD-NCD-C air heat-capacity-ratio workflow with a frozen 3D instrument-control skeleton for later Blender model replacement.
- Local high-quality export for PDF reports, figures, and CSV data.
- System Python is used first when available; the packaged PyInstaller exporter is used as the fallback.
- Simplified Chinese, Traditional Chinese, and English UI copy.
- Legacy Android/APK material is preserved under `legacy-apk/` only as a frozen archive.

## Heat Capacity / Blender Model Contract

The FD-NCD-C air heat-capacity-ratio instrument controls are frozen in v4.0.1. Future work should primarily change experiment-process logic, teaching prompts, thresholds, and calculation methods rather than the instrument-control skeleton.

The 3D/Blender model is a state-machine-driven visualization and interaction carrier. It must not become the source of truth for `P0`, `P1`, `P2`, `U_p`, `U_T`, or `gamma`; those values come from the experiment state machine and calculation layer.

Independent Blender model development must follow the stable contract in [`docs/instrument-modeling/reference/Blender模型接入规则-v4.0.1.md`](./docs/instrument-modeling/reference/Blender%E6%A8%A1%E5%9E%8B%E6%8E%A5%E5%85%A5%E8%A7%84%E5%88%99-v4.0.1.md).

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
release/Hard Sphere Lab Setup 4.0.1.exe
```

## Release Folder Guide

- `Hard Sphere Lab Setup 4.0.1.exe`: official Windows installer. Use this for the full install, use, and uninstall workflow.
- `Hard Sphere Lab 4.0.1.exe`: portable no-install app. Double-click to run; close it before running the installer.
- `win-unpacked/`: unpacked application folder for developer inspection.
- `Hard Sphere Lab Setup 4.0.1.exe.blockmap`: update metadata for differential update flows.
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

- File-style workbench for standard simulation, ideal-gas studies, and the air heat-capacity-ratio experiment.
- Interactive 3D preview, live instrument readouts, and state-machine-driven heat-capacity controls.
- Editable current-parameter sidebar with immediate runtime refresh after Save.
- Results windows with tabs for summaries, data tables, figures, points, and verification views.
- Desktop bridge for report, figure, and CSV export.
- Default export archive under `Documents\Hard Sphere Lab Exports\<study-name>_<YYYYMMDD-HHmmss>\`.
- Local PDF/PNG/CSV export with system Python first and bundled exporter fallback.
- Persistent workbench session, layout defaults, theme, and language settings.

## Verification Commands

```powershell
npm.cmd test
npm.cmd exec tsc -- --noEmit
```

Before publishing a Windows installer, also run:

```powershell
npm.cmd run exporter:bundle
npm.cmd run desktop:installer
```

Then install `release/Hard Sphere Lab Setup 4.0.1.exe` into a clean test directory, launch the app, verify local export, and uninstall it through Windows Apps or `Uninstall Hard Sphere Lab.exe`.

## Repository Layout

- `src/app/`: React entrypoint and app shell.
- `src/components/`: shared UI components used across features.
- `src/features/`: feature UI for the workbench, ideal-gas mode, and heat-capacity experiment.
- `src/domain/`: simulation, ideal-gas, and heat-capacity calculation models.
- `src/shared/`: shared types and small utilities.
- `src/i18n/`: localized UI copy.
- `tests/`: regression tests grouped by feature area.
- `scripts/`: maintenance scripts such as test discovery and exporter bundling.
- `electron/`: desktop main and preload bridge for local export.
- `tools/exporter/`: Python PDF, figure, and CSV exporter.
- `docs/theory/`: theory notes and derivation documents.
- `docs/instrument-modeling/`: FD-NCD-C air heat-capacity-ratio modeling references and Blender model contract.
- `resources/exporter/`: ignored local PyInstaller fallback executable output.
- `legacy-apk/`: frozen mobile packaging archive, not an active development path.
