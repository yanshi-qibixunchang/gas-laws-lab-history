import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as p from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import * as f from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import * as t from '../../src/domain/pistonOscillation/pistonOscillationThermalPhysicsModel.ts';
import * as s from '../../src/domain/pistonOscillation/pistonOscillationSensorObservationModel.ts';
import { createPistonOscillationFreeExperimentGroup, createPistonOscillationFreeExperimentContextSnapshot } from '../../src/domain/pistonOscillation/pistonOscillationFreeExperimentGroupModel.ts';
import { createPistonOscillationGasMaterialSnapshot } from '../../src/domain/pistonOscillation/pistonOscillationGasMaterialModel.ts';
import { createPistonOscillationRealParameterDraft } from '../../src/domain/pistonOscillation/pistonOscillationRealParameterProfile.ts';
import { resolvePistonOscillationFreeEffectiveConfig } from '../../src/domain/pistonOscillation/pistonOscillationFreeEffectiveConfig.ts';
import { createPistonOscillationPressOperationEvidence } from '../../src/domain/pistonOscillation/pistonOscillationPressInteractionModel.ts';
import { applyPistonOscillationTailIrregularityObservation } from '../../src/domain/pistonOscillation/pistonOscillationTailIrregularityObservationModel.ts';
import { getPistonOscillationDecayDurationS } from '../../src/domain/pistonOscillation/pistonOscillationInternalDissipation.ts';
import type { PistonOscillationFreeParameterDraft } from '../../src/domain/pistonOscillation/pistonOscillationFreeParameterConfig.ts';
import { writeDissipationReport } from './renderPistonDissipationReport.ts';

export type Gas = 'air' | 'helium';
export type Scheme = 'ideal' | 'real';
export const HEIGHTS = [70, 60, 50];
export const OPERATIONS = [
  { id: 'baseline', pressurePa: 123000, pressS: .75, holdS: 0 },
  { id: 'lower-pressure', pressurePa: 122000, pressS: .75, holdS: 0 },
  { id: 'higher-pressure', pressurePa: 124000, pressS: .75, holdS: 0 },
  { id: 'faster-press', pressurePa: 123000, pressS: .5, holdS: 0 },
  { id: 'hold-before-release', pressurePa: 123000, pressS: .75, holdS: .1 },
];
type Operation = typeof OPERATIONS[number];
export const simulate = (gas: Gas, scheme: Scheme, height: number, op: Operation = OPERATIONS[0]!, overrides: Partial<PistonOscillationFreeParameterDraft> = {}) => {
  const group = createPistonOscillationFreeExperimentGroup({ scheme,
    gasMaterialSnapshot: createPistonOscillationGasMaterialSnapshot(gas), groupId: `audit-${scheme}-${gas}`, createdAtMs: 0 });
  const effective = resolvePistonOscillationFreeEffectiveConfig(group, {...createPistonOscillationRealParameterDraft(gas),...overrides});
  const config = effective.physicsConfig;
  let state = f.getPistonOscillationSettlingStateAtProgress(height, 1, config);
  const h0 = state.pistonHeightM * 1000;
  const compressionExponent = scheme === 'ideal' ? 1 / config.gamma : 1;
  const displacement = (h0 + config.equivalentDeadVolumeHeightM * 1000)
    * (1 - (state.pressurePa / op.pressurePa) ** compressionExponent);
  const states = [state];
  const pressSteps = Math.round(op.pressS * 1000);
  for (let i = 1; i <= pressSteps + Math.round(op.holdS * 1000); i++) {
    const u = Math.min(i / pressSteps, 1);
    state = t.advancePistonOscillationPrescribedThermodynamicState({ referenceState: state,
      pistonHeightMm: h0 - displacement * u * u * (3 - 2 * u), elapsedS: .001,
      velocityMmPerS: u === 1 ? 0 : -displacement * 6 * u * (1-u) / op.pressS,
      physicsConfig: config, thermalConfig: effective.thermalConfig, adiabatic: scheme === 'ideal' });
    states.push(state);
  }
  const trajectory = t.simulatePistonOscillationThermalRelease({ lockedHeightMm: height,
    initialDisplacementMm: state.pistonHeightM * 1000 - h0, initialVelocityMmPerS: state.velocityMPerS * 1000,
    referenceThermodynamicState: state, adiabatic: scheme === 'ideal' }, config, effective.thermalConfig);
  const evidence = createPistonOscillationPressOperationEvidence({ trace: [], releasedAtMs: 0,
    spaceReleasedAtMs: 0, mouseReleasedAtMs: 0, equilibriumHeightMm: h0,
    releaseThermodynamicState: state, releaseVelocityMPerS: state.velocityMPerS });
  return { gas, scheme, height, group, effective, states, trajectory, evidence };
};

