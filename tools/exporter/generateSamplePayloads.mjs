import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createDefaultIdealFile, createDefaultStandardFile } from '../../components/workbenchState.ts';
import { createWorkbenchExportPayload } from '../../components/workbenchResults.ts';

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = resolve(here, 'examples');
const timestamp = 1710000000000;

const writeJson = async (name, data) => {
  await writeFile(resolve(examplesDir, name), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};

const idealBaseParams = {
  ...createDefaultIdealFile(1).activeParams,
  N: 128,
  L: 12,
  targetTemperature: 1,
};

const createIdealPoint = (relation, index, params, overrides) => {
  const targetTemperature = overrides.targetTemperature ?? params.targetTemperature ?? 1;
  const meanTemperature = overrides.meanTemperature ?? targetTemperature;
  const particleCount = overrides.N ?? params.N;
  const boxLength = overrides.L ?? params.L;
  const volume = boxLength ** 3;
  const idealPressure = particleCount * params.k * meanTemperature / volume;
  const relativeGap = overrides.relativeGap ?? 0;
  const meanPressure = idealPressure * (1 + relativeGap);

  return {
    id: `${relation}-${index + 1}`,
    relation,
    targetTemperature,
    meanTemperature,
    meanPressure,
    idealPressure,
    relativeGap,
    timestamp: timestamp + index * 60000,
    boxLength: relation === 'pv' ? boxLength : null,
    volume: relation === 'pv' ? volume : null,
    inverseVolume: relation === 'pv' ? 1 / volume : null,
    particleCount: relation === 'pn' ? particleCount : null,
    sampleCount: 120 + index * 8,
    history: [],
  };
};

const createIdealReportFile = ({ index, relation, name, params, pointSpecs, finalTime }) => {
  const points = pointSpecs.map((spec, pointIndex) => createIdealPoint(relation, pointIndex, params, spec));
  const referencePoint = points[Math.floor(points.length / 2)] ?? points[0];
  const meanTemperature = points.reduce((sum, point) => sum + point.meanTemperature, 0) / points.length;
  const pointsByRelation = { pt: [], pv: [], pn: [] };
  pointsByRelation[relation] = points;

  return {
    ...createDefaultIdealFile(index),
    name,
    relation,
    updatedAt: timestamp,
    runState: 'finished',
    params,
    appliedParams: params,
    activeParams: params,
    stats: {
      time: finalTime,
      temperature: meanTemperature,
      pressure: referencePoint.meanPressure,
      meanSpeed: Math.sqrt((8 * params.k * meanTemperature) / (Math.PI * params.m)),
      rmsSpeed: Math.sqrt((3 * params.k * meanTemperature) / params.m),
      isEquilibrated: true,
      progress: 1,
      phase: 'finished',
    },
    pointsByRelation,
  };
};

const idealPt = createIdealReportFile({
  index: 1,
  relation: 'pt',
  name: 'Ideal Gas PT Verification',
  params: idealBaseParams,
  finalTime: 15,
  pointSpecs: [
    { targetTemperature: 0.65, meanTemperature: 0.648, relativeGap: -0.014 },
    { targetTemperature: 0.8, meanTemperature: 0.803, relativeGap: 0.009 },
    { targetTemperature: 0.95, meanTemperature: 0.947, relativeGap: -0.006 },
    { targetTemperature: 1.1, meanTemperature: 1.106, relativeGap: 0.011 },
    { targetTemperature: 1.25, meanTemperature: 1.247, relativeGap: -0.008 },
    { targetTemperature: 1.4, meanTemperature: 1.405, relativeGap: 0.006 },
  ],
});

const idealPv = createIdealReportFile({
  index: 2,
  relation: 'pv',
  name: 'Ideal Gas PV Verification',
  params: idealBaseParams,
  finalTime: 16,
  pointSpecs: [
    { L: 9.6, meanTemperature: 0.998, relativeGap: -0.017 },
    { L: 10.4, meanTemperature: 1.004, relativeGap: 0.012 },
    { L: 11.2, meanTemperature: 1.011, relativeGap: 0.006 },
    { L: 12.0, meanTemperature: 1.006, relativeGap: -0.008 },
    { L: 12.8, meanTemperature: 0.996, relativeGap: 0.014 },
    { L: 13.6, meanTemperature: 1.002, relativeGap: -0.011 },
  ],
});

const idealPn = createIdealReportFile({
  index: 3,
  relation: 'pn',
  name: 'Ideal Gas PN Verification',
  params: idealBaseParams,
  finalTime: 17,
  pointSpecs: [
    { N: 72, meanTemperature: 1.006, relativeGap: -0.015 },
    { N: 96, meanTemperature: 0.998, relativeGap: 0.012 },
    { N: 120, meanTemperature: 1.004, relativeGap: -0.006 },
    { N: 144, meanTemperature: 1.002, relativeGap: 0.009 },
    { N: 168, meanTemperature: 0.997, relativeGap: 0.004 },
    { N: 192, meanTemperature: 1.005, relativeGap: -0.01 },
  ],
});

const speedBins = Array.from({ length: 24 }, (_, index) => {
  const binStart = index * 0.16;
  const binEnd = binStart + 0.16;
  const center = (binStart + binEnd) / 2;
  const theoretical = 1.55 * center ** 2 * Math.exp(-0.95 * center ** 2);
  const modulation = 1 + 0.055 * Math.sin(index * 0.9);
  return {
    binStart,
    binEnd,
    count: Math.round(1200 * theoretical * modulation),
    probability: theoretical * modulation,
    theoretical,
  };
});

const energyBins = Array.from({ length: 24 }, (_, index) => {
  const binStart = index * 0.12;
  const binEnd = binStart + 0.12;
  const center = (binStart + binEnd) / 2;
  const theoretical = center > 0 ? 1.18 * Math.sqrt(center) * Math.exp(-center) : 0;
  const modulation = 1 + 0.045 * Math.cos(index * 0.7);
  return {
    binStart,
    binEnd,
    count: Math.round(900 * theoretical * modulation),
    probability: theoretical * modulation,
    theoretical,
  };
});

const tempHistory = Array.from({ length: 80 }, (_, index) => {
  const time = index * 0.75;
  const temperature = 1 + 0.06 * Math.exp(-index / 26) * Math.cos(index / 4);
  return {
    time,
    temperature,
    targetTemperature: 1,
    error: ((temperature - 1) / 1) * 100,
    totalEnergy: 300 + 0.35 * Math.sin(index / 9) + 0.08 * index / 80,
  };
});

const standard = {
  ...createDefaultStandardFile(1),
  name: 'Standard Simulation Validation',
  updatedAt: timestamp,
  runState: 'finished',
  stats: {
    time: 70,
    temperature: 1.004,
    pressure: 0.059,
    meanSpeed: 1.58,
    rmsSpeed: 1.74,
    isEquilibrated: true,
    progress: 1,
    phase: 'finished',
  },
  finalChartData: {
    speed: speedBins,
    energy: energyBins,
    energyLog: energyBins.map((bin) => ({
      ...bin,
      probability: Math.log10(Math.max(bin.probability, 1e-5)),
      theoretical: Math.log10(Math.max(bin.theoretical ?? 0, 1e-5)),
    })),
    tempHistory,
  },
};

await mkdir(examplesDir, { recursive: true });
await writeJson('ideal-pt-report.json', createWorkbenchExportPayload(idealPt, 'report'));
await writeJson('ideal-pv-report.json', createWorkbenchExportPayload(idealPv, 'report'));
await writeJson('ideal-pn-report.json', createWorkbenchExportPayload(idealPn, 'report'));
await writeJson('ideal-pv-points.json', createWorkbenchExportPayload(idealPv, 'pointsCsv'));
await writeJson('standard-report.json', createWorkbenchExportPayload(standard, 'report'));
await writeJson('standard-figures.json', createWorkbenchExportPayload(standard, 'figuresZip'));

console.log(`Sample payloads written to ${examplesDir}`);
