# Third Party Notices

This project includes third-party open source software and fonts. The project
source, UI text, simulation logic, and product-specific assets remain separate
from the licenses listed here.

This notice is a project-maintained inventory. For final commercial
distribution, ship this file together with the application and retain the full
license texts from the referenced packages where required.

## NPM Dependencies

The application is built with npm packages listed in `package.json` and locked
in `package-lock.json`.

Direct runtime dependencies:

| Package | License |
| --- | --- |
| `@capacitor/app` | MIT |
| `@capacitor/core` | MIT |
| `@capacitor/filesystem` | MIT |
| `@capacitor/share` | MIT |
| `@react-three/drei` | MIT |
| `@react-three/fiber` | MIT |
| `lucide-react` | ISC |
| `pdfjs-dist` | Apache-2.0 |
| `react` | MIT |
| `react-dom` | MIT |
| `three` | MIT |

Direct development and build dependencies:

| Package | License |
| --- | --- |
| `@types/react` | MIT |
| `@types/react-dom` | MIT |
| `@vitejs/plugin-react` | MIT |
| `autoprefixer` | MIT |
| `electron` | MIT |
| `electron-builder` | MIT |
| `playwright` | Apache-2.0 |
| `postcss` | MIT |
| `tailwindcss` | MIT |
| `typescript` | Apache-2.0 |
| `vite` | MIT |

Notable transitive npm licenses observed in `package-lock.json` include MIT,
ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause, BlueOak-1.0.0, Python-2.0,
Unlicense, CC-BY-4.0, 0BSD, WTFPL, and dual-license variants such as
`WTFPL OR ISC` and `WTFPL OR MIT`.

The following transitive packages should be called out in distribution notices:

| Package | License | Path / Introduced By |
| --- | --- | --- |
| `caniuse-lite` | CC-BY-4.0 | `autoprefixer` / `browserslist` |
| `sanitize-filename` | WTFPL OR ISC | `electron-builder` |
| `truncate-utf8-bytes` | WTFPL | `sanitize-filename` |
| `utf8-byte-length` | WTFPL OR MIT | `truncate-utf8-bytes` |
| `webgl-constants` | MIT | `@react-three/drei` / `detect-gpu`; package lock metadata may show UNKNOWN, but the installed package contains an MIT license file. |

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
| Inter | SIL Open Font License 1.1 |
| JetBrains Mono | SIL Open Font License 1.1 |
| Playfair Display | SIL Open Font License 1.1 |

Font-specific license notes are also provided in `public/fonts/LICENSES.txt`.

## Project Reference Materials

The local instrument-modelling reference directory contains project-progress
materials, including real instrument photos, modelling guidance, and related
PDFs. These files are not part of the product UI and are not included by the
current desktop packaging configuration.

Do not add reference-only folders to `public`, `dist`, `resources`, or Electron
`extraResources` unless their rights are separately cleared for distribution.