export const observe = (sim: ReturnType<typeof simulate>, seed = 1, plannedHeight = sim.height) => {
  const { effective, trajectory } = sim;
  const sensorConfig = { ...effective.sensorConfig, seed };
  const press = s.createPistonOscillationDynamicSensorObservationSeries(sim.states, 1000, { config: sensorConfig });
  const base = sim.scheme === 'ideal' ? s.createPistonOscillationIdealProcessSensorObservationSeries(trajectory.samples, 1000)
    : s.createPistonOscillationDynamicSensorObservationSeries(trajectory.samples, 1000, { config: sensorConfig,
      initialState: press.finalDynamicState, initialObservedPressureKpa: press.samples.at(-1)!.absolutePressureKpa });
  const series = effective.tailIrregularityEnabled ? applyPistonOscillationTailIrregularityObservation({
    observationSeries: base, expectedPeriodS: 1/f.getPistonOscillationSmallSignalFrequencyFromLockedHeightHz(sim.height, trajectory.config),
    config: effective.tailConfig }).observationSeries : base;
  const trigger = s.findPistonOscillationObservedFallingTriggerSample(series, 120);
  if (!trigger) return null;
  const duration = sim.effective.parameters.recordingDurationS ?? .5;
  const samples = s.createPistonOscillationRecordedObservationSamples(series, trigger.sampleIndex, duration);
  const record = p.createPistonOscillationRawMeasurementRecord({ recordId: `${sim.gas}-${sim.scheme}-${sim.height}-${seed}`,
    capturedAtMs: 0, measurementIndex: 0, targetHeightMm: plannedHeight,
    confirmedHeightMm: trajectory.equilibrium.equilibriumHeightM * 1000, sampleRateHz: 1000, triggerThresholdKpa: 120,
    recordedDurationS: duration, recordingPath: 'falling-trigger', releaseOffsetS: null, samples,
    pressOperationEvidence: sim.evidence, experimentContext: createPistonOscillationFreeExperimentContextSnapshot(sim.group),
    sensorObservationSnapshot: p.createPistonOscillationSensorObservationSnapshot({ sampleRateHz: 1000,
      triggerSourceSampleIndex: trigger.sampleIndex, observationSeries: series }),
    physicsSnapshot: p.createPistonOscillationPhysicsSnapshot(trajectory, trigger.timeS) });
  const extrema = p.findPistonOscillationPrimaryExtrema(record);
  // Use more cycles when the ideal noise-free record permits it, reducing
  // the endpoints' 1 ms quantization error. Never select endpoints by gamma.
  const cycleCount = sim.scheme === 'ideal' ? 10 : 3;
  for (let i = 0; i + 2 * cycleCount < extrema.length; i++) {
    const left = extrema[i]!, right = extrema[i+2*cycleCount]!;
    if (left.type !== 'peak') continue;
    const selection = p.createPistonOscillationPeriodSelection(record, Math.max(0,left.timeS-.0004), right.timeS+.0004, cycleCount, 0);
    if (selection.issue || selection.periodCount !== cycleCount) continue;
    let session = p.createPistonOscillationDataProcessingSession([record], 0);
    session = p.selectPistonOscillationPeriodRange(session, [record], 0, selection.rangeStartTimeS, selection.rangeEndTimeS, cycleCount, 0);
    for (const field of ['t1','t2'] as const) session = p.updatePistonOscillationPeriodAnswerDraft(session, 0, field,
      p.formatPistonOscillationEndpointTime(session.runs[0]!.answers[field].expectedValue!), 0);
    session = p.submitPistonOscillationPeriodEndpoints(session, 0, 0);
    session = p.updatePistonOscillationPeriodAnswerDraft(session, 0, 'period',
      p.formatPistonOscillationPeriod(session.runs[0]!.answers.period.expectedValue!), 0);
    session = p.submitPistonOscillationPeriod(session, 0, 0);
    if (!session.runs[0]?.result) throw Error('Production period calculation failed');
    return { record, run: session.runs[0] };
  }
  return null;
};

