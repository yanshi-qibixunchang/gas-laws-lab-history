# Gas Laws Lab

[简体中文](./README.zh-CN.md) · [繁體中文](./README.zh-TW.md)

Gas Laws Lab is a Windows engineering workbench for hard-sphere molecular dynamics, ideal-gas relation studies, and air heat-capacity-ratio experiments using both adiabatic expansion and piston oscillation.

The latest published desktop release is `v6.4.1`. The unpublished `6.4.2` patch has passed local compatibility and packaging checks and is awaiting clean Windows upgrade acceptance. The `main` branch may contain reviewed work completed after the published tag.

- Public downloads and update metadata: [gas-laws-lab-release](https://github.com/yanshi-qibixunchang/gas-laws-lab-release)
- Security and disclosure policy: [SECURITY.md](./SECURITY.md)
- Contribution and privacy checks: [CONTRIBUTING.md](./CONTRIBUTING.md)

## Product Scope

- Standard hard-sphere simulation with a live 3D preview, realtime charts, and result tabs.
- Ideal-gas `P-T`, `P-V`, and `P-N` studies with sampling, verification, and history views.
- Adiabatic-expansion heat-capacity-ratio experiment with Demo, Guide, and Free modes.
- Piston-oscillation heat-capacity-ratio experiment with complete Demo, Guide, and Free workflows, live acquisition, period processing, fitting, and calculation.
- Local desktop export for PDF reports, PDF/PNG figures, CSV data, and metadata.
- Simplified Chinese, Traditional Chinese, and English interface text.

## Current Source Highlights

- The `v6.4.2` candidate adds strict migration for older piston workspaces, repairs clean dependency installation, and strengthens upgrade verification. Raw records remain authoritative; obsolete fits and calculations require recomputation. Experiment operation and exact checks based on displayed values follow `v6.4.1`.

- The workbench UI is split into focused command, settings, updater, parameter, persistence, and experiment modules.
- Each heat-capacity method keeps an explicit runtime and persistence boundary separate from standard and ideal-gas files.
- `v6.4.1` adds Real/Ideal conditions and air/helium profiles across both heat-capacity methods, plus staged learning and consistent Demo/Guide/Free retention.
- `v6.4.1` requires at least two primary piston periods, ignores small local peaks, fixes the power-off calculation handoff, and computes exact answers from displayed rounded values. Obsolete fits and calculations must be recomputed while raw records are retained.
- `v6.4.1` completes the workbench responsibility split, restores scoped materials-window undo, reduces redundant canvas/mirror rendering, fixes single-figure PDF pagination, and patches the updater YAML dependency.
- `v6.4.0` adds a complete Piston-Oscillation Free-mode review and scoring workspace. Each experiment attempt has its own instrument-operation timeline, saved-curve evidence, selection result, expandable scoring evidence, and consistent per-attempt switching; user-facing text now uses experiment numbers rather than the internal “Run” name.
- `v6.4.0` adds local PDF report export for completed piston experiments. The report follows the established adiabatic-expansion layout and includes compact file information, recorded measurements, calculation results, process evidence, and score summaries without adding a separate theory chapter.
- `v6.4.0` adds a Free-mode parameter sidebar aligned with the existing heat-capacity controls. Ambient pressure and temperature, sampling, trigger level, and input visualization are available directly; reviewed thermal, sensor, release-asymmetry, and tail-observation parameters remain behind an acknowledged advanced-settings dialog and freeze after the first formal curve is saved.
- `v6.4.0` makes the falling-trigger range follow the configured ambient pressure while preserving the reviewed standard-pressure window. Parameter edits now propagate through the saved experiment profile, physical process, acquisition, processing, review, and export paths without reinterpreting historical files.
- `v6.3.1` completes the piston Free-mode data-quality loop. It separates an unusable whole recording from a merely narrow selection, reacquires only the affected run, preserves excluded attempts as evidence, and validates `t1 / t2 / T` plus final calculations in editable batches.
- `v6.3.1` adds seeded late-trace irregularities and a short-lived release-asymmetry loss, while new experiments use one versioned `1.1 N·s/m` equivalent loss for pressing and free oscillation. Historical `0.434 N·s/m` and other supported snapshots remain unchanged.
- `v6.3.1` gives the operator more time to pause through a `0.300 s` presentation delay and `0.55x` pacing over the first `0.400 s` of physical trace without rescaling samples. It also restores live monitoring after a missed trigger and lets long unified-validation button labels size correctly.
- `v6.3.0` introduced the continuous thermal, pressure-sensor, press, and virtual-hand acquisition chain, complete localized piston interaction audio, and the Guide sequencing, recording-freeze, parameter-entry, screw-guidance, and Demo-pacing repairs that remain the foundation of this patch.
- `v6.2.1` remains the preceding piston stability patch for first acquisition, period selection, rebound validation, render recovery, and restart-safe Free data.
- `v6.2.0` completes piston-oscillation Free Mode with 3–6-run plans, system and custom 10–80 mm heights, ordered progress, resumable sessions, per-run acquisition settings, dynamic monitoring, manual retry and reset, period verification, fitting, and automatic calculation handoff.
- `v6.2.0` also unifies the two heat-capacity experiments around shared count and progress controls, aligns mode-specific navigation and visual styling, improves Demo and Guide interactions, and applies one persistent loaded-gas equilibrium model across all three piston modes. Releasing the locking screw now produces a recorded 0.2 s one-way physical settling process while the exact height remains an internal model quantity.
- `v6.1.1` introduced the reviewed piston instrument, power-gated realtime data, complete Demo and Guide workflows, and strict Guide sequencing.
- `v5.3.1` completes multi-group adiabatic-expansion experiments, automatic experiment progression, scoped experiment/group restarts, group-level review charts and scoring, and polished report/figure/package exports.
- `v5.2.2` fixes the startup screen remaining at 100% after workspace restoration has completed.
- `v5.2.1` adds a complete trilingual first-run experience, a re-recordable animated product introduction, unified engineering prompts, tutorial-session recovery, and a startup animation driven by real workspace restoration progress.
- `v5.2.0` moves verified V3 saves off the UI thread, bounds long-running Free traces, and preserves valid 4.2.3 and 5.1.1 workspaces without changing the existing user-data or updater identity. Experimental data written by the withdrawn 5.1.2 build is outside the compatibility guarantee.
- Desktop publishing targets only the public release repository. The source repository is not an update channel.

## Repository Layout

- `src/app/`: React application entrypoint.
- `src/components/`: shared visual components.
- `src/features/`: workbench, ideal-gas, adiabatic-expansion, and piston-oscillation UI and orchestration.
- `src/domain/`: simulation and experiment calculation models.
- `src/shared/`: shared types and utilities.
- `src/i18n/`: application translation tables.
- `tests/`: hard-sphere, ideal-gas, both heat-capacity methods, workbench, updater, legal-notice, and exporter regression tests.
- `electron/`: Electron main process, preload bridge, and update integration.
- `tools/exporter/`: Python exporter source.
- `scripts/` and `build/`: build, validation, packaging, and installer helpers.
- `public/`: runtime models, fonts, icons, mockups, and generated legal notices.
- `resources/`: desktop icons and generated exporter resources.
- `docs/`: current documentation map, release notes, theory, instrument-modeling references, active backlog, and clearly separated historical archives; start with `docs/README.md`.

Generated dependencies and outputs such as `node_modules/`, `dist/`, `release/`, `output/`, and `tmp/` are intentionally ignored.

## Source History And Release Channels

- Reviewed, anonymized source history is published at [gas-laws-lab-history](https://github.com/yanshi-qibixunchang/gas-laws-lab-history). Its release tags preserve the app-source evolution needed to inspect published versions while private research-report working material remains outside that mirror.
- Installers, `latest.yml`, blockmaps, changelogs, and user-facing release notes are published separately at [gas-laws-lab-release](https://github.com/yanshi-qibixunchang/gas-laws-lab-release).
- Active collaboration and unreleased work remain in a private development repository. Repository access does not grant redistribution rights, and the public source-history mirror is not the desktop update channel.

## Development

Install the locked dependency set:

```powershell
npm.cmd ci
```

Run the fixed local preview:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Preview URL: `http://127.0.0.1:5174/`

Run the normal quality gates:

```powershell
npm.cmd run check
npm.cmd run build
```

Run the Electron application locally:

```powershell
npm.cmd run desktop:dev
```

The browser preview covers the simulator and workbench UI. Local report and figure export requires the Electron bridge and exporter environment.

## Desktop Release Boundary

Do not build or publish a new installer merely because `main` changed. A desktop release starts only after a version is chosen and `package.json` plus `package-lock.json` are updated.

For an approved release, the public update repository must receive exactly the matching update assets from `release/`:

- `heat-capacity-lab-setup-<version>.exe`
- `heat-capacity-lab-setup-<version>.exe.blockmap`
- `latest.yml`

The public update repository may also contain user-facing README, changelog, security, and structured release-note files. It must not contain this repository's source tree, development branches, build inputs, local reports, credentials, or personal information.

## Privacy And Repository Hygiene

- Use a GitHub-provided `noreply` address for commits.
- Do not commit credentials, `.env` files, personal contact details, participant names, school affiliations, absolute user paths, or document/image author metadata.
- Before any repository becomes public, audit the current tree, every pushed branch and tag, commit identities, deleted historical blobs, release assets, and binary metadata.
- Third-party author names required by licenses or academic citations are source attribution, not project-member identity; keep those records separate from participant information.

## Instrument Model Contract

The adiabatic-expansion apparatus is a state-machine-driven visualization and interaction carrier. It is not the source of truth for `P0`, `P1`, `P2`, `U_p`, `U_T`, or `gamma`. Its structure and workflow draw on several teaching instruments, with FD-NCD-C serving as one of the principal references; this project is not an official simulation or digital replica of that model.

The piston-oscillation apparatus follows the same software-owned-state rule. Runtime behavior binds to reviewed node names, hierarchy, origins, axes, scales, hit regions, magnetic snap points, and camera targets. The formal hybrid GLB retains the established functional contract while refining the v1.3 universal-interface visual subtree. Exact source revisions, hashes, rights status, and the final asset digest are recorded in `public/models/piston-oscillation/model-provenance.json`.

The Blender integration contract is documented at:

```text
docs/instrument-modeling/adiabatic-expansion/references/instrument/Blender模型接入规则-v4.0.1.md
```

## Licensing

No open-source license is declared for the project source. Access to the repository does not grant redistribution rights. Third-party components, audio, fonts, exporter components, and project-provided model assets retain their recorded terms or rights status; see [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md). Desktop builds include a generated, exact-version legal inventory accessible from the application.
