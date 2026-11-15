import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { HEIGHTS, OPERATIONS, simulate, observe, fit, type Gas } from './pistonDissipationAcceptance.ts';
import { advancePistonOscillationPrescribedThermodynamicState, simulatePistonOscillationThermalRelease } from '../../src/domain/pistonOscillation/pistonOscillationThermalPhysicsModel.ts';
import { createPistonOscillationPressOperationEvidence } from '../../src/domain/pistonOscillation/pistonOscillationPressInteractionModel.ts';
import { getPistonOscillationDecayDurationS } from '../../src/domain/pistonOscillation/pistonOscillationInternalDissipation.ts';
import { getPistonOscillationReleaseAsymmetrySeverity } from '../../src/domain/pistonOscillation/pistonOscillationReleaseAsymmetryModel.ts';

// Match the UI's one-hand hold: fix position, keep heat exchange running, then
// pass the actual release gap into the production transient-contact model.
export const delayedRelease = (base: ReturnType<typeof simulate>, gapMs: number) => {
  const { effective } = base;
  let state = base.states.at(-1)!;
  const states = [...base.states];
  for (let elapsedMs = 0; elapsedMs < gapMs; elapsedMs++) {
    state = advancePistonOscillationPrescribedThermodynamicState({
      referenceState: state, pistonHeightMm: state.pistonHeightM * 1000,
      velocityMmPerS: 0, elapsedS: .001, physicsConfig: effective.physicsConfig,
      thermalConfig: effective.thermalConfig, adiabatic: false,
    });
    states.push(state);
  }
  const trajectory = simulatePistonOscillationThermalRelease({
    lockedHeightMm: base.height,
    initialDisplacementMm: (state.pistonHeightM - base.trajectory.equilibrium.equilibriumHeightM) * 1000,
    initialVelocityMmPerS: state.velocityMPerS * 1000,
    referenceThermodynamicState: state, adiabatic: false,
    releaseAsymmetry: { signedReleaseGapS: -gapMs / 1000 },
    releaseAsymmetryConfig: effective.releaseAsymmetryConfig,
  }, effective.physicsConfig, effective.thermalConfig);
  const firstReleaseMs = OPERATIONS[0]!.pressS * 1000;
  const evidence = createPistonOscillationPressOperationEvidence({
    trace: states.map((sample,index)=>({observedAtMs:index,
      pistonHeightMm:sample.pistonHeightM*1000,
      displacementMm:(sample.pistonHeightM-trajectory.equilibrium.equilibriumHeightM)*1000,
      pressurePa:sample.pressurePa,temperatureK:sample.temperatureK})),
    releasedAtMs: firstReleaseMs + gapMs,
    spaceReleasedAtMs: firstReleaseMs, mouseReleasedAtMs: firstReleaseMs + gapMs,
    equilibriumHeightMm: trajectory.equilibrium.equilibriumHeightM * 1000,
    releaseThermodynamicState: state, releaseVelocityMPerS: state.velocityMPerS,
  });
  assert.equal(evidence.signedReleaseGapS, gapMs===0 ? 0 : -gapMs / 1000);
  return { ...base, states, trajectory, evidence };
};

