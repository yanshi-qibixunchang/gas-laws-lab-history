export const PISTON_OSCILLATION_LANGUAGES = ['zh-CN', 'zh-TW', 'en'] as const;

export type PistonOscillationLanguage = typeof PISTON_OSCILLATION_LANGUAGES[number];

export interface PistonOscillationShellCopy {
  experimentName: string;
  methodName: string;
  preview: {
    ariaLabel: string;
    loadingTitle: string;
    loadingBody: string;
    loadErrorTitle: string;
    loadErrorBody: string;
    restoreDefaultView: string;
  };
  unavailable: {
    rightSidebar: string;
  };
  modes: {
    demo: string;
    guide: string;
    free: string;
    pauseDemo: string;
    resumeDemo: string;
    stopDemo: string;
    exitDemo: string;
    resetGuide: string;
    exitGuide: string;
    exitFree: string;
  };
  demoPresentation: {
    stepCounter: (current: number, total: number) => string;
    completed: string;
    terminated: string;
    running: string;
    paused: string;
    completedStatus: string;
    pausedStatus: string;
    terminatedStatus: string;
    targetLabel: string;
    criterionLabel: string;
    observationLabel: string;
    instrumentOperation: string;
  };
  hands: {
    left: string;
    right: string;
  };
  lesson: {
    buttonLabel: string;
    label: string;
    pages: readonly {
      title: string;
      body: string;
    }[];
    close: string;
  };
  recovery: {
    label: string;
    supportLostTitle: string;
    supportLostBody: (heightMm: number) => string;
    wrongHeightTitle: string;
    wrongHeightBody: (heightMm: number) => string;
    continueHint: string;
  };
  feedback: {
    wrongStep: string;
    targetHeightRequired: (heightMm: number) => string;
    leftHandBeforeLock: string;
    releaseRightHandBeforeLock: string;
    leftHandBeforeDisconnect: string;
    bothHandsBeforePress: string;
  };
  interaction: {
    focusEntryAria: string;
    lockedHints: readonly string[];
    disconnectedHints: readonly string[];
    connectedHints: readonly string[];
    overviewHints: readonly string[];
    hoseInRange: string;
    hoseOutsideRange: string;
    hoseConnected: string;
    hoseDisconnected: string;
    lockedStatus: string;
    looseStatus: string;
    scaleReadingTitle: string;
    heightAdjustmentTitle: string;
    pistonFocusTitle: string;
    hoseFocusTitle: string;
    hoseLabel: string;
    scaleReadingMirrorAria: string;
    lockingScrewMirrorAria: string;
    screwTightenDirectionAria: string;
    screwLoosenDirectionAria: string;
    screwTightenDirectionLabel: string;
    screwLoosenDirectionLabel: string;
    waitingHeightDrag: string;
    waitingBothHands: string;
    rightHandReady: string;
    leftHandReady: string;
    oneHandReady: string;
    handoffInProgress: string;
    rightHandDragging: string;
    platformSupported: string;
    oneHandHolding: string;
    screwHolding: string;
    bothHandsPressing: string;
    falling: string;
    rebounding: string;
    experimentPress: string;
    heightAdjustment: string;
    heightFixed: string;
    screwLabel: string;
    platformModeLabel: string;
    equilibriumHeightLabel: string;
    handStatusLabel: string;
    bothHandsStatusLabel: string;
    displacementLabel: string;
    releaseGapLabel: string;
    switchingView: string;
    supportBeforeMirror: string;
    focusLocked: string;
    confirmHeight: string;
    returnScale: string;
    exitFocus: string;
  };
  acquisition: {
    title: string;
    powerOff: string;
    acquisitionComplete: string;
    measurement: (current: number, total: number) => string;
    phases: Record<'idle' | 'armed' | 'recording' | 'stopped', string>;
    sampleRate: string;
    triggerThreshold: string;
    absolutePressure: string;
    formalSamples: string;
    recordingTime: string;
    pointsUnit: string;
    pressureAxis: string;
    timeAxis: string;
    triggerLine: (value: number) => string;
    qualityUpperLine: (value: number) => string;
    pressureIndicator: (value: number) => string;
    waitingTrigger: string;
    emptyCurve: string;
    start: string;
    pause: string;
    redo: string;
    save: string;
    actionsAria: string;
    curveAria: string;
    preTriggerNote: string;
    immediateRecordingNote: string;
    sampleRateRangeWarning: string;
    triggerThresholdRangeWarning: string;
    acquisitionParametersRequired: string;
    demoSaved: string;
    saved: string;
    virtualKeyboard: string;
    keyboardNext: string;
    keyboardConfirm: string;
    keyboardBackspace: string;
  };
  guide: {
    checklist: string;
    stepLabel: string;
    powerOnTitle: string;
    powerOnDetail: string;
    powerOffTitle: string;
    powerOffDetail: string;
    powerOffSuccess: string;
    powerRequiredReminder: string;
    parameterSetupTitle: string;
    parameterSetupDetail: string;
    adjustHeightTitle: (heightMm: number) => string;
    adjustHeightDetail: (heightMm: number) => string;
    lockScrewTitle: string;
    lockScrewDetail: string;
    reconnectHoseTitle: string;
    reconnectHoseDetail: string;
    loosenScrewTitle: string;
    loosenScrewDetail: string;
    screwWrongDirectionTighten: string;
    screwWrongDirectionLoosen: string;
    screwBoundaryBlockedTighten: string;
    screwBoundaryBlockedLoosen: string;
    startAcquisitionTitle: string;
    startAcquisitionDetail: string;
    releasePistonTitle: string;
    releasePistonDetail: string;
    recordingTitle: string;
    recordingDetail: string;
    pauseRecordingTitle: string;
    pauseRecordingDetail: string;
    saveCurveTitle: (measurementNumber: number) => string;
    saveCurveDetail: (measurementNumber: number) => string;
    crossRunDisconnectTitle: string;
    crossRunDisconnectDetail: string;
    completedTitle: string;
    completedDetail: string;
    completionToastKicker: string;
    completionToast: string;
    sampleRateInvalid: string;
    triggerThresholdInvalid: string;
    reminderTitle: string;
    reminderBody: string;
    pressureTooLowFeedback: string;
    pressureTooHighFeedback: string;
    pressureTooLowStrongReminder: string;
    pressureTooHighStrongReminder: string;
    pressureRangeLessonTitle: string;
    pressureRangeLessonBody: string;
    lockingScrewLessonTitle: string;
    lockingScrewLessonBody: string;
    multiPeriodLessonTitle: string;
    multiPeriodLessonBody: string;
  };
  processing: {
    title: string;
    hint: string;
    navigationItem: string;
    unavailableTitle: string;
    unavailableBody: string;
    runListAria: string;
    runLabel: (number: number) => string;
    runState: Record<'active' | 'completed' | 'pending', string>;
    selectionTitle: string;
    selectionInstruction: (minimumPeriods: number) => string;
    wheelHint: string;
    moveTool: string;
    selectTool: string;
    clearSelection: string;
    resetView: string;
    horizontalScrollbar: string;
    chartAria: (runNumber: number, heightMm: number) => string;
    chartKeyboardInstructions: string;
    timeAxis: string;
    pressureAxis: string;
    leftEndpoint: string;
    rightEndpoint: string;
    periodCount: string;
    selectionTooShort: string;
    insufficientRecordTitle: string;
    insufficientRecordBody: string;
    guidedMinimumWarning: (minimumPeriods: number) => string;
    selectionAccepted: (extremaCount: number, periodCount: string) => string;
    dragHint: string;
    preprocessingTitle: string;
    preprocessingInstruction: string;
    calculationLockedTitle: string;
    calculationLockedBody: string;
    endpointCheckTitle: string;
    endpointCheckInstruction: string;
    freeEndpointEntryInstruction: string;
    t1Label: string;
    t2Label: string;
    endpointPrecision: string;
    checkEndpoints: string;
    continuePeriodCalculation: string;
    periodCheckTitle: string;
    periodCheckInstruction: string;
    periodLabel: string;
    periodPrecision: string;
    checkPeriod: string;
    freePeriodBatchInstruction: string;
    checkPeriodBatch: string;
    numericFormatReminder: string;
    periodWaiting: string;
    freePeriodWaiting: string;
    previousRun: string;
    nextRun: string;
    nextStep: string;
    calculationReady: string;
    navigationUnlocked: string;
    navigationLocked: string;
    calculationReadyDetail: string;
    reviewTitle: string;
    reviewInstruction: string;
    reviewRunSummary: (number: number, total: number) => string;
    reviewAttemptSummary: (endpointAttempts: number, periodAttempts: number) => string;
    reviewBatchAttemptSummary: (attempts: number) => string;
    closeReview: string;
    viewFitAndCalculation: string;
    correctRecorded: string;
    correct: string;
    revealedRecorded: string;
    revealed: string;
    feedback: Record<
      'empty' | 'invalid' | 'numeric-wrong' | 'precision-wrong' | 'wrong',
      string
    >;
    reference: string;
    continueAnswer: string;
    revealAnswer: string;
    selectionToolReminder: string;
    selectionReminder: string;
    endpointReminder: string;
    periodReminder: string;
    nextReminder: string;
  };
  review: {
    title: string;
    hint: string;
    navigationItem: string;
    closeAria: string;
  };
}

