# Hard Sphere Workbench

[简体中文说明](./README.zh-CN.md)

Hard Sphere Workbench is a desktop-first React/Vite/Electron prototype for hard-sphere and ideal-gas simulation studies. The current workbench opens into an empty workspace, lets the user create studies explicitly, and persists each created workbench file, window layout, theme preference, and UI language setting locally.

## Current Focus

This branch focuses on the Workbench experience:

- Empty-start workflow with user-created Standard Simulation and Ideal Gas Simulation studies.
- Desktop export bridge for reports and figures, with localized report and figure text while preserving scientific symbols and generated file names.
- Workbench settings under Settings -> General for theme, language, shortcut reference, and layout defaults.
- Light, dark, and system theme preferences with persistent storage.
- Simplified Chinese, Traditional Chinese, and English Workbench UI copy.
- Draggable 3D Preview / Realtime Data split layout, saved per file and as per-study default layout.
- Results window layout memory for both standard and ideal-gas studies.

## Local Development

Install dependencies first:

```powershell
npm.cmd install
```

Run the desktop preview used for Workbench verification:

```powershell
npm.cmd run desktop:dev
```

A browser-only Vite preview is still available when needed:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

## Verification

The targeted Workbench checks are plain Node scripts plus the production build:

```powershell
node scripts\workbenchLanguageMode.test.ts
node scripts\workbenchSettingsGeneral.test.ts
node scripts\workbenchLightTheme.test.ts
node scripts\workbenchLayoutExport.test.ts
node scripts\workbenchEmptySession.test.ts
node scripts\workbenchClickOutsideDismiss.test.ts
npm.cmd run build
```

## Project Structure

- `components/WorkbenchStudioPrototype.tsx` - main Workbench UI, state, settings, language copy, layout controls, and desktop bridge calls.
- `components/WorkbenchStudioPrototype.css` - Workbench dark/light styling and responsive layout rules.
- `components/workbenchState.ts` - Workbench file/session state helpers and layout defaults.
- `components/workbenchSession.ts` - persistent Workbench session encoding and decoding.
- `components/workbenchResults.ts` - report and figure export payload generation.
- `scripts/workbench*.test.ts` - focused static and behavior checks for Workbench regressions.

## Notes

The app intentionally does not translate scientific variables, relation names, units, generated filenames, or low-level exporter errors. UI language preferences only affect Workbench-facing labels, logs, panels, reports, and figure text.
