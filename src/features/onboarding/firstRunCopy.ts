import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';

export interface FirstRunProductCardCopy {
  eyebrow: string;
  title: string;
  body: string;
  meta: string;
}

export interface FirstRunCopy {
  windowControls: {
    controls: string;
    minimize: string;
    maximize: string;
    restore: string;
    close: string;
  };
  common: {
    previous: string;
    next: string;
    finish: string;
  };
  language: {
    step: string;
    title: string;
    body: string;
    groupLabel: string;
    options: Record<WorkbenchLanguagePreference, { label: string; hint: string }>;
  };
  welcome: {
    eyebrow: string;
    title: string;
    body: string;
  };
  product: {
    step: string;
    title: string;
    body: string;
    previousCard: string;
    nextCard: string;
    pauseAutoplay: string;
    resumeAutoplay: string;
    cardStatus: (current: number, total: number) => string;
    cards: FirstRunProductCardCopy[];
  };
  needs: {
    step: string;
    title: string;
    body: string;
    known: string;
    knownHint: string;
    guidance: string;
    guidanceHint: string;
    required: string;
  };
  consent: {
    title: string;
    subtitle: string;
    navigation: string;
    navigationToggle: string;
    back: string;
    openLocalFile: string;
    openInBrowser: string;
    largeFileBody: string;
    previewUnavailable: string;
    scrollComplete: string;
    scrollPending: string;
    timeComplete: string;
    timePending: (seconds: number) => string;
    disagree: string;
    agree: string;
    saving: string;
    submitErrorTitle: string;
  };
  rejected: {
    title: string;
    body: string;
  };
}

