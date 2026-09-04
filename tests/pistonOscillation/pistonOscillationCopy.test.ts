import assert from 'node:assert/strict';
import {
  PISTON_OSCILLATION_LANGUAGES,
  PISTON_OSCILLATION_SHELL_COPY,
  getPistonOscillationShellCopy,
} from '../../src/features/pistonOscillation/pistonOscillationCopy.ts';

assert.deepEqual(PISTON_OSCILLATION_LANGUAGES, ['zh-CN', 'zh-TW', 'en']);

const expectedHandCopy = {
  'zh-CN': { left: '左手（Space）', right: '右手（鼠标左键）' },
  'zh-TW': { left: '左手（Space）', right: '右手（滑鼠左鍵）' },
  en: { left: 'left hand (Space)', right: 'right hand (left mouse button)' },
} as const;

const expectedGuideCopy = {
  'zh-CN': {
    adjustHeightDetail: '双击顶部平台进入聚焦；用右手（鼠标左键）拖至 70 mm。松开右手前，用左手（Space）托住平台，再确认高度。',
    lockScrewDetail: '持续用左手（Space）托住顶部平台，并用右手（鼠标左键）在左上操作镜中顺时针旋紧侧面锁紧螺钉；达到功能锁紧后再松开左手（Space）。',
    loosenScrewDetail: '软管接通后，双击顶部平台进入聚焦，再在左上操作镜中逆时针旋松侧面锁紧螺钉，使活塞在密封状态下自由运动。',
    releasePistonDetail: '双击顶部平台进入聚焦；让左手（Space）与右手（鼠标左键）全部就位，双手下压顶部平台，再同时松开双手。',
    completedTitle: '数据处理与计算已完成',
    completedDetail: '80、70、60 mm 三次测量、周期预处理、线性拟合与结果计算均已完成，全部过程和结果已保存。引导模式使用三组不同高度的数据，帮助你以最简流程体验一次完整拟合；在正式实验或自由模式中，建议采集更多不同高度的数据点，以减小随机波动和个别异常数据对拟合的影响，提高斜率、截距及最终计算结果的稳定性和可信度。',
    completionToastKicker: '系统',
    completionToast: '引导模式已结束',
  },
  'zh-TW': {
    adjustHeightDetail: '雙擊頂部平台進入聚焦；用右手（滑鼠左鍵）拖至 70 mm。鬆開右手前，用左手（Space）托住平台，再確認高度。',
    lockScrewDetail: '持續用左手（Space）托住頂部平台，並用右手（滑鼠左鍵）在左上操作鏡中順時針旋緊側面鎖緊螺釘；達到功能鎖緊後再鬆開左手（Space）。',
    loosenScrewDetail: '軟管接通後，雙擊頂部平台進入聚焦，再在左上操作鏡中逆時針旋鬆側面鎖緊螺釘，使活塞在密封狀態下自由運動。',
    releasePistonDetail: '雙擊頂部平台進入聚焦；讓左手（Space）與右手（滑鼠左鍵）全部就位，雙手下壓頂部平台，再同時鬆開雙手。',
    completedTitle: '資料處理與計算已完成',
    completedDetail: '80、70、60 mm 三次測量、週期預處理、線性擬合與結果計算均已完成，全部過程與結果已儲存。引導模式使用三組不同高度的資料，協助你以最簡流程體驗一次完整擬合；在正式實驗或自由模式中，建議採集更多不同高度的資料點，以減小隨機波動和個別異常資料對擬合的影響，提高斜率、截距及最終計算結果的穩定性和可信度。',
    completionToastKicker: '系統',
    completionToast: '引導模式已結束',
  },
  en: {
    adjustHeightDetail: 'Double-click the platform. Drag it to 70 mm with the right hand (left mouse button). Hold it with the left hand (Space) before releasing the mouse, then confirm the height.',
    lockScrewDetail: 'Keep the left hand (Space) supporting the top platform and use the right hand (left mouse button) to turn the side locking screw clockwise in the upper-left operation mirror. Release the left hand (Space) only after the screw is functionally locked.',
    loosenScrewDetail: 'After reconnecting the hose, double-click the top platform to enter focus mode. Then turn the side locking screw counterclockwise in the upper-left operation mirror so the piston can move freely in the sealed system.',
    releasePistonDetail: 'Double-click the top platform to enter focus mode. Put the left hand (Space) and right hand (left mouse button) in place, press the top platform with both hands, then release both hands at the same time.',
    completedTitle: 'Data processing and calculations complete',
    completedDetail: 'The measurements at 80, 70, and 60 mm, period preprocessing, linear fit, and result calculations are complete, and the full process and results have been saved. Guided mode uses three different heights to demonstrate a complete fit with the simplest workflow. In a formal experiment or Free mode, collect more data points at different heights to reduce the influence of random variation and isolated outliers, and to improve the stability and credibility of the fitted slope, intercept, and final result.',
    completionToastKicker: 'SYSTEM',
    completionToast: 'Guided mode has ended',
  },
} as const;

