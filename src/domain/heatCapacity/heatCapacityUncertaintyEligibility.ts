import { isUncertaintyTeachingEnvironment, matchesTeachingSettings, uncertaintyTeachingEligibility } from '../calculation/uncertaintyTeachingEligibility.ts';
import { applyHeatCapacityFreeGasTypeModelDefaultsToDraft, applyHeatCapacityFreeParameterDraftToConfigs, normalizeHeatCapacityFreeParameterDraft } from './heatCapacityFreeParameterConfig.ts';
import type { HeatCapacityFreeGasType } from './heatCapacityGasTheory.ts';
import { createDefaultFreeConfigSnapshot, type HeatCapacityFreeConfigSnapshot } from './heatCapacityFreeTraceModel.ts';
import type { HeatCapacityFreeExperimentGroupRecord } from './heatCapacityFreeExperimentGroupModel.ts';
import { rehydrateHeatCapacityCalculationWorkflowSession, type HeatCapacityCalculationWorkflowSession } from './heatCapacityCalculationWorkflowModel.ts';
import { getHeatCapacityFreePublicZero } from './heatCapacityFreeTrialModel.ts';
import { calculateHeatCapacityGroupReference } from './heatCapacityCalculationModel.ts';

/** Uses only the effective settings frozen at acquisition, including disabled noise. */
export const evaluateHeatCapacityUncertaintyEligibility = (
  scheme: 'real' | 'ideal',
  gasType: HeatCapacityFreeGasType,
  snapshot: HeatCapacityFreeConfigSnapshot | null,
) => {
  if (scheme === 'ideal') return uncertaintyTeachingEligibility('ideal');
  if (!snapshot) return uncertaintyTeachingEligibility('missing-snapshot');
  if (!isUncertaintyTeachingEnvironment(snapshot.environment.ambientTemperatureK, snapshot.environment.ambientPressureKPa)) {
    return uncertaintyTeachingEligibility('environment');
  }
  const defaults = applyHeatCapacityFreeParameterDraftToConfigs(applyHeatCapacityFreeGasTypeModelDefaultsToDraft(
    normalizeHeatCapacityFreeParameterDraft(snapshot.environment), gasType,
  ));
  const baseline = createDefaultFreeConfigSnapshot();
  if (!matchesTeachingSettings(snapshot.record, { ...defaults.recordConfig, pressureWarningMv: defaults.pressureWarningMv })) {
    return uncertaintyTeachingEligibility('record-criteria');
  }
  const { environment: _environment, ...physics } = defaults.physicsConfig;
  if (!matchesTeachingSettings(snapshot.physics, { ...baseline.physics, ...physics })
    || !matchesTeachingSettings(snapshot.sensor, { ...baseline.sensor, ...defaults.sensorConfig })) {
    return uncertaintyTeachingEligibility('instrument-model');
  }
  return uncertaintyTeachingEligibility('eligible');
};

export const reconcileHeatCapacityCalculationUncertainty = (
  previous: HeatCapacityCalculationWorkflowSession,
  scheme: 'real' | 'ideal', gasType: HeatCapacityFreeGasType, snapshot: HeatCapacityFreeConfigSnapshot | null,
) => rehydrateHeatCapacityCalculationWorkflowSession(previous, {
  mode: 'free', groups: previous.groups.map(({ trialId, reference }) => ({ trialId, reference })),
  theoreticalGamma: previous.theoreticalGamma, presentation: previous.presentation,
  scoringConfig: previous.scoringConfig, now: previous.startedAtMs,
  uncertaintyEligibility: evaluateHeatCapacityUncertaintyEligibility(scheme, gasType, snapshot),
});

/** Rebuild the course scope from acquisition evidence when restoring a group. */
export const reconcileHeatCapacityGroupUncertainty = (group: HeatCapacityFreeExperimentGroupRecord) => {
  const calculation = group.calculation;
  const interactive = calculation?.kind === 'real-interactive' || calculation?.kind === 'ideal-interactive';
  const previous = interactive ? calculation.session : group.runSeries.batch.calculationSession;
  if (!previous) return group;
  const snapshot = group.parameterSnapshot;
  const groups = group.runSeries.trials.flatMap(trial => {
    const zero = getHeatCapacityFreePublicZero(trial);
    if (!zero || !trial.u1 || !trial.u2 || !snapshot) return [];
    const reference = calculateHeatCapacityGroupReference({ u0Mv: zero.displayPressureMv,
      u1Mv: trial.u1.displayPressureMv, u2Mv: trial.u2.displayPressureMv,
      atmosphericPressureKPa: snapshot.environment.ambientPressureKPa,
      pressureSensitivityMvPerKPa: snapshot.sensor.pressureMvPerKPa });
    return reference ? [{ trialId: trial.id, reference }] : [];
  });
  if (groups.length !== previous.groups.length) return {
    ...group, status: 'legacy-incomplete-readonly' as const, finalScore: null,
    calculation: null, runSeries: { ...group.runSeries, batch: { ...group.runSeries.batch, calculationSession: null } },
  };
  const session = rehydrateHeatCapacityCalculationWorkflowSession(previous, {
    mode: 'free', groups, theoreticalGamma: previous.theoreticalGamma, presentation: previous.presentation,
    scoringConfig: previous.scoringConfig, now: previous.startedAtMs,
    uncertaintyEligibility: evaluateHeatCapacityUncertaintyEligibility(group.scheme, group.gasType, snapshot),
  });
  return {
    ...group,
    ...(group.status === 'completed' && session.status !== 'completed'
      ? { status: 'legacy-incomplete-readonly' as const, finalScore: null } : {}),
    calculation: interactive ? { ...calculation, session } : calculation,
    runSeries: { ...group.runSeries, batch: { ...group.runSeries.batch, calculationSession: session } },
  } as HeatCapacityFreeExperimentGroupRecord;
};