export const fit = (observations: ReturnType<typeof observe>[]) => {
  if (observations.some(x=>!x)) return null;
  const records = observations.map((x,i)=>({ ...x!.record, measurementIndex: i }));
  let session = p.createPistonOscillationDataProcessingSession(records, 0);
  session = { ...session, runs: observations.map((x,i)=>({ ...x!.run, measurementIndex:i })) };
  for (let i=0;i<records.length;i++) session = p.advancePistonOscillationPeriodRun(session, 0, records);
  for (let i=0;i<records.length;i++) session = p.togglePistonOscillationFitRun(session,i,0);
  session = p.submitPistonOscillationLinearFit(session,0,{ requireAllRuns:true });
  if (!session.calculationSession) throw Error('Production fit failed');
  return { gamma: session.calculationSession.answers.gamma.expectedValue!,
    points: session.linearFitResult!.points, knowns: session.calculationSession.knowns };
};

export const absoluteIdealGamma = (gas: Gas) => {
  const points = HEIGHTS.map((height,runIndex)=> {
    const sim = simulate(gas,'ideal',height,{id:'small-signal',pressurePa:102100,pressS:.75,holdS:0});
    const peaks: number[]=[];
    const a=sim.trajectory.samples;
    for(let i=1;i<a.length-1 && peaks.length<11;i++) {
      const l=a[i-1]!.pressurePa,c=a[i]!.pressurePa,r=a[i+1]!.pressurePa;
      if(c>l && c>=r) peaks.push(a[i]!.timeS + .001 * (l-r)/(2*(l-2*c+r)));
    }
    const period=(peaks[10]!-peaks[0]!)/10;
    const h=sim.trajectory.equilibrium.equilibriumHeightM;
    return {runIndex,measurementIndex:runIndex,rawMeasurementRecordId:`small-${height}`,
      periodSquaredS2:period**2,heightMm:h*1000,heightM:h};
  });
  const result=p.calculatePistonOscillationLinearFit(points,0)!;
  const equilibrium=f.createPistonOscillationLoadedEquilibriumState(70,{gamma:gas==='air'?1.4:5/3});
  return 4*Math.PI**2*.0485*result.slopeMPerS2/(equilibrium.cylinderAreaM2*equilibrium.equilibriumPressurePa);
};

