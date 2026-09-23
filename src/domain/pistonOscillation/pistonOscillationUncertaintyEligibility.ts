import { isUncertaintyTeachingEnvironment, matchesTeachingSettings, uncertaintyTeachingEligibility } from '../calculation/uncertaintyTeachingEligibility.ts';
import type { PistonOscillationFreeExperimentGroup } from './pistonOscillationFreeExperimentGroupModel.ts';
import { isPistonOscillationFreeTriggerThresholdKpa } from './pistonOscillationFreeParameterConfig.ts';
import { createPistonOscillationRealParameterDraft } from './pistonOscillationRealParameterProfile.ts';

/** Never infer eligibility from the current sidebar or a saved eligibility flag. */
export const evaluatePistonUncertaintyEligibility = (group: PistonOscillationFreeExperimentGroup) => {
  if (group.scheme === 'ideal') return uncertaintyTeachingEligibility('ideal');
  if (!group.parameterSnapshot || group.provenance === 'legacy-inferred') return uncertaintyTeachingEligibility('missing-snapshot');
  const parameters = group.parameterSnapshot.parameters;
  if (!isUncertaintyTeachingEnvironment(parameters.ambientTemperatureK, parameters.ambientPressureKpa)) {
    return uncertaintyTeachingEligibility('environment');
  }
  const { ambientTemperatureK: _temperature, ambientPressureKpa: _pressure,
    sampleRateHz: _rate, triggerThresholdKpa: _trigger, ...fixed } =
    createPistonOscillationRealParameterDraft(group.gasMaterialSnapshot.gasType);
  if (!matchesTeachingSettings(parameters, fixed)) return uncertaintyTeachingEligibility('instrument-model');
  if (!Number.isSafeInteger(parameters.sampleRateHz) || parameters.sampleRateHz! < 1
    || parameters.sampleRateHz! > 1000
    || !isPistonOscillationFreeTriggerThresholdKpa(parameters.triggerThresholdKpa, parameters.ambientPressureKpa)) {
    return uncertaintyTeachingEligibility('acquisition');
  }
  return uncertaintyTeachingEligibility('eligible');
};
