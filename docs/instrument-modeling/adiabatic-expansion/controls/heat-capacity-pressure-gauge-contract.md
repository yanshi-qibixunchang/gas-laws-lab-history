# Heat Capacity Pressure Gauge Contract

This document is the shared contract for the Heat Capacity pressure gauge in
both the procedural software skeleton and the future Ultra GLB integration.

The goal is to keep the pointer range, movement direction, danger-zone entry,
and pressure mapping identical across implementations. Visual detail may differ,
but the gauge must read the same from the user's default front view.

## Scope

This contract applies to:

- `src/features/heatCapacity/HeatCapacityInstrumentScene.tsx`
- future Ultra GLB runtime binding for `HSL_PressureGauge_NeedlePivot`
- model-candidate review notes and audit checks that touch the pressure gauge

This contract does not require the procedural skeleton to match every GLB
material, bevel, texture, numeral, or tick-density detail.

## Reference Model

Current reference branch:

- `codex/heat-capacity-ultra-model-candidate`

Reference artifacts:

- `docs/archive/model-candidates/2026-05-31-ultra-glass-stopcock-redesign/README.md`
- `docs/archive/model-candidates/2026-05-31-ultra-glass-stopcock-redesign/fd-ncd-c-experiment.ultra-layout-glass-stopcock-redesign.candidate.glb`
- `docs/archive/model-candidates/2026-05-31-ultra-glass-stopcock-redesign/glass-stopcock-redesign-audit.candidate.json`
- pressure-gauge `realism2` front/closeup screenshots in the same candidate directory

When using this contract, record the exact GLB reference commit SHA in the
implementation report.

## Front-View Visual Contract

From the default user-facing front view:

- The low-pressure end is on the lower-left / left side of the dial.
- The pointer moves from the low-pressure side toward the right side as pressure
  increases.
- The red danger zone is on the right side of the dial.
- The danger threshold maps to the first visible point of the red zone.
- Pressure above the danger threshold continues along the same direction into
  the red zone.
- The dial has only two visual ranges: normal and red danger.
- There is no yellow warning zone on the dial.

Warning pressure is communicated only by warning toast/message UI. Danger or
alarm pressure is communicated by the red danger range plus danger/alarm UI.

## Model-Angle Contract

The shared semantic pressure-gauge model angles are:

- Minimum pressure angle: `-2.15 rad`
- Danger-entry angle: `0.86 rad`
- Maximum pressure angle: `2.15 rad`

These values are the semantic/model-angle contract. They must not be interpreted
as raw procedural-screen XY angles without an explicit front-view conversion.

The latest GLB pressure gauge presents these semantic angles through its own
front-view orientation. The procedural skeleton must apply an equivalent visual
conversion before drawing ticks or the pointer.

## Front-View Conversion Rule

Use one shared conversion path for ticks, danger range, and pointer display.

For the current GLB front-view convention, the procedural visual angle is:

```ts
visualAngle = Math.PI / 2 - modelAngle;
```

Expected front-view landmarks:

- `modelAngle = -2.15 rad` appears at the low-pressure lower-left / left side.
- `modelAngle = 0.86 rad` appears at the right-side red-zone entry.
- `modelAngle = 2.15 rad` appears at the right-side red-zone end.

The procedural skeleton must not place gauge ticks with raw
`Math.cos(modelAngle), Math.sin(modelAngle)` or rotate the visible needle by raw
`modelAngle`. It must first convert through the shared front-view mapping.

## Dynamic Pressure Mapping

Pressure values map to semantic model angles first. Display conversion happens
after that.

Rules:

- The gauge keeps fixed visual geometry.
- The current danger threshold maps to `0.86 rad`.
- Values below danger remain in the normal visual range.
- Values at or above danger enter the red visual range.
- Values above danger continue toward `2.15 rad`.
- If the user changes Heat Capacity safety parameters, the pointer mapping and
  danger/alarm logic must update from the same threshold source.

Warning threshold:

- Used only for warning toast/message logic.
- Must not create a yellow dial segment.
- Must not move the red-zone boundary.

Danger threshold:

- Defines where the pointer first enters the red zone.
- Drives danger/alarm toast and message semantics.
- Must be read from the same Heat Capacity safety-threshold source used by the
  experiment state and toast logic.

## GLB Integration Rules

Future GLB integration should drive the pressure gauge through a stable pointer
target, preferably:

- `HSL_PressureGauge_NeedlePivot`

Do not create a second pressure state, threshold source, or gauge mapping just
for the GLB layer. The GLB layer should consume the same pressure-gauge semantic
angle or the same derived pressure-to-angle output used by the procedural
skeleton.

If the whole GLB instrument needs to be positioned in the software scene, rotate,
scale, or translate an outer placement group. Do not break the internal relative
orientation between:

- pressure-gauge dial artwork
- red danger band
- pointer pivot
- pointer default pose
- pointer rotation axis

## Dynamic Numeral Rule

Future GLB work may add dynamic dial numerals or labels, for example changing
the visible `0-10 kPa` text when editable parameters change.

That work is allowed only if it preserves this contract:

- It may change numeral text or label content.
- It may not move the low-pressure start angle.
- It may not move the danger-entry angle.
- It may not move the maximum angle.
- It may not reverse pointer movement direction.
- It may not change the red-zone angular span.
- It may not introduce a yellow warning dial segment.

Dynamic numerals are a rendering/model enhancement, not a new pressure mapping.

## Review Checklist

Before accepting a software or GLB change that touches the pressure gauge,
verify:

- Default front view shows low pressure at the lower-left / left side.
- Increasing pressure moves the pointer toward the right side.
- The red zone is on the right side.
- The pointer enters red exactly at the current danger threshold.
- Warning threshold only affects warning toast/message UI.
- Danger/alarm threshold affects red-zone entry and danger/alarm UI.
- Procedural skeleton and GLB use the same semantic model-angle contract.
- No model-candidate files are copied into a software-only branch unless the
  user explicitly requests model integration.
