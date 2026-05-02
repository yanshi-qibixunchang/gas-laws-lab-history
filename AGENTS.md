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

## UI Interaction Consistency

- Floating menus must close when the user clicks outside the active menu, including blank workspace areas, sidebars, or other non-menu UI.
- Closing a floating menu from an outside click must also clear that menu's temporary state, such as pending delete confirmations.
- Clicks inside the active menu, its trigger button, or the active inline editor must not be treated as outside clicks.
- Inline rename editors must submit on outside click or blur when the draft is non-empty.
- Inline rename editors with an empty or whitespace-only draft must show `File name cannot be empty.` and exit rename mode.
- Inline rename keyboard behavior must stay consistent: `Enter` submits and `Escape` cancels.
- New user-facing menus, popovers, dropdowns, and inline editors should follow these same outside-click and keyboard conventions unless the user explicitly requests a different interaction.

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