const range = (values: number[]) => values.length ? [Math.min(...values), Math.max(...values)] : null;
const mean = (values: number[]) => values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
const gapsMs = [100, 150, 300, 500];
const seeds = Array.from({length:60}, (_,i)=>i+1);
type Trial = {
  gas: Gas; gapMs: number; delayedHeightMm: number; seed: number;
  result: ReturnType<typeof fit>; baselineGamma: number | null;
  periodsS: (number | null)[];
};
export const runLateReleaseAcceptance = () => {
const trials: Trial[] = [];
const rows = [];
const baselines = [];
const physicalExamples = [];
for (const gas of ['air','helium'] as const) {
  const bases = HEIGHTS.map(h=>simulate(gas,'real',h));
  const normalObservations = seeds.map(seed=>bases.map(base=>observe(base,seed)));
  const normalFits = normalObservations.map(observations=>fit(observations));
  assert(normalFits.every(result=>result!==null), 'Normal control must remain valid');
  // Same code path with zero gap must reproduce the accepted control.
  const zeroGap = delayedRelease(bases[0]!, 0);
  const zeroObservation = observe(zeroGap,1);
  assert.deepEqual(zeroObservation?.run.result, normalObservations[0]![0]?.run.result);
  const target = gas==='air' ? [1.34,1.46] : [1.34,1.46].map(v=>v*(5/3)/1.4);
  baselines.push({gas, releaseAsymmetryConfig:bases[0]!.effective.releaseAsymmetryConfig,
    gamma:range(normalFits.map(v=>v!.gamma)),mean:mean(normalFits.map(v=>v!.gamma)),target});
  for (const gapMs of gapsMs) {
    for (let badIndex=0;badIndex<HEIGHTS.length;badIndex++) {
      const bad = delayedRelease(bases[badIndex]!,gapMs);
      const group: Trial[] = [];
      let invalidBadRecordCount = 0;
      for (const [seedIndex,seed] of seeds.entries()) {
        const observations = [...normalObservations[seedIndex]!];
        observations[badIndex] = observe(bad,seed);
        if (!observations[badIndex]) invalidBadRecordCount++;
        const result = fit(observations);
        const trial: Trial = {gas,gapMs,delayedHeightMm:HEIGHTS[badIndex]!,seed,result,
          baselineGamma:normalFits[seedIndex]!.gamma,
          periodsS:observations.map(v=>v?.run.result?.periodS ?? null)};
        group.push(trial);trials.push(trial);
      }
      const valid = group.filter(v=>v.result!==null);
      const gamma = valid.map(v=>v.result!.gamma);
      const row = {gas,gapMs,delayedHeightMm:HEIGHTS[badIndex]!,trials:seeds.length,
        valid:valid.length,invalidBadRecordCount,gamma:range(gamma),mean:mean(gamma),
        pairedChange:range(valid.map(v=>v.result!.gamma-v.baselineGamma!)),
        belowRange:gamma.filter(v=>v<target[0]!).length,
        insideRange:gamma.filter(v=>v>=target[0]!&&v<=target[1]!).length,
        aboveRange:gamma.filter(v=>v>target[1]!).length,
        badPeriodS:range(group.flatMap(v=>v.periodsS[badIndex]===null?[]:[v.periodsS[badIndex]!])),
        normalPeriodS:range(normalObservations.flatMap(v=>v[badIndex]?.run.result ? [v[badIndex]!.run.result!.periodS] : [])),
        physicalDurationS:getPistonOscillationDecayDurationS(bad.trajectory.samples,bad.trajectory.equilibrium.equilibriumPressurePa),
        visiblePositivePeaks:bad.trajectory.samples.filter((s,i,a)=>i>0&&i<a.length-1
          &&s.pressurePa>a[i-1]!.pressurePa&&s.pressurePa>=a[i+1]!.pressurePa
          &&s.pressurePa-bad.trajectory.equilibrium.equilibriumPressurePa>=500).length,
        normalPhysicalDurationS:getPistonOscillationDecayDurationS(bases[badIndex]!.trajectory.samples,bad.trajectory.equilibrium.equilibriumPressurePa),
        releasePressureKpa:bad.states.at(-1)!.pressurePa/1000,
        severity:getPistonOscillationReleaseAsymmetrySeverity(gapMs/1000,bad.effective.releaseAsymmetryConfig),
      };
      rows.push(row); console.log(JSON.stringify(row));
      if ((gapMs===300 || gapMs===500) && badIndex===0) physicalExamples.push({gas,heightMm:bad.height,gapMs,
        normal:bases[badIndex]!.trajectory.samples.filter(v=>v.timeS<=.7),
        delayed:bad.trajectory.samples.filter(v=>v.timeS<=.7)});
    }
  }
}
const sourcePaths=[
  'scripts/analysis/pistonLateReleaseAcceptance.ts','scripts/analysis/pistonDissipationAcceptance.ts',
  'src/domain/pistonOscillation/pistonOscillationReleaseAsymmetryModel.ts',
  'src/domain/pistonOscillation/pistonOscillationThermalPhysicsModel.ts',
  'src/domain/pistonOscillation/pistonOscillationRealParameterProfile.ts',
  'src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts',
  'src/features/pistonOscillation/PistonOscillationInteractionWorkspace.tsx',
];
const data={protocol:{date:'2026-11-15',scheme:'real',heightsMm:HEIGHTS,gapsMs,seeds,
  error:'Exactly one height has a delayed second-hand release; the other two match the control for the same seed',
  delay:'Fixed piston position during the actual hand delay, continued heat exchange; actual signed gap passed to transient contact loss',
  press:OPERATIONS[0],selection:'Unchanged: earliest accepted peak-to-peak 3 cycles; no fallback to fewer cycles',
  reporting:'Individual complete three-height fits; gamma range and mean summarize calculable attempts only, invalid attempts listed separately',
  interpretation:'Diagnostic only. No new acceptance requirement or parameter tuning.'},
  sourceHashes:Object.fromEntries(sourcePaths.map(path=>[path,createHash('sha256').update(readFileSync(resolve(path))).digest('hex')])),
  baselines,rows,trials,physicalExamples};
const directory=resolve('docs/validation/piston-unbounded-release-2026-11-15');
mkdirSync(directory,{recursive:true});
writeFileSync(resolve(directory,'late-release-results.json'),JSON.stringify(data,null,2));
const num=(v:number|null)=>v===null?'无法计算':v.toFixed(3);
const interval=(v:number[]|null)=>v===null?'无法计算':v.map(num).join('–');
const gasName=(v:Gas)=>v==='air'?'空气':'氦气';
const plots=physicalExamples.map(example=> {
  const eq=101.89833;
  const line=(samples:typeof example.normal)=>samples.filter(s=>s.timeS<=.2).map(s=>`${(50+s.timeS/.2*580).toFixed(2)},${(125-(s.pressurePa/1000-eq)*3.5).toFixed(2)}`).join(' ');
  return `<figure><figcaption>${gasName(example.gas)} · 70 mm · 相差 ${example.gapMs} ms</figcaption><svg viewBox="0 0 660 260" role="img" aria-label="同步与延迟松手的物理曲线"><path d="M50 25V220H630M50 125H630" fill="none" stroke="#a8b7c0"/><polyline points="${line(example.normal)}" stroke="#b0bcc4" fill="none"/><polyline points="${line(example.delayed)}" stroke="#296a9a" stroke-width="2" fill="none"/>${[0,.05,.1,.15,.2].map(t=>`<text x="${50+t/.2*580}" y="240" text-anchor="middle">${t}</text>`).join('')}<text x="15" y="30">kPa</text><text x="40" y="55" text-anchor="end">+20</text><text x="40" y="130" text-anchor="end">0</text><text x="40" y="200" text-anchor="end">−20</text><text x="630" y="255">s</text></svg></figure>`;
}).join('');
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>一次松手不同步的影响</title><style>body{font:16px/1.7 system-ui,"Microsoft YaHei",sans-serif;color:#182c39;background:#f2f5f7;margin:0}main{max-width:1150px;margin:auto;padding:32px}h1{font-size:26px}h2{font-size:20px}table{width:100%;border-collapse:collapse;background:white}td,th{padding:8px 12px;text-align:left;border-bottom:1px solid #d7e0e7}th{background:#e5edf3}a{color:#296a9a}.plots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}figure{margin:0;background:white;border:1px solid #cedae2;border-radius:12px;padding:12px}svg{width:100%;font:12px system-ui}figcaption{font-weight:600}.scroll{overflow:auto}.note{padding:14px 18px;border:1px solid #a4bfce;border-radius:12px;background:#eaf2f7}small{color:#526777}</style><main><h1>三个高度中，一次松手不同步的影响</h1><p>2026-11-15 · 当前空气 v10 / 氦气 v7 · 真实模式 · 松手损耗 v2 · 正常操作参数保留</p><p class="note">每一行是 60 次完整三高度拟合的单次结果范围。只让所列高度的第二只手晚松开，另外两个高度保持正常；失败记录保留。范围和平均值只统计能计算的结果，无效次数单列。</p><p>高度 70、55、40 mm；1000 Hz；下降触发 120 kPa；与原核验相同的 0.75 s 按压操作和最早可用峰到峰 3 周期取值。单手等待期间活塞保持位置、气体继续换热，随后使用软件现有的松手不对称损耗。新模型保留 0.06 s 的正常操作容差；0.15 s 改为参照点，之后附加阻力继续随时间差线性增长，不再封顶。这是软件现象模型的延伸，尚无本装置大时间差压强曲线用于拟合增长率。</p>${baselines.map(base=>`<h2>${gasName(base.gas)}</h2><p>三次均同步松手的对照：${interval(base.gamma)}，平均 ${num(base.mean)}。用于对照的合适操作范围：${interval(base.target)}。</p><div class="scroll"><table><thead><tr><th>松手时间差</th><th>失误高度</th><th>最终 γ 单次范围</th><th>平均 γ</th><th>与同种子正常结果之差</th><th>低于 / 范围内 / 高于</th><th>无效</th></tr></thead><tbody>${rows.filter(row=>row.gas===base.gas).map(row=>`<tr><td>${row.gapMs} ms</td><td>${row.delayedHeightMm} mm</td><td>${interval(row.gamma)}</td><td>${num(row.mean)}</td><td>${interval(row.pairedChange)}</td><td>${row.belowRange} / ${row.insideRange} / ${row.aboveRange}</td><td>${row.invalidBadRecordCount} / ${row.trials}</td></tr>`).join('')}</tbody></table></div>`).join('')}<h2>实际物理曲线的前 0.2 秒</h2><p>灰线：同步松手；蓝线：晚松手。绘制底层物理压强，没有另外添加波峰或绘图衰减。当前仍是一维时变阻尼模型，不能据此宣称已复现倾斜、卡滞等造成的复杂不规则峰形。</p><div class="plots">${plots}</div><p>“无效”表示未能按固定取值规则得到该高度的周期，从而无法完成整组拟合。上下边界只作结果分布对照；这次补测没有新增“错误操作必须越界”的验收要求。</p><p><a href="normal-acceptance.json">原十项工况复核数据</a> · <a href="late-release-results.json">逐次数据、周期、物理时长与来源摘要</a> · <a href="../piston-dissipation-2026-11-15/report.html">原十项核验</a></p></main></html>`;
writeFileSync(resolve(directory,'late-release.html'),html);
console.log(JSON.stringify({baselines,report:resolve(directory,'late-release.html')},null,2));
return data;
};
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) runLateReleaseAcceptance();
