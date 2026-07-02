# Heat Capacity Free Mode Process Review Design

## Scope

This design covers the Free Mode left-panel Process Review page for the Heat Capacity Ratio experiment.

The existing left-panel structure remains:

- Experiment Guide
- Data and Results
- Process Review

Only the Free Mode Process Review behavior is redesigned in this spec. The Data and Results page continues to show only real experiment records and calculated results. Demo and Guide modes keep the current unavailable-state messaging for Process Review until their separate data models are redesigned later.

## Goals

- Compare the user's real process trace with a reproducible standard-operation trace under the same experiment conditions.
- Keep the process charts readable by aligning phases rather than raw elapsed time.
- Preserve the current diagnostic-score structure while updating each score source for the newer physical models.
- Make "operational upper bound" clear without mixing it into the Data and Results page.
- Use the review as teaching guidance, not a strict point-by-point curve-fitting exam.

## Non-Goals

- Do not change the Data and Results calculation flow.
- Do not write standard-operation data into the real experiment record chain.
- Do not implement Guide Mode scoring in this pass.
- Do not score by pointwise curve-fit error between actual and standard traces.
- Do not replace the current three-section left-panel navigation.

## Data Model Boundaries

Process Review consumes four data sources for the selected Free Mode trial:

1. Real trace data
   - actual control events
   - pressure and temperature display samples
   - stability flags
   - warnings, blocked actions, danger events, and retake branches

2. Real record data
   - U0, U1, and U2 record values
   - record timestamps
   - linked trace sample ids
   - gamma for the selected trial
   - relative error against theoretical air gamma

3. Trial parameter snapshot
   - the frozen parameter snapshot active when this trial started
   - pressure sensitivity, vessel volume, gamma, leakage, noise, sensor lag, thermal exchange, release behavior, warning thresholds, and record thresholds
   - current UI parameter drafts must not be used for historical trials

4. Standard-operation trace
   - derived data for Process Review only
   - generated from the selected trial's parameter snapshot
   - standard operation timing, standard pressure/temperature traces, standard record windows, and standard-operation gamma

The standard-operation trace is analysis reference data. It must not be stored as a real trial, included in Data and Results tables, or used to calculate the user's mean gamma.

## Standard Operation Trace

The standard-operation trace represents the expected upper-bound operation under the same experimental conditions.

Rules:

- Use the selected trial's frozen parameter snapshot.
- Follow the same enabled/disabled disturbance switches as the trial:
  - if leakage is enabled for the trial, standard operation includes leakage
  - if leakage is disabled, standard operation disables leakage
  - if instrument noise is enabled, standard operation includes noise
  - if instrument noise is disabled, standard operation disables noise
  - sensor lag, thermal exchange, release behavior, vessel volume, and thresholds also use the trial snapshot
- Use a fixed standard operation sequence:
  - zeroing
  - pumping
  - sealed stabilization
  - stopcock release
  - closed recovery
  - standard U0, U1, and U2 record windows
- Use reproducible randomness.

The seed should be derived from:

```text
trialId + traceTrialId + parameterSnapshotHash + scoringVersion
```

This makes the same trial show the same standard trace every time it is reviewed. Changing the scoring version may intentionally regenerate the standard trace and scores.

## Phase Alignment

Charts use phase-aligned time instead of raw absolute time.

Shared phases:

- zeroing
- pumping
- sealed stabilization
- stopcock release
- closed recovery

Both actual and standard traces are mapped into the same visual phase bands. Within a phase, each trace keeps its own local time scaling. Long actual waits should not stretch the entire chart; the affected phase can be compressed while diagnostics call out the delay.

This keeps the chart useful for teaching: the user can see which phase diverged from the standard operation without losing the whole comparison to long waiting times.

## Chart Presentation

The existing Process Review chart structure remains:

- phase timeline
- pressure chart
- temperature chart
- diagnostic score table

Updated chart behavior:

- actual trace and standard trace are drawn on the same pressure chart
- actual trace and standard trace are drawn on the same temperature chart
- actual trace uses stronger color and thicker stroke
- standard trace uses lighter color and thinner stroke
- standard trace may show small disturbance/noise wiggles when enabled
- scoring does not require actual curves to match the standard trace point by point
- actual U0, U1, and U2 record points are visually prominent
- standard record timing is shown as windows, not single points
- record windows appear on the timeline and both charts

Standard record windows:

- U0 window: after zeroing, near-zero pressure display, pressure and temperature stable
- U1 window: high-pressure sealed stable section before release
- U2 window: post-release closed recovery section after pressure and temperature stabilize again

Actual records inside a window receive full or near-full timing credit. Records near a window edge receive small deductions. Records clearly before or after the window receive larger deductions and a teaching recommendation.

## Operational Upper Bound

The operational upper bound is shown only in Process Review.

Definition:

```text
gamma_standard = gamma from standard-operation record windows
gamma_real = gamma from actual U0/U1/U2 records
gamma_upper = max(gamma_standard, gamma_real)
```

If the actual result exceeds the standard-operation reference because of randomness or modeling details, the actual result becomes the displayed upper bound. The standard trace still remains visible as the reference trace; only the summary statistic is protected from showing an impossible "upper bound below actual" state.

Displayed metrics:

- real gamma
- real-vs-theory error
- operational upper-bound gamma
- upper-bound-vs-theory error
- gap from operational upper bound

Formulas:

