import { type WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import { type WorkbenchFileKind } from './workbenchFileKind.ts';
import { getLocalizedWorkbenchPanelTitle, getLocalizedWorkbenchTabTitle } from './workbenchPanelDefinitions.tsx';

export const getLocalizedWorkbenchEditLabel = (
  label: string,
  language: WorkbenchLanguagePreference,
) => {
  const exactCopies: Record<WorkbenchLanguagePreference, Record<string, string>> = {
    'zh-CN': {
      'restart current heat-capacity experiment': '重新开始本次实验',
      'restart heat-capacity free batch': '重新开始本组实验',
      'saved heat capacity parameters': '保存热容比参数',
      'applied heat capacity parameters': '应用热容比参数',
      'saved parameters': '保存参数',
      'saved and applied ideal parameters': '保存并应用理想气体参数',
      'applied ideal parameters': '应用理想气体参数',
      'saved and applied parameters': '保存并应用参数',
      'applied parameters': '应用参数',
      'opened ideal Results window': '打开理想气体结果窗口',
      'closed ideal Results window': '关闭理想气体结果窗口',
      'opened Results panel': '打开结果面板',
      'opened heat-capacity materials tabs': '打开热容比实验资料标签页',
      'closed heat-capacity materials window': '关闭实验资料与结果窗口',
      'changed ideal relation': '更改理想气体关系',
      'changed ideal scan variable': '更改理想气体扫描变量',
      'removed ideal experiment point': '移除理想气体实验点',
      'cleared ideal relation points': '清空理想气体关系点',
      'renamed file': '重命名文件',
      'closed file': '关闭文件',
      'reopened file': '重新打开文件',
      'deleted file': '删除文件',
      'reset layout': '重置布局',
      'reset piston-oscillation free session': '重置活塞振动法自由模式',
    },
    'zh-TW': {
      'restart current heat-capacity experiment': '重新開始本次實驗',
      'restart heat-capacity free batch': '重新開始本組實驗',
      'saved heat capacity parameters': '儲存熱容比參數',
      'applied heat capacity parameters': '套用熱容比參數',
      'saved parameters': '儲存參數',
      'saved and applied ideal parameters': '儲存並套用理想氣體參數',
      'applied ideal parameters': '套用理想氣體參數',
      'saved and applied parameters': '儲存並套用參數',
      'applied parameters': '套用參數',
      'opened ideal Results window': '開啟理想氣體結果視窗',
      'closed ideal Results window': '關閉理想氣體結果視窗',
      'opened Results panel': '開啟結果面板',
      'opened heat-capacity materials tabs': '開啟熱容比實驗資料分頁',
      'closed heat-capacity materials window': '關閉實驗資料與結果視窗',
      'changed ideal relation': '變更理想氣體關係',
      'changed ideal scan variable': '變更理想氣體掃描變量',
      'removed ideal experiment point': '移除理想氣體實驗點',
      'cleared ideal relation points': '清空理想氣體關係點',
      'renamed file': '重新命名檔案',
      'closed file': '關閉檔案',
      'reopened file': '重新開啟檔案',
      'deleted file': '刪除檔案',
      'reset layout': '重設版面',
      'reset piston-oscillation free session': '重設活塞振動法自由模式',
    },
    en: {
      'reset piston-oscillation free session': 'Reset piston-oscillation Free mode',
    },
  };
  const exactCopy = exactCopies[language][label];
  if (exactCopy) return exactCopy;

  const createdFileMatch = /^created (standard|ideal|heatCapacity|heatCapacityPistonOscillation) file$/.exec(label);
  if (createdFileMatch) {
    const kind = createdFileMatch[1] as WorkbenchFileKind;
    if (language === 'zh-CN') {
      const kindLabel = kind === 'standard' ? '标准模拟' : kind === 'ideal' ? '理想气体' : '热容比实验';
      return `创建${kindLabel}文件`;
    }
    if (language === 'zh-TW') {
      const kindLabel = kind === 'standard' ? '標準模擬' : kind === 'ideal' ? '理想氣體' : '熱容比實驗';
      return `建立${kindLabel}檔案`;
    }
  }

  const removedRecordMatch = /^removed heat-capacity (u0|u1|u2|trial) record$/.exec(label);
  if (removedRecordMatch && language !== 'en') {
    const recordLabel = removedRecordMatch[1] === 'trial'
      ? language === 'zh-CN' ? '整组' : '整組'
      : removedRecordMatch[1].toUpperCase();
    return language === 'zh-CN'
      ? `删除热容比 ${recordLabel} 记录`
      : `刪除熱容比 ${recordLabel} 記錄`;
  }

  const localizedContainerLabel = (
    pattern: RegExp,
    container: 'tab' | 'heat-capacity tab' | 'panel',
  ) => {
    const match = pattern.exec(label);
    if (!match || language === 'en') return null;
    const action = match[1] === 'opened'
      ? language === 'zh-CN' ? '打开' : '開啟'
      : language === 'zh-CN' ? '关闭' : '關閉';
    const title = container === 'panel'
      ? getLocalizedWorkbenchPanelTitle(match[2], language)
      : getLocalizedWorkbenchTabTitle(match[2], language);
    if (container === 'panel') return `${action}${title}面板`;
    if (container === 'heat-capacity tab') {
      return language === 'zh-CN' ? `${action}${title}热容比标签页` : `${action}${title}熱容比分頁`;
    }
    return language === 'zh-CN' ? `${action}${title}标签页` : `${action}${title}分頁`;
  };
  const containerCopy = localizedContainerLabel(/^(opened|closed) (.+) heat-capacity tab$/, 'heat-capacity tab')
    ?? localizedContainerLabel(/^(opened|closed) (.+) panel$/, 'panel')
    ?? localizedContainerLabel(/^(opened|closed) (.+) tab$/, 'tab');
  if (containerCopy) return containerCopy;

  if (language === 'zh-CN') return '工作台操作';
  if (language === 'zh-TW') return '工作台操作';
  return label;
};
