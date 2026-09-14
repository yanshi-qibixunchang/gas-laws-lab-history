import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  OPERATION_SWEEP_PROTOCOL, createSweepOperations, fitDisplayedHeightSet,
  observeOperation, operationKey, sampleSummary, simulateOperation,
  type Observation, type Operation,
} from './pistonOperationSweepModel.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUTPUT = 'docs/instrument-modeling/piston-oscillation/validation/operation-sweep-v1';
const PROTOCOL_DOCUMENT = 'docs/instrument-modeling/piston-oscillation/validation/operation-sweep-protocol.md';

export const buildOperationSweep = (
  operations: readonly Operation[] = createSweepOperations(),
  seeds: readonly number[] = OPERATION_SWEEP_PROTOCOL.seeds,
  onProgress: (count: number) => void = () => {},
) => {
  const runs: Array<Record<string, string | number | null>> = [];
  const fits: Array<{ operation: string; seed: number; heightSet: string;
    result: ReturnType<typeof fitDisplayedHeightSet> }> = [];
  const summaries: Array<{ operation: string; heightMm: number; total: number; triggered: number;
    usable: number; periodS: ReturnType<typeof sampleSummary> }> = [];
  const representativeRecords: NonNullable<Observation['record']>[] = [];
  for (const [operationIndex, operation] of operations.entries()) {
    const observationsBySeed = seeds.map(() => [] as Observation[]);
    for (const heightMm of OPERATION_SWEEP_PROTOCOL.heightsMm) {
      const simulation = simulateOperation(heightMm, operation);
      const observations = seeds.map((seed, seedIndex) => {
        const observation = observeOperation(simulation, seed);
        observationsBySeed[seedIndex]!.push(observation);
        const result = observation.run?.result;
        const extrema = observation.analysis?.primaryExtrema ?? [];
        runs.push({ operation: operationKey(operation), heightMm, ...operation, seed,
          ...simulation.diagnostics,
          releaseObservedPressureKpa: observation.releaseObservedPressureKpa,
          triggerTimeS: observation.triggerTimeS,
          status: !observation.record ? 'no-falling-trigger' : !result ? 'no-accepted-two-cycle-window' : 'usable',
          analysisReason: observation.analysis?.reason ?? null,
          primaryPeriodSpan: extrema.length ? (extrema.at(-1)!.ordinal - extrema[0]!.ordinal) / 2 : 0,
          skippedPrimaryExtrema: observation.skippedPrimaryExtrema,
          amplitudeToNoiseRatio: observation.amplitudeToNoiseRatio,
          selectedCycleCvPercent: observation.selectedCycleCvPercent,
          t1S: result?.t1S ?? null, t2S: result?.t2S ?? null,
          periodCount: result?.periodCount ?? null,
          displayedPeriodS: result?.periodS ?? null, displayedPeriodSquaredS2: result?.periodSquaredS2 ?? null,
          samplesSha256: observation.samplesSha256,
        });
        if (operation.dragReferencePx === 200 && operation.rampDurationS === 1.1
          && (operation.holdDurationS === 0 || operation.holdDurationS === 0.4)
          && seed === OPERATION_SWEEP_PROTOCOL.seeds[0] && observation.record) {
          representativeRecords.push(observation.record);
        }
        return observation;
      });
      summaries.push({ operation: operationKey(operation), heightMm, total: seeds.length,
        triggered: observations.filter(item => item.record !== null).length,
        usable: observations.filter(item => item.run !== null).length,
        periodS: sampleSummary(observations.flatMap(item => item.run?.result ? [item.run.result.periodS] : [])),
      });
    }
    for (const [seedIndex, seed] of seeds.entries()) {
      for (const heights of [[80, 70, 60], OPERATION_SWEEP_PROTOCOL.heightsMm]) {
        fits.push({ operation: operationKey(operation), seed, heightSet: heights.join('/'),
          result: fitDisplayedHeightSet(observationsBySeed[seedIndex]!, heights) });
      }
    }
    onProgress(operationIndex + 1);
  }
  return { runs, fits, summaries, representativeRecords };
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
  visit('scripts/analysis/runPistonOperationSweep.ts');
  visited.add(PROTOCOL_DOCUMENT);
  return [...visited].sort().map(source => ({ path: source,
    // Cross-platform checkout line endings do not change numeric provenance.
    sha256: createHash('sha256').update(fs.readFileSync(path.join(ROOT, source), 'utf8').replace(/\r\n/g, '\n')).digest('hex') }));
};

