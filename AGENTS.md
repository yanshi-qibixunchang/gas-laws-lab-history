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
