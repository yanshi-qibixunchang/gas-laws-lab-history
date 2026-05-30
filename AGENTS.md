# Project Workflow Rules

These rules apply only to this repository.

## Communication And Scope

- Prefer Chinese for plans and implementation summaries.
- Before changing UI behavior, confirm the exact control or area the user means. When the user points to a location, treat that location as authoritative, but you may mention similar controls and ask the user to confirm the intended modification scope first.
- For user modification requests, actively analyze possible ambiguity before implementing, especially around scope, affected controls, success criteria, and whether similar UI patterns should also change.
- Ask the user clarifying questions more proactively when ambiguity could lead to inconsistent interaction behavior, unintended scope expansion, or rework. Prefer concise, concrete questions that name the candidate controls or behaviors.

## Fixed Preview Port

- After every code or user-facing project modification, preview this app on the fixed local port `5174`.
- Use this command as the reusable PowerShell preview entrypoint:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

- Use `http://127.0.0.1:5174/` as the preview URL.
- Keep `--strictPort` in the command so Vite fails instead of silently switching to a different port.
- If port `5174` is already occupied, stop the process using that port or ask the user before changing the project preview port.

## Desktop Release And Auto Update

- The Windows desktop release uses NSIS installer updates through `electron-updater`; do not treat the installer `.exe` as a complete release by itself.
- For every version intended to update installed desktop clients, bump `package.json` `version` first, then build the NSIS installer with:

```powershell
npm.cmd run desktop:installer
```

- A GitHub Release for desktop updates must upload all matching files from `release/`: the installer `.exe`, `latest.yml`, and the corresponding `.exe.blockmap`. Missing `latest.yml` or `.blockmap` means the in-app update path is incomplete.
- The installer file name in `latest.yml` must exactly match the uploaded installer asset. If changing `build.nsis.artifactName`, release naming, or GitHub upload method, verify `release/latest.yml` before publishing.
- Keep `build.publish` in `package.json` aligned with the GitHub repository that hosts releases. If the owner or repo changes, update and test the updater configuration in the same change.
- A same-version release does not appear as an available update. To verify the full update dialog against GitHub, publish a higher version than the locally installed app.
- When the user says "做成下一个版本", treat it as a full desktop update release request: rewrite the release notes for the next patch version, bump `package.json` and `package-lock.json`, build the installer, and publish the installer `.exe`, `latest.yml`, and `.exe.blockmap` to the configured update GitHub Release so installed clients can detect it in-app.
- When a batch of changes is substantial enough to be uploaded to GitHub for user testing or release preparation, ask the user what version number should be used before pushing or publishing. Do not silently decide version bumps.
- Before announcing a release-ready build, run at minimum `npm.cmd exec tsc -- --noEmit`, `npm.cmd test`, `npm.cmd audit --omit=dev`, and `npm.cmd run desktop:installer`, then confirm the three release update assets exist.

## UI Interaction Consistency

- Floating menus must close when the user clicks outside the active menu, including blank workspace areas, sidebars, or other non-menu UI.
- Closing a floating menu from an outside click must also clear that menu's temporary state, such as pending delete confirmations.
- Clicks inside the active menu, its trigger button, or the active inline editor must not be treated as outside clicks.
- Inline rename editors must submit on outside click or blur when the draft is non-empty.
- Inline rename editors with an empty or whitespace-only draft must show `File name cannot be empty.` and exit rename mode.
- Inline rename keyboard behavior must stay consistent: `Enter` submits and `Escape` cancels.
- New user-facing menus, popovers, dropdowns, and inline editors should follow these same outside-click and keyboard conventions unless the user explicitly requests a different interaction.

## Heat Capacity 3D Performance Modes

- The Heat Capacity 3D performance setting uses four modes: `standard`, `balanced`, `performance`, and `ultra`.
- The user-facing order is low load, balanced, high performance, then ultra. Labels are `低负载`, `均衡`, `高性能`, and `极致画质` in Simplified Chinese; `低負載`, `均衡`, `高效能`, and `極致畫質` in Traditional Chinese; and `Low load`, `Balanced`, `High performance`, and `Ultra` in English.
- Until the FD-NCD-C GLB adapter is implemented, `ultra` is a placeholder mode and should intentionally reuse the current `performance` behavior: low-load DPR, reduced interaction rendering, hard-sphere visual preset, and Heat Capacity tick interval.
- `standard`, `balanced`, and `performance` must keep the current procedural Heat Capacity skeleton. Future GLB work should attach the FD-NCD-C model only to `ultra`.
- Performance mode is a UI/runtime preference only. Do not write it into Heat Capacity experiment parameters, result calculations, trial data, gamma formulas, or exported scientific data.

