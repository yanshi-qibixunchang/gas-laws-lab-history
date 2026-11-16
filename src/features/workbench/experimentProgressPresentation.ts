import type { PistonOscillationFreeSession } from '../../domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts';
import type { WorkbenchHeatCapacityState } from './workbenchHeatCapacityStateTypes.ts';
import { selectCurrentHeatCapacityFreeExperimentGroup } from '../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import { deriveHeatCapacityFreeBatchProgress } from '../../domain/heatCapacity/heatCapacityFreeBatchModel.ts';

export const EXPERIMENT_PROGRESS_COPY = {
  'zh-CN': { acquired: (n: number) => `本组采集已完成（${n}/${n}）`, completed: '本组实验已完成', calculation: '待计算', legacy: '历史记录 · 不完整（只读）', setup: '待设置实验', saved: (n: number, h: number) => `已保存：第 ${n} 次 · ${h} mm`, heat: '绝热膨胀法', piston: '活塞振动法', free: '自由模式', guide: '引导模式', demo: '演示模式', ready: '待开始', pending: '记录完成 · 待保存' },
  'zh-TW': { acquired: (n: number) => `本組採集已完成（${n}/${n}）`, completed: '本組實驗已完成', calculation: '待計算', legacy: '歷史紀錄 · 不完整（唯讀）', setup: '待設定實驗', saved: (n: number, h: number) => `已儲存：第 ${n} 次 · ${h} mm`, heat: '絕熱膨脹法', piston: '活塞振動法', free: '自由模式', guide: '引導模式', demo: '示範模式', ready: '待開始', pending: '記錄完成 · 待儲存' },
  en: { acquired: (n: number) => `Group acquisition complete (${n}/${n})`, completed: 'Experiment group complete', calculation: 'Calculation pending', legacy: 'Incomplete historical record (read-only)', setup: 'Experiment setup pending', saved: (n: number, h: number) => `Saved: run ${n} · ${h} mm`, heat: 'Adiabatic expansion', piston: 'Piston oscillation', free: 'Free mode', guide: 'Guided mode', demo: 'Demo mode', ready: 'Not started', pending: 'Recording complete · Not saved' },
} as const;
export type ProgressLanguage = keyof typeof EXPERIMENT_PROGRESS_COPY;

/** A replacement still in progress is not a completed plan, even if its old record remains. */
export const getPistonFreeAcquisitionSummary = (session: PistonOscillationFreeSession | null | undefined) => {
  const targets = session?.experimentPlan?.targets ?? [];
  const records = session?.savedMeasurements ?? [];
  const complete = targets.length > 0 && !session?.reacquisition && targets.every((target, index) =>
    records.some(record => record.measurementIndex === index &&
      record.targetHeightMm === target.heightMm &&
      (!session?.savedMeasurementTargetIds[record.recordId] || session.savedMeasurementTargetIds[record.recordId] === target.targetId)));
  const lastSaved = complete ? records.reduce<(typeof records)[number] | null>((latest, record) =>
    !latest || record.capturedAtMs >= latest.capturedAtMs ? record : latest, null) : null;
  return { complete, total: targets.length, lastSaved };
};

export const getHeatGroupCompletionLabel = (file: WorkbenchHeatCapacityState, language: ProgressLanguage): string | null => {
  const copy = EXPERIMENT_PROGRESS_COPY[language];
  if (file.heatCapacityMode !== 'free') return file.heatCapacityMode && file.heatCapacityTeachingStatus === 'completed' ? copy.completed : null;
  const group = selectCurrentHeatCapacityFreeExperimentGroup(file.heatCapacityFreeExperimentGroups);
  if (group?.status === 'legacy-incomplete-readonly') return copy.legacy;
  if (group?.status === 'completed') return copy.completed;
  if (group && (group.status.startsWith('awaiting-') || deriveHeatCapacityFreeBatchProgress(group.runSeries.batch, group.runSeries.trials).allGroupsRecorded)) {
    return `${copy.acquired(group.targetExperimentCount)} · ${copy.calculation}`;
  }
  return null;
};
