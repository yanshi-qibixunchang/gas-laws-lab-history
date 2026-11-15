/** Mungan, Eur. J. Phys. 38 (2017) 035102, equations (3), (5), (14).
 * Gas-side dynamic-pressure drag. Its mechanical work heats the sealed gas.
 */
export const getPistonInternalDampingNsPerM = (
  pressurePa: number,
  temperatureK: number,
  areaM2: number,
  molarMassKgPerMol = 0,
) => areaM2 * pressurePa * Math.sqrt(
  8 * molarMassKgPerMol / (Math.PI * 8.31446261815324 * temperatureK),
);

export const PISTON_DISSIPATIVE_ADIABATIC_MODEL_VERSION =
  'piston-oscillation-adiabatic-dynamic-pressure-v1' as const;

/** Last visible pressure excursion; callers can add a quiet tail for plotting.
 * The scan uses the entire physical trajectory, including low-amplitude turns.
 */
export const getPistonOscillationDecayDurationS = (
  samples: readonly { timeS: number; pressurePa: number }[],
  equilibriumPressurePa: number,
  thresholdPa = 500,
) => {
  let lastExcursionS = 0;
  for (const sample of samples) {
    if (Math.abs(sample.pressurePa - equilibriumPressurePa) >= thresholdPa) {
      lastExcursionS = sample.timeS;
    }
  }
  return lastExcursionS;
};
