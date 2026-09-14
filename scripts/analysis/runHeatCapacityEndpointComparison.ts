import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  ENDPOINT_METHODS, ENDPOINT_PROTOCOL, ENDPOINT_SCENARIOS,
  compareEndpoint, prepareEndpointComparison,
  type EndpointMethod, type EndpointScenario,
} from './heatCapacityEndpointComparisonModel.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUTPUT = 'docs/instrument-modeling/adiabatic-expansion/validation/endpoint-comparison-v1';
const PROTOCOL_DOCUMENT = 'docs/instrument-modeling/adiabatic-expansion/validation/endpoint-comparison-protocol.md';
const COORDINATOR = 'src/features/workbench/workbenchHeatCapacityFreeRuntimeCoordinator.ts';
type Result = ReturnType<typeof compareEndpoint>;
export type EndpointRow = Result['row'] & { traceSha256: string };
const sha256 = (text: string) => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
const range = (values: Array<number | null>) => {
  const finite = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return { count: finite.length, min: finite.length ? Math.min(...finite) : null,
    max: finite.length ? Math.max(...finite) : null,
    mean: finite.length ? finite.reduce((a, b) => a + b, 0) / finite.length : null };
};

export const summarizeEndpointRows = (rows: EndpointRow[]) => ({
  total: rows.length,
  statuses: Object.fromEntries(['recorded', 'invalid-record', 'no-cue-within-observation', 'reaction-exceeds-observation']
    .map(status => [status, rows.filter(row => row.status === status).length])),
  cueS: range(rows.map(row => row.cueAtS)), closeS: range(rows.map(row => row.closeElapsedS)),
  gamma: range(rows.map(row => row.gamma)), errorPercent: range(rows.map(row => row.relativeErrorPercent)),
});
const difference = (refined: number | null, base: number | null) => refined === null || base === null ? null : refined - base;

export const pairEndpointRows = (base: EndpointRow, refined: EndpointRow) => {
  for (const key of ['scenario', 'seed', 'method', 'reactionDelayS'] as const) {
    if (base[key] !== refined[key]) throw new Error(`Unpaired endpoint rows: ${key}`);
  }
  return {
    scenario: base.scenario, seed: base.seed, method: base.method, reactionDelayS: base.reactionDelayS,
    baseStatus: base.status, refinedStatus: refined.status, statusChanged: base.status !== refined.status,
    baseCueS: base.cueAtS, refinedCueS: refined.cueAtS, cueDifferenceS: difference(refined.cueAtS, base.cueAtS),
    baseGamma: base.gamma, refinedGamma: refined.gamma, gammaDifference: difference(refined.gamma, base.gamma),
  };
};

export const buildEndpointComparison = (
  scenarios: readonly EndpointScenario[] = ENDPOINT_SCENARIOS,
  seeds: readonly number[] = ENDPOINT_PROTOCOL.seeds,
) => {
  const runs: EndpointRow[] = [];
  const refinedRuns: EndpointRow[] = [];
  const pairs: ReturnType<typeof pairEndpointRows>[] = [];
  const preparedStates: Array<{ scenario: string; seed: number; run: ReturnType<typeof prepareEndpointComparison>['run'];
    trial: Result['trial']; calibration: ReturnType<typeof prepareEndpointComparison>['calibration'] }> = [];
  const representatives: Array<{ row: EndpointRow; trace: Result['trace']; trial: Result['trial'] }> = [];
  const capture = (result: Result) => {
    const row = { ...result.row, traceSha256: sha256(JSON.stringify(result.trace)) };
    if (row.reactionDelayS === 0 && (row.seed === ENDPOINT_PROTOCOL.seeds[0] || row.status !== 'recorded')) {
      representatives.push({ row, trace: result.trace, trial: result.trial });
    }
    return row;
  };
  for (const scenario of scenarios) for (const seed of seeds) {
    const prepared = prepareEndpointComparison(scenario, seed);
    preparedStates.push({ scenario: scenario.id, seed, run: prepared.run, trial: prepared.trial, calibration: prepared.calibration });
    for (const method of ENDPOINT_METHODS) for (const delay of ENDPOINT_PROTOCOL.reactionDelaysS) {
      const base = capture(compareEndpoint(prepared, method, delay));
      const refined = capture(compareEndpoint(prepared, method, delay, { stepS: ENDPOINT_PROTOCOL.refinementStepS }));
      runs.push(base);
      refinedRuns.push(refined);
      pairs.push(pairEndpointRows(base, refined));
    }
  }
  const groups = scenarios.flatMap(scenario => ENDPOINT_METHODS.flatMap(method =>
    ENDPOINT_PROTOCOL.reactionDelaysS.map(reactionDelayS => {
      const matches = (row: EndpointRow) => row.scenario === scenario.id && row.method === method && row.reactionDelayS === reactionDelayS;
      return { scenario: scenario.id, method, reactionDelayS,
        base: summarizeEndpointRows(runs.filter(matches)), refined: summarizeEndpointRows(refinedRuns.filter(matches)) };
    })));
  return { runs, refinedRuns, pairs, groups, preparedStates, representatives };
};

