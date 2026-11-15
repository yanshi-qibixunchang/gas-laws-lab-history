import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { runAcceptance } from './pistonDissipationAcceptance.ts';

export const writeDissipationReport = (data: ReturnType<typeof runAcceptance>) => {
  const directory=resolve('docs/validation/piston-dissipation-2026-11-15');
  mkdirSync(directory,{recursive:true});
  const gas=(value:string)=>value==='air'?'空气':'氦气';
  const scheme=(value:string)=>value==='ideal'?'理想':'真实';
  const number=(v:number)=>Number.isFinite(v)?v.toFixed(5):'无有效记录';
  const range=(values:number[])=>values[0]===values[1]?number(values[0]!):values.map(number).join('–');
  const conditions:Record<string,string>={'absolute-ideal':'绝对理想：小振幅数值核验','ideal-operation':'理想实验操作：单次完整计算',
    'best-real':'真实最佳：连续 3 次均值','suitable-real':'合适真实：每组 30 次均值','wrong-height':'错误操作：第一高度偏低 10 mm'};
  const rows=data.rows.map(r=>`<tr><td>${gas(r.gas)}</td><td>${conditions[r.condition]}</td><td>${r.condition==='wrong-height'?'应在以下合格区间之外：':''}${range(r.target)}</td><td>${range(r.actual)}</td><td>${r.passed?'通过':'未通过'}</td></tr>`).join('');
  const durationRows=data.durations.map(r=>`<tr><td>${scheme(r.scheme)}${gas(r.gas)}</td><td>${r.durationS.map(v=>v.toFixed(3)).join('–')} s</td><td>${r.scheme==='ideal'&&r.gas==='helium'?'3.0':r.gas==='air'?'1.2':'0.5'} s</td></tr>`).join('');
  const plots=data.durations.map(row=> {
    const trace=row.samples.find(s=>s.heightMm===50)!;
    const points=trace.samples.filter(s=>s.timeS<=3).map(s=>`${(54+s.timeS/3*586).toFixed(2)},${(134-(s.pressurePa/1000-101.89833)/25*100).toFixed(2)}`).join(' ');
    return `<figure><figcaption>${scheme(row.scheme)}${gas(row.gas)} · 50 mm</figcaption><svg viewBox="0 0 680 290" role="img" aria-label="${scheme(row.scheme)}${gas(row.gas)}释放后的物理压强曲线"><rect x="54" y="132" width="586" height="4" fill="#e5f1e9"/><path d="M54 34V234H640M54 134H640" stroke="#94a3b8" fill="none"/><polyline points="${points}" fill="none" stroke="${row.scheme==='ideal'?'#316e9e':'#298472'}" stroke-width="1.3"/>${[0,1,2,3].map(v=>`<text x="${54+v/3*586}" y="255" text-anchor="middle">${v}</text>`).join('')}<text x="348" y="280" text-anchor="middle">松手后时间 / s</text><text x="45" y="38" text-anchor="end">+25</text><text x="45" y="138" text-anchor="end">0</text><text x="45" y="238" text-anchor="end">−25</text><text x="12" y="18">压强偏差 / kPa</text></svg></figure>`;
  }).join('');
  const individual=data.rows.filter(r=>r.individual).map(r=>`${gas(r.gas)}：${range(r.individual!)}（连续 3 次均值见表）`).join('；');
  const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>活塞耗散与十项工况核验</title><style>body{font:16px/1.7 system-ui,"Microsoft YaHei",sans-serif;background:#f2f5f7;color:#182c39;margin:0}main{max-width:1160px;margin:auto;padding:34px}h1{font-size:28px}h2{font-size:21px;margin-top:32px}p{max-width:1000px}table{border-collapse:collapse;width:100%;background:white}td,th{padding:10px 14px;text-align:left;border-bottom:1px solid #d7e0e7}th{background:#e5edf3}section,.plots{margin-top:22px}.plots{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0;border:1px solid #cdd9e2;border-radius:12px;background:white;padding:16px}figcaption{font-weight:600}svg{width:100%;font:12px system-ui}code{background:#e5edf3;padding:2px 5px}a{color:#296a9a}.status{background:#e6f1ea;border:1px solid #90b9a4;padding:14px 20px;border-radius:12px}@media(max-width:800px){main{padding:18px}.plots{grid-template-columns:1fr}table{font-size:13px}td,th{padding:6px}}</style><main>
  <h1>活塞耗散模型与十项工况核验</h1><p>2026-11-15 · 空气 γ=1.4，氦气 γ=5/3 · 当前本地参数</p>
  <p class="status">${data.rows.filter(r=>r.passed).length}/10 项达到表列标准。结果取自生产物理、观测、取周期和计算函数；没有把输出强制改成理论值。</p>
  <h2>四种状态的振动结束过程</h2><p>图中为底层物理压强相对平衡压强的偏差；未另加绘图衰减。绿色窄带为 ±0.5 kPa。数学上的指数衰减不会在有限时间精确变成零，表内时长指最后一次离开该窄带。范围覆盖 30–80 mm 的八个高度，同步松手、基准按压。</p><div class="plots">${plots}</div>
  <table><thead><tr><th>状态</th><th>明显振动持续时间</th><th>新实验默认记录时间</th></tr></thead><tbody>${durationRows}</tbody></table><p>采集上限已提高到 3 s，用户仍可自行设置。该上限足以覆盖本表基准操作及其尾段；不把它解释成任意深按压、任意初速度下的绝对停止上限。声音沿用已确认的时长倍率，图像保留物理时间。</p>
  <h2>十项验收</h2><table><thead><tr><th>气体</th><th>工况与统计量</th><th>事先规定的目标</th><th>实际结果</th><th>结论</th></tr></thead><tbody>${rows}</tbody></table>
  <p>真实最佳操作的单次结果：${individual}。单次范围与均值范围不同；本表没有声称每个单次值均在最佳操作的较窄区间内。</p>
  <h2>操作与取值规则</h2><p>正式拟合使用 70、55、40 mm 三个高度，采样 1000 Hz，下降触发阈值 120 kPa。基准在 0.75 s 内按压到约 123 kPa 后同步松手。合适操作另测约 122 kPa、124 kPa、0.50 s 快按、按下后停留 0.10 s，合计五组；本次没有把松手不同步的所有连续取值都宣称已覆盖。</p>
  <p>每组 30 个固定随机种子用于核验，另 30 个种子独立复核，失败记录计入分母。真实模式按最早可用的峰到峰 3 周期取值。新理想模式因曲线更长，固定取最早可用的 10 周期，以降低端点 1 ms 分辨率的影响；未按 γ 好坏挑选端点。小振幅核验单独使用底层轨迹的峰值插值，检验物理方程，不冒充界面手动取值。</p>
  <h2>模型与参数</h2><p>Ideal 新增 b=AP√(8M/(πRT))、F=−bv、气体内能增加率 bv²。外界热流为零，机械能转为气体内能，最终气体略热、活塞平衡位置略升。标称平衡条件下 b：空气 0.4651、氦气 0.1729 N·s/m。该系数随状态更新。</p>
  <table><thead><tr><th>状态</th><th>等效线性损耗 / N·s/m</th><th>换热时间参数 / s</th><th>传感器响应 / s</th></tr></thead><tbody><tr><td>理想空气 / 氦气</td><td>0；另有上述内部耗散</td><td>无外界换热</td><td>0</td></tr><tr><td>真实空气 v10</td><td>0.06</td><td>0.020（原 0.012）</td><td>0.0030（原 0.0025）</td></tr><tr><td>真实氦气 v7</td><td>0.18</td><td>0.008（保留）</td><td>0.0022（原 0.0026）</td></tr></tbody></table>
  <p>Real 保留热交换与已标定综合损耗，没有再叠加 Ideal 的绝热阻力，以免重复计算。新参数是面向上述教学验收的标定值，不是重新测得的仪器常数。原空气 v9、氦气 v6 和旧理想记录继续按各自版本读取。没有改 γ、质量、缸径或死体积来凑结果。</p>
  <h2>来源与复现</h2><p><a href="https://doi.org/10.1088/1361-6404/aa6054">Mungan (2017)，绝热动态压强阻力</a>；<a href="https://doi.org/10.1088/1361-6404/acc5c2">Shearwood 与 Sloan (2023)，实际装置总体衰减</a>。原文存档及版本说明位于项目 <code>docs/instrument-modeling/piston-oscillation/references/dissipation/</code>，软件“关于 → 构建说明 → 活塞模型参考文献”也已列出。</p><p>复现：<code>node scripts/analysis/pistonDissipationAcceptance.ts --full</code>。<a href="results.json">逐次计算数据与协议</a>。</p></main></html>`;
  writeFileSync(resolve(directory,'report.html'),html);
  writeFileSync(resolve(directory,'results.json'),JSON.stringify({...data,durations:data.durations.map(({samples,...r})=>r)},null,2));
  return resolve(directory,'report.html');
};
