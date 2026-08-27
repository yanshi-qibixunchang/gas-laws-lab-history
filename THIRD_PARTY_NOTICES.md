# Third Party Notices

This project includes third-party open source software and fonts. The project
source, UI text, simulation logic, and product-specific assets remain separate
from the licenses listed here.

This notice is the source-level inventory. Every desktop build also generates
the exact locked npm package list, installed license texts, Electron and
Chromium notices, font notices, exporter notices, audio attribution, and the
packaged 3D-asset provenance under `public/legal`; those generated files are
included in the installer and available from the in-app legal materials view.

## NPM Dependencies

The application is built with npm packages listed in `package.json` and locked
in `package-lock.json`.

Direct runtime dependencies:

| Package | License |
| --- | --- |
| `@react-three/drei` | MIT |
| `@react-three/fiber` | MIT |
| `electron-updater` | MIT |
| `lucide-react` | ISC |
| `react` | MIT |
| `react-dom` | MIT |
| `three` | MIT |
| `three-stdlib` | MIT |

Direct development and build dependencies:

| Package | License |
| --- | --- |
| `@types/node` | MIT |
| `@types/react` | MIT |
| `@types/react-dom` | MIT |
| `@types/three` | MIT |
| `@vitejs/plugin-react` | MIT |
| `autoprefixer` | MIT |
| `electron` | MIT |
| `electron-builder` | MIT |
| `electron-winstaller` | MIT |
| `js-yaml` | MIT |
| `postcss` | MIT |
| `tailwindcss` | MIT |
| `typescript` | Apache-2.0 |
| `vite` | MIT |

Notable transitive npm licenses observed in `package-lock.json` include MIT,
ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause, BlueOak-1.0.0, Python-2.0,
Unlicense, CC-BY-4.0, 0BSD, WTFPL, and dual-license variants such as
`WTFPL OR ISC` and `WTFPL OR MIT`.

The generated distribution notices enumerate every unique locked package,
version, license, source URL, and install path and fail the release build if a
license remains unclassified. Notable transitive packages include:

| Package | License | Path / Introduced By |
| --- | --- | --- |
| `caniuse-lite` | CC-BY-4.0 | `autoprefixer` / `browserslist` |
| `sanitize-filename` | WTFPL OR ISC | `electron-builder` |
| `truncate-utf8-bytes` | WTFPL | `sanitize-filename` |
| `utf8-byte-length` | WTFPL OR MIT | `truncate-utf8-bytes` |
| `webgl-constants` | MIT | `@react-three/drei` / `detect-gpu`; lock metadata omits the license, so generation verifies an exact-version installed MIT license file by SHA-256. |

## CI-Only GitHub Actions

The clean-machine desktop upgrade workflow uses the following GitHub-maintained
actions. They run only in GitHub Actions, are pinned to the listed commits, and
are not bundled into the application or installer.

| Action | Pinned commit | License |
| --- | --- | --- |
| `actions/checkout@v4` | `11d5960a326750d5838078e36cf38b85af677262` | MIT |
| `actions/setup-node@v4` | `49933ea5288caeca8642d1e84afbd3f7d6820020` | MIT |
| `actions/upload-artifact@v4` | `ea165f8d65b6e75b540449e92b4886f43607fa02` | MIT |

## Electron and Chromium

Desktop builds include Electron and Chromium runtime components.

The unpacked desktop build includes:

| File | Purpose |
| --- | --- |
| `release/win-unpacked/LICENSE.electron.txt` | Electron license text. |
| `release/win-unpacked/LICENSES.chromium.html` | Chromium third-party license notices. |

When creating installers or portable releases, keep these license files
available to end users or expose them from an application "About" or "Licenses"
entry.

## Python Exporter

The bundled exporter is built from `tools/exporter/hsl_exporter.py` and may be
distributed as `resources/exporter/hsl-exporter.exe`.

Direct Python imports used by the exporter include Python standard-library
modules plus:

| Package | License family |
| --- | --- |
| `matplotlib` | Matplotlib license, BSD-style |
| `reportlab` | BSD-style ReportLab license |

The PyInstaller bundle may also include transitive runtime packages such as
`numpy`, `Pillow`, `contourpy`, `cycler`, `fonttools`, `kiwisolver`,
`packaging`, `pyparsing`, `python-dateutil`, and `six`, depending on the local
build environment. These packages are generally permissive, but their full
license texts and bundled binary-library notices must be retained in commercial
distribution. NumPy binary distributions can include OpenBLAS/LAPACK notices
and GCC runtime exception / libquadmath license text.

PyInstaller itself is GPL with a special exception that permits using it to
build and distribute non-free and commercial programs. Keep the PyInstaller
license notice with release compliance materials when distributing the bundled
exporter.

## Fonts

The application ships local web font files under `public/fonts`.

| Font family | License |
| --- | --- |
| Noto Sans SC | SIL Open Font License 1.1 |
| Gas Laws Lab Serif (subset derived from Noto Serif SC) | SIL Open Font License 1.1 |
| JetBrains Mono | SIL Open Font License 1.1 |

Font-specific license notes are also provided in `public/fonts/LICENSES.txt`.

## Audio Materials

The heat-capacity experiment includes edited recordings whose source records
declare CC0 1.0, plus first-party procedural audio. Exact audio IDs, original
titles, authors, source URLs, license URLs, and ownership boundaries are stored
in `public/audio/experiments/heat-capacity/manifest.json` and generated into
`public/legal/audio-materials.html` for desktop distribution.

## Project Reference Materials

The local instrument-modelling reference directory contains project-progress
materials, including real instrument photos, modelling guidance, and related
PDFs. These files are not part of the product UI and are not included by the
current desktop packaging configuration.

Do not add reference-only folders to `public`, `dist`, `resources`, or Electron
`extraResources` unless their rights are separately cleared for distribution.

## Project-Provided Piston-Oscillation Model

The application includes
`public/models/piston-oscillation/piston-oscillation.glb`, a project-authorized
hybrid asset. It retains the previous project-current model's functional node,
coordinate, scale, screw, hose, hit-target, and camera contracts while
transplanting and refining the universal-interface and data-cable visual subtree
from the project team's model repository at tag `v1.3.0` (commit
`15bc8502441f451b2d810204275265f8b5494ef7`).

The source model repository does not declare a separate open-source license for
its project-specific model content. Public repository access must not be read as
a general redistribution grant; distribution of the integrated GLB relies on
the project team's authorization. Blender, Blender's bundled Python, and the
source repository's three.js preview are authoring or preview tools and are not
embedded in the GLB. The application renders the model through its already
listed local `three`, `@react-three/fiber`, and `@react-three/drei` packages, so
the asset adds no new runtime package or CDN dependency.

The hybrid asset's base-model digest, v1.3.0 source digest, final digest,
refinement scope, rights note, format, and runtime contract are recorded in
`public/models/piston-oscillation/model-provenance.json`. That record and the
shared-bench provenance are included in the generated packaged legal inventory.

The piston-oscillation scene hides the source model's white `Tabletop` node and
uses `public/models/shared/unified-light-lab-bench.glb` for its visible bench.
That compact bench asset is derived from the project-provided
`public/models/heat-capacity/fd-ncd-c-ultra.glb` nodes `clean_lab_bench` and
`HSL_LabBench_Backstop_LowLip`; its exact digest and extraction record are in
`public/models/shared/unified-light-lab-bench.provenance.json`.