const expectedScrewDirectionCopy = {
  'zh-CN': { tighten: /顺时针/, loosen: /逆时针/ },
  'zh-TW': { tighten: /順時針/, loosen: /逆時針/ },
  en: { tighten: /clockwise/i, loosen: /counterclockwise/i },
} as const;

for (const language of PISTON_OSCILLATION_LANGUAGES) {
  const copy = getPistonOscillationShellCopy(language);
  assert.equal(copy, PISTON_OSCILLATION_SHELL_COPY[language]);
  assert.ok(copy.experimentName.length > 0);
  assert.ok(copy.methodName.length > 0);
  assert.ok(copy.preview.ariaLabel.length > 0);
  assert.match(copy.acquisition.qualityUpperLine(130), /130/);
  assert.match(copy.acquisition.pressureIndicator(120.26), /120\.26/);
  assert.ok(copy.unavailable.rightSidebar.length > 0);
  assert.deepEqual(copy.hands, expectedHandCopy[language]);
  assert.equal(copy.lesson.pages.length, 4);
  assert.ok(copy.lesson.pages.every((page) => page.title.length > 0 && page.body.length > 0));
  assert.ok(copy.recovery.supportLostBody(80).includes(copy.hands.left));
  assert.ok(copy.recovery.supportLostBody(80).includes(copy.hands.right));
  assert.ok(copy.recovery.wrongHeightBody(80).includes(copy.hands.left));
  assert.ok(copy.recovery.wrongHeightBody(80).includes(copy.hands.right));
  assert.ok(copy.feedback.leftHandBeforeDisconnect.includes(copy.hands.left));
  assert.ok(copy.feedback.leftHandBeforeDisconnect.includes(copy.hands.right));
  assert.ok(copy.feedback.bothHandsBeforePress.includes(copy.hands.left));
  assert.ok(copy.feedback.bothHandsBeforePress.includes(copy.hands.right));
  for (const localizedInteractionLabel of [
    copy.interaction.lockedStatus,
    copy.interaction.looseStatus,
    copy.interaction.scaleReadingTitle,
    copy.interaction.heightAdjustmentTitle,
    copy.interaction.pistonFocusTitle,
    copy.interaction.hoseFocusTitle,
    copy.interaction.hoseLabel,
    copy.interaction.scaleReadingMirrorAria,
    copy.interaction.lockingScrewMirrorAria,
    copy.interaction.screwTightenDirectionAria,
    copy.interaction.screwLoosenDirectionAria,
  ]) {
    assert.ok(localizedInteractionLabel.length > 0);
  }
  for (const statusCopy of [
    copy.interaction.waitingBothHands,
    copy.interaction.oneHandReady,
    copy.interaction.handoffInProgress,
    copy.interaction.platformSupported,
    copy.interaction.oneHandHolding,
    copy.interaction.bothHandsPressing,
    copy.interaction.handStatusLabel,
    copy.interaction.bothHandsStatusLabel,
  ]) {
    assert.ok(statusCopy.includes(copy.hands.left));
    assert.ok(statusCopy.includes(copy.hands.right));
  }
  assert.ok(copy.guide.parameterSetupTitle.length > 0);
  assert.match(copy.guide.adjustHeightTitle(80), /80/);
  assert.match(copy.guide.adjustHeightDetail(80), /80/);
  assert.ok(copy.guide.adjustHeightDetail(80).includes(copy.hands.left));
  assert.ok(copy.guide.adjustHeightDetail(80).includes(copy.hands.right));
  assert.deepEqual(
    {
      adjustHeightDetail: copy.guide.adjustHeightDetail(70),
      lockScrewDetail: copy.guide.lockScrewDetail,
      loosenScrewDetail: copy.guide.loosenScrewDetail,
      releasePistonDetail: copy.guide.releasePistonDetail,
      completedTitle: copy.guide.completedTitle,
      completedDetail: copy.guide.completedDetail,
      completionToastKicker: copy.guide.completionToastKicker,
      completionToast: copy.guide.completionToast,
    },
    expectedGuideCopy[language],
    `${language} should preserve the approved focus and completion wording`,
  );
  const directionCopy = expectedScrewDirectionCopy[language];
  for (const tightenCopy of [
    copy.interaction.screwTightenDirectionAria,
    copy.interaction.screwTightenDirectionLabel,
    copy.guide.lockScrewDetail,
    copy.guide.screwWrongDirectionTighten,
    copy.guide.screwBoundaryBlockedTighten,
  ]) {
    assert.match(
      tightenCopy,
      directionCopy.tighten,
      `${language} should identify clockwise tightening in every Guide cue level`,
    );
  }
  for (const loosenCopy of [
    copy.interaction.screwLoosenDirectionAria,
    copy.interaction.screwLoosenDirectionLabel,
    copy.guide.loosenScrewDetail,
    copy.guide.screwWrongDirectionLoosen,
    copy.guide.screwBoundaryBlockedLoosen,
  ]) {
    assert.match(
      loosenCopy,
      directionCopy.loosen,
      `${language} should identify counterclockwise loosening in every Guide cue level`,
    );
  }
  assert.notEqual(copy.guide.screwWrongDirectionTighten, copy.guide.screwBoundaryBlockedTighten);
  assert.notEqual(copy.guide.screwWrongDirectionLoosen, copy.guide.screwBoundaryBlockedLoosen);
  for (const key of [
    'lockScrewTitle',
    'reconnectHoseTitle',
    'loosenScrewTitle',
    'startAcquisitionTitle',
    'releasePistonTitle',
    'recordingTitle',
    'pauseRecordingTitle',
    'crossRunDisconnectTitle',
    'completedTitle',
  ] as const) {
    assert.ok(copy.guide[key].length > 0, `${language} should localize Guide copy ${key}`);
  }
  for (const measurementNumber of [1, 2, 3]) {
    assert.match(copy.guide.saveCurveTitle(measurementNumber), new RegExp(`${measurementNumber}`));
    assert.match(copy.guide.saveCurveDetail(measurementNumber), new RegExp(`${measurementNumber}`));
  }
  assert.match(copy.guide.completedDetail, /80[\s\S]*70[\s\S]*60/);
  for (const value of [
    copy.guide.pressureTooLowFeedback,
    copy.guide.pressureTooHighFeedback,
    copy.guide.pressureTooLowStrongReminder,
    copy.guide.pressureTooHighStrongReminder,
    copy.guide.pressureRangeLessonTitle,
    copy.guide.pressureRangeLessonBody,
    copy.guide.lockingScrewLessonTitle,
    copy.guide.lockingScrewLessonBody,
    copy.guide.screwWrongDirectionTighten,
    copy.guide.screwWrongDirectionLoosen,
    copy.guide.screwBoundaryBlockedTighten,
    copy.guide.screwBoundaryBlockedLoosen,
    copy.guide.multiPeriodLessonTitle,
    copy.guide.multiPeriodLessonBody,
  ]) {
    assert.ok(value.length > 0, `${language} should localize the pressure and period lessons`);
  }
  assert.match(copy.guide.pressureRangeLessonBody, /120[\s\S]*130/);
  assert.match(copy.guide.multiPeriodLessonBody, /1000[\s\S]*0\.001[\s\S]*t₂[\s\S]*t₁/);
  assert.match(
    copy.processing.selectionReminder,
    language === 'zh-CN' ? /至少两个/ : language === 'zh-TW' ? /至少兩個/ : /at least two/i,
    `${language} should state the new two-period Guide minimum`,
  );
  assert.ok(
    copy.processing.unstableSelection.length > 0,
    `${language} should explain an unstable primary-period selection`,
  );
  assert.doesNotMatch(
    copy.guide.multiPeriodLessonBody,
    /t_[12]|T\^2|\\frac|\$\$/,
    `${language} must not expose source-style formula markup to the user`,
  );
  assert.equal('pauseGuide' in copy.modes, false);
  assert.equal('resumeGuide' in copy.modes, false);
  assert.ok(copy.modes.resetGuide.length > 0);
  assert.ok(copy.modes.exitGuide.length > 0);
  assert.match(copy.demoPresentation.stepCounter(1, 3), /1/);
  assert.match(copy.demoPresentation.stepCounter(1, 3), /3/);
  for (const value of [
    copy.demoPresentation.completed,
    copy.demoPresentation.terminated,
    copy.demoPresentation.running,
    copy.demoPresentation.completedStatus,
    copy.demoPresentation.terminatedStatus,
    copy.demoPresentation.targetLabel,
    copy.demoPresentation.criterionLabel,
    copy.demoPresentation.observationLabel,
    copy.demoPresentation.instrumentOperation,
  ]) {
    assert.ok(value.length > 0, `${language} should localize the demonstration presentation`);
  }
  assert.ok(copy.acquisition.title.length > 0);
  assert.doesNotMatch(copy.acquisition.measurement(1, 6), /Run/i);
  assert.doesNotMatch(copy.processing.wheelHint, /Shift/);
  assert.match(copy.processing.wheelHint, /Ctrl/);
  assert.match(copy.processing.moveTool, /[（(]Shift[）)]/);
  assert.match(copy.processing.selectTool, /[（(]Shift[）)]/);
  assert.match(copy.processing.selectionToolReminder, /Shift/);
  assert.ok(copy.processing.horizontalScrollbar.length > 0);
  assert.equal('supportPlatformTitle' in copy.guide, false);
  assert.equal('supportPlatformDetail' in copy.guide, false);
}

