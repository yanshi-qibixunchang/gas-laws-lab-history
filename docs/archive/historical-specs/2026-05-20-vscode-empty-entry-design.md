# VS Code Style Empty Entry Design

## Goal

Refine only the no-file state experiment entry controls so they feel like a quiet engineering tool rather than dashboard buttons.

## Scope

In scope:
- Main no-file welcome area experiment creation entries.
- Main no-file welcome area cached experiment open entries.
- Left sidebar no-file creation entries.
- Left sidebar cached experiment open entries.
- Light and dark theme variants for those entries.

Out of scope:
- Top `Experiment Files` menu and its submenu.
- Normal open-file rows.
- Top file tabs.
- Runtime panels, dialogs, and parameter controls.
- Any behavioral changes to creating, reopening, or caching experiments.

## Visual Direction

Use a VS Code welcome-page pattern:
- Entries should read as command rows or text links, not boxed buttons.
- Default state has no hard blue outline and no large card surface.
- Blue is reserved for command text, icons, and focus accent.
- Hover and keyboard focus reveal a subtle row background.
- Cached experiment rows use the same command-row structure with a muted kind label on the right.
- Disabled empty-cache rows are gray and non-interactive.

## Layout

Main welcome area:
- Keep the existing centered no-file welcome layout.
- Replace the current blue bordered button grid with two command groups: startup entries and cached open entries.
- Startup entries remain in the existing order: ideal gas, heat capacity, standard simulation.
- Cached open entries display up to the same number already supported by the current component.

Left sidebar:
- Keep the compact sidebar layout.
- Replace button-like empty entries with tighter command rows.
- Preserve the existing "Files", "Open Experiment", and empty panel section structure.

## Interaction

Existing behavior remains unchanged:
- Startup entries call `createFile(kind)`.
- Cached entries call `openClosedWorkbenchFile(file.id)`.
- Disabled no-cache hint remains disabled.
- Existing keyboard focus must remain visible.

## Testing

Add or update static workbench tests to verify:
- Empty entry controls use the new command-row classes.
- The old blue outlined empty-state button treatment is no longer applied to no-file entries.
- Main and sidebar empty states both render the command-row open actions.
- Light and dark theme CSS includes hover/focus treatment for the command rows.

Manual browser validation:
- Fixed preview URL: `http://127.0.0.1:5174/`.
- Verify no-file dark theme.
- Verify no-file light theme.
- Verify cached experiment open rows after closing an experiment.
- Verify top `Experiment Files` menu is visually unchanged.
