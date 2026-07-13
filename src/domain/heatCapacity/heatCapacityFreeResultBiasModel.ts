export type HeatCapacityFreePreheatOutcome = 'completed' | 'omitted';

export interface HeatCapacityFreePreheatBiasInput {
  formulaGamma: number;
  theoreticalGamma: number;
  preheatOutcome: HeatCapacityFreePreheatOutcome;
  seed: string;
}

export interface HeatCapacityFreePreheatBiasResult {
  preheatBiasGamma: number;
  gamma: number;
}

const PREHEAT_BIAS_MAX_MILLI_GAMMA = 10;

const roundGamma = (value: number) => Number(value.toFixed(6));

const hashSeed = (seed: string) => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

export const deriveHeatCapacityFreePreheatBiasGamma = (
  seed: string,
) => (hashSeed(`${seed}:preheat-bias-magnitude`) % (PREHEAT_BIAS_MAX_MILLI_GAMMA + 1)) / 1000;

export const applyHeatCapacityFreePreheatBias = ({
  formulaGamma,
  theoreticalGamma,
  preheatOutcome,
  seed,
}: HeatCapacityFreePreheatBiasInput): HeatCapacityFreePreheatBiasResult => {
  if (preheatOutcome === 'completed') {
    return {
      preheatBiasGamma: 0,
      gamma: roundGamma(formulaGamma),
    };
  }

  const magnitude = deriveHeatCapacityFreePreheatBiasGamma(seed);
  const direction = formulaGamma < theoreticalGamma
    ? -1
    : formulaGamma > theoreticalGamma
      ? 1
      : hashSeed(`${seed}:preheat-bias-direction`) % 2 === 0
        ? -1
        : 1;
  const preheatBiasGamma = roundGamma(direction * magnitude);
  return {
    preheatBiasGamma,
    gamma: roundGamma(formulaGamma + preheatBiasGamma),
  };
};