export const firstRunCopies: Record<WorkbenchLanguagePreference, FirstRunCopy> = {
  'zh-CN': {
    windowControls: {
      controls: '窗口控制',
      minimize: '最小化',
      maximize: '最大化',
      restore: '还原',
      close: '关闭软件',
    },
    common: { previous: '上一步', next: '下一步', finish: '完成' },
    language: {
      step: '首次设置 · 1 / 3',
      title: '选择软件语言',
      body: '该选择将用于首次介绍、许可说明和后续工作台。进入软件后仍可在设置中修改。',
      groupLabel: '软件语言',
      options: {
        'zh-CN': { label: '简体中文', hint: 'Simplified Chinese' },
        'zh-TW': { label: '繁體中文', hint: 'Traditional Chinese' },
        en: { label: 'English', hint: '英语' },
      },
    },
    welcome: {
      eyebrow: '气律实验室',
      title: '欢迎使用气律实验室',
      body: '面向气体定律与热学实验的桌面工程工作台',
    },
    product: {
      step: '产品介绍 · 2 / 3',
      title: '认识实验工作台',
      body: '三张简短介绍将带您了解工作空间、学习方式与完整实验流程。',
      previousCard: '上一张介绍卡片',
      nextCard: '下一张介绍卡片',
      pauseAutoplay: '暂停自动播放',
      resumeAutoplay: '继续自动播放',
      cardStatus: (current, total) => `第 ${current} 张，共 ${total} 张`,
      cards: [
        {
          eyebrow: '工作空间',
          title: '一个工作台，贯穿实验始终',
          body: '实验文件、仪器视图、过程数据与结果窗口保持在同一套界面中，操作过程连续而清晰。',
          meta: '实验文件 · 仪器视图 · 数据窗口 · 结果',
        },
        {
          eyebrow: '学习方式',
          title: '先看懂，再跟做，最后独立完成',
          body: '先通过演示理解流程，再在引导中完成关键步骤；熟悉后即可进入自由实验。',
          meta: '演示 · 引导 · 自由实验',
        },
        {
          eyebrow: '实验闭环',
          title: '每一次操作，都能回到数据与结果',
          body: '仪器操作、传感器读数、数据记录、计算处理和结果复核在同一实验文件中自然衔接。',
          meta: '操作 · 记录 · 计算 · 复核',
        },
      ],
    },
    needs: {
      step: '使用确认 · 3 / 3',
      title: '您是否了解本软件绝热膨胀法实验的操作逻辑？',
      body: '请根据您是否能够使用本软件完成模式选择、仪器操作、数据记录与结果处理进行选择。',
      known: '是，我已了解',
      knownHint: '进入软件后直接开放演示、引导和自由实验。',
      guidance: '否，我需要引导',
      guidanceHint: '同意许可后立即进入演示与引导逐步解锁流程。',
      required: '请选择一项后继续。',
    },
    consent: {
      title: '权限说明与第三方开源许可',
      subtitle: '请阅读主文档；许可全文可按需打开查看',
      navigation: '文档目录',
      navigationToggle: '打开或关闭文档目录',
      back: '返回主文档',
      openLocalFile: '打开本地许可文件',
      openInBrowser: '在浏览器中打开',
      largeFileBody: '该许可集合内容较大，请通过本地文件入口查看完整内容。',
      previewUnavailable: '当前环境无法在窗口内预览该材料，请使用打开入口查看。',
      scrollComplete: '已阅读至文档底部',
      scrollPending: '请将主文档滚动至底部',
      timeComplete: '已完成 15 秒阅读时间',
      timePending: (seconds) => `阅读时间还需 ${seconds} 秒`,
      disagree: '不同意并退出',
      agree: '我已阅读并知悉',
      saving: '正在保存…',
      submitErrorTitle: '许可确认尚未保存',
    },
    rejected: {
      title: '软件尚未获得使用许可',
      body: '当前页面将保持阻断。刷新页面或下次打开软件后，可以重新阅读并选择是否同意。',
    },
  },
  'zh-TW': {
    windowControls: {
      controls: '視窗控制',
      minimize: '最小化',
      maximize: '最大化',
      restore: '還原',
      close: '關閉軟體',
    },
    common: { previous: '上一步', next: '下一步', finish: '完成' },
    language: {
      step: '首次設定 · 1 / 3',
      title: '選擇軟體語言',
      body: '此選擇將用於首次介紹、授權說明與後續工作台。進入軟體後仍可在設定中修改。',
      groupLabel: '軟體語言',
      options: {
        'zh-CN': { label: '简体中文', hint: 'Simplified Chinese' },
        'zh-TW': { label: '繁體中文', hint: 'Traditional Chinese' },
        en: { label: 'English', hint: '英文' },
      },
    },
    welcome: {
      eyebrow: '氣律實驗室',
      title: '歡迎使用氣律實驗室',
      body: '面向氣體定律與熱學實驗的桌面工程工作台',
    },
    product: {
      step: '產品介紹 · 2 / 3',
      title: '認識實驗工作台',
      body: '三張簡短介紹將帶您了解工作空間、學習方式與完整實驗流程。',
      previousCard: '上一張介紹卡片',
      nextCard: '下一張介紹卡片',
      pauseAutoplay: '暫停自動播放',
      resumeAutoplay: '繼續自動播放',
      cardStatus: (current, total) => `第 ${current} 張，共 ${total} 張`,
      cards: [
        { eyebrow: '工作空間', title: '一個工作台，貫穿實驗始終', body: '實驗檔案、儀器視圖、過程資料與結果視窗保持在同一套介面中，操作過程連續而清晰。', meta: '實驗檔案 · 儀器視圖 · 資料視窗 · 結果' },
        { eyebrow: '學習方式', title: '先看懂，再跟做，最後獨立完成', body: '先透過示範理解流程，再在引導中完成關鍵步驟；熟悉後即可進入自由實驗。', meta: '示範 · 引導 · 自由實驗' },
        { eyebrow: '實驗閉環', title: '每一次操作，都能回到資料與結果', body: '儀器操作、感測器讀數、資料記錄、計算處理與結果複核在同一實驗檔案中自然銜接。', meta: '操作 · 記錄 · 計算 · 複核' },
      ],
    },
    needs: {
      step: '使用確認 · 3 / 3',
      title: '您是否了解本軟體絕熱膨脹法實驗的操作邏輯？',
      body: '請根據您是否能夠使用本軟體完成模式選擇、儀器操作、資料記錄與結果處理進行選擇。',
      known: '是，我已了解',
      knownHint: '進入軟體後直接開放示範、引導與自由實驗。',
      guidance: '否，我需要引導',
      guidanceHint: '同意授權後立即進入示範與引導逐步解鎖流程。',
      required: '請選擇一項後繼續。',
    },
    consent: {
      title: '權限說明與第三方開源授權',
      subtitle: '請閱讀主文件；授權全文可按需開啟查看',
      navigation: '文件目錄',
      navigationToggle: '開啟或關閉文件目錄',
      back: '返回主文件',
      openLocalFile: '開啟本機授權檔案',
      openInBrowser: '在瀏覽器中開啟',
      largeFileBody: '此授權集合內容較大，請透過本機檔案入口查看完整內容。',
      previewUnavailable: '目前環境無法在視窗內預覽此材料，請使用開啟入口查看。',
      scrollComplete: '已閱讀至文件底部',
      scrollPending: '請將主文件捲動至底部',
      timeComplete: '已完成 15 秒閱讀時間',
      timePending: (seconds) => `閱讀時間還需 ${seconds} 秒`,
      disagree: '不同意並退出',
      agree: '我已閱讀並知悉',
      saving: '正在儲存…',
      submitErrorTitle: '授權確認尚未儲存',
    },
    rejected: {
      title: '軟體尚未取得使用授權',
      body: '目前頁面將保持阻斷。重新整理頁面或下次開啟軟體後，可以重新閱讀並選擇是否同意。',
    },
  },
  en: {
    windowControls: {
      controls: 'Window controls',
      minimize: 'Minimize',
      maximize: 'Maximize',
      restore: 'Restore',
      close: 'Close the app',
    },
    common: { previous: 'Back', next: 'Next', finish: 'Finish' },
    language: {
      step: 'First setup · 1 / 3',
      title: 'Choose the app language',
      body: 'This language will be used for the introduction, legal notice, and workbench. You can change it later in Settings.',
      groupLabel: 'App language',
      options: {
        'zh-CN': { label: '简体中文', hint: 'Simplified Chinese' },
        'zh-TW': { label: '繁體中文', hint: 'Traditional Chinese' },
        en: { label: 'English', hint: 'English' },
      },
    },
    welcome: {
      eyebrow: 'Gas Laws Lab',
      title: 'Welcome to Gas Laws Lab',
      body: 'A desktop engineering workbench for gas-law and thermal experiments',
    },
    product: {
      step: 'Product introduction · 2 / 3',
      title: 'Meet the experiment workbench',
      body: 'Three short introductions cover the workspace, learning path, and complete experiment flow.',
      previousCard: 'Previous introduction card',
      nextCard: 'Next introduction card',
      pauseAutoplay: 'Pause automatic playback',
      resumeAutoplay: 'Resume automatic playback',
      cardStatus: (current, total) => `Card ${current} of ${total}`,
      cards: [
        { eyebrow: 'Workspace', title: 'One workbench from start to finish', body: 'Experiment files, instrument views, process data, and results stay together in one clear, continuous interface.', meta: 'Files · instruments · data · results' },
        { eyebrow: 'Learning path', title: 'Observe, follow, then work independently', body: 'Understand the flow through Demo, complete the key steps in Guide, then move into the Free experiment.', meta: 'Demo · Guide · Free experiment' },
        { eyebrow: 'Experiment loop', title: 'Connect every action back to data and results', body: 'Instrument actions, sensor readings, records, calculations, and result review stay connected inside one experiment file.', meta: 'Operate · record · calculate · review' },
      ],
    },
    needs: {
      step: 'Familiarity · 3 / 3',
      title: 'Do you understand how to operate the adiabatic-expansion experiment in this app?',
      body: 'Choose based on whether you can use this app to select a mode, operate the apparatus, record data, and process results.',
      known: 'Yes, I understand',
      knownHint: 'Demo, Guide, and Free experiment modes will be available immediately.',
      guidance: 'No, I need guidance',
      guidanceHint: 'The staged Demo and Guide learning flow will begin after legal consent.',
      required: 'Choose one option to continue.',
    },
    consent: {
      title: 'Permissions and Third-Party Open-Source Licenses',
      subtitle: 'Read the main notice; full license materials are available when needed',
      navigation: 'Document outline',
      navigationToggle: 'Open or close the document outline',
      back: 'Back to main notice',
      openLocalFile: 'Open local license file',
      openInBrowser: 'Open in browser',
      largeFileBody: 'This license collection is large. Use the local-file entry to view the complete content.',
      previewUnavailable: 'This material cannot be previewed in the current environment. Use the open action to view it.',
      scrollComplete: 'Main notice read to the end',
      scrollPending: 'Scroll the main notice to the end',
      timeComplete: '15-second reading time completed',
      timePending: (seconds) => `${seconds} seconds of reading time remaining`,
      disagree: 'Disagree and exit',
      agree: 'I have read and understand',
      saving: 'Saving…',
      submitErrorTitle: 'Consent has not been saved',
    },
    rejected: {
      title: 'The app has not been authorized for use',
      body: 'This page will remain blocked. Refresh or reopen the app to review the notice and choose again.',
    },
  },
};
