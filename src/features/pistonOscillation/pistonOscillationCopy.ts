export const PISTON_OSCILLATION_LANGUAGES = ['zh-CN', 'zh-TW', 'en'] as const;

export type PistonOscillationLanguage = typeof PISTON_OSCILLATION_LANGUAGES[number];

export interface PistonOscillationShellCopy {
  experimentName: string;
  methodName: string;
  developmentBadge: string;
  preview: {
    ariaLabel: string;
    eyebrow: string;
    title: string;
    body: string;
    loadingTitle: string;
    loadingBody: string;
    loadErrorTitle: string;
    loadErrorBody: string;
    restoreDefaultView: string;
  };
  realtime: {
    ariaLabel: string;
    eyebrow: string;
    title: string;
    body: string;
  };
  unavailable: {
    navigationItem: string;
    rightSidebar: string;
  };
}

export const PISTON_OSCILLATION_SHELL_COPY = {
  'zh-CN': {
    experimentName: '空气热容比（活塞振动法）',
    methodName: '活塞振动法',
    developmentBadge: '开发中',
    preview: {
      ariaLabel: '活塞振动法仪器模型 3D 预览',
      eyebrow: '实时预览',
      title: '仪器模型待接入',
      body: '已为活塞振动法预留独立的模型展示区域。',
      loadingTitle: '正在加载仪器模型',
      loadingBody: '正在从本地实验资源中载入活塞振动装置。',
      loadErrorTitle: '3D 模型加载失败',
      loadErrorBody: '当前实验仍可安全关闭；请检查本地模型文件后重新打开。',
      restoreDefaultView: '默认视角',
    },
    realtime: {
      ariaLabel: '活塞振动法实时数据暂不可用',
      eyebrow: '实时数据',
      title: '当前功能仍在开发阶段',
      body: '实时数据暂不可用，敬请期待。',
    },
    unavailable: {
      navigationItem: '该实验内容仍在开发中，暂时无法打开。',
      rightSidebar: '当前参数区域仍在开发阶段，暂时无法展开，敬请期待。',
    },
  },
  'zh-TW': {
    experimentName: '空氣熱容比（活塞振動法）',
    methodName: '活塞振動法',
    developmentBadge: '開發中',
    preview: {
      ariaLabel: '活塞振動法儀器模型 3D 預覽',
      eyebrow: '即時預覽',
      title: '儀器模型待接入',
      body: '已為活塞振動法預留獨立的模型展示區域。',
      loadingTitle: '正在載入儀器模型',
      loadingBody: '正在從本機實驗資源中載入活塞振動裝置。',
      loadErrorTitle: '3D 模型載入失敗',
      loadErrorBody: '目前實驗仍可安全關閉；請檢查本機模型檔案後重新開啟。',
      restoreDefaultView: '預設視角',
    },
    realtime: {
      ariaLabel: '活塞振動法即時資料暫不可用',
      eyebrow: '即時資料',
      title: '目前功能仍在開發階段',
      body: '即時資料暫不可用，敬請期待。',
    },
    unavailable: {
      navigationItem: '此實驗內容仍在開發中，暫時無法開啟。',
      rightSidebar: '目前參數區域仍在開發階段，暫時無法展開，敬請期待。',
    },
  },
  en: {
    experimentName: 'Air Heat-Capacity Ratio (Piston Oscillation)',
    methodName: 'Piston Oscillation',
    developmentBadge: 'In development',
    preview: {
      ariaLabel: 'Piston-oscillation instrument 3D preview',
      eyebrow: 'Live Preview',
      title: 'Instrument model pending integration',
      body: 'A dedicated model viewport is reserved for the piston-oscillation method.',
      loadingTitle: 'Loading instrument model',
      loadingBody: 'Loading the piston-oscillation apparatus from local experiment resources.',
      loadErrorTitle: '3D model failed to load',
      loadErrorBody: 'The experiment can be closed safely. Check the local model file, then reopen it.',
      restoreDefaultView: 'Default view',
    },
    realtime: {
      ariaLabel: 'Piston-oscillation live data is unavailable',
      eyebrow: 'Live Data',
      title: 'This feature is still in development',
      body: 'Live data is temporarily unavailable. Please check back later.',
    },
    unavailable: {
      navigationItem: 'This experiment content is still in development and cannot be opened yet.',
      rightSidebar: 'The current-parameters area is still in development and cannot be expanded yet.',
    },
  },
} as const satisfies Record<PistonOscillationLanguage, PistonOscillationShellCopy>;

export const getPistonOscillationShellCopy = (
  language: PistonOscillationLanguage,
): PistonOscillationShellCopy => PISTON_OSCILLATION_SHELL_COPY[language];