const display = (value: number | null, decimals = 2) => value === null ? '—' : value.toFixed(decimals);

export const renderOperationSweepReport = (sweep: ReturnType<typeof buildOperationSweep>) => {
  const usable = sweep.runs.filter(row => row.status === 'usable').length;
  const untriggered = sweep.runs.filter(row => row.status === 'no-falling-trigger').length;
  const perHeight = OPERATION_SWEEP_PROTOCOL.heightsMm.map(heightMm => {
    const rows = sweep.runs.filter(row => row.heightMm === heightMm);
    const success = rows.filter(row => row.status === 'usable');
    const pressures = sampleSummary(rows.map(row => row.releasePhysicalPressureKpa as number));
    return `| ${heightMm} | ${rows.length} | ${rows.filter(row => row.triggerTimeS !== null).length} | ${success.length} | ${display(pressures.min)}–${display(pressures.max)} |`;
  }).join('\n');
  const anchors = [0, 0.4].flatMap(holdDurationS => {
    const key = operationKey({ dragReferencePx: 200, rampDurationS: 1.1, holdDurationS });
    return OPERATION_SWEEP_PROTOCOL.heightsMm.map(heightMm => {
      const rows = sweep.runs.filter(row => row.operation === key && row.heightMm === heightMm);
      const summary = sweep.summaries.find(item => item.operation === key && item.heightMm === heightMm);
      return `| ${holdDurationS.toFixed(1)} | ${heightMm} | ${display(rows[0]?.releasePhysicalPressureKpa as number ?? null)} | ${summary?.usable ?? 0}/${rows.length} | ${display(summary?.periodS.mean ?? null, 5)} | ${display(summary?.periodS.cvPercent ?? null, 3)} |`;
    });
  }).join('\n');
  const fitSummaries = [0, 0.4].flatMap(holdDurationS => {
    const key = operationKey({ dragReferencePx: 200, rampDurationS: 1.1, holdDurationS });
    return ['80/70/60', '80/70/60/50/40/30'].map(heightSet => {
      const rows = sweep.fits.filter(row => row.operation === key && row.heightSet === heightSet);
      const gamma = sampleSummary(rows.flatMap(row => row.result ? [row.result.gamma] : []));
      const error = sampleSummary(rows.flatMap(row => row.result ? [row.result.relativeErrorPercent] : []));
      return `| ${holdDurationS.toFixed(1)} | ${heightSet} | ${gamma.count}/${rows.length} | ${display(gamma.min, 3)}–${display(gamma.max, 3)} | ${display(error.min)}–${display(error.max)} |`;
    });
  }).join('\n');
  const byDrag = OPERATION_SWEEP_PROTOCOL.dragReferencePx.map(drag => {
    const rows = sweep.runs.filter(row => row.dragReferencePx === drag);
    const keys = new Set(rows.map(row => row.operation));
    const completeFits = sweep.fits.filter(row => keys.has(row.operation) && row.heightSet === '80/70/60/50/40/30');
    return `| ${drag} | ${rows.filter(row => row.status === 'usable').length}/${rows.length} | ${completeFits.filter(row => row.result).length}/${completeFits.length} |`;
  }).join('\n');
  const timing = OPERATION_SWEEP_PROTOCOL.rampDurationsS.flatMap(rampDurationS =>
    OPERATION_SWEEP_PROTOCOL.holdDurationsS.map(holdDurationS => {
      const key = operationKey({ dragReferencePx: 200, rampDurationS, holdDurationS });
      const rows = sweep.fits.filter(row => row.operation === key);
      const three = sampleSummary(rows.flatMap(row => row.heightSet === '80/70/60' && row.result ? [row.result.gamma] : []));
      const six = sampleSummary(rows.flatMap(row => row.heightSet === '80/70/60/50/40/30' && row.result ? [row.result.gamma] : []));
      return `| ${rampDurationS.toFixed(1)} | ${holdDurationS.toFixed(1)} | ${display(three.min, 3)}–${display(three.max, 3)} | ${display(six.min, 3)}–${display(six.max, 3)} |`;
    })).join('\n');
  const belowZero = sweep.runs.filter(row => (row.minimumHeightMm as number) < 0).length;
  const aboveReference = sweep.runs.filter(row => (row.upperReferenceMarginMm as number) < 0).length;
  const outsideSensor = sweep.runs.filter(row => (row.minimumPhysicalPressureKpa as number) < 20
    || (row.maximumPhysicalPressureKpa as number) > 200).length;
  const maximumHeight = Math.max(...sweep.runs.map(row => row.maximumHeightMm as number));
  return `# 活塞操作参数扫描报告

> 状态：可复现模型敏感性证据；不是实物标定或新的产品阈值
> 口径：${OPERATION_SWEEP_PROTOCOL.version}；Real 空气；2026-09-14
> 来源：本项目原创，直接调用当前生产模型与显示值精确计算链

本轮 ${sweep.runs.length} 个观测实例中，${usable} 个可按固定策略处理两个主周期，${untriggered} 个未发生下降触发，另有 ${sweep.runs.length - usable - untriggered} 个未找到可接受的两周期选区。以上分母包括失败情况。采样点低于0 mm下限共 ${belowZero} 个，超出当前模型20–200 kPa压力范围共 ${outsideSensor} 个。

另有 ${aboveReference} 个实例的反弹超过80 mm名义设置参考线，最高约 ${display(maximumHeight)} mm。源码中的80 mm限制用于平衡高度设置，振动位移继续叠加；不能据此认定真实装置已撞到上限。[PASCO当前产品规格](https://www.pasco.com/products/lab-apparatus/thermodynamics/heat-engine/td-8572)给出最大活塞位移约10 cm（2026-09-14核验），但该近似行程不是本机零刻度下的精确机械上限；本报告将上侧实物净空记录为未知。

扫描协议、指标定义和限制见[固定口径](../operation-sweep-protocol.md)。行程、时间和停留共同决定释放状态；不能从本模型的可处理率直接确定科学操作标准。以下所有范围包含5个固定种子，零变异可能来自采样和显示舍入。

## 六个高度的全部扫描结果

| 高度 mm | 观测实例 | 触发实例 | 两周期可处理实例 | 释放真实压强范围 kPa |
| --- | --- | --- | --- | --- |
${perHeight}

按行程汇总如下，各行包含全部下压时间和停留组合。可处理只指现行两周期门禁，不含新设的误差阈值。

| 参考行程 px | 两周期可处理实例/总实例 | 完整六高度拟合/尝试 |
| --- | --- | --- |
${byDrag}

## 当前演示行程附近的配对对照

这里固定200参考像素、1.1 s下压，比较立即释放和手部目标停留0.4 s。该行程在不同高度产生不同实际下压幅度和释放压强；表中的真实压强只作模型诊断，不参与学生答案计算。

| 停留 s | 高度 mm | 释放真实压强 kPa | 两周期可处理 | 显示T均值 s | 显示T变异系数 % |
| --- | --- | --- | --- | --- | --- |
${anchors}

## 固定选区的最终显示值计算

最早可接受的两主周期窗口在计算γ之前确定；不为降低误差移动选区。只用完整三点或六点集合，任何高度失败则该次拟合失败。显示T经过现有精确十进制平方，拟合与A、γ、误差由当前产品提交函数生成。

| 停留 s | 拟合高度 mm | 完整拟合实例 | 显示γ范围 | 显示相对误差范围 % |
| --- | --- | --- | --- | --- |
${fitSummaries}

200参考像素下的完整时间矩阵如下；保留全部种子结果，未按最小γ误差择优。所有明细和拟合失败情况仍见数据文件。

| 下压 s | 停留 s | 三高度显示γ范围 | 六高度显示γ范围 |
| --- | --- | --- | --- |
${timing}

当前1.1 s动作的三高度结果说明，“至少两个周期”是处理门禁，不保证结果精度。1 ms端点网格在两个周期下对应0.5 ms的周期变化；三点拟合会进一步放大选点差异。此处仅按预先固定窗口观察这种敏感性，不以理论γ反向改选区，也不恢复容差判题。

## 数据及复现

- [全部逐例指标](runs.csv)：包含动作、种子、触发、主周期、选区、噪声代理量、机械余量、显示T/T²、观测样本SHA-256；空值与失败保留。
- [聚合与全部拟合](summary.json)：完整逐高度重复性和逐种子三/六高度拟合，不按误差筛选。
- [代表性原始观测](representative-records.json)：200像素、1.1 s、停留0或0.4 s、种子11的正式记录和快照；其他样本由同一脚本重建并核对逐例指纹。
- [来源指纹](metadata.json)：协议、执行脚本及全部实际源码依赖的指纹。指纹覆盖物理、观测和计算版本。

运行 node scripts/analysis/runPistonOperationSweep.ts --check 可重新计算并检查全部证据，无文件写入。该工具只读生产源码，不接触用户文件和保存接口，不被应用运行时导入。

## 证据边界与下一步

此次是固定候选参数下的模型扫描。现有四条实测未记录完整下压、停留和同步释放，且缺少80/70/60 mm及各条件重复，不能用于验证当前网格的操作成功率。此报告不把任何行程、时间、压强区间或误差上限升级为科学标准，也不重标定阻尼、热交换或传感器。

后续应先按协议补齐对应实测，再决定按高度分配的操作范围，以及是否调整演示停留和引导触发。PO-CAL-002/003继续等待独立实测，PO-CAL-004不能仅凭模型误差最小值修改阈值。氦气、Ideal、10–29 mm自定义高度及真实人手重复性不在本扫描范围。
`;
};