export const runAcceptance = () => {
  const rows: {gas:Gas;condition:string;target:number[];actual:number[];passed:boolean;invalid:number;individual?:number[]}[]=[];
  const durations=[];
  const profiles=[];
  const allRuns=[];
  const range=(a:number[])=>[Math.min(...a),Math.max(...a)];
  for(const gas of ['air','helium'] as const) {
    const scale=gas==='air'?1:(5/3)/1.4;
    const add=(condition:string,target:number[],actual:number[],invalid=0,individual?:number[])=> {
      const bounds=target.map(v=>v*scale);
      rows.push({gas,condition,target:bounds,actual:range(actual),invalid,individual:individual?range(individual):undefined,
        passed:invalid===0 && actual.every(v=>condition==='wrong-height'?v<bounds[0]!||v>bounds[1]!:v>=bounds[0]!&&v<=bounds[1]!)});
    };
    add('absolute-ideal',[1.395,1.405],[absoluteIdealGamma(gas)]);
    const ideal=HEIGHTS.map(h=>simulate(gas,'ideal',h));
    const idealFit=fit(ideal.map(sim=>observe(sim)));
    add('ideal-operation',[1.39,1.41],idealFit?[idealFit.gamma]:[],idealFit?0:1);
    allRuns.push({gas,scheme:'ideal',operation:OPERATIONS[0],seed:1,result:idealFit});
    for(const scheme of ['ideal','real'] as const) {
      const sims=[30,40,45,50,55,60,70,80].map(h=>simulate(gas,scheme,h));
      const effective=sims[0]!.effective;
      profiles.push({gas,scheme,version:effective.parameterProfileVersion,
        parameters:effective.parameters,physicsConfig:effective.physicsConfig,
        thermalConfig:effective.thermalConfig,sensorConfig:effective.sensorConfig,tailConfig:effective.tailConfig});
      durations.push({gas,scheme,thresholdPa:500,heightsMm:sims.map(x=>x.height),
        durationS:range(sims.map(sim=>getPistonOscillationDecayDurationS(sim.trajectory.samples,sim.trajectory.equilibrium.equilibriumPressurePa))),
        samples:sims.map(sim=>({heightMm:sim.height,samples:sim.trajectory.samples.filter((_,i)=>i%2===0)}))});
    }
    const means=[];
    let suitableInvalid=0;
    for(const op of OPERATIONS) {
      const sims=HEIGHTS.map(h=>simulate(gas,'real',h,op));
      const values=[];
      let invalid=0;
      for(let seed=1;seed<=60;seed++) {
        const result=fit(sims.map(sim=>observe(sim,seed)));
        allRuns.push({gas,scheme:'real',operation:op,seed,result});
        values.push(result?.gamma ?? Number.NaN);
        if(!result) invalid++;
      }
      if(op.id==='baseline') add('best-real',[1.37,1.43],values.slice(2).map((v,i)=>(values[i]!+values[i+1]!+v)/3),invalid,values);
      for(const batch of [values.slice(0,30),values.slice(30)]) means.push(batch.reduce((a,b)=>a+b,0)/batch.length);
      suitableInvalid+=invalid;
    }
    add('suitable-real',[1.34,1.46],means,suitableInvalid);
    const wrongSims=[60,60,50].map(h=>simulate(gas,'real',h));
    const wrongFit=fit(wrongSims.map((sim,i)=>observe(sim,1,HEIGHTS[i]!)));
    add('wrong-height',[1.34,1.46],wrongFit?[wrongFit.gamma]:[],0);
  }
  const sourceFiles=['pistonOscillationPhysicsEngine','pistonOscillationThermalPhysicsModel',
    'pistonOscillationInternalDissipation','pistonOscillationIdealParameterProfile',
    'pistonOscillationRealParameterProfile','pistonOscillationSensorObservationModel','pistonOscillationDataProcessingModel'];
  const sourceHashes=Object.fromEntries(sourceFiles.map(name=>[name,createHash('sha256').update(readFileSync(
    new URL(`../../src/domain/pistonOscillation/${name}.ts`,import.meta.url))).digest('hex')]));
  return {profiles,sourceHashes,protocol:{heightsMm:HEIGHTS,operations:OPERATIONS,seeds:'1..30 calibration; 31..60 holdout',sampleRateHz:1000,
    triggerKpa:120,selection:'earliest accepted peak to peak; ideal 10 cycles; real 3 cycles',
    absoluteIdeal:'small amplitude 0.2 kPa; 10 numerical cycles with parabolic sub-sample peak timing; no sensor quantization',
    suitableMetric:'mean of each operation over 30 seeds; no runs removed',wrong:'first planned 70 mm actually 60 mm',
    duration:'last absolute physical pressure deviation >=0.5 kPa; baseline operation over 30..80 mm'},rows,durations,allRuns};
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result=runAcceptance();
  const output=resolve('output/piston-dissipation-2026-11-15');mkdirSync(output,{recursive:true});
  writeFileSync(resolve(output,'acceptance.json'),JSON.stringify(result,null,2));
  console.log(writeDissipationReport(result));
  console.log(JSON.stringify({rows:result.rows,durations:result.durations.map(({samples,...row})=>row)},null,2));
  process.exit(result.rows.every(r=>r.passed)?0:1);
}