assert.match(
  PISTON_OSCILLATION_SHELL_COPY['zh-CN'].guide.crossRunDisconnectDetail,
  /保持左手（Space）[\s\S]*右手（鼠标左键）[\s\S]*拖出白色接头/,
);

assert.equal(
  PISTON_OSCILLATION_SHELL_COPY['zh-CN'].lesson.pages[2]?.body,
  '本实验需要两只手协同操作。软件使用左手（Space）模拟托住顶部平台，使用右手（鼠标左键）模拟抓取、拖动和按压顶部平台，以及操作压力传感器软管与侧面锁紧螺钉。调节高度可以分多次完成：只要左手（Space）或右手（鼠标左键）仍在托住平台，交接就是有效的。移开右手（鼠标左键）去确认高度或操作螺钉前，应先用左手（Space）接住平台，并一直保持到螺钉锁紧。引导模式中若两只手同时离开，仪器会动态复位到 0 mm 并暂停显示说明；自由模式中平台则按真实物理下落。',
);
const expectedMinimumHeightLesson = {
  'zh-CN': {
    title: '为什么最低从 30 mm 开始',
    body: '在 10、20 mm 时，密闭气体的有效体积较小。在本软件采用统一按压操作和采集判据的前提下，相同的活塞位移会造成更大的相对体积变化和压强变化，更容易偏离分析所要求的小振幅条件；振动周期也更短，周期读取更容易受到按压差异和选点误差影响。为使曲线清晰、各次测量更易重复，当前流程从 30 mm 开始取点。',
  },
  'zh-TW': {
    title: '為什麼最低從 30 mm 開始',
    body: '在 10、20 mm 時，密閉氣體的有效體積較小。在本軟體採用統一按壓操作和採集判據的前提下，相同的活塞位移會造成更大的相對體積變化和壓強變化，更容易偏離分析所要求的小振幅條件；振動週期也更短，週期讀取更容易受到按壓差異和選點誤差影響。為使曲線清楚、各次測量更易重複，目前流程從 30 mm 開始取點。',
  },
  en: {
    title: 'Why measurements begin at 30 mm',
    body: 'At 10 and 20 mm, the effective volume of the sealed gas is small. With the common pressing action and acquisition criteria used in this software, the same piston displacement produces larger fractional changes in volume and pressure, making it easier to leave the small-amplitude regime required by the analysis. The oscillation period is also shorter, so period measurements become more sensitive to differences in the press and point selection. To keep the curves clear and the measurements repeatable, the current procedure begins at 30 mm.',
  },
} as const;
for (const language of PISTON_OSCILLATION_LANGUAGES) {
  assert.deepEqual(PISTON_OSCILLATION_SHELL_COPY[language].lesson.pages[1], expectedMinimumHeightLesson[language]);
}
assert.equal(
  PISTON_OSCILLATION_SHELL_COPY['zh-CN'].recovery.continueHint,
  '点击空白区域来继续',
);

