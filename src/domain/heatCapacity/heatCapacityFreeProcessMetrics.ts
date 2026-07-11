import type {
  HeatCapacityFreeTraceSample,
} from './heatCapacityFreeTraceModel.ts';

export const calculateHeatCapacityRelativeErrorPercent = (
  gamma: number | null,
  theoreticalGamma: number,
) => (
  gamma !== null && Number.isFinite(gamma) && theoreticalGamma > 0
    ? Number((Math.abs(gamma - theoreticalGamma) / theoreticalGamma * 100).toFixed(2))
    : null
);

export const findHeatCapacityStopcockFlowStartTime = (
  samples: HeatCapacityFreeTraceSample[],
  visualOpenS: number,
) => {
  const confirmedFlowSample = samples.find((sample) => (
    sample.atS >= visualOpenS &&
    sample.controls.stopcockFlowOpen
  ));
  if (confirmedFlowSample) return confirmedFlowSample.atS;

  const releasingSample = samples.find((sample) => (
    sample.atS >= visualOpenS &&
    sample.controls.stopcockOpen &&
    sample.physical.releaseStarted
  ));
  return releasingSample?.atS ?? visualOpenS;
};