## Heat Capacity Ultra GLB Model Work

- Ultra GLB model layout work must first match the current procedural Heat Capacity skeleton's interaction habits: pump bulb in the default-camera front area, pump valve above or very near the bottle stopper, stopcock above the bottle mouth, and instrument controls on the right/front panel.
- Preserve existing GLB node names, animation target paths, and morph target names. Add project-specific anchors with the `HSL_` prefix instead of renaming original model nodes.
- Model optimization must use a candidate copy. Do not overwrite the source audit GLB or copy a runtime GLB into `public\models` until the user accepts the model layout.
- External preview apps, Blender scripts, `.blend` files, and external preview state machines must not be imported into the main project.
- The visual GLB layer must read the existing Heat Capacity state machine only. It must not create separate pressure, temperature, valve, power, gamma, or trial state.
- Final Ultra software integration must support `demo`, `guide`, and `free` with the same project callbacks and feedback semantics as the procedural skeleton.
- External model viewers may use a temporary port such as `5181` only for isolated GLB inspection. Once any main-project code or user-facing project behavior changes, preview the main app on the fixed `5174` port.

## Ideal Gas Current Parameters Sidebar

- For ideal-gas files, the right `Current Parameters` sidebar must keep the core controls directly visible: `Relation`, `Scan variable`, and `Sampling preset`.
- Ideal-gas model constants and sampling parameters such as `N`, `r`, `L`, `dt`, `nu`, `equilibriumTime`, `statsDuration`, and similar editable advanced values belong inside a default-collapsed `Advanced settings` section.
- The ideal-gas `Edit` and `Save` parameter actions belong inside the expanded `Advanced settings` section, because they only affect the advanced parameter rows, not the relation selector or scan-variable controls above it.
- The read-only ideal-gas relation or verification summary must not be moved into the editable advanced parameter list; relation changes should continue to use the dedicated `Relation` control.
- Standard simulation files should keep their current direct parameter-row display unless the user explicitly requests the same advanced-settings treatment for standard files.
- New ideal-gas files should default `targetTemperature` to the minimum recommended preset value, currently `0.6`, and the initial `P-T` scan variable should stay synchronized with that value.
- Expanding ideal-gas `Advanced settings` should scroll the right sidebar upward or downward as needed so the advanced parameter rows become immediately visible without requiring an extra manual scroll.
- Collapsing ideal-gas `Advanced settings` should animate back to the sidebar scroll position recorded immediately before expansion, then hide the advanced body.
- Expand and collapse scroll animations for ideal-gas `Advanced settings` should use the same explicit duration and easing. Avoid relying only on native smooth scrolling when content mount or unmount can make one direction feel faster.
- When calculating the expanded scroll target, clamp it to the right sidebar's actual scroll range so the browser does not truncate the animation early at the maximum `scrollTop`.

## Results Window And Tab Behavior

- Results child pages use browser-style tabs inside one Results window. Do not restore the old ideal-gas back/front overlapping child-window stack.
- This Results tab behavior applies to both ideal-gas files (`Points`, `Verification`) and standard simulation files (`Summary`, `Data Table`, `Figures`).
- In the left file tree, single-clicking `Results` or any Results child row only selects or expands/collapses the row. It must not open content.
- In the left file tree, double-clicking the top-level `Results` row opens the Results window with all child tabs open.
- In the left file tree, double-clicking a Results child row opens only that child tab when Results is currently closed.
- If Results is already open, double-clicking another closed child row should append that tab to the right side of the current tab strip and activate it, while preserving already open tabs.
- The top `Window` menu is a control panel: its switches act on single click, unlike the left file tree.
- In the `Window` menu, the top-level `Results` switch opens or closes the whole Results window. Opening top-level `Results` should open all child tabs.
- In the `Window` menu, child switches open or close individual Results tabs. From a closed Results window, opening one child switch should open only that child tab; from an already open Results window, opening another child switch should append that tab to the right and activate it.
- Closing the final open Results child tab closes the whole Results window.
- Switching the active Results tab is transient UI state and should not create an undo entry. Opening or closing the Results window or individual Results tabs should remain undoable.
