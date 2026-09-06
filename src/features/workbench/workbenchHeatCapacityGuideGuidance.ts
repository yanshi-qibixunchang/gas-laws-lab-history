import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import type { HeatCapacityRealtimeCopy } from './workbenchHeatCapacityRealtimeCopy.ts';
import { getHeatCapacityStopcockState } from './workbenchHeatCapacityInstrumentState.ts';
import {
  getActiveTrialRecordedU1Mv,
  isGuideHeatCapacityReleaseCompleteForU2,
  isGuideHeatCapacityTemperatureAtAmbient,
  isGuideU0ZeroAttempted,
} from './workbenchHeatCapacityGuideDecisions.ts';
import {
  getHeatCapacityGuideStepControlId,
  type GuideHeatCapacityStep,
} from '../heatCapacity/heatCapacityGuideStepModel.ts';

export const getGuideStepGuidance = (
  step: GuideHeatCapacityStep,
  file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }> | undefined,
  settingsLanguagePreference: WorkbenchLanguagePreference,
  heatCapacityRealtimeCopy: HeatCapacityRealtimeCopy,
): { message: string; controlId: string | null } => {
  const isEn = settingsLanguagePreference === 'en';
  const isTw = settingsLanguagePreference === 'zh-TW';
  const zeroAdjustMessage = file && isGuideU0ZeroAttempted(file)
    ? isEn
      ? 'Uₚ is still not close to 0. Continue adjusting the pressure-zero knob.'
      : isTw
        ? '目前 Uₚ 仍未接近 0，請繼續調整壓強調零旋鈕。'
        : '当前 Uₚ 仍未接近 0，请继续调整压力调零旋钮。'
    : `${heatCapacityRealtimeCopy.guideUsageHints.zeroFocus}${heatCapacityRealtimeCopy.guideUsageHints.zeroAdjust}`;
  const temperatureReady = file ? isGuideHeatCapacityTemperatureAtAmbient(file) : false;
  const waitBeforeU1Message = isEn
    ? 'Keep the vessel sealed for 5 min; when the timer completes, record U₁ / Uₜ₁.'
    : isTw
      ? '請保持氣瓶封閉等待 5 min；計時到達後記錄 U₁ / Uₜ₁。'
      : '请保持气瓶封闭等待 5 min；计时到达后记录 U₁ / Uₜ₁。';
  const recordedU1Mv = file ? getActiveTrialRecordedU1Mv(file) : null;
  const releaseComplete = file ? isGuideHeatCapacityReleaseCompleteForU2(file, recordedU1Mv) : false;
  const stopcockState = file ? getHeatCapacityStopcockState(file.stopcockAngleDeg) : 'closed';
  const openReleaseMessage = releaseComplete
    ? isEn
      ? 'Close the glass stopcock after quick release.'
      : isTw
        ? '放氣完成，請關閉玻璃旋塞。'
        : '放气完成，请关闭玻璃旋塞。'
    : stopcockState === 'open'
      ? isEn
        ? 'Keep the glass stopcock open and wait for the release process to finish.'
        : isTw
          ? '請保持玻璃旋塞打開，等待放氣過程完成。'
          : '请保持玻璃旋塞打开，等待放气过程完成。'
      : isEn
        ? 'Open the glass stopcock for quick release.'
        : isTw
          ? '請打開玻璃旋塞進行快速放氣。'
          : '请打开玻璃旋塞进行快速放气。';
  const recoverMessage = isEn
    ? 'After closing the glass stopcock, wait 5 min; after thermal recovery, record U₂ / Uₜ₂.'
    : isTw
      ? '請關閉玻璃旋塞後等待 5 min；回溫穩定後記錄 U₂ / Uₜ₂。'
      : '请关闭玻璃旋塞后等待 5 min；回温稳定后记录 U₂ / Uₜ₂。';
  const releaseStateMessage = isEn
    ? 'Wait for the “whoosh” to end; once the gas release is complete, close the glass stopcock immediately.'
    : isTw
      ? '等待「咻」聲結束，氣體釋放完畢，請立即關閉玻璃旋塞。'
      : '等待“咻”声结束，气体释放完毕，请立即关闭玻璃旋塞。';
  const messages: Record<GuideHeatCapacityStep, string> = {
    idle: isEn ? 'Start guide mode when ready.' : isTw ? '需要時開始引導模式。' : '需要时开始引导模式。',
    powerOnRequired: isEn ? 'Turn on the power first.' : isTw ? '請先打開電源。' : '请先打开电源。',
    preheatRequired: isEn
      ? 'Keep the instrument powered while the sensor warm-up completes.'
      : isTw
        ? '請保持儀器通電，等待感測器預熱完成。'
        : '请保持仪器通电，等待传感器预热完成。',
    openStopcockForZeroRequired: isEn ? 'Open the glass stopcock before pressure zeroing.' : isTw ? '請先打開玻璃旋塞，再進行壓強差調零。' : '请先打开玻璃旋塞，再进行压强差调零。',
    zeroAdjustRequired: zeroAdjustMessage,
    recordU0Required: isEn ? 'Record U₀ before pressurizing.' : isTw ? '請先記錄 U₀，再開始加壓。' : '请先记录 U₀，再开始加压。',
    closeStopcockRequired: isEn ? 'Close the glass stopcock before pumping.' : isTw ? '請先關閉玻璃旋塞。' : '请先关闭玻璃旋塞。',
    openPumpValveRequired: heatCapacityRealtimeCopy.guideUsageHints.pumpValve,
    pumpRequired: heatCapacityRealtimeCopy.guideUsageHints.pumpAction,
    closePumpValveRequired: isEn ? 'Close the pump valve to start the sealed 5 min wait.' : isTw ? '請關閉打氣閥門，進入封閉 5 min 等待。' : '请关闭打气阀门，进入封闭 5 min 等待。',
    stabilizeBeforeReleaseRequired: waitBeforeU1Message,
    recordU1Required: heatCapacityRealtimeCopy.guideUsageHints.waitU1Ready,
    openStopcockReleaseRequired: openReleaseMessage,
    closeStopcockAfterReleaseRequired: releaseStateMessage,
    recoverRequired: recoverMessage,
    recordU2Required: heatCapacityRealtimeCopy.guideUsageHints.waitU2Ready,
    closePowerRequired: isEn ? 'Turn off the power to finish this guided experiment.' : isTw ? '請關閉電源，完成本次引導實驗。' : '请关闭电源，完成本次引导实验。',
    completed: isEn ? 'Guide experiment complete.' : isTw ? '引導實驗已完成。' : '引导实验已完成。',
  };
  return {
    message: messages[step],
    controlId: getHeatCapacityGuideStepControlId(step, { temperatureReady }),
  };
};