const label: Record<EndpointMethod, string> = { 'sound-stop': '程序声音代理', 'display-zero': '显示归零', 'fixed-time': '固定 0.6 s' };
const display = (value: number | null, digits = 2) => value === null ? '—' : value.toFixed(digits);
const span = (value: ReturnType<typeof range>, digits = 2) => value.count === 0 ? '—' : `${display(value.min, digits)}–${display(value.max, digits)}`;

export const renderEndpointComparisonReport = (data: ReturnType<typeof buildEndpointComparison>) => {
  const base = summarizeEndpointRows(data.runs);
  const refined = summarizeEndpointRows(data.refinedRuns);
  const changed = data.pairs.filter(pair => pair.statusChanged);
  const anchors = data.groups.filter(group => group.reactionDelayS === 0).map(group =>
    `| ${group.scenario} | ${label[group.method]} | ${group.base.statuses.recorded}/${group.base.total} | ${span(group.base.cueS)} | ${span(group.base.gamma, 6)} | ${span(group.base.errorPercent, 3)} |`).join('\n');
  const allGroups = data.groups.map(group =>
    `| ${group.scenario} | ${label[group.method]} | ${group.reactionDelayS.toFixed(2)} | ${group.base.statuses.recorded}/${group.base.total} | ${span(group.base.gamma, 6)} | ${group.refined.statuses.recorded}/${group.refined.total} | ${span(group.refined.gamma, 6)} |`).join('\n');
  const missing = data.runs.filter(row => row.status !== 'recorded').map(row =>
    `| ${row.scenario} | ${row.seed} | ${label[row.method]} | ${row.reactionDelayS.toFixed(2)} | ${row.status} |`).join('\n');
  const pairing = data.groups.filter(group => group.reactionDelayS === 0).map(group => {
    const pairs = data.pairs.filter(pair => pair.scenario === group.scenario && pair.method === group.method);
    const delta = range(pairs.map(pair => pair.gammaDifference === null ? null : Math.abs(pair.gammaDifference)));
    const cueDelta = range(pairs.map(pair => pair.cueDifferenceS === null ? null : Math.abs(pair.cueDifferenceS)));
    return `| ${group.scenario} | ${label[group.method]} | ${pairs.filter(pair => pair.statusChanged).length}/${pairs.length} | ${delta.count}/${pairs.length} | ${display(cueDelta.max, 3)} | ${display(delta.max, 6)} |`;
  }).join('\n');
  return `# 绝热膨胀终点判据对照报告

> 状态：可复现教学模型证据；不是实物标定或新的操作标准
> 口径：${ENDPOINT_PROTOCOL.version}；Real 空气；2026-09-15
> 来源：本项目原创，复用现行生产模块；产品行为未修改

基准 ${base.total} 例中 ${base.statuses.recorded} 例得到有效记录，${base.statuses['no-cue-within-observation']} 例在 5 s 内没有终点信号，${base.statuses['reaction-exceeds-observation']} 例反应截止超出窗口，${base.statuses['invalid-record']} 例记录无效。步长减半的 ${refined.total} 个配对中，有效记录 ${refined.statuses.recorded} 例，状态改变 ${changed.length} 例。显示归零策略对采样与观察网格敏感，不能据此冻结真实关阀标准。

每种策略从同一 U₁ 快照分支。程序声音停止是内部反馈代理，未包含扬声器输出或人耳判断；压力归零是首个新样本的显示值恰为 0.0 mV。完整定义、配对条件、反应延迟假设与失败处理见[协议](../endpoint-comparison-protocol.md)。

## 无反应延迟的三种终点

时间从主通路开放起算，不含 0.42 s 开启动画。范围描述五个固定种子，成功记录并不表示误差合格；理论 γ=1.4 只作诊断，不参与选终点。

| 场景 | 策略 | 有效记录/全部 | 终点时间范围 s | 记录 γ 范围 | 相对理论值误差范围 % |
| --- | --- | --- | --- | --- | --- |
${anchors}

程序声音代理与固定时长在部分条件下得到相同的六位小数 γ，这只反映当前模型及记录显示精度，不证明终点相同，也不表示两种真实操作等效。较晚的显示归零会继续经历热交换和流出；低起始压差也会放大固定显示精度对计算的影响。各因素贡献尚未单独分解。

## 全部反应延迟与步长配对

三种延迟是固定假设，不是受试者数据。同一场景和种子的延迟分支共享前段信号，不能将其当成更多独立实验。下表保留全部组；完整的均值、范围、时间与状态计数见 summary.json。

| 场景 | 策略 | 反应延迟 s | 0.04 s 有效/全部 | 0.04 s γ 范围 | 0.02 s 有效/全部 | 0.02 s γ 范围 |
| --- | --- | --- | --- | --- | --- | --- |
${allGroups}

步长变化同时影响积分、强制采样与噪声序列，因此这里报告“步长与观察网格敏感性”，不声称积分器收敛。以下按场景和策略汇总全部三个延迟；缺值保持缺值，最大差值只统计双方都有值的配对。

| 场景 | 策略 | 状态改变/配对 | γ 可比较/配对 | 最大绝对终点差 s | 最大绝对 γ 差 |
| --- | --- | --- | --- | --- | --- |
${pairing}

## 基准未形成有效记录的实例

未触发时保持开阀状态，不补默认终点、不生成 U₂/γ，以下实例仍计入全部分母。两种网格下所有失败的逐例状态见对应 CSV。

| 场景 | 种子 | 策略 | 反应延迟 s | 状态 |
| --- | --- | --- | --- | --- |
${missing || '| — | — | — | — | 无 |'}

## 证据与复现

- [基准逐例数据](runs.csv)与[减半步长逐例数据](refined-runs.csv)：完整时间、U₀/U₁/U₂、γ、错误状态和轨迹 SHA-256；物理压差与温度只作诊断。
- [完整汇总与配对](summary.json)：所有组、状态变化及缺值，不按误差筛选结果。
- [起始快照](prepared-states.json)与[代表性轨迹](representative-traces.json)：保存正式记录、调零夹具和逐步可观察/物理诊断。种子 11 的无延迟样本与两种网格下无延迟失败全部保留；其余轨迹由脚本重建并核对指纹。
- [来源与配置指纹](metadata.json)：协议、分析工具和生产来源、完整配置、包版本及数据文件摘要。

运行 node scripts/analysis/runHeatCapacityEndpointComparison.ts --check 可重新计算并只读核对全部证据。分析脚本不进入应用，不访问用户文件、工作区状态、持久化或撤销接口。

## 本批结论与限制

三种策略的定义与配对证据已经建立。当前结果支持进一步教学讨论，但“声音停止”“显示归零”“固定 0.6 s”尚不能互换。尤其显示归零存在窗口内未触发和网格改变状态的情况，应在任何教学界面方案中明确展示，而不是自动掩盖为成功。

本批保留当前产品的放气时长、声音阈值、传感器、流量与评分。真实操作标准仍需同步动作、声音、压力显示和回温记录；预热、调零误差、氦气、Ideal、人的听觉与真实设备不在本对照范围。下一步若进入界面或调整模型，应先确定相应产品范围及实测依据。
`;
};