const csv = (rows: ReturnType<typeof buildOperationSweep>['runs']) => {
  const columns = Object.keys(rows[0] ?? {});
  const field = (value: unknown) => value == null ? '' : JSON.stringify(String(value));
  return [columns.map(field).join(','), ...rows.map(row => columns.map(column => field(row[column])).join(','))].join('\n') + '\n';
};

const main = () => {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check') || args.length > 1) throw new Error('Usage: node scripts/analysis/runPistonOperationSweep.ts [--check]');
  const check = args.includes('--check');
  const sweep = buildOperationSweep(undefined, undefined, count => {
    if (count % 12 === 0) console.log(`Evaluated ${count}/72 operations.`);
  });
  const metadata = {
    schemaVersion: 1, protocol: OPERATION_SWEEP_PROTOCOL,
    productionSourceCommit: execFileSync('git', ['log', '-1', '--format=%H', '--', 'src/domain/pistonOscillation', 'src/domain/calculation'], { cwd: ROOT, encoding: 'utf8' }).trim(),
    sources: sourceManifest(),
  };
  const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
  const files = {
    'metadata.json': json(metadata), 'runs.csv': csv(sweep.runs),
    'summary.json': json({ fits: sweep.fits, summaries: sweep.summaries }),
    'representative-records.json': '[\n' + sweep.representativeRecords.map(record => JSON.stringify(record)).join(',\n') + '\n]\n',
    'report.md': renderOperationSweepReport(sweep),
  };
  const output = path.join(ROOT, OUTPUT);
  if (!check) fs.mkdirSync(output, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(output, name);
    if (check) {
      if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== content) {
        throw new Error(`Evidence differs: ${OUTPUT}/${name}`);
      }
    } else fs.writeFileSync(target, content);
  }
  console.log(`${check ? 'Verified' : 'Generated'} ${sweep.runs.length} observations and ${sweep.fits.length} complete-set fit attempts in ${OUTPUT}.`);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
