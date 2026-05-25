# Hard Sphere Lab v4.1.5

[简体中文 README](./README.zh-CN.md)

Hard Sphere Lab is a Windows desktop engineering workbench for hard-sphere molecular dynamics, ideal-gas relation verification, and the FD-NCD-C air heat-capacity-ratio experiment. The active release path is the Electron desktop app with a packaged local exporter for PDF reports, figures, and CSV data.

## What Changed In v4.1.5

- Tests and verifies remote structured release-note loading for future updates.
- Ensures update dialogs match the current interface language instead of showing every release-note language at once.
- Removes the blue accent edge and emphasis shadow from the update dialog version-information block for a simpler engineering-software style.
- Keeps plain-text release-note fallback for older clients and failure cases.
- Updates the app, package metadata, release metadata, and documentation version to `4.1.5`.

## What Changed In v4.1.4

- Added the heat-capacity free-experiment parameter adjustment system, including per-group editable parameters, locked historical snapshots, and persisted free-mode settings.
- Added structured advanced heat-capacity parameter groups, clearer engineering-style parameter rows, and improved light/dark theme styling across the experiment sidebars.
- Improved the heat-capacity free-mode physics path with thermal exchange, leakage, sensor response, safety thresholds, process review, and parameter impact checks.
- Added structured desktop update notes, transient-network download retries, and a direct manual installer download path after automatic update failures.
- Updated the app, package metadata, release metadata, and documentation version to `4.1.4`.

## Product Scope

- Standard hard-sphere simulation with live 3D preview, realtime charts, and final result tabs.
- Ideal-gas relation studies for `P-T`, `P-V`, and `P-N`, including point collection, verification, and history unlocks.
- FD-NCD-C air heat-capacity-ratio experiment with demo, guided, and free modes.
- Desktop export for PDF reports, PNG/PDF figures, and CSV data.
- Simplified Chinese, Traditional Chinese, and English interface text.
- Frozen Android/APK material is archived locally and is not part of the active release path.

## Repository Layout

- `src/app/`: React entrypoint and legacy app shell.
- `src/components/`: shared visual components.
- `src/features/`: workbench UI, ideal-gas UI, and heat-capacity UI.
- `src/domain/`: simulation, ideal-gas, and heat-capacity calculation models.
- `src/shared/`: shared types and utility definitions.
- `src/i18n/`: app-level translation tables.
- `tests/`: feature regression tests.
- `scripts/`: project maintenance scripts, including test discovery and exporter bundling.
- `electron/`: Electron main process and preload bridge for desktop export.
- `tools/exporter/`: Python exporter source and sample payloads.
- `resources/exporter/`: generated PyInstaller exporter output; ignored by Git and regenerated before packaging.
- `resources/app-icon/`: desktop application icons.
- `docs/theory/`: theory and derivation materials.
- `docs/instrument-modeling/`: FD-NCD-C modeling references and Blender integration contract.
- `legacy-apk/`: frozen mobile archive, not tracked for active development.
- `release/`: local build output, ignored by Git.

## Web Deployment

Install dependencies:

```powershell
npm.cmd install
```

Build the static web bundle:

```powershell
npm.cmd run build
```

Deploy the generated `dist/` folder to any static host. For local browser preview during development, use the fixed project port:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Preview URL:

```text
http://127.0.0.1:5174/
```

Browser deployment can preview the simulator and workbench UI, but local PDF/image export requires the Electron desktop bridge.

## Desktop App And Installer

Build the bundled exporter first:

```powershell
npm.cmd run exporter:bundle
```

Build the official Windows installer:

```powershell
npm.cmd run desktop:installer
```

The formal distributable for v4.1.4 is:

```text
release/heat-capacity-lab-setup-4.1.4.exe
```

Run the desktop app locally for development:

```powershell
npm.cmd run desktop:dev
```

## Interface Guide

- Top menu: create/open experiments, open a fresh window, undo/redo, layout controls, settings, and help/about.
- Left sidebar: open experiment files and file-specific panels.
- Center workspace: 3D preview, realtime data/charts, results, experiment records, and processing panels.
- Right sidebar: current parameters, relation controls, scan variable controls, sampling presets, and advanced settings.
- Bottom console: logs, warnings, and runtime summaries.
- Settings: theme, language, performance mode, and layout preferences.
- About: version, local export environment status, and workspace cache summary.

## Basic Workflow

1. Create or open an experiment from the top menu or empty workspace.
2. Choose the experiment file in the left sidebar.
3. Adjust parameters in the right sidebar before running.
4. Run the simulation or heat-capacity workflow.
5. Review realtime charts and result tabs.
6. Export reports, figures, or CSV data from the result/export controls.

## Export Details

The desktop app checks the export environment in this order:

1. System Python exporter, if available.
2. Bundled PyInstaller exporter packaged with the app.

The exporter creates PDF reports, PDF/PNG figures, CSV data, and metadata under the selected output folder. The default desktop export folder is under the user's Documents directory.

## Verification

Recommended checks before publishing:

```powershell
npm.cmd test
npm.cmd exec tsc -- --noEmit
npm.cmd run build
npm.cmd run exporter:bundle
npm.cmd run desktop:installer
```

After packaging, verify the generated installer and the bundled exporter before creating a GitHub Release.

## Heat Capacity / Blender Model Contract

The FD-NCD-C air heat-capacity-ratio instrument-control skeleton remains governed by the v4.0.1 modeling contract. The 3D/Blender model is a state-machine-driven visualization and interaction carrier; it must not become the source of truth for `P0`, `P1`, `P2`, `U_p`, `U_T`, or `gamma`.

Independent Blender model development should follow:

```text
docs/instrument-modeling/reference/Blender模型接入规则-v4.0.1.md
```