const sourceManifest = () => {
  const visited = new Set<string>();
  const visit = (relative: string) => {
    const normalized = relative.replace(/\\/g, '/');
    if (visited.has(normalized)) return;
    visited.add(normalized);
    const text = fs.readFileSync(path.join(ROOT, normalized), 'utf8');
    for (const match of text.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) {
      visit(path.relative(ROOT, path.resolve(ROOT, path.dirname(normalized), match[1]!)));
    }
  };
  visit('scripts/analysis/runHeatCapacityEndpointComparison.ts');
  // Coordinator is a reference for event order, not an imported application driver.
  visited.add(COORDINATOR);
  visited.add(PROTOCOL_DOCUMENT);
  return [...visited].sort().map(source => ({ path: source, sha256: sha256(fs.readFileSync(path.join(ROOT, source), 'utf8')) }));
};
const csv = (rows: EndpointRow[]) => {
  const columns = Object.keys(rows[0] ?? {}) as Array<keyof EndpointRow>;
  const field = (value: unknown) => value == null ? '' : `"${String(value).replace(/"/g, '""')}"`;
  return [columns.map(field).join(','), ...rows.map(row => columns.map(column => field(row[column])).join(','))].join('\n') + '\n';
};

const main = () => {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check') || args.length > 1) throw new Error('Usage: node scripts/analysis/runHeatCapacityEndpointComparison.ts [--check]');
  const check = args.includes('--check');
  const data = buildEndpointComparison();
  const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
  const compactRows = (value: unknown[]) => '[\n' + value.map(row => JSON.stringify(row)).join(',\n') + '\n]\n';
  const files: Record<string, string> = {
    'runs.csv': csv(data.runs), 'refined-runs.csv': csv(data.refinedRuns),
    'summary.json': json({ baseline: summarizeEndpointRows(data.runs), refinement: summarizeEndpointRows(data.refinedRuns), groups: data.groups, pairs: data.pairs }),
    'prepared-states.json': compactRows(data.preparedStates),
    'representative-traces.json': compactRows(data.representatives),
    'report.md': renderEndpointComparisonReport(data),
  };
  const sources = sourceManifest();
  files['metadata.json'] = json({
    schemaVersion: 1, protocol: ENDPOINT_PROTOCOL, scenarios: ENDPOINT_SCENARIOS,
    packageVersion: JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version,
    nodeMajorVersion: Number(process.versions.node.split('.')[0]),
    productionSourceCommit: execFileSync('git', ['log', '-1', '--format=%H', '--', ...sources.filter(source => source.path.startsWith('src/')).map(source => source.path)],
      { cwd: ROOT, encoding: 'utf8' }).trim(),
    configs: ENDPOINT_SCENARIOS.map(scenario => ({ scenario: scenario.id, ...prepareEndpointComparison(scenario, ENDPOINT_PROTOCOL.seeds[0]).configs })),
    sources, outputs: Object.entries(files).map(([name, content]) => ({ name, sha256: sha256(content) })),
  });
  const output = path.join(ROOT, OUTPUT);
  if (!check) fs.mkdirSync(output, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(output, name);
    if (check) {
      if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== content) throw new Error(`Evidence differs: ${OUTPUT}/${name}`);
    } else fs.writeFileSync(target, content);
  }
  console.log(`${check ? 'Verified' : 'Generated'} ${data.runs.length} baseline cases and ${data.refinedRuns.length} paired cases in ${OUTPUT}.`);
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
