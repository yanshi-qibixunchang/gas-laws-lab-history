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
      ariaLabel: '活塞振动法仪器模型预览占位区域',
      eyebrow: '实时预览',
      title: '仪器模型待接入',
      body: '已为活塞振动法预留独立的模型展示区域。',
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
      ariaLabel: '活塞振動法儀器模型預覽預留區域',
      eyebrow: '即時預覽',
      title: '儀器模型待接入',
      body: '已為活塞振動法預留獨立的模型展示區域。',
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
      ariaLabel: 'Piston-oscillation instrument model preview placeholder',
      eyebrow: 'Live Preview',
      title: 'Instrument model pending integration',
      body: 'A dedicated model viewport is reserved for the piston-oscillation method.',
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