```text
real-vs-theory error = abs(gamma_real - gamma_air) / gamma_air * 100%
upper-bound-vs-theory error = abs(gamma_upper - gamma_air) / gamma_air * 100%
gap from upper bound = abs(gamma_upper - gamma_real) / gamma_upper * 100%
```

If `gamma_real >= gamma_standard`, gap from upper bound is `0.00%`.

The Operational Upper Bound card should include a help affordance. Suggested Simplified Chinese tooltip:

```text
操作上限表示同一参数和干扰条件下，标准操作可达到的参考结果，用于判断本组误差中有多少来自操作时机。若实际结果高于标准操作参考，则以实际结果作为本组操作上限。
```

## Process Review Summary Layout

The top summary should distinguish three concepts:

1. Current trial result
   - selected trial number
   - real gamma
   - real-vs-theory error

2. Operational upper bound
   - upper-bound gamma
   - upper-bound-vs-theory error
   - help tooltip explaining the concept

3. Operation loss
   - gap from upper bound
   - operation score
   - retake count and hidden branch count

Avoid showing two unlabeled "relative error" rows. Every error label should name its reference:

- Real vs theory
- Upper bound vs theory
- Gap from upper bound

## Scoring Framework

Total score remains 100 points. The existing four major groups remain.

### Pumping Process: 20

- Target pressure: 8
  - actual U1 pressure should land in the recommended high-pressure range derived from the trial snapshot and standard operation
  - fixed historical U1 thresholds should be replaced by snapshot/standard-derived ranges

- Safety prompts: 6
  - no pressure warning or danger event receives full credit
  - warning approach and actual danger entry should be distinguished

- Pumping rhythm: 4
  - evaluate pump count, pump intervals, pump valve state, and pressure-rise continuity

- Stable wait: 2
  - evaluate whether pressure and temperature slopes were stable before U1 recording

### Release Operation: 20

- Stopcock release: 6
  - compare actual open duration with standard release duration or a derived acceptable window

- Release response: 6
  - evaluate release magnitude or U2/U1 against the standard operation under the same parameters
  - do not use a fixed historical ratio such as 0.26 as the universal target

- Close and recover: 4
  - verify stopcock closure and entry into recovery recording phase

- U2 retention: 4
  - evaluate whether U2 is in a parameter-derived reasonable retention range

### Record Chain: 50

- Data completeness: 10
  - U0, U1, U2, calculation result, and trace linkage are complete

- Result reasonableness: 5
  - small contribution from real gamma's error against theoretical air gamma
  - this must not dominate the operation score

- Zeroing and U0: 15
  - U0 close to zero
  - U0 recorded after a stable zeroing state

- Record timing: 20
  - U0 timing: 5
  - U1 timing: 7
  - U2 timing: 8
  - compare actual record times with standard record windows
  - U2 receives the largest timing weight because early or unrecovered U2 recording is a common high-impact mistake

### Retake State: 10

- no retake branch receives full credit
- a single reasonable retake receives a small deduction
- repeated retakes, danger-triggered retakes, or broken-flow retakes receive stronger deductions
- because the purpose is teaching guidance, retake deductions should not erase otherwise good final-mainline operation without clear reason

## Diagnostic Table

The score table should continue to use grouped rows similar to the current design.

Each sub-row should show:

- score label
- actual evidence
- standard reference or expected window/range
- diagnosis status
- score

Expanded details can show:

- reason for deduction
- next-step recommendation
- whether the evidence came from actual trace, record value, parameter snapshot, or standard operation

The copy should avoid implying that the user failed because the actual trace did not exactly overlap the standard curve. Use teaching language such as:

- "recorded before the recovery window"
- "release duration was longer than the standard operation window"
- "U1 pressure was below the recommended high-pressure range"

## Mode Boundaries

Free Mode:

- full Process Review with standard operation, upper bound, charts, windows, and scoring

Demo and Guide modes:

- keep the unavailable-state message for now
- do not read Free Mode trace data
- later Guide Mode redesign can reuse the same UI structure with its own data model

## Testing Strategy

Unit tests:

- reproducible standard operation for the same trial and snapshot
- changed snapshot or scoring version changes the seed output intentionally
- standard trace follows leakage/noise/sensor-lag switches from the snapshot
- operational upper bound uses `max(gamma_standard, gamma_real)`
- gap from upper bound is zero when actual gamma is above the standard reference
- each scoring group preserves its configured max points
- fixed historical targets are not used as universal score targets

Model scenario tests:

- standard operation scores near 100
- early U2 recording loses timing and recovery credit
- slow release loses release-operation credit
- insufficient U1 loses target-pressure credit
- warning and danger events reduce safety credit differently
- retake branches reduce retake credit
- high random-noise trace does not receive curve-fit penalties if key operation timing is correct

UI/source tests:

- Data and Results page does not show operational upper bound
- Process Review summary distinguishes real-vs-theory, upper-bound-vs-theory, and gap-from-upper-bound
- pressure and temperature charts include actual and standard traces
- standard record windows are rendered as ranges, not only points
- Demo and Guide modes keep the Free-Mode-only Process Review message

Manual verification:

- create a Free Mode trial with default parameters
- review the latest completed group
- confirm phase-aligned actual and standard traces are readable
- confirm standard windows appear in timeline, pressure chart, and temperature chart
- confirm the summary labels are not ambiguous
- switch to an older completed group and confirm its standard trace remains stable across reopen

## Open Decisions

None for the current design. Implementation may choose exact numeric tolerances for standard-derived acceptable ranges, but those tolerances must come from the standard-operation model and current snapshot rather than fixed legacy constants.
