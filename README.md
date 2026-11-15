# Gas Laws Lab

[简体中文](./README.zh-CN.md) · [繁體中文](./README.zh-TW.md)

Gas Laws Lab is a Windows experiment workbench connecting 3D apparatus interaction, physical simulation, data acquisition, guided calculation and local reports. It covers hard-sphere molecular dynamics, ideal-gas relations, and air/helium heat-capacity-ratio experiments.

**Current stable version: 6.5.0**

[Download for Windows x64](https://github.com/yanshi-qibixunchang/gas-laws-lab-release/releases/download/v6.5.0/heat-capacity-lab-setup-6.5.0.exe) · [Release notes and assets](https://github.com/yanshi-qibixunchang/gas-laws-lab-release/releases/tag/v6.5.0) · [Release verification](docs/releases/v6.5.0.md)

## Experiments

| Experiment | Workflow |
| --- | --- |
| Standard hard-sphere simulation | 3D molecular motion, live charts, statistics and results |
| Ideal-gas relations | P–T, P–V and P–N sampling, fitting, verification and history |
| Adiabatic expansion | Apparatus operation, pressure and temperature signals, repeated trials, heat-capacity ratio and uncertainty |
| Piston oscillation | Two-hand pressing and release, acquisition, period selection, height versus squared-period fitting, heat-capacity ratio and uncertainty |

Both heat-capacity methods support **air/helium**, **ideal/realistic conditions**, and Demo, Guide and Free modes. The interface supports Simplified Chinese, Traditional Chinese and English, with light and dark themes. The desktop app exports supported PDF reports, PDF/PNG figures, CSV files and data packages.

## What changed in 6.5.0

- Recalibrated gas profiles are verified against previously agreed operating ranges. Piston calculations use loaded equilibrium pressure, while physical precision remains separate from teaching-answer rounding.
- Ideal piston motion includes internal dissipation: mechanical energy returns to gas internal energy and amplitude decays naturally. Acquisition supports up to 3 seconds. Realistic profiles retain calibrated losses, and large release-time differences no longer hit the former loss cap.
- Recording-based rebound audio adapts its duration to the oscillation event.
- Calculation and Type A/B uncertainty explanations, variable help, input focus, scrolling, result boxes and rounded panels are aligned.
- Both visualization switches use the same help panel: it appears after a one-second hover and slides/fades away on pointer leave. Mouse-click focus no longer keeps it visible.
- Fixes premature acquisition-input locking, ideal piston measurement progression, large-workspace exit-save timeouts and misleading desktop export warnings.
- Adiabatic Free mode accepts trial counts of at least three through typing or a dropdown, and molecular visualization includes a continuous temperature legend.
- File names are unique across experiment types, with `(1)`, `(2)` and further suffixes for conflicts. Existing duplicate names are repaired on load without changing experiment contents.

## Install and upgrade

Download the installer and follow its setup wizard. Users on **6.4.4** can check for updates in the app or save and close the app before installing the full package into the existing location.

Users of a local **6.5.0 candidate** must install this stable package manually: an identical version number does not trigger an update. The application identity and user-data location remain unchanged. Historical experiments retain their model and parameter snapshots, raw records and calculation progress; new experiments use current profiles. Existing migration rules still apply to older formats.

Core experiments run locally without an account. The browser and desktop editions save progress separately; installing the app does not transfer browser experiments. The browser supports the simulation and calculation UI, while report, figure and table export requires the Windows desktop app.

## Model scope

Ideal/realistic refers to experimental conditions. Ideal conditions still require correct operation. Realistic profiles include calibrated thermal, mechanical and measurement effects and do not reproduce every physical apparatus. Some helium acceptance ranges are scaled from the agreed air ranges using the theoretical ratio; they are not helium measurements.

The 3D apparatus is an interaction and visualization layer; the software's physical model produces numerical results. The adiabatic apparatus draws on several teaching instruments, including FD-NCD-C, and is not an official simulation or digital replica of that product. Model, audio and physics references are available in the app's About pages and [third-party notices](THIRD_PARTY_NOTICES.md).

## Source and development

- [Public source history](https://github.com/yanshi-qibixunchang/gas-laws-lab-history) contains privacy-reviewed source, tests and release tags.
- [Release repository](https://github.com/yanshi-qibixunchang/gas-laws-lab-release) contains installers, update metadata, blockmaps and user documents, rather than development source.
- [Documentation map](docs/README.md) links architecture, physics, provenance and release evidence.

```powershell
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Preview: http://127.0.0.1:5174/

```powershell
npm.cmd run check
npm.cmd audit --omit=dev
npm.cmd run legal:check
npm.cmd run desktop:installer
```

A desktop update requires the matching `heat-capacity-lab-setup-<version>.exe`, `.exe.blockmap` and `latest.yml`. Output defaults to `release/`; building does not publish automatically. Keep dependencies, caches, generated builds and personal experiments outside source control.

`src/domain/` holds physics and calculations, `src/features/` holds workbench and experiment flows, `electron/` supplies desktop bridges and updates, `tools/exporter/` supplies the local exporter, and `tests/` contains regression checks.

## Rights and feedback

No open-source license is declared for the project source. Public access does not grant redistribution rights. Dependencies, fonts, audio, models and exporter components retain their recorded terms or rights status, with an exact-version third-party inventory in the app. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), [SECURITY.md](SECURITY.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

For feedback, include the app version, experiment, gas and conditions, reproduction steps and screenshots. Remove personal information before sharing experiment files. Post-release fixes will be documented in subsequent patch versions.
