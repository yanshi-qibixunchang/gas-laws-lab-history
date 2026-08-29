# Third-party audio notices

The production sound effects listed below use materials downloaded from Freesound. Each source page was checked at download time and identified the sound as Creative Commons Zero 1.0 (CC0-1.0): <https://creativecommons.org/publicdomain/zero/1.0/>.

## Heat-capacity experiment

These source files were downloaded on 2026-07-12. The unmodified originals are retained outside the repository at:

`D:\downloads\codex\hard-sphere-lab-audio\heat-capacity\sources\`

### Source records

| Internal source ID | Original file | Title | Author/uploader | Freesound ID and page | License | Original SHA-256 |
| --- | --- | --- | --- | --- | --- | --- |
| `freesound.391697` | `391697__jpolito__jp_lightswitch04.wav` | jp_lightswitch04.wav | JPolito | [391697](https://freesound.org/s/391697/) | CC0-1.0 | `0F877E6CB229635DB26E908A0E84C47135A8387FCFBAC22068053372677B97D9` |
| `freesound.643563` | `643563__el_boss__radial-knob-clicks-turning-dial.wav` | Radial knob clicks turning dial | el_boss | [643563](https://freesound.org/s/643563/) | CC0-1.0 | `990CBD06C541BD06F856244226DAA3A6E19EB1DFB2D13FEBB5099098970CE030` |
| `freesound.650353` | `650353__ches_bar__pen.wav` | Pen.wav | Ches_Bar | [650353](https://freesound.org/people/Ches_Bar/sounds/650353/) | CC0-1.0 | `1CFE20AC4F37986837C4607872F7C49854E132C72646349249D70783853D09DA` |
| `freesound.808874` | `808874__designerschoice__metlfric-samsung-galaxy-smartphone-cu_valve-squeaks_nicholas-judy_tdc.wav` | METLFric-Samsung Galaxy Smartphone, CU_Valve Squeaks_Nicholas Judy_TDC | designerschoice | [808874](https://freesound.org/people/designerschoice/sounds/808874/) | CC0-1.0 | `1CEA3FA289B8B31B3FABC9C8DDC6699A30DA58952E78D16D88653FF1C1B7316C` |
| `freesound.810077` | `810077__designerschoice__objmed-samsung-galaxy-smartphone-cu_rapid-blood-pressure-cuff-air-pumps-quick-release_nicholas-judy_tdc.wav` | OBJMed-Samsung Galaxy Smartphone, CU_Rapid Blood Pressure Cuff Air Pumps, Quick Release_Nicholas Judy_TDC | designerschoice | [810077](https://freesound.org/people/designerschoice/sounds/810077/) | CC0-1.0 | `C8FB7CD47347AFAB13ABD90CE988D41F3FCDA79E1ADE728F816CA51B0972E3F8` |

### Production derivatives

All production derivatives are mono, 48 kHz, 16-bit PCM WAV files under `public/audio/experiments/heat-capacity/`. Processing included DC removal, short boundary fades, conservative peak normalization, and the source-specific edits recorded in the runtime manifest.

| Source | Production files | Source interval(s) |
| --- | --- | --- |
| `freesound.391697` | `power-switch-on.wav`, `power-switch-off.wav`, `glass-stopcock-turn-open.wav`, `glass-stopcock-turn-close.wav` | 0.000-0.038208 s; the stopcock derivatives use shortened 0.030/0.029 s regions and darker/slower filtering |
| `freesound.643563` | `zero-knob-tick.wav` | 3.914-3.975 s |
| `freesound.650353` | `record-writing.wav` | 0.000-2.376 s; first handwriting phrase only |
| `freesound.808874` | `pump-valve-open.wav`, `pump-valve-open-02.wav`, `pump-valve-open-03.wav`, `pump-valve-close.wav`, `pump-valve-close-02.wav`, `pump-valve-close-03.wav` | 1.600-2.060 s, 4.080-4.540 s, 6.660-7.180 s, 2.280-2.760 s, 5.440-5.840 s, and 6.000-6.480 s |
| `freesound.810077` | `pump-bulb-stroke-01.wav`, `pump-bulb-stroke-02.wav`, `pump-bulb-stroke-03.wav` | 0.205-0.405 s, 0.950-1.120 s, and 1.335-1.505 s; the quick-release tail is not used |

Per-file output hashes, durations, filter settings, fades, and peak levels are recorded in [the heat-capacity audio manifest](../../public/audio/experiments/heat-capacity/manifest.json).

### First-party procedural audio

`heatCapacity.release.flow` is not a third-party recording. It is generated at runtime by the project using Web Audio filtered noise. Its lifetime is controlled by the actual outward-flow condition: the stopcock path must be fully open and the vessel pressure must be above ambient pressure. The pause state and application audio setting can stop it immediately. It is registered in the manifest as `first-party-procedural` and has no external author or license attribution.

## Piston-oscillation experiment

The Freesound HQ preview files and the user-approved vibration audition derivative were downloaded or prepared on 2026-08-29. They are retained outside the repository at:

`D:\downloads\codex\hard-sphere-lab-audio\piston-oscillation\`

### Source records

| Internal source ID | Downloaded source file | Title | Author/uploader | Freesound ID and page | License | Downloaded file SHA-256 |
| --- | --- | --- | --- | --- | --- | --- |
| `freesound.543637` | `candidate-01-freesound-543637-hq-preview.mp3` | Vibrating metal ruler on cake tin (Slow).mp3 | belanhud | [543637](https://freesound.org/people/belanhud/sounds/543637/) | CC0-1.0 | `6ACFFBDA7779373C71DAAC7DA056979246526CDE5FA73A7B00D1CCD95F97765E` |
| `freesound.452640` | `freesound-452640-hq-preview.mp3` | hose screw onto exterior tap threads turn grainy and unscrew1.wav | kyles | [452640](https://freesound.org/people/kyles/sounds/452640/) | CC0-1.0 | `1A0BCF132F4A458B918FA65B24FA9DD7C57CB258A9B5EE39514F5B80DE3298ED` |
| `freesound.840868` | `freesound-840868-hq-preview.mp3` | Camera Lens Mounting Sounds and Lens Cap | justamudkip | [840868](https://freesound.org/people/justamudkip/sounds/840868/) | CC0-1.0 | `88C8EC8078C279D8AA6C600884F0A608AC79501CE3EEE9D4F793A2F2474489E7` |
| `freesound.828779` | `freesound-828779-hq-preview.mp3` | Ballpoint Pen Switch | Filmscore | [828779](https://freesound.org/people/Filmscore/sounds/828779/) | CC0-1.0 | `66A69ED19842A3D2B65DB8E435D3DC5110901AB5699A4B376F68122DFB9D81A4` |
| `freesound.150501` | `freesound-150501-hq-preview.mp3` | Cup Drop | davdud101 | [150501](https://freesound.org/people/davdud101/sounds/150501/) | CC0-1.0 | `95B9C848BD37AC97A0B60CD349A9628DE61A6CEEF70B6E72A485C88B9B9BFFF8` |

### Production derivatives

All piston-oscillation derivatives are mono, 48 kHz, 16-bit PCM WAV files under `public/audio/experiments/piston-oscillation/`. Processing uses short boundary fades, source-appropriate filtering, conservative peak normalization, and the exact source regions recorded in the experiment manifest.

| Source | Production files | Use |
| --- | --- | --- |
| `freesound.543637` | `piston-vibration.wav` | The user-approved short, high-rate vibration heard immediately after a valid two-hand release |
| `freesound.452640` | `locking-screw-grain-01.wav` through `locking-screw-grain-03.wav` | Natural thread-friction grains selected by accumulated real gesture angle |
| `freesound.840868` | `hose-connect-01.wav`, `hose-connect-02.wav`, `hose-disconnect-01.wav`, `hose-disconnect-02.wav` | Bayonet-style rotation/lock and release/separation gestures; lens-cap-only regions are excluded |
| `freesound.828779` | `power-button-click-01.wav`, `power-button-click-02.wav` | Two complete retractable-ballpoint switch gestures used as natural variants |
| `freesound.150501` | `piston-bottom-impact.wav` | Primary impact and short resonance; runtime gain follows uninterrupted unsupported drop distance |

Per-file output hashes, source intervals, durations, filter settings, fades, and peak levels are recorded in [the piston-oscillation audio manifest](../../public/audio/experiments/piston-oscillation/manifest.json).