assert.equal(PISTON_OSCILLATION_SHELL_COPY['zh-CN'].acquisition.measurement(1, 6), '第 1 次测量 · 共 6 次');
assert.equal(PISTON_OSCILLATION_SHELL_COPY['zh-TW'].acquisition.measurement(2, 6), '第 2 次測量 · 共 6 次');
assert.equal(PISTON_OSCILLATION_SHELL_COPY.en.acquisition.measurement(3, 6), 'Measurement 3 of 6');

const expectedPreviewStateCopy = {
  'zh-CN': {
    loadingTitle: '正在加载仪器模型',
    loadingBody: '正在从本地实验资源中载入活塞振动装置。',
    loadErrorTitle: '3D 模型加载失败',
    loadErrorBody: '当前实验仍可安全关闭；请检查本地模型文件后重新打开。',
    restoreDefaultView: '默认视角',
  },
  'zh-TW': {
    loadingTitle: '正在載入儀器模型',
    loadingBody: '正在從本機實驗資源中載入活塞振動裝置。',
    loadErrorTitle: '3D 模型載入失敗',
    loadErrorBody: '目前實驗仍可安全關閉；請檢查本機模型檔案後重新開啟。',
    restoreDefaultView: '預設視角',
  },
  en: {
    loadingTitle: 'Loading instrument model',
    loadingBody: 'Loading the piston-oscillation apparatus from local experiment resources.',
    loadErrorTitle: '3D model failed to load',
    loadErrorBody: 'The experiment can be closed safely. Check the local model file, then reopen it.',
    restoreDefaultView: 'Default view',
  },
} as const;

for (const language of PISTON_OSCILLATION_LANGUAGES) {
  const preview = getPistonOscillationShellCopy(language).preview;
  assert.deepEqual(
    {
      loadingTitle: preview.loadingTitle,
      loadingBody: preview.loadingBody,
      loadErrorTitle: preview.loadErrorTitle,
      loadErrorBody: preview.loadErrorBody,
      restoreDefaultView: preview.restoreDefaultView,
    },
    expectedPreviewStateCopy[language],
    `${language} must provide complete loading, error, and reset-view copy`,
  );
}

console.log('pistonOscillationCopy tests passed');