export const PISTON_OSCILLATION_SHELL_COPY = {
  'zh-CN': {
    experimentName: '空气热容比（活塞振动法）',
    methodName: '活塞振动法',
    preview: {
      ariaLabel: '活塞振动法仪器模型 3D 预览',
      loadingTitle: '正在加载仪器模型',
      loadingBody: '正在从本地实验资源中载入活塞振动装置。',
      loadErrorTitle: '3D 模型加载失败',
      loadErrorBody: '当前实验仍可安全关闭；请检查本地模型文件后重新打开。',
      restoreDefaultView: '默认视角',
    },
    unavailable: {
      rightSidebar: '当前参数区域仍在开发阶段，暂时无法展开，敬请期待。',
    },
    modes: {
      demo: '演示',
      guide: '引导',
      free: '自由',
      pauseDemo: '暂停演示',
      resumeDemo: '继续演示',
      stopDemo: '终止演示',
      exitDemo: '退出演示',
      resetGuide: '重置引导',
      exitGuide: '退出引导',
      exitFree: '退出自由模式',
    },
    demoPresentation: {
      stepCounter: (current, total) => `步骤 ${current} / ${total}`,
      completed: '演示完成',
      terminated: '演示已终止。',
      running: '演示中',
      paused: '演示已暂停',
      completedStatus: '已完成',
      pausedStatus: '已暂停',
      terminatedStatus: '已终止',
      targetLabel: '操作目标',
      criterionLabel: '完成判据',
      observationLabel: '观察重点',
      instrumentOperation: '仪器操作',
    },
    hands: {
      left: '左手（Space）',
      right: '右手（鼠标左键）',
    },
    lesson: {
      buttonLabel: '实验说明',
      label: '实验说明',
      pages: [
        {
          title: '实验目标',
          body: '本实验通过改变气柱高度，使石墨活塞在密闭气体弹力作用下产生衰减振动，并同步记录绝对压强随时间的变化。完成不同高度的测量后，可利用振动周期与气柱高度的关系计算空气比热容比。',
        },
        {
          title: '为什么最低从 30 mm 开始',
          body: '在 10、20 mm 时，密闭气体的有效体积较小。在本软件采用统一按压操作和采集判据的前提下，相同的活塞位移会造成更大的相对体积变化和压强变化，更容易偏离分析所要求的小振幅条件；振动周期也更短，周期读取更容易受到按压差异和选点误差影响。为使曲线清晰、各次测量更易重复，当前流程从 30 mm 开始取点。',
        },
        {
          title: '双手操作方式',
          body: '本实验需要两只手协同操作。软件使用左手（Space）模拟托住顶部平台，使用右手（鼠标左键）模拟抓取、拖动和按压顶部平台，以及操作压力传感器软管与侧面锁紧螺钉。调节高度可以分多次完成：只要左手（Space）或右手（鼠标左键）仍在托住平台，交接就是有效的。移开右手（鼠标左键）去确认高度或操作螺钉前，应先用左手（Space）接住平台，并一直保持到螺钉锁紧。引导模式中若两只手同时离开，仪器会动态复位到 0 mm 并暂停显示说明；自由模式中平台则按真实物理下落。',
        },
        {
          title: '重新查看',
          body: '如果后续忘记这些内容，可以点击右上角、演示 / 引导 / 自由模式按钮右侧的扳手图标，重新查看实验说明。',
        },
      ],
      close: '关闭实验说明',
    },
    recovery: {
      label: '实验说明',
      supportLostTitle: '双手不能同时离开平台',
      supportLostBody: (heightMm) => `软管断开且侧面锁紧螺钉松开时，顶部平台必须由左手（Space）托住，或由右手（鼠标左键）抓住。刚才左手（Space）与右手（鼠标左键）同时离开，仪器已动态复位到 0 mm。请从 0 mm 重新调至 ${heightMm} mm；移开右手（鼠标左键）前，先用左手（Space）接住顶部平台，并保持到螺钉真正锁紧。`,
      wrongHeightTitle: '当前条件不能确认高度',
      wrongHeightBody: (heightMm) => `只有石墨活塞下沿对准 ${heightMm} mm、左手（Space）正在托住顶部平台，并且右手（鼠标左键）已经离开平台时，才能点击“高度已调好，去固定”。刚才确认条件未满足，仪器已动态复位到 0 mm。你可以分多次调节高度；请从 0 mm 重新开始，满足全部条件后再确认。`,
      continueHint: '点击空白区域来继续',
    },
    feedback: {
      wrongStep: '请先完成当前引导步骤。',
      targetHeightRequired: (heightMm) => `请先将石墨活塞下沿对准 ${heightMm} mm。`,
      leftHandBeforeLock: '移开右手（鼠标左键）前，请先用左手（Space）托住顶部平台，并保持到螺钉锁紧。',
      releaseRightHandBeforeLock: '请先让右手（鼠标左键）离开顶部平台，再用它操作高度按钮或侧面锁紧螺钉。',
      leftHandBeforeDisconnect: '请先用左手（Space）托住顶部平台，再用右手（鼠标左键）断开压力传感器软管。',
      bothHandsBeforePress: '请让左手（Space）与右手（鼠标左键）全部就位，再双手下压顶部平台。',
    },
    interaction: {
      focusEntryAria: '双击进入活塞操作视角',
      lockedHints: [
        '当前侧面锁紧螺钉已固定活塞高度',
        '保持左手（Space）托住顶部平台，并用右手（鼠标左键）在左上操作镜中旋松螺钉',
        '螺钉松开后，根据软管状态调节高度或双手按压',
      ],
      disconnectedHints: [
        '用右手（鼠标左键）拖动顶部平台至目标高度',
        '移开右手（鼠标左键）前，先用左手（Space）接住顶部平台',
        '保持左手（Space）托住，并用右手（鼠标左键）在左上操作镜中旋紧螺钉',
      ],
      connectedHints: [
        '让左手（Space）与右手（鼠标左键）全部就位后双手下压',
        '两只手全部松开后释放活塞',
        '左上操作镜用于观察和操作侧面锁紧螺钉',
      ],
      overviewHints: [
        '双击顶部平台、玻璃管、黑色框架或侧面锁紧螺钉：进入活塞操作视角',
        '用右手（鼠标左键）拖动软管或接头：断开或接回软管',
        '右手（鼠标左键）拖动空白区域：旋转模型',
        '右键拖动：平移模型',
        '滚轮：缩放模型',
      ],
      hoseInRange: '磁吸范围内',
      hoseOutsideRange: '已越过磁吸范围',
      hoseConnected: '已接通密封',
      hoseDisconnected: '已断开通大气',
      lockedStatus: '已锁紧',
      looseStatus: '已松开',
      scaleReadingTitle: '刻度读取',
      heightAdjustmentTitle: '高度调节',
      pistonFocusTitle: '活塞聚焦',
      hoseFocusTitle: '软管聚焦',
      hoseLabel: '软管',
      scaleReadingMirrorAria: '刻度读取操作镜',
      lockingScrewMirrorAria: '锁紧螺钉操作镜',
      screwTightenDirectionAria: '顺时针旋紧方向指引',
      screwLoosenDirectionAria: '逆时针旋松方向指引',
      screwTightenDirectionLabel: '顺时针旋紧',
      screwLoosenDirectionLabel: '逆时针旋松',
      waitingHeightDrag: '等待右手（鼠标左键）拖动',
      waitingBothHands: '等待左手（Space）与右手（鼠标左键）',
      rightHandReady: '右手（鼠标左键）已抓住',
      leftHandReady: '左手（Space）已托住',
      oneHandReady: '左手（Space）或右手（鼠标左键）已就位',
      handoffInProgress: '左手（Space）与右手（鼠标左键）交接中',
      rightHandDragging: '右手（鼠标左键）拖动中',
      platformSupported: '左手（Space）或右手（鼠标左键）正在托住',
      oneHandHolding: '左手（Space）或右手（鼠标左键）仍在托住',
      screwHolding: '螺钉固定中',
      bothHandsPressing: '左手（Space）与右手（鼠标左键）下压中',
      falling: '未固定，平台下落中',
      rebounding: '回弹振动中',
      experimentPress: '实验按压',
      heightAdjustment: '平衡高度调节',
      heightFixed: '高度已固定',
      screwLabel: '侧面锁紧螺钉',
      platformModeLabel: '平台模式',
      equilibriumHeightLabel: '平衡高度',
      handStatusLabel: '左手（Space）、右手（鼠标左键）',
      bothHandsStatusLabel: '左手（Space）、右手（鼠标左键）',
      displacementLabel: '下压位移',
      releaseGapLabel: '松手时间差',
      switchingView: '正在切换视角',
      supportBeforeMirror: '请先用左手（Space）托住平台，并让右手（鼠标左键）离开平台',
      focusLocked: '聚焦视角已锁定',
      confirmHeight: '高度已调好，去固定',
      returnScale: '返回刻度读取',
      exitFocus: '退出聚焦',
    },
    acquisition: {
      title: '压力数据采集',
      powerOff: '电源关闭',
      acquisitionComplete: '采集完成',
      measurement: (current, total) => `第 ${current} 次测量 · 共 ${total} 次`,
      phases: {
        idle: '未开始',
        armed: '等待触发',
        recording: '已触发 · 记录中',
        stopped: '已停止 · 曲线冻结',
      },
      sampleRate: '采样频率',
      triggerThreshold: '下降触发阈值',
      absolutePressure: '当前绝对压强',
      formalSamples: '正式样本',
      recordingTime: '记录时间',
      pointsUnit: '点',
      pressureAxis: '绝对压强 / kPa',
      timeAxis: '触发后时间 / s',
      triggerLine: (value) => `下降触发 ${value.toFixed(1)} kPa`,
      qualityUpperLine: (value) => `测量质量上限 ${value.toFixed(1)} kPa`,
      pressureIndicator: (value) => `压强指示点 ${value.toFixed(2)} kPa`,
      waitingTrigger: '等待压力由高向低越过阈值',
      emptyCurve: '开始采集并操作活塞后显示正式曲线',
      start: '开始采集',
      pause: '暂停采集',
      redo: '重做本次',
      save: '保存本次',
      actionsAria: '本次压力采集操作',
      curveAria: '当前测量的绝对压力时间曲线',
      preTriggerNote: '触发前高压段仅用于监视，不写入本次测量。',
      immediateRecordingNote: '开始记录时已达到监测条件，本次会保留按压、停留和松手后的完整曲线。',
      sampleRateRangeWarning: '请输入 1 至 1000 Hz 的整数采样频率。',
      triggerThresholdRangeWarning: '请输入 96.0 至 130.0 kPa 的有效监测值。',
      acquisitionParametersRequired: '请先输入有效的采样频率和监测值，再开始采集。',
      demoSaved: '保存操作已完成',
      saved: '本次曲线已保存',
      virtualKeyboard: '屏幕数字键盘',
      keyboardNext: '下一项',
      keyboardConfirm: '确认',
      keyboardBackspace: '退格',
    },
    guide: {
      checklist: '引导步骤',
      stepLabel: '步骤',
      powerOnTitle: '打开数据采集系统电源',
      powerOnDetail: '点击主机左侧的蓝色电源按键。按键完成一次按下—回弹后，蓝色电源符号和绿色状态灯亮起，右侧实时数据界面启动。',
      powerOffTitle: '关闭数据采集系统电源',
      powerOffDetail: '三幅曲线的周期结果已经保存。点击主机左侧的蓝色电源按键；按键完成一次按下—回弹，蓝色电源符号和绿色状态灯熄灭后，完成本次仪器操作。',
      powerOffSuccess: '数据采集系统已关闭。已保存的数据不会丢失，可以继续进行离线拟合与计算。',
      powerRequiredReminder: '请先点击蓝色电源按键打开数据采集系统。关机时不能设置参数、显示曲线或记录数据。',
      parameterSetupTitle: '设置采集参数',
      parameterSetupDetail: '输入 1000 Hz 和 120 kPa；两项正确后自动进入下一步。',
      adjustHeightTitle: (heightMm) => `进入聚焦并调至 ${heightMm} mm`,
      adjustHeightDetail: (heightMm) => `双击顶部平台进入聚焦；用右手（鼠标左键）拖至 ${heightMm} mm。松开右手前，用左手（Space）托住平台，再确认高度。`,
      lockScrewTitle: '旋紧侧面锁紧螺钉',
      lockScrewDetail: '持续用左手（Space）托住顶部平台，并用右手（鼠标左键）在左上操作镜中顺时针旋紧侧面锁紧螺钉；达到功能锁紧后再松开左手（Space）。',
      reconnectHoseTitle: '接回压力传感器软管',
      reconnectHoseDetail: '将白色接头拖入平台接口的磁吸范围，恢复密封。',
      loosenScrewTitle: '旋松锁紧螺钉',
      loosenScrewDetail: '软管接通后，双击顶部平台进入聚焦，再在左上操作镜中逆时针旋松侧面锁紧螺钉，使活塞在密封状态下自由运动。',
      screwWrongDirectionTighten: '旋转方向可能反了；正确方向是顺时针旋紧。当前功能状态尚未改变，可以反向继续操作。',
      screwWrongDirectionLoosen: '旋转方向可能反了；正确方向是逆时针旋松。当前功能状态尚未改变，可以反向继续操作。',
      screwBoundaryBlockedTighten: '已阻止螺钉越过锁紧临界位置。请顺时针旋紧，以保持当前锁紧状态。',
      screwBoundaryBlockedLoosen: '已阻止螺钉重新进入锁紧状态。请逆时针旋松，以保持当前松开状态。',
      startAcquisitionTitle: '开始压力采集',
      startAcquisitionDetail: '点击图表左下角的开始按钮，进入等待下降触发状态。',
      releasePistonTitle: '双手下压并同时释放',
      releasePistonDetail: '双击顶部平台进入聚焦；让左手（Space）与右手（鼠标左键）全部就位，双手下压顶部平台，再同时松开双手。',
      recordingTitle: '记录压力振荡曲线',
      recordingDetail: '压力向下跨过 120 kPa 后自动触发，继续记录至 0.500 s。',
      pauseRecordingTitle: '等待活塞稳定并暂停采集',
      pauseRecordingDetail: '记录时间达到 0.500 s 后，等待活塞完全停止振动，再点击暂停，冻结本次曲线。',
      saveCurveTitle: (measurementNumber) => `保存第 ${measurementNumber} 次测量`,
      saveCurveDetail: (measurementNumber) => `检查曲线后点击保存，将它记入第 ${measurementNumber} 次测量。`,
      crossRunDisconnectTitle: '托住平台并断开软管',
      crossRunDisconnectDetail: '保持左手（Space）托住顶部平台，用右手（鼠标左键）拖出白色接头，使气缸与大气连通。',
      completedTitle: '数据处理与计算已完成',
      completedDetail: '80、70、60 mm 三次测量、周期预处理、线性拟合与结果计算均已完成，全部过程和结果已保存。引导模式使用三组不同高度的数据，帮助你以最简流程体验一次完整拟合；在正式实验或自由模式中，建议采集更多不同高度的数据点，以减小随机波动和个别异常数据对拟合的影响，提高斜率、截距及最终计算结果的稳定性和可信度。',
      completionToastKicker: '系统',
      completionToast: '引导模式已结束',
      sampleRateInvalid: '采样频率应设置为 1000 Hz。',
      triggerThresholdInvalid: '下降触发阈值应设置为 120 kPa。',
      reminderTitle: '请完成采集参数设置',
      reminderBody: '两个输入框属于同一个步骤，请依次填写 1000 Hz 和 120 kPa。',
      pressureTooLowFeedback: '最高压强未达到 120 kPa，尚未触发记录；无需重做，请再次下压。',
      pressureTooHighFeedback: '本次最高压强超过 130 kPa，初始压缩幅度过大，不符合实验规范。请点击“重做”。',
      pressureTooLowStrongReminder: '请继续下压，使压强指示点进入 120–130 kPa 后，再同时松开双手。',
      pressureTooHighStrongReminder: '请点击“重做”，并将最高压强控制在 120–130 kPa 后重新操作。',
      pressureRangeLessonTitle: '下压压强范围',
      pressureRangeLessonBody: '按实验规范，本实验将 120 kPa 作为下降触发值。下压时应使压强指示进入 120–130 kPa，再同时松开双手；压强由高向低越过 120 kPa 时，系统开始记录正式曲线。若最高压强低于 120 kPa，记录不会触发；若超过 130 kPa，则初始压缩幅度过大，不符合本实验的小振幅测量条件。将三次测量的初始压强控制在同一范围，也有助于保持各组曲线的初始条件一致。',
      lockingScrewLessonTitle: '锁紧螺钉与定容',
      lockingScrewLessonBody: '锁紧螺钉用于在读数和接管时把活塞稳定固定在目标刻度，使每组测量从确定的气体体积开始。活塞位置的变化会直接改变密闭气体体积，而高度与周期平方的拟合斜率决定最终的空气比热容比；若用手扶住平台，读数时的细小位移和松手时的漂移都会改变高度数据，并传递到拟合结果。应先用螺钉固定刻度，接管完成后再完全旋松，使活塞在密封条件下自由振动。',
      multiPeriodLessonTitle: '多周期测量',
      multiPeriodLessonBody: '传感器以 1000 Hz 采样，相邻时间点间隔为 0.001 s。只用一个周期时，任一端点相差一个采样点都会直接影响周期结果。选取同相位的两个端点并跨越 N 个完整周期，再按 T = (t₂ − t₁) / N 计算平均周期，可将端点读数误差分摊到多个周期，使 T、T² 以及后续线性拟合更稳定。',
    },
    processing: {
      title: '数据处理',
      hint: '框选振荡区间并逐组计算周期',
      navigationItem: '数据处理',
      unavailableTitle: '周期数据尚未就绪',
      unavailableBody: '请先完成并保存本轮全部压力曲线。',
      runListAria: '待处理的压力曲线',
      runLabel: (number) => `第 ${number} 幅`,
      runState: {
        active: '处理中',
        completed: '已记录',
        pending: '待处理',
      },
      selectionTitle: '框选周期范围',
      selectionInstruction: (minimumPeriods) => `先用手型工具观察曲线；需要取值时切换为十字框选。本次引导需选取至少 ${minimumPeriods} 个完整周期。`,
      wheelHint: '滚轮滚动页面 · 鼠标横向滚轮或触控板横向手势平移 · Ctrl + 滚轮缩放时间轴',
      moveTool: '移动视图；点击切换为框选（Shift）',
      selectTool: '框选周期；点击切换为移动（Shift）',
      clearSelection: '清除当前选区',
      resetView: '恢复默认视图',
      horizontalScrollbar: '横向移动曲线可见时间范围',
      chartAria: (runNumber, heightMm) => `第 ${runNumber} 幅、活塞高度 ${heightMm} 毫米的绝对压强时间曲线`,
      chartKeyboardInstructions: '键盘操作：按 Shift 切换移动与框选。移动模式用方向键平移、Home 恢复默认视图；框选模式用左右方向键定位极值，按 Enter 依次确定两个端点，按 Escape 取消。',
      timeAxis: '时间 t / s',
      pressureAxis: '绝对压强 P / kPa',
      leftEndpoint: '左端点',
      rightEndpoint: '右端点',
      periodCount: '周期数',
      selectionTooShort: '选取范围过短，尚无法确定振动周期。请扩大时间范围，使选区至少包含两个相邻的极值点。',
      insufficientRecordTitle: '本次记录不足以完成周期计算',
      insufficientRecordBody: '系统未在整条曲线中确认到至少半个可信的主振动周期。本次记录已保留为实验过程证据，并已自动返回仪器。软管已断开、活塞已复位到 0 mm、锁紧螺钉已完全松开，电源、采样率和触发阈值保持不变；请重新调节本组高度、接通软管并采集替代曲线。',
      guidedMinimumWarning: (minimumPeriods) => `本次测量需要选取至少 ${minimumPeriods} 个完整周期。请扩大时间范围后重新框选。`,
      selectionAccepted: (extremaCount, periodCount) => `已标记 ${extremaCount} 个波峰与波谷；两端极值点之间包含 ${periodCount} 个周期。`,
      dragHint: '点击手型工具切换为十字框选，再在图中横向拖动。',
      preprocessingTitle: '本幅曲线预处理',
      preprocessingInstruction: '先核对两个端点的时间坐标，再根据端点时间和周期数计算单个周期。',
      calculationLockedTitle: '请先完成框选',
      calculationLockedBody: '选择有效的周期范围后，端点坐标校验将自动解锁。',
      endpointCheckTitle: '第一步：核对端点时间',
      endpointCheckInstruction: '输入信息框中左、右端点的横坐标 t₁ 与 t₂，并一次提交校验。',
      freeEndpointEntryInstruction: '输入 t₁ 与 t₂ 后继续；此处只展开周期输入，不提前判断答案。',
      t1Label: '左端点时间 t₁',
      t2Label: '右端点时间 t₂',
      endpointPrecision: '按图中显示的 3 位小数观测时间原样填写',
      checkEndpoints: '校验 t₁、t₂',
      continuePeriodCalculation: '继续计算周期 T',
      periodCheckTitle: '第二步：计算单个周期',
      periodCheckInstruction: '使用 T = (t₂ − t₁) / N 计算单个振动周期。',
      periodLabel: '单个周期 T',
      periodPrecision: '保留 4 位有效数字',
      checkPeriod: '校验周期 T',
      freePeriodBatchInstruction: '填入单个周期 T 后，一次性校验本组的 t₁、t₂ 与 T。校验前可随时返回修改已显示的输入。',
      checkPeriodBatch: '统一校验 t₁、t₂、T',
      numericFormatReminder: '请先把所有输入改为有效数值。空值、字母或不完整数字不会计入正式尝试。',
      periodWaiting: '端点时间校验完成后显示周期计算。',
      freePeriodWaiting: '填写 t₁、t₂ 并点击继续后显示周期输入；此时不会提前校验。',
      previousRun: '上一幅',
      nextRun: '下一幅',
      nextStep: '下一步',
      calculationReady: '各组周期数据均已记录，可以进入下一阶段。',
      navigationUnlocked: '本幅周期结果已记录，可以继续。',
      navigationLocked: '周期结果正确录入后才能继续。',
      calculationReadyDetail: '全部曲线的周期结果已保存。点击“下一步”返回仪器界面，并完成数据采集系统关机。',
      reviewTitle: '周期数据处理回顾',
      reviewInstruction: '点击上方任一幅曲线查看已保存的选区、端点、周期计算与校验结果。回顾中可调整视图，不会改写实验数据。',
      reviewRunSummary: (number, total) => `正在回顾第 ${number} 幅，共 ${total} 幅`,
      reviewAttemptSummary: (endpointAttempts, periodAttempts) => `校验记录：端点提交 ${endpointAttempts} 次，周期提交 ${periodAttempts} 次`,
      reviewBatchAttemptSummary: (attempts) => `统一校验记录：正式提交 ${attempts} 次`,
      closeReview: '关闭回顾',
      viewFitAndCalculation: '查看拟合与计算',
      correctRecorded: '正确，计算值已被记录。',
      correct: '正确。',
      revealedRecorded: '已显示正确值，计算值已被记录。',
      revealed: '已显示正确值。',
      feedback: {
        empty: '请先填写答案。',
        invalid: '请输入合法的十进制数值。',
        'numeric-wrong': '数值不正确，请重新计算。',
        'precision-wrong': '数值正确，但精度不符合要求。',
        wrong: '答案不正确，请检查数值与精度。',
      },
      reference: '参考值：',
      continueAnswer: '继续作答',
      revealAnswer: '查看并继续',
      selectionToolReminder: '点击下方的手形／十字图标，可在“移动视图”和“框选周期”两种状态间切换；也可按 Shift 快速切换。切换到十字状态后，在曲线内拖动完成框选。',
      selectionReminder: '请在曲线上横向框选至少三个完整周期。',
      endpointReminder: '请读取并校验信息框中的 t₁ 与 t₂。',
      periodReminder: '请使用端点时间和周期数计算单个周期 T。',
      nextReminder: '本幅周期结果已经记录，请继续处理下一幅曲线。',
    },
    review: {
      title: '过程回顾与评分',
      hint: '逐次回顾仪器操作、正式曲线、周期证据与评分',
      navigationItem: '过程回顾与评分',
      closeAria: '关闭过程回顾与评分',
    },
  },
  'zh-TW': {
    experimentName: '空氣熱容比（活塞振動法）',
    methodName: '活塞振動法',
    preview: {
      ariaLabel: '活塞振動法儀器模型 3D 預覽',
      loadingTitle: '正在載入儀器模型',
      loadingBody: '正在從本機實驗資源中載入活塞振動裝置。',
      loadErrorTitle: '3D 模型載入失敗',
      loadErrorBody: '目前實驗仍可安全關閉；請檢查本機模型檔案後重新開啟。',
      restoreDefaultView: '預設視角',
    },
    unavailable: {
      rightSidebar: '目前參數區域仍在開發階段，暫時無法展開，敬請期待。',
    },
    modes: {
      demo: '演示',
      guide: '引導',
      free: '自由',
      pauseDemo: '暫停演示',
      resumeDemo: '繼續演示',
      stopDemo: '終止演示',
      exitDemo: '退出演示',
      resetGuide: '重置引導',
      exitGuide: '退出引導',
      exitFree: '退出自由模式',
    },
    demoPresentation: {
      stepCounter: (current, total) => `步驟 ${current} / ${total}`,
      completed: '演示完成',
      terminated: '演示已終止。',
      running: '演示中',
      paused: '演示已暫停',
      completedStatus: '已完成',
      pausedStatus: '已暫停',
      terminatedStatus: '已終止',
      targetLabel: '操作目標',
      criterionLabel: '完成判據',
      observationLabel: '觀察重點',
      instrumentOperation: '儀器操作',
    },
    hands: {
      left: '左手（Space）',
      right: '右手（滑鼠左鍵）',
    },
    lesson: {
      buttonLabel: '實驗說明',
      label: '實驗說明',
      pages: [
        {
          title: '實驗目標',
          body: '本實驗透過改變氣柱高度，使石墨活塞在密閉氣體彈力作用下產生衰減振動，並同步記錄絕對壓強隨時間的變化。完成不同高度的測量後，可利用振動週期與氣柱高度的關係計算空氣比熱容比。',
        },
        {
          title: '為什麼最低從 30 mm 開始',
          body: '在 10、20 mm 時，密閉氣體的有效體積較小。在本軟體採用統一按壓操作和採集判據的前提下，相同的活塞位移會造成更大的相對體積變化和壓強變化，更容易偏離分析所要求的小振幅條件；振動週期也更短，週期讀取更容易受到按壓差異和選點誤差影響。為使曲線清楚、各次測量更易重複，目前流程從 30 mm 開始取點。',
        },
        {
          title: '雙手操作方式',
          body: '本實驗需要兩隻手協同操作。軟體使用左手（Space）模擬托住頂部平台，使用右手（滑鼠左鍵）模擬抓取、拖動和按壓頂部平台，以及操作壓力感測器軟管與側面鎖緊螺釘。調節高度可以分多次完成：只要左手（Space）或右手（滑鼠左鍵）仍在托住平台，交接就是有效的。移開右手（滑鼠左鍵）去確認高度或操作螺釘前，應先用左手（Space）接住平台，並一直保持到螺釘鎖緊。引導模式中若兩隻手同時離開，儀器會動態復位到 0 mm 並暫停顯示說明；自由模式中平台則按真實物理下落。',
        },
        {
          title: '重新查看',
          body: '如果後續忘記這些內容，可以點擊右上角、演示 / 引導 / 自由模式按鈕右側的扳手圖示，重新查看實驗說明。',
        },
      ],
      close: '關閉實驗說明',
    },
    recovery: {
      label: '實驗說明',
      supportLostTitle: '雙手不能同時離開平台',
      supportLostBody: (heightMm) => `軟管斷開且側面鎖緊螺釘鬆開時，頂部平台必須由左手（Space）托住，或由右手（滑鼠左鍵）抓住。剛才左手（Space）與右手（滑鼠左鍵）同時離開，儀器已動態復位到 0 mm。請從 0 mm 重新調至 ${heightMm} mm；移開右手（滑鼠左鍵）前，先用左手（Space）接住頂部平台，並保持到螺釘真正鎖緊。`,
      wrongHeightTitle: '目前條件不能確認高度',
      wrongHeightBody: (heightMm) => `只有石墨活塞下沿對準 ${heightMm} mm、左手（Space）正在托住頂部平台，並且右手（滑鼠左鍵）已經離開平台時，才能點擊「高度已調好，去固定」。剛才確認條件未滿足，儀器已動態復位到 0 mm。你可以分多次調節高度；請從 0 mm 重新開始，滿足全部條件後再確認。`,
      continueHint: '點擊空白區域來繼續',
    },
    feedback: {
      wrongStep: '請先完成目前引導步驟。',
      targetHeightRequired: (heightMm) => `請先將石墨活塞下沿對準 ${heightMm} mm。`,
      leftHandBeforeLock: '移開右手（滑鼠左鍵）前，請先用左手（Space）托住頂部平台，並保持到螺釘鎖緊。',
      releaseRightHandBeforeLock: '請先讓右手（滑鼠左鍵）離開頂部平台，再用它操作高度按鈕或側面鎖緊螺釘。',
      leftHandBeforeDisconnect: '請先用左手（Space）托住頂部平台，再用右手（滑鼠左鍵）斷開壓力感測器軟管。',
      bothHandsBeforePress: '請讓左手（Space）與右手（滑鼠左鍵）全部就位，再雙手下壓頂部平台。',
    },
    interaction: {
      focusEntryAria: '雙擊進入活塞操作視角',
      lockedHints: [
        '目前側面鎖緊螺釘已固定活塞高度',
        '保持左手（Space）托住頂部平台，並用右手（滑鼠左鍵）在左上操作鏡中旋鬆螺釘',
        '螺釘鬆開後，根據軟管狀態調節高度或雙手按壓',
      ],
      disconnectedHints: [
        '用右手（滑鼠左鍵）拖動頂部平台至目標高度',
        '移開右手（滑鼠左鍵）前，先用左手（Space）接住頂部平台',
        '保持左手（Space）托住，並用右手（滑鼠左鍵）在左上操作鏡中旋緊螺釘',
      ],
      connectedHints: [
        '讓左手（Space）與右手（滑鼠左鍵）全部就位後雙手下壓',
        '兩隻手全部鬆開後釋放活塞',
        '左上操作鏡用於觀察和操作側面鎖緊螺釘',
      ],
      overviewHints: [
        '雙擊頂部平台、玻璃管、黑色框架或側面鎖緊螺釘：進入活塞操作視角',
        '用右手（滑鼠左鍵）拖動軟管或接頭：斷開或接回軟管',
        '右手（滑鼠左鍵）拖動空白區域：旋轉模型',
        '右鍵拖動：平移模型',
        '滾輪：縮放模型',
      ],
      hoseInRange: '磁吸範圍內',
      hoseOutsideRange: '已越過磁吸範圍',
      hoseConnected: '已接通密封',
      hoseDisconnected: '已斷開通大氣',
      lockedStatus: '已鎖緊',
      looseStatus: '已鬆開',
      scaleReadingTitle: '刻度讀取',
      heightAdjustmentTitle: '高度調節',
      pistonFocusTitle: '活塞聚焦',
      hoseFocusTitle: '軟管聚焦',
      hoseLabel: '軟管',
      scaleReadingMirrorAria: '刻度讀取操作鏡',
      lockingScrewMirrorAria: '鎖緊螺釘操作鏡',
      screwTightenDirectionAria: '順時針旋緊方向指引',
      screwLoosenDirectionAria: '逆時針旋鬆方向指引',
      screwTightenDirectionLabel: '順時針旋緊',
      screwLoosenDirectionLabel: '逆時針旋鬆',
      waitingHeightDrag: '等待右手（滑鼠左鍵）拖動',
      waitingBothHands: '等待左手（Space）與右手（滑鼠左鍵）',
      rightHandReady: '右手（滑鼠左鍵）已抓住',
      leftHandReady: '左手（Space）已托住',
      oneHandReady: '左手（Space）或右手（滑鼠左鍵）已就位',
      handoffInProgress: '左手（Space）與右手（滑鼠左鍵）交接中',
      rightHandDragging: '右手（滑鼠左鍵）拖動中',
      platformSupported: '左手（Space）或右手（滑鼠左鍵）正在托住',
      oneHandHolding: '左手（Space）或右手（滑鼠左鍵）仍在托住',
      screwHolding: '螺釘固定中',
      bothHandsPressing: '左手（Space）與右手（滑鼠左鍵）下壓中',
      falling: '尚未固定，平台下落中',
      rebounding: '回彈振動中',
      experimentPress: '實驗按壓',
      heightAdjustment: '平衡高度調節',
      heightFixed: '高度已固定',
      screwLabel: '側面鎖緊螺釘',
      platformModeLabel: '平台模式',
      equilibriumHeightLabel: '平衡高度',
      handStatusLabel: '左手（Space）、右手（滑鼠左鍵）',
      bothHandsStatusLabel: '左手（Space）、右手（滑鼠左鍵）',
      displacementLabel: '下壓位移',
      releaseGapLabel: '鬆手時間差',
      switchingView: '正在切換視角',
      supportBeforeMirror: '請先用左手（Space）托住平台，並讓右手（滑鼠左鍵）離開平台',
      focusLocked: '聚焦視角已鎖定',
      confirmHeight: '高度已調好，去固定',
      returnScale: '返回刻度讀取',
      exitFocus: '退出聚焦',
    },
    acquisition: {
      title: '壓力資料採集',
      powerOff: '電源關閉',
      acquisitionComplete: '採集完成',
      measurement: (current, total) => `第 ${current} 次測量 · 共 ${total} 次`,
      phases: {
        idle: '尚未開始',
        armed: '等待觸發',
        recording: '已觸發 · 記錄中',
        stopped: '已停止 · 曲線凍結',
      },
      sampleRate: '採樣頻率',
      triggerThreshold: '下降觸發閾值',
      absolutePressure: '目前絕對壓強',
      formalSamples: '正式樣本',
      recordingTime: '記錄時間',
      pointsUnit: '點',
      pressureAxis: '絕對壓強 / kPa',
      timeAxis: '觸發後時間 / s',
      triggerLine: (value) => `下降觸發 ${value.toFixed(1)} kPa`,
      qualityUpperLine: (value) => `測量品質上限 ${value.toFixed(1)} kPa`,
      pressureIndicator: (value) => `壓強指示點 ${value.toFixed(2)} kPa`,
      waitingTrigger: '等待壓力由高向低越過閾值',
      emptyCurve: '開始採集並操作活塞後顯示正式曲線',
      start: '開始採集',
      pause: '暫停採集',
      redo: '重做本次',
      save: '儲存本次',
      actionsAria: '本次壓力採集操作',
      curveAria: '目前測量的絕對壓力時間曲線',
      preTriggerNote: '觸發前高壓段僅用於監視，不寫入本次測量。',
      immediateRecordingNote: '開始記錄時已達到監測條件，本次會保留按壓、停留和鬆手後的完整曲線。',
      sampleRateRangeWarning: '請輸入 1 至 1000 Hz 的整數採樣頻率。',
      triggerThresholdRangeWarning: '請輸入 96.0 至 130.0 kPa 的有效監測值。',
      acquisitionParametersRequired: '請先輸入有效的採樣頻率和監測值，再開始採集。',
      demoSaved: '儲存操作已完成',
      saved: '本次曲線已儲存',
      virtualKeyboard: '螢幕數字鍵盤',
      keyboardNext: '下一項',
      keyboardConfirm: '確認',
      keyboardBackspace: '退格',
    },
    guide: {
      checklist: '引導步驟',
      stepLabel: '步驟',
      powerOnTitle: '開啟資料採集系統電源',
      powerOnDetail: '點擊主機左側的藍色電源按鍵。按鍵完成一次按下—回彈後，藍色電源符號與綠色狀態燈亮起，右側即時資料介面啟動。',
      powerOffTitle: '關閉資料採集系統電源',
      powerOffDetail: '三幅曲線的週期結果已經儲存。點擊主機左側的藍色電源按鍵；按鍵完成一次按下—回彈，藍色電源符號與綠色狀態燈熄滅後，完成本次儀器操作。',
      powerOffSuccess: '資料採集系統已關閉。已儲存的資料不會遺失，可以繼續進行離線擬合與計算。',
      powerRequiredReminder: '請先點擊藍色電源按鍵開啟資料採集系統。關機時不能設定參數、顯示曲線或記錄資料。',
      parameterSetupTitle: '設定採集參數',
      parameterSetupDetail: '輸入 1000 Hz 與 120 kPa；兩項正確後自動進入下一步。',
      adjustHeightTitle: (heightMm) => `進入聚焦並調至 ${heightMm} mm`,
      adjustHeightDetail: (heightMm) => `雙擊頂部平台進入聚焦；用右手（滑鼠左鍵）拖至 ${heightMm} mm。鬆開右手前，用左手（Space）托住平台，再確認高度。`,
      lockScrewTitle: '旋緊側面鎖緊螺釘',
      lockScrewDetail: '持續用左手（Space）托住頂部平台，並用右手（滑鼠左鍵）在左上操作鏡中順時針旋緊側面鎖緊螺釘；達到功能鎖緊後再鬆開左手（Space）。',
      reconnectHoseTitle: '接回壓力感測器軟管',
      reconnectHoseDetail: '將白色接頭拖入平台接口的磁吸範圍，恢復密封。',
      loosenScrewTitle: '旋鬆鎖緊螺釘',
      loosenScrewDetail: '軟管接通後，雙擊頂部平台進入聚焦，再在左上操作鏡中逆時針旋鬆側面鎖緊螺釘，使活塞在密封狀態下自由運動。',
      screwWrongDirectionTighten: '旋轉方向可能反了；正確方向是順時針旋緊。目前功能狀態尚未改變，可以反向繼續操作。',
      screwWrongDirectionLoosen: '旋轉方向可能反了；正確方向是逆時針旋鬆。目前功能狀態尚未改變，可以反向繼續操作。',
      screwBoundaryBlockedTighten: '已阻止螺釘越過鎖緊臨界位置。請順時針旋緊，以保持目前鎖緊狀態。',
      screwBoundaryBlockedLoosen: '已阻止螺釘重新進入鎖緊狀態。請逆時針旋鬆，以保持目前鬆開狀態。',
      startAcquisitionTitle: '開始壓力採集',
      startAcquisitionDetail: '點擊圖表左下角的開始按鈕，進入等待下降觸發狀態。',
      releasePistonTitle: '雙手下壓並同時釋放',
      releasePistonDetail: '雙擊頂部平台進入聚焦；讓左手（Space）與右手（滑鼠左鍵）全部就位，雙手下壓頂部平台，再同時鬆開雙手。',
      recordingTitle: '記錄壓力振盪曲線',
      recordingDetail: '壓力向下跨越 120 kPa 後自動觸發，繼續記錄至 0.500 s。',
      pauseRecordingTitle: '等待活塞穩定並暫停採集',
      pauseRecordingDetail: '記錄時間達到 0.500 s 後，等待活塞完全停止振動，再點擊暫停，凍結本次曲線。',
      saveCurveTitle: (measurementNumber) => `儲存第 ${measurementNumber} 次測量`,
      saveCurveDetail: (measurementNumber) => `檢查曲線後點擊儲存，將它記入第 ${measurementNumber} 次測量。`,
      crossRunDisconnectTitle: '托住平台並斷開軟管',
      crossRunDisconnectDetail: '保持左手（Space）托住頂部平台，用右手（滑鼠左鍵）拖出白色接頭，使氣缸與大氣連通。',
      completedTitle: '資料處理與計算已完成',
      completedDetail: '80、70、60 mm 三次測量、週期預處理、線性擬合與結果計算均已完成，全部過程與結果已儲存。引導模式使用三組不同高度的資料，協助你以最簡流程體驗一次完整擬合；在正式實驗或自由模式中，建議採集更多不同高度的資料點，以減小隨機波動和個別異常資料對擬合的影響，提高斜率、截距及最終計算結果的穩定性和可信度。',
      completionToastKicker: '系統',
      completionToast: '引導模式已結束',
      sampleRateInvalid: '採樣頻率應設定為 1000 Hz。',
      triggerThresholdInvalid: '下降觸發閾值應設定為 120 kPa。',
      reminderTitle: '請完成採集參數設定',
      reminderBody: '兩個輸入框屬於同一個步驟，請依次填寫 1000 Hz 與 120 kPa。',
      pressureTooLowFeedback: '最高壓強未達到 120 kPa，尚未觸發記錄；無需重做，請再次下壓。',
      pressureTooHighFeedback: '本次最高壓強超過 130 kPa，初始壓縮幅度過大，不符合實驗規範。請點擊「重做」。',
      pressureTooLowStrongReminder: '請繼續下壓，使壓強指示點進入 120–130 kPa 後，再同時鬆開雙手。',
      pressureTooHighStrongReminder: '請點擊「重做」，並將最高壓強控制在 120–130 kPa 後重新操作。',
      pressureRangeLessonTitle: '下壓壓強範圍',
      pressureRangeLessonBody: '按實驗規範，本實驗將 120 kPa 作為下降觸發值。下壓時應使壓強指示進入 120–130 kPa，再同時鬆開雙手；壓強由高向低越過 120 kPa 時，系統開始記錄正式曲線。若最高壓強低於 120 kPa，記錄不會觸發；若超過 130 kPa，則初始壓縮幅度過大，不符合本實驗的小振幅測量條件。將三次測量的初始壓強控制在同一範圍，也有助於保持各組曲線的初始條件一致。',
      lockingScrewLessonTitle: '鎖緊螺釘與定容',
      lockingScrewLessonBody: '鎖緊螺釘用於在讀值和接管時把活塞穩定固定在目標刻度，使每組測量從確定的氣體體積開始。活塞位置的變化會直接改變密閉氣體體積，而高度與週期平方的擬合斜率決定最終的空氣比熱容比；若用手扶住平台，讀值時的細小位移和鬆手時的漂移都會改變高度資料，並傳遞到擬合結果。應先用螺釘固定刻度，接管完成後再完全旋鬆，使活塞在密封條件下自由振動。',
      multiPeriodLessonTitle: '多週期測量',
      multiPeriodLessonBody: '感測器以 1000 Hz 取樣，相鄰時間點間隔為 0.001 s。只用一個週期時，任一端點相差一個取樣點都會直接影響週期結果。選取同相位的兩個端點並跨越 N 個完整週期，再按 T = (t₂ − t₁) / N 計算平均週期，可將端點讀值誤差分攤到多個週期，使 T、T² 以及後續線性擬合更穩定。',
    },
    processing: {
      title: '資料處理',
      hint: '框選振盪區間並逐組計算週期',
      navigationItem: '資料處理',
      unavailableTitle: '週期資料尚未就緒',
      unavailableBody: '請先完成並儲存本輪全部壓力曲線。',
      runListAria: '待處理的壓力曲線',
      runLabel: (number) => `第 ${number} 幅`,
      runState: {
        active: '處理中',
        completed: '已記錄',
        pending: '待處理',
      },
      selectionTitle: '框選週期範圍',
      selectionInstruction: (minimumPeriods) => `先用手型工具觀察曲線；需要取值時切換為十字框選。本次引導需選取至少 ${minimumPeriods} 個完整週期。`,
      wheelHint: '滾輪捲動頁面 · 滑鼠橫向滾輪或觸控板橫向手勢平移 · Ctrl + 滾輪縮放時間軸',
      moveTool: '移動視圖；點擊切換為框選（Shift）',
      selectTool: '框選週期；點擊切換為移動（Shift）',
      clearSelection: '清除目前選區',
      resetView: '恢復預設視圖',
      horizontalScrollbar: '橫向移動曲線可見時間範圍',
      chartAria: (runNumber, heightMm) => `第 ${runNumber} 幅、活塞高度 ${heightMm} 毫米的絕對壓強時間曲線`,
      chartKeyboardInstructions: '鍵盤操作：按 Shift 切換移動與框選。移動模式用方向鍵平移、Home 恢復預設視圖；框選模式用左右方向鍵定位極值，按 Enter 依次確定兩個端點，按 Escape 取消。',
      timeAxis: '時間 t / s',
      pressureAxis: '絕對壓強 P / kPa',
      leftEndpoint: '左端點',
      rightEndpoint: '右端點',
      periodCount: '週期數',
      selectionTooShort: '選取範圍過短，尚無法確定振動週期。請擴大時間範圍，使選區至少包含兩個相鄰的極值點。',
      insufficientRecordTitle: '本次記錄不足以完成週期計算',
      insufficientRecordBody: '系統未在整條曲線中確認到至少半個可信的主振動週期。本次記錄已保留為實驗過程證據，並已自動返回儀器。軟管已斷開、活塞已復位到 0 mm、鎖緊螺釘已完全鬆開，電源、取樣率和觸發閾值保持不變；請重新調節本組高度、接通軟管並採集替代曲線。',
      guidedMinimumWarning: (minimumPeriods) => `本次測量需要選取至少 ${minimumPeriods} 個完整週期。請擴大時間範圍後重新框選。`,
      selectionAccepted: (extremaCount, periodCount) => `已標記 ${extremaCount} 個波峰與波谷；兩端極值點之間包含 ${periodCount} 個週期。`,
      dragHint: '點擊手型工具切換為十字框選，再在圖中橫向拖動。',
      preprocessingTitle: '本幅曲線預處理',
      preprocessingInstruction: '先核對兩個端點的時間座標，再根據端點時間與週期數計算單個週期。',
      calculationLockedTitle: '請先完成框選',
      calculationLockedBody: '選擇有效的週期範圍後，端點座標校驗將自動解鎖。',
      endpointCheckTitle: '第一步：核對端點時間',
      endpointCheckInstruction: '輸入資訊框中左、右端點的橫座標 t₁ 與 t₂，並一次提交校驗。',
      freeEndpointEntryInstruction: '輸入 t₁ 與 t₂ 後繼續；此處只展開週期輸入，不提前判斷答案。',
      t1Label: '左端點時間 t₁',
      t2Label: '右端點時間 t₂',
      endpointPrecision: '按圖中顯示的 3 位小數觀測時間原樣填寫',
      checkEndpoints: '校驗 t₁、t₂',
      continuePeriodCalculation: '繼續計算週期 T',
      periodCheckTitle: '第二步：計算單個週期',
      periodCheckInstruction: '使用 T = (t₂ − t₁) / N 計算單個振動週期。',
      periodLabel: '單個週期 T',
      periodPrecision: '保留 4 位有效數字',
      checkPeriod: '校驗週期 T',
      freePeriodBatchInstruction: '填入單個週期 T 後，一次校驗本組的 t₁、t₂ 與 T。校驗前可隨時返回修改已顯示的輸入。',
      checkPeriodBatch: '統一校驗 t₁、t₂、T',
      numericFormatReminder: '請先把所有輸入改為有效數值。空值、字母或不完整數字不會計入正式嘗試。',
      periodWaiting: '端點時間校驗完成後顯示週期計算。',
      freePeriodWaiting: '填寫 t₁、t₂ 並點擊繼續後顯示週期輸入；此時不會提前校驗。',
      previousRun: '上一幅',
      nextRun: '下一幅',
      nextStep: '下一步',
      calculationReady: '各組週期資料均已記錄，可以進入下一階段。',
      navigationUnlocked: '本幅週期結果已記錄，可以繼續。',
      navigationLocked: '週期結果正確錄入後才能繼續。',
      calculationReadyDetail: '全部曲線的週期結果已儲存。點擊「下一步」返回儀器介面，並完成資料採集系統關機。',
      reviewTitle: '週期資料處理回顧',
      reviewInstruction: '點擊上方任一幅曲線查看已儲存的選區、端點、週期計算與校驗結果。回顧中可調整視圖，不會改寫實驗資料。',
      reviewRunSummary: (number, total) => `正在回顧第 ${number} 幅，共 ${total} 幅`,
      reviewAttemptSummary: (endpointAttempts, periodAttempts) => `校驗記錄：端點提交 ${endpointAttempts} 次，週期提交 ${periodAttempts} 次`,
      reviewBatchAttemptSummary: (attempts) => `統一校驗記錄：正式提交 ${attempts} 次`,
      closeReview: '關閉回顧',
      viewFitAndCalculation: '查看擬合與計算',
      correctRecorded: '正確，計算值已被記錄。',
      correct: '正確。',
      revealedRecorded: '已顯示正確值，計算值已被記錄。',
      revealed: '已顯示正確值。',
      feedback: {
        empty: '請先填寫答案。',
        invalid: '請輸入合法的十進位數值。',
        'numeric-wrong': '數值不正確，請重新計算。',
        'precision-wrong': '數值正確，但精度不符合要求。',
        wrong: '答案不正確，請檢查數值與精度。',
      },
      reference: '參考值：',
      continueAnswer: '繼續作答',
      revealAnswer: '查看並繼續',
      selectionToolReminder: '點擊下方的手形／十字圖示，可在「移動視圖」與「框選週期」兩種狀態間切換；也可按 Shift 快速切換。切換到十字狀態後，在曲線內拖曳完成框選。',
      selectionReminder: '請在曲線上橫向框選至少三個完整週期。',
      endpointReminder: '請讀取並校驗資訊框中的 t₁ 與 t₂。',
      periodReminder: '請使用端點時間與週期數計算單個週期 T。',
      nextReminder: '本幅週期結果已經記錄，請繼續處理下一幅曲線。',
    },
    review: {
      title: '過程回顧與評分',
      hint: '逐次回顧儀器操作、正式曲線、週期證據與評分',
      navigationItem: '過程回顧與評分',
      closeAria: '關閉過程回顧與評分',
    },
  },
  en: {
    experimentName: 'Air Heat-Capacity Ratio (Piston Oscillation)',
    methodName: 'Piston Oscillation',
    preview: {
      ariaLabel: 'Piston-oscillation instrument 3D preview',
      loadingTitle: 'Loading instrument model',
      loadingBody: 'Loading the piston-oscillation apparatus from local experiment resources.',
      loadErrorTitle: '3D model failed to load',
      loadErrorBody: 'The experiment can be closed safely. Check the local model file, then reopen it.',
      restoreDefaultView: 'Default view',
    },
    unavailable: {
      rightSidebar: 'The current-parameters area is still in development and cannot be expanded yet.',
    },
    modes: {
      demo: 'Demo',
      guide: 'Guide',
      free: 'Free',
      pauseDemo: 'Pause demo',
      resumeDemo: 'Resume demo',
      stopDemo: 'Stop demo',
      exitDemo: 'Exit demo',
      resetGuide: 'Reset guide',
      exitGuide: 'Exit guide',
      exitFree: 'Exit Free mode',
    },
    demoPresentation: {
      stepCounter: (current, total) => `Step ${current} / ${total}`,
      completed: 'Demo complete',
      terminated: 'Demo terminated.',
      running: 'Demo running',
      paused: 'Demo paused',
      completedStatus: 'Completed',
      pausedStatus: 'Paused',
      terminatedStatus: 'Terminated',
      targetLabel: 'Target',
      criterionLabel: 'Completion criterion',
      observationLabel: 'Observe',
      instrumentOperation: 'Instrument controls',
    },
    hands: {
      left: 'left hand (Space)',
      right: 'right hand (left mouse button)',
    },
    lesson: {
      buttonLabel: 'Experiment notes',
      label: 'Experiment notes',
      pages: [
        {
          title: 'Experiment objective',
          body: 'This experiment changes the gas-column height so the graphite piston undergoes damped oscillation under the elastic force of the sealed gas while absolute pressure is recorded over time. After measurements at different heights, the relationship between oscillation period and gas-column height is used to calculate the heat-capacity ratio of air.',
        },
        {
          title: 'Why measurements begin at 30 mm',
          body: 'At 10 and 20 mm, the effective volume of the sealed gas is small. With the common pressing action and acquisition criteria used in this software, the same piston displacement produces larger fractional changes in volume and pressure, making it easier to leave the small-amplitude regime required by the analysis. The oscillation period is also shorter, so period measurements become more sensitive to differences in the press and point selection. To keep the curves clear and the measurements repeatable, the current procedure begins at 30 mm.',
        },
        {
          title: 'Two-hand operation',
          body: 'This experiment requires coordinated use of both hands. The left hand (Space) supports the top platform. The right hand (left mouse button) grabs, drags, and presses the top platform and operates the pressure-sensor hose and side locking screw. Height may be adjusted in several passes: a handoff remains valid while either the left hand (Space) or right hand (left mouse button) still supports the platform. Before moving the right hand (left mouse button) to confirm the height or operate the screw, take over support with the left hand (Space) and keep supporting until the screw is locked. In Guide mode, releasing both hands resets the instrument to 0 mm with an animation and pauses for an explanation; in Free mode, the platform falls under the physical model.',
        },
        {
          title: 'View again',
          body: 'If you forget these instructions, select the wrench to the right of the Demo / Guide / Free mode buttons in the upper-right corner to reopen the experiment notes.',
        },
      ],
      close: 'Close experiment notes',
    },
    recovery: {
      label: 'Experiment notes',
      supportLostTitle: 'Do not release both hands',
      supportLostBody: (heightMm) => `When the hose is disconnected and the side locking screw is loose, the top platform must be supported by the left hand (Space) or held by the right hand (left mouse button). Both hands were just released, so the instrument has animated back to 0 mm. Adjust it again from 0 mm to ${heightMm} mm. Before moving the right hand (left mouse button) away, take over support with the left hand (Space) and keep supporting until the screw is truly locked.`,
      wrongHeightTitle: 'The height cannot be confirmed yet',
      wrongHeightBody: (heightMm) => `Select “Height set, secure it” only when the graphite piston lower edge is aligned with ${heightMm} mm, the left hand (Space) is supporting the top platform, and the right hand (left mouse button) has released the platform. Those conditions were not all met, so the instrument has animated back to 0 mm. You may adjust the height in several passes; restart from 0 mm and confirm only after all conditions are met.`,
      continueHint: 'Select the blank area to continue',
    },
    feedback: {
      wrongStep: 'Complete the current guide step first.',
      targetHeightRequired: (heightMm) => `Align the graphite piston lower edge with ${heightMm} mm first.`,
      leftHandBeforeLock: 'Before moving the right hand (left mouse button) away, support the top platform with the left hand (Space) and keep supporting it until the screw is locked.',
      releaseRightHandBeforeLock: 'Release the top platform with the right hand (left mouse button) before using it on the height button or side locking screw.',
      leftHandBeforeDisconnect: 'Support the top platform with the left hand (Space) before using the right hand (left mouse button) to disconnect the pressure-sensor hose.',
      bothHandsBeforePress: 'Put the left hand (Space) and right hand (left mouse button) in place before pressing the top platform with both hands.',
    },
    interaction: {
      focusEntryAria: 'Double-click to enter the piston operation view',
      lockedHints: [
        'The side locking screw currently secures the piston height',
        'Keep the left hand (Space) supporting the platform and use the right hand (left mouse button) to loosen the screw in the upper-left operation mirror',
        'After loosening the screw, adjust the height or press with both hands as required by the hose state',
      ],
      disconnectedHints: [
        'Use the right hand (left mouse button) to drag the top platform to the target height',
        'Before moving the right hand (left mouse button) away, take over support with the left hand (Space)',
        'Keep the left hand (Space) supporting the platform and use the right hand (left mouse button) to tighten the screw in the upper-left operation mirror',
      ],
      connectedHints: [
        'Put the left hand (Space) and right hand (left mouse button) in place, then press with both hands',
        'Release both hands to release the piston',
        'Use the upper-left operation mirror to inspect and operate the side locking screw',
      ],
      overviewHints: [
        'Double-click the top platform, glass tube, black frame, or side locking screw to enter the piston view',
        'Use the right hand (left mouse button) to drag the hose or connector and disconnect or reconnect it',
        'Drag a blank area with the right hand (left mouse button) to rotate the model',
        'Right-drag to pan the model',
        'Use the wheel to zoom',
      ],
      hoseInRange: 'Inside magnetic range',
      hoseOutsideRange: 'Outside magnetic range',
      hoseConnected: 'Sealed connection',
      hoseDisconnected: 'Open to atmosphere',
      lockedStatus: 'Locked',
      looseStatus: 'Loose',
      scaleReadingTitle: 'Scale reading',
      heightAdjustmentTitle: 'Height adjustment',
      pistonFocusTitle: 'Piston focus',
      hoseFocusTitle: 'Hose focus',
      hoseLabel: 'Hose',
      scaleReadingMirrorAria: 'Scale-reading operation mirror',
      lockingScrewMirrorAria: 'Locking-screw operation mirror',
      screwTightenDirectionAria: 'Clockwise tightening direction cue',
      screwLoosenDirectionAria: 'Counterclockwise loosening direction cue',
      screwTightenDirectionLabel: 'Clockwise to tighten',
      screwLoosenDirectionLabel: 'Counterclockwise to loosen',
      waitingHeightDrag: 'Waiting for the right hand (left mouse button) to drag',
      waitingBothHands: 'Waiting for left hand (Space) and right hand (left mouse button)',
      rightHandReady: 'right hand (left mouse button) is holding',
      leftHandReady: 'left hand (Space) is supporting',
      oneHandReady: 'left hand (Space) or right hand (left mouse button) is ready',
      handoffInProgress: 'left hand (Space) and right hand (left mouse button) handoff',
      rightHandDragging: 'right hand (left mouse button) is dragging',
      platformSupported: 'left hand (Space) or right hand (left mouse button) is supporting',
      oneHandHolding: 'left hand (Space) or right hand (left mouse button) is still supporting',
      screwHolding: 'Screw is securing the height',
      bothHandsPressing: 'left hand (Space) and right hand (left mouse button) are pressing',
      falling: 'Unsecured platform is falling',
      rebounding: 'Rebound oscillation',
      experimentPress: 'Experiment press',
      heightAdjustment: 'Equilibrium-height adjustment',
      heightFixed: 'Height secured',
      screwLabel: 'Side locking screw',
      platformModeLabel: 'Platform mode',
      equilibriumHeightLabel: 'Equilibrium height',
      handStatusLabel: 'left hand (Space), right hand (left mouse button)',
      bothHandsStatusLabel: 'left hand (Space), right hand (left mouse button)',
      displacementLabel: 'Press displacement',
      releaseGapLabel: 'Release-time gap',
      switchingView: 'Switching view',
      supportBeforeMirror: 'Support the platform with the left hand (Space), then release it with the right hand (left mouse button)',
      focusLocked: 'Piston focus is locked',
      confirmHeight: 'Height set, secure it',
      returnScale: 'Return to scale view',
      exitFocus: 'Exit focus',
    },
    acquisition: {
      title: 'Pressure data acquisition',
      powerOff: 'Power off',
      acquisitionComplete: 'Acquisition complete',
      measurement: (current, total) => `Measurement ${current} of ${total}`,
      phases: {
        idle: 'Not started',
        armed: 'Waiting for trigger',
        recording: 'Triggered · recording',
        stopped: 'Stopped · curve frozen',
      },
      sampleRate: 'Sample rate',
      triggerThreshold: 'Falling-edge threshold',
      absolutePressure: 'Current absolute pressure',
      formalSamples: 'Recorded samples',
      recordingTime: 'Recording time',
      pointsUnit: 'pts',
      pressureAxis: 'Absolute pressure / kPa',
      timeAxis: 'Time after trigger / s',
      triggerLine: (value) => `Falling trigger ${value.toFixed(1)} kPa`,
      qualityUpperLine: (value) => `Measurement-quality limit ${value.toFixed(1)} kPa`,
      pressureIndicator: (value) => `Pressure indicator ${value.toFixed(2)} kPa`,
      waitingTrigger: 'Waiting for pressure to cross the threshold downward',
      emptyCurve: 'Start acquisition and operate the piston to display the curve',
      start: 'Start acquisition',
      pause: 'Pause acquisition',
      redo: 'Redo measurement',
      save: 'Save measurement',
      actionsAria: 'Current pressure acquisition controls',
      curveAria: 'Absolute pressure curve for the current measurement',
      preTriggerNote: 'The high-pressure segment before triggering is monitored but not recorded.',
      immediateRecordingNote: 'The monitoring condition was already met at start, so pressing, holding, and the curve after release are all retained.',
      sampleRateRangeWarning: 'Enter an integer sample rate from 1 to 1000 Hz.',
      triggerThresholdRangeWarning: 'Enter a valid monitoring value from 96.0 to 130.0 kPa.',
      acquisitionParametersRequired: 'Enter a valid sample rate and monitoring value before starting acquisition.',
      demoSaved: 'Save action complete',
      saved: 'Measurement curve saved',
      virtualKeyboard: 'On-screen numeric keypad',
      keyboardNext: 'Next field',
      keyboardConfirm: 'Confirm',
      keyboardBackspace: 'Backspace',
    },
    guide: {
      checklist: 'Guide steps',
      stepLabel: 'Step',
      powerOnTitle: 'Turn on the data-acquisition system',
      powerOnDetail: 'Press the blue power button on the left side of the interface. After the button depresses and springs back, the blue power symbol and green status LED illuminate, and the real-time data display starts.',
      powerOffTitle: 'Turn off the data-acquisition system',
      powerOffDetail: 'All three period results have been saved. Press the blue power button on the left side of the interface. When the button springs back and the blue power symbol and green status LED turn off, the instrument procedure is complete.',
      powerOffSuccess: 'The data-acquisition system is off. Saved data remains available for offline fitting and calculations.',
      powerRequiredReminder: 'Turn on the data-acquisition system with the blue power button first. Parameters, curves, and recording are unavailable while the power is off.',
      parameterSetupTitle: 'Set acquisition parameters',
      parameterSetupDetail: 'Enter 1000 Hz and 120 kPa. The next step starts when both values are correct.',
      adjustHeightTitle: (heightMm) => `Focus the piston and set ${heightMm} mm`,
      adjustHeightDetail: (heightMm) => `Double-click the platform. Drag it to ${heightMm} mm with the right hand (left mouse button). Hold it with the left hand (Space) before releasing the mouse, then confirm the height.`,
      lockScrewTitle: 'Tighten the side locking screw',
      lockScrewDetail: 'Keep the left hand (Space) supporting the top platform and use the right hand (left mouse button) to turn the side locking screw clockwise in the upper-left operation mirror. Release the left hand (Space) only after the screw is functionally locked.',
      reconnectHoseTitle: 'Reconnect the pressure-sensor hose',
      reconnectHoseDetail: 'Drag the white connector into the magnetic area at the platform port to reseal the system.',
      loosenScrewTitle: 'Loosen the locking screw',
      loosenScrewDetail: 'After reconnecting the hose, double-click the top platform to enter focus mode. Then turn the side locking screw counterclockwise in the upper-left operation mirror so the piston can move freely in the sealed system.',
      screwWrongDirectionTighten: 'The rotation direction may be reversed. Turn clockwise to tighten. The functional state has not changed, so you can reverse direction and continue.',
      screwWrongDirectionLoosen: 'The rotation direction may be reversed. Turn counterclockwise to loosen. The functional state has not changed, so you can reverse direction and continue.',
      screwBoundaryBlockedTighten: 'The screw was stopped at the locking boundary. Turn clockwise to keep it locked.',
      screwBoundaryBlockedLoosen: 'The screw was stopped before it could lock again. Turn counterclockwise to keep it loose.',
      startAcquisitionTitle: 'Start pressure acquisition',
      startAcquisitionDetail: 'Select Start at the lower-left of the chart to arm the falling-edge trigger.',
      releasePistonTitle: 'Press with both hands and release together',
      releasePistonDetail: 'Double-click the top platform to enter focus mode. Put the left hand (Space) and right hand (left mouse button) in place, press the top platform with both hands, then release both hands at the same time.',
      recordingTitle: 'Record the pressure oscillation curve',
      recordingDetail: 'Recording triggers when pressure crosses 120 kPa downward; continue to 0.500 s.',
      pauseRecordingTitle: 'Let the piston settle and pause acquisition',
      pauseRecordingDetail: 'After 0.500 s of recording, wait until the piston stops oscillating, then select Pause to freeze the current curve.',
      saveCurveTitle: (measurementNumber) => `Save measurement ${measurementNumber}`,
      saveCurveDetail: (measurementNumber) => `Check the frozen curve, then select Save to store it as measurement ${measurementNumber}.`,
      crossRunDisconnectTitle: 'Support the platform and disconnect the hose',
      crossRunDisconnectDetail: 'Keep the left hand (Space) supporting the top platform and use the right hand (left mouse button) to pull out the white connector so the cylinder is open to the atmosphere.',
      completedTitle: 'Data processing and calculations complete',
      completedDetail: 'The measurements at 80, 70, and 60 mm, period preprocessing, linear fit, and result calculations are complete, and the full process and results have been saved. Guided mode uses three different heights to demonstrate a complete fit with the simplest workflow. In a formal experiment or Free mode, collect more data points at different heights to reduce the influence of random variation and isolated outliers, and to improve the stability and credibility of the fitted slope, intercept, and final result.',
      completionToastKicker: 'SYSTEM',
      completionToast: 'Guided mode has ended',
      sampleRateInvalid: 'Set the sample rate to 1000 Hz.',
      triggerThresholdInvalid: 'Set the falling-edge threshold to 120 kPa.',
      reminderTitle: 'Complete the acquisition settings',
      reminderBody: 'The two inputs form one step. Enter 1000 Hz and 120 kPa.',
      pressureTooLowFeedback: 'The peak pressure did not reach 120 kPa, so recording was not triggered. No redo is needed; press again.',
      pressureTooHighFeedback: 'The peak pressure exceeded 130 kPa. The initial compression was too large and does not meet the experiment procedure. Select Redo.',
      pressureTooLowStrongReminder: 'Press farther until the pressure indicator enters 120–130 kPa, then release both hands together.',
      pressureTooHighStrongReminder: 'Select Redo, then repeat the operation with the peak pressure kept within 120–130 kPa.',
      pressureRangeLessonTitle: 'Pressing-pressure range',
      pressureRangeLessonBody: 'Following the experiment procedure, 120 kPa is used as the falling-edge trigger. Press until the pressure indication enters 120–130 kPa, then release both hands together; formal recording begins when the pressure crosses 120 kPa downward. A peak below 120 kPa does not trigger recording. A peak above 130 kPa gives an initial compression that is too large for the small-amplitude measurement condition. Keeping all three measurements within the same initial-pressure range also makes their starting conditions more consistent.',
      lockingScrewLessonTitle: 'Locking screw and fixed volume',
      lockingScrewLessonBody: 'The locking screw holds the piston steadily at the target scale mark while the height is read and the hose is connected, so each measurement starts from a defined gas volume. A change in piston position directly changes the sealed gas volume, while the slope of the height-versus-period-squared fit determines the final ratio of specific heats. Holding the platform by hand can introduce small reading shifts and release drift that propagate into the fitted result. Lock the scale position first, then fully loosen the screw after reconnecting the hose so the piston can oscillate freely in the sealed system.',
      multiPeriodLessonTitle: 'Multi-period measurement',
      multiPeriodLessonBody: 'The sensor samples at 1000 Hz, so adjacent time points are 0.001 s apart. When only one period is used, a one-sample difference at either endpoint directly changes the period result. Select two same-phase endpoints spanning N complete periods and calculate the mean period with T = (t₂ − t₁) / N. This distributes endpoint-reading error across several periods and makes T, T², and the subsequent linear fit more stable.',
    },
    processing: {
      title: 'Data processing',
      hint: 'Select an oscillation interval and calculate each period',
      navigationItem: 'Data processing',
      unavailableTitle: 'Period data is not ready',
      unavailableBody: 'Complete and save every pressure curve in this run first.',
      runListAria: 'Pressure curves awaiting processing',
      runLabel: (number) => `Curve ${number}`,
      runState: {
        active: 'In progress',
        completed: 'Recorded',
        pending: 'Pending',
      },
      selectionTitle: 'Select a period range',
      selectionInstruction: (minimumPeriods) => `Inspect the curve with the hand tool, then switch to the crosshair to select a range. This guide requires at least ${minimumPeriods} complete periods.`,
      wheelHint: 'Wheel scrolls the page · Mouse horizontal wheel or trackpad gesture pans horizontally · Ctrl + wheel zooms the time axis',
      moveTool: 'Move view; select to switch to range selection (Shift)',
      selectTool: 'Select periods; select to switch to move view (Shift)',
      clearSelection: 'Clear current selection',
      resetView: 'Restore default view',
      horizontalScrollbar: 'Move the visible time range horizontally',
      chartAria: (runNumber, heightMm) => `Absolute-pressure time curve ${runNumber} at a piston height of ${heightMm} millimetres`,
      chartKeyboardInstructions: 'Keyboard: press Shift to switch between move and range selection. In move mode, use the arrow keys to pan and Home to reset. In selection mode, use Left and Right to locate extrema, press Enter to set each endpoint, and press Escape to cancel.',
      timeAxis: 'Time t / s',
      pressureAxis: 'Absolute pressure P / kPa',
      leftEndpoint: 'Left endpoint',
      rightEndpoint: 'Right endpoint',
      periodCount: 'Periods',
      selectionTooShort: 'The selected range is too short to determine a period. Expand it to include at least two adjacent extrema.',
      insufficientRecordTitle: 'This recording is too short for period calculation',
      insufficientRecordBody: 'No credible half-cycle of the primary oscillation was confirmed in the full curve. The recording remains archived as process evidence, and the instrument has returned automatically. The hose is disconnected, the piston is at 0 mm, and the locking screw is fully loose; power, sample rate, and trigger threshold are unchanged. Reset this run\'s height, reconnect the hose, and acquire a replacement curve.',
      guidedMinimumWarning: (minimumPeriods) => `This measurement requires at least ${minimumPeriods} complete periods. Expand the time range and select again.`,
      selectionAccepted: (extremaCount, periodCount) => `${extremaCount} peaks and troughs marked; the two endpoint extrema span ${periodCount} periods.`,
      dragHint: 'Select the hand tool to switch to the crosshair, then drag horizontally in the chart.',
      preprocessingTitle: 'Preprocess this curve',
      preprocessingInstruction: 'First verify both endpoint time coordinates, then calculate one period from the endpoint times and period count.',
      calculationLockedTitle: 'Make a selection first',
      calculationLockedBody: 'Endpoint verification unlocks after a valid period range is selected.',
      endpointCheckTitle: 'Step 1: verify endpoint times',
      endpointCheckInstruction: 'Enter the horizontal coordinates t₁ and t₂ shown for the left and right endpoints, then submit them together.',
      freeEndpointEntryInstruction: 'Enter t₁ and t₂, then continue. This only reveals the period entry and does not check either answer yet.',
      t1Label: 'Left endpoint time t₁',
      t2Label: 'Right endpoint time t₂',
      endpointPrecision: 'Enter the observed time exactly as shown, with 3 decimal places',
      checkEndpoints: 'Check t₁ and t₂',
      continuePeriodCalculation: 'Continue to period T',
      periodCheckTitle: 'Step 2: calculate one period',
      periodCheckInstruction: 'Use T = (t₂ − t₁) / N to calculate one oscillation period.',
      periodLabel: 'Single period T',
      periodPrecision: 'Use 4 significant figures',
      checkPeriod: 'Check period T',
      freePeriodBatchInstruction: 'Enter period T, then check t₁, t₂, and T together. Every visible entry remains editable before this check.',
      checkPeriodBatch: 'Check t₁, t₂, and T together',
      numericFormatReminder: 'Make every entry a valid number first. Empty, alphabetic, or incomplete values are not recorded as a formal attempt.',
      periodWaiting: 'The period calculation appears after both endpoint times are verified.',
      freePeriodWaiting: 'Enter t₁ and t₂ and continue to reveal the period field; no answer is checked yet.',
      previousRun: 'Previous curve',
      nextRun: 'Next curve',
      nextStep: 'Next step',
      calculationReady: 'The period result for every run is recorded. You can continue to the next stage.',
      navigationUnlocked: 'This curve\'s period result is recorded. You can continue.',
      navigationLocked: 'Record the correct period result before continuing.',
      calculationReadyDetail: 'All period results are saved. Select Next step to return to the instrument and turn off the data-acquisition system.',
      reviewTitle: 'Review period data processing',
      reviewInstruction: 'Select any curve above to inspect its saved range, endpoints, period calculation, and validation result. You can adjust the view without changing the saved experiment data.',
      reviewRunSummary: (number, total) => `Reviewing curve ${number} of ${total}`,
      reviewAttemptSummary: (endpointAttempts, periodAttempts) => `Validation record: ${endpointAttempts} endpoint submissions and ${periodAttempts} period submissions`,
      reviewBatchAttemptSummary: (attempts) => `Unified validation record: ${attempts} formal submissions`,
      closeReview: 'Close review',
      viewFitAndCalculation: 'View fit and calculations',
      correctRecorded: 'Correct. The calculated value has been recorded.',
      correct: 'Correct.',
      revealedRecorded: 'The correct value is shown and has been recorded.',
      revealed: 'The correct value is shown.',
      feedback: {
        empty: 'Enter an answer first.',
        invalid: 'Enter a valid decimal number.',
        'numeric-wrong': 'The value is incorrect. Calculate it again.',
        'precision-wrong': 'The value is correct, but its precision does not meet the requirement.',
        wrong: 'The answer is incorrect. Check both the value and precision.',
      },
      reference: 'Reference:',
      continueAnswer: 'Continue answering',
      revealAnswer: 'Show and continue',
      selectionToolReminder: 'Select the hand/crosshair button below to switch between Move view and Select periods. You can also press Shift to switch quickly. After the crosshair is active, drag inside the curve to select a range.',
      selectionReminder: 'Select at least three complete periods on the curve.',
      endpointReminder: 'Read and verify t₁ and t₂ in the information box.',
      periodReminder: 'Use the endpoint times and period count to calculate T.',
      nextReminder: 'This period result is recorded. Continue with the next curve.',
    },
    review: {
      title: 'Process Review & Score',
      hint: 'Review instrument actions, recorded curves, period evidence, and scores by run',
      navigationItem: 'Process Review & Score',
      closeAria: 'Close process review and score',
    },
  },
} as const satisfies Record<PistonOscillationLanguage, PistonOscillationShellCopy>;

export const getPistonOscillationShellCopy = (
  language: PistonOscillationLanguage,
): PistonOscillationShellCopy => PISTON_OSCILLATION_SHELL_COPY[language];
