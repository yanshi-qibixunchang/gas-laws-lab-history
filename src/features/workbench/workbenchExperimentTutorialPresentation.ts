import { type WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import { getExperimentTutorialMilestoneLogs } from '../learning/workbenchTutorialCoordinator.ts';
import { type ExperimentLearningMilestone } from '../learning/experimentLearningModel.ts';
import { type ConsoleLog, createConsoleLog } from './workbenchConsolePresentation.ts';

export type ExperimentTutorialNoticeKind =
  | 'start-demo'
  | 'resume-demo'
  | 'guide-unlocked'
  | 'resume-guide'
  | 'all-unlocked';

export const EXPERIMENT_TUTORIAL_COPY: Record<WorkbenchLanguagePreference, {
  settingsTitle: string;
  settingsHint: string;
  replayIntroLabel: string;
  replayIntroHint: string;
  reselectNeedsLabel: string;
  reselectNeedsHint: string;
  simulateFirstRunLabel: string;
  simulateFirstRunHint: string;
  simulateFirstRunTitle: string;
  simulateFirstRunBody: string;
  confirmSimulateFirstRun: string;
  resetLabel: string;
  resetHint: string;
  resetDisabledHint: string;
  exitTutorialLabel: string;
  exitTutorialHint: string;
  exitTutorialBody: string;
  exitTutorialConsequence: string;
  confirmExitTutorial: string;
  resetEyebrow: string;
  resetBody: string;
  resetConsequence: string;
  cancel: string;
  confirmReset: string;
  blockedEyebrow: string;
  blockedTitle: string;
  blockedBody: string;
  acknowledge: string;
  startDemoTitle: string;
  startDemoBody: string;
  resumeDemoTitle: string;
  resumeDemoBody: string;
  guideUnlockedTitle: string;
  guideUnlockedBody: string;
  resumeGuideTitle: string;
  resumeGuideBody: string;
  allUnlockedTitle: string;
  allUnlockedBody: string;
  operationFailedTitle: string;
  retry: string;
  remoteTitle: string;
  remoteBody: string;
  recheck: string;
  browserRemoteBody: string;
  continueHere: string;
}> = {
  'zh-CN': {
    settingsTitle: '学习与引导',
    settingsHint: '管理实验学习进度；现有实验数据不会被删除。',
    replayIntroLabel: '重新观看产品介绍',
    replayIntroHint: '只播放欢迎动画和产品卡片，不改变许可与学习进度',
    reselectNeedsLabel: '重新选择学习需求',
    reselectNeedsHint: '分别确认两个实验是否需要逐步引导',
    simulateFirstRunLabel: '模拟首次启动',
    simulateFirstRunHint: '仅开发预览可见；保留实验文件并在刷新后重走首次流程',
    simulateFirstRunTitle: '模拟一次全新的首次启动？',
    simulateFirstRunBody: '当前实验文件会先安全保存；首次流程、许可确认和学习状态将被清除。',
    confirmSimulateFirstRun: '保存并重新启动',
    resetLabel: '重置绝热膨胀学习进度',
    resetHint: '重新体验演示、引导与全部模式解锁流程',
    resetDisabledHint: '当前正在进行实验学习流程',
    exitTutorialLabel: '退出新手教程',
    exitTutorialHint: '停止逐步解锁，并立即开放本实验的全部模式',
    exitTutorialBody: '当前教程将结束，演示、引导和自由模式会全部解锁。',
    exitTutorialConsequence: '临时教程文件会被移除；现有实验文件不会丢失，并会恢复为可打开状态。',
    confirmExitTutorial: '退出并解锁全部模式',
    resetEyebrow: '学习进度',
    resetBody: '开始后，现有实验文件会暂时无法打开，直到完成当前学习流程。',
    resetConsequence: '现有文件不会被删除、清理或丢失；完成学习后可重新打开。',
    cancel: '取消',
    confirmReset: '开始学习流程',
    blockedEyebrow: '学习流程进行中',
    blockedTitle: '该操作暂时不可用',
    blockedBody: '完成当前学习流程后即可使用其他实验文件',
    acknowledge: '我知道了',
    startDemoTitle: '您当前只可以使用演示模式',
    startDemoBody: '先观看一次完整演示；演示结束后将自动解锁引导模式。',
    resumeDemoTitle: '继续完成演示模式',
    resumeDemoBody: '上次已进入演示学习阶段，本次将从演示模式第一步重新开始。',
    guideUnlockedTitle: '您已经解锁了引导模式',
    guideUnlockedBody: '接下来请按引导完成实验操作和数据处理。',
    resumeGuideTitle: '继续完成引导模式',
    resumeGuideBody: '上次已解锁引导模式，本次将从引导模式第一步重新开始。',
    allUnlockedTitle: '您已经解锁自由模式和全部模式',
    allUnlockedBody: '现在可以打开旧有文件、新建其他实验文件，也可以在当前新文件中自由选择实验模式。',
    operationFailedTitle: '学习流程未能安全更新',
    retry: '重试',
    remoteTitle: '学习流程已在另一个窗口中打开',
    remoteBody: '当前窗口已暂停实验文件操作。请在正在进行学习流程的窗口中完成教程。',
    recheck: '重新检查',
    browserRemoteBody: '如果原窗口仍可使用，请在原窗口继续；如果已经关闭，可在当前窗口接管并从当前解锁阶段重新开始。',
    continueHere: '在当前窗口继续',
  },
  'zh-TW': {
    settingsTitle: '學習與引導',
    settingsHint: '管理實驗學習進度；現有實驗資料不會被刪除。',
    replayIntroLabel: '重新觀看產品介紹',
    replayIntroHint: '只播放歡迎動畫與產品卡片，不變更授權與學習進度',
    reselectNeedsLabel: '重新選擇學習需求',
    reselectNeedsHint: '分別確認兩個實驗是否需要逐步引導',
    simulateFirstRunLabel: '模擬首次啟動',
    simulateFirstRunHint: '僅開發預覽可見；保留實驗檔案並於重新整理後重走首次流程',
    simulateFirstRunTitle: '模擬一次全新的首次啟動？',
    simulateFirstRunBody: '目前實驗檔案會先安全儲存；首次流程、授權確認與學習狀態將被清除。',
    confirmSimulateFirstRun: '儲存並重新啟動',
    resetLabel: '重設絕熱膨脹學習進度',
    resetHint: '重新體驗演示、引導與全部模式解鎖流程',
    resetDisabledHint: '目前正在進行實驗學習流程',
    exitTutorialLabel: '退出新手教學',
    exitTutorialHint: '停止逐步解鎖，並立即開放本實驗的全部模式',
    exitTutorialBody: '目前教學將結束，演示、引導與自由模式會全部解鎖。',
    exitTutorialConsequence: '臨時教學檔案會被移除；現有實驗檔案不會遺失，並會恢復為可開啟狀態。',
    confirmExitTutorial: '退出並解鎖全部模式',
    resetEyebrow: '學習進度',
    resetBody: '開始後，現有實驗檔案會暫時無法開啟，直到完成目前學習流程。',
    resetConsequence: '現有檔案不會被刪除、清理或遺失；完成學習後可重新開啟。',
    cancel: '取消',
    confirmReset: '開始學習流程',
    blockedEyebrow: '學習流程進行中',
    blockedTitle: '此操作暫時無法使用',
    blockedBody: '完成目前學習流程後即可使用其他實驗檔案',
    acknowledge: '我知道了',
    startDemoTitle: '您目前只可以使用演示模式',
    startDemoBody: '先觀看一次完整演示；演示結束後將自動解鎖引導模式。',
    resumeDemoTitle: '繼續完成演示模式',
    resumeDemoBody: '上次已進入演示學習階段，本次將從演示模式第一步重新開始。',
    guideUnlockedTitle: '您已經解鎖了引導模式',
    guideUnlockedBody: '接下來請依引導完成實驗操作與資料處理。',
    resumeGuideTitle: '繼續完成引導模式',
    resumeGuideBody: '上次已解鎖引導模式，本次將從引導模式第一步重新開始。',
    allUnlockedTitle: '您已經解鎖自由模式與全部模式',
    allUnlockedBody: '現在可以開啟舊有檔案、建立其他實驗檔案，也可以在目前新檔案中自由選擇實驗模式。',
    operationFailedTitle: '學習流程未能安全更新',
    retry: '重試',
    remoteTitle: '學習流程已在另一個視窗中開啟',
    remoteBody: '目前視窗已暫停實驗檔案操作。請在正在進行學習流程的視窗中完成教學。',
    recheck: '重新檢查',
    browserRemoteBody: '如果原視窗仍可使用，請在原視窗繼續；如果已經關閉，可在目前視窗接管並從目前解鎖階段重新開始。',
    continueHere: '在目前視窗繼續',
  },
  en: {
    settingsTitle: 'Learning & Guidance',
    settingsHint: 'Manage experiment learning progress without deleting existing data.',
    replayIntroLabel: 'Replay product introduction',
    replayIntroHint: 'Play only the welcome and product cards without changing consent or progress',
    reselectNeedsLabel: 'Reselect learning needs',
    reselectNeedsHint: 'Choose guided learning separately for both experiments',
    simulateFirstRunLabel: 'Simulate first launch',
    simulateFirstRunHint: 'Development preview only; keep experiment files and replay first setup after reload',
    simulateFirstRunTitle: 'Simulate a completely new first launch?',
    simulateFirstRunBody: 'Experiment files will be saved first. First-run, consent, and learning state will then be cleared.',
    confirmSimulateFirstRun: 'Save and restart',
    resetLabel: 'Reset adiabatic-expansion learning progress',
    resetHint: 'Replay the Demo, Guide, and full-mode unlock sequence',
    resetDisabledHint: 'An experiment learning flow is currently active',
    exitTutorialLabel: 'Exit beginner tutorial',
    exitTutorialHint: 'Stop progressive unlocking and make every mode available now',
    exitTutorialBody: 'The current tutorial will end and Demo, Guide, and Free modes will all be unlocked.',
    exitTutorialConsequence: 'The temporary tutorial file will be removed. Existing experiment files will remain safe and become available again.',
    confirmExitTutorial: 'Exit and unlock all modes',
    resetEyebrow: 'Learning progress',
    resetBody: 'Existing experiment files will be temporarily unavailable until this learning flow is complete.',
    resetConsequence: 'Existing files will not be deleted, cleared, or lost; they can be opened again afterward.',
    cancel: 'Cancel',
    confirmReset: 'Start learning flow',
    blockedEyebrow: 'Learning flow active',
    blockedTitle: 'This action is temporarily unavailable',
    blockedBody: 'Complete the current learning flow to use other experiment files.',
    acknowledge: 'OK',
    startDemoTitle: 'Only Demo mode is currently available',
    startDemoBody: 'Watch one complete demonstration. Guide mode will unlock automatically afterward.',
    resumeDemoTitle: 'Continue Demo mode',
    resumeDemoBody: 'The Demo stage was previously started and will restart from its first step.',
    guideUnlockedTitle: 'Guide mode is now unlocked',
    guideUnlockedBody: 'Next, follow the guidance to complete the experiment and data processing.',
    resumeGuideTitle: 'Continue Guide mode',
    resumeGuideBody: 'Guide mode was previously unlocked and will restart from its first step.',
    allUnlockedTitle: 'Free mode and all modes are now unlocked',
    allUnlockedBody: 'You can now open older files, create experiments, and choose any mode in the new current file.',
    operationFailedTitle: 'The learning flow could not be updated safely',
    retry: 'Retry',
    remoteTitle: 'The learning flow is open in another window',
    remoteBody: 'Experiment-file actions are paused here. Complete the tutorial in the window that owns it.',
    recheck: 'Check again',
    browserRemoteBody: 'Continue in the original window if it is still available. If it was closed, take over here and restart the current unlocked stage.',
    continueHere: 'Continue in this window',
  },
};

export const getExperimentTutorialLogMessage = (
  id: ReturnType<typeof getExperimentTutorialMilestoneLogs>[number]['id'],
  language: WorkbenchLanguagePreference,
) => {
  if (language === 'en') {
    if (id === 'demo-started') return 'Demonstration tutorial started.';
    if (id === 'guide-unlocked') return 'Guide mode unlocked.';
    return 'Free mode and all experiment modes unlocked.';
  }
  if (language === 'zh-TW') {
    if (id === 'demo-started') return '演示教學開始';
    if (id === 'guide-unlocked') return '引導模式已解鎖';
    return '自由模式與全部模式已解鎖';
  }
  if (id === 'demo-started') return '演示教程开始';
  if (id === 'guide-unlocked') return '引导模式解锁';
  return '自由模式和全部模式解锁';
};

export const createExperimentTutorialLogs = (
  milestone: ExperimentLearningMilestone,
  language: WorkbenchLanguagePreference,
): ConsoleLog[] => getExperimentTutorialMilestoneLogs(milestone).map((entry, index) => (
  createConsoleLog(
    index + 1,
    entry.kind,
    (nextLanguage) => getExperimentTutorialLogMessage(entry.id, nextLanguage),
    language,
  )
));
