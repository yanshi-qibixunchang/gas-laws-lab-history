import { type WorkbenchStandardResultsTab, type WorkbenchPanelKey } from './workbenchFileState.ts';
import React from 'react';
import { type WorkbenchCopy, workbenchCopies } from './workbenchStudioCopy.ts';
import { Activity, BarChart3, Gauge, Table2, BookOpen, PanelTopOpen } from 'lucide-react';
import { getHeatCapacityRealtimeCopy } from './workbenchHeatCapacityRealtimeCopy.ts';
import { type PistonOscillationShellCopy, getPistonOscillationShellCopy } from '../pistonOscillation/index.ts';
import { type WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import { isIdealResultWindowKey } from './workbenchLayoutCompatibility.ts';

export type ResultsSectionKey = WorkbenchStandardResultsTab;

export interface PanelDefinition {
  key: WorkbenchPanelKey;
  title: string;
  hint: string;
  icon: React.ReactNode;
  defaultVisible?: boolean;
}

export const createStandardPanels = (copy: WorkbenchCopy): PanelDefinition[] => [
  { key: 'preview', title: copy.panels.previewTitle, hint: copy.panels.previewHint, icon: <Activity size={13} />, defaultVisible: true },
  { key: 'realtime', title: copy.panels.realtimeTitle, hint: copy.panels.standardRealtimeHint, icon: <BarChart3 size={13} />, defaultVisible: true },
  { key: 'results', title: copy.panels.standardResultsTitle, hint: copy.panels.standardResultsHint, icon: <Gauge size={13} /> },
];

export const createIdealPanels = (copy: WorkbenchCopy): PanelDefinition[] => [
  { key: 'preview', title: copy.panels.previewTitle, hint: copy.panels.previewHint, icon: <Activity size={13} />, defaultVisible: true },
  { key: 'realtime', title: copy.panels.realtimeTitle, hint: copy.panels.idealRealtimeHint, icon: <BarChart3 size={13} />, defaultVisible: true },
  { key: 'results', title: copy.panels.idealResultsTitle, hint: copy.panels.idealResultsHint, icon: <Gauge size={13} /> },
  { key: 'experimentPoints', title: copy.panels.pointsTitle, hint: copy.panels.pointsHint, icon: <Table2 size={13} /> },
  { key: 'verification', title: copy.panels.verificationTitle, hint: copy.panels.verificationHint, icon: <BarChart3 size={13} /> },
];

export const createHeatCapacityPanels = (
  copy: WorkbenchCopy,
  heatCopy: ReturnType<typeof getHeatCapacityRealtimeCopy>,
): PanelDefinition[] => [
  { key: 'preview', title: copy.panels.previewTitle, hint: copy.panels.previewHint, icon: <Gauge size={13} />, defaultVisible: true },
  { key: 'realtime', title: copy.panels.heatRealtimeTitle, hint: copy.panels.heatRealtimeHint, icon: <BarChart3 size={13} />, defaultVisible: true },
  { key: 'heatCapacityGuide', title: heatCopy.guideTitle, hint: heatCopy.guideHint, icon: <BookOpen size={13} /> },
  { key: 'heatCapacityRecords', title: heatCopy.recordsTitle, hint: heatCopy.recordsHint, icon: <Table2 size={13} /> },
  { key: 'heatCapacityReview', title: heatCopy.reviewTitle, hint: heatCopy.reviewHint, icon: <PanelTopOpen size={13} /> },
];

export const createPistonOscillationPanels = (
  copy: WorkbenchCopy,
  pistonCopy: PistonOscillationShellCopy,
  heatCopy: ReturnType<typeof getHeatCapacityRealtimeCopy>,
): PanelDefinition[] => [
  { key: 'preview', title: copy.panels.previewTitle, hint: copy.panels.previewHint, icon: <Gauge size={13} />, defaultVisible: true },
  { key: 'realtime', title: copy.panels.heatRealtimeTitle, hint: copy.panels.heatRealtimeHint, icon: <BarChart3 size={13} />, defaultVisible: true },
  { key: 'heatCapacityGuide', title: pistonCopy.processing.navigationItem, hint: pistonCopy.processing.hint, icon: <PanelTopOpen size={13} /> },
  { key: 'heatCapacityRecords', title: heatCopy.recordsTitle, hint: heatCopy.recordsHint, icon: <Table2 size={13} /> },
  { key: 'heatCapacityReview', title: pistonCopy.review.navigationItem, hint: pistonCopy.review.hint, icon: <BookOpen size={13} /> },
];

export const createResultsSections = (copy: WorkbenchCopy): Array<{ key: ResultsSectionKey; title: string; icon: React.ReactNode }> => [
  { key: 'summary', title: copy.panels.summaryTitle, icon: <Gauge size={12} /> },
  { key: 'dataTable', title: copy.panels.dataTableTitle, icon: <Table2 size={12} /> },
  { key: 'figures', title: copy.panels.figuresTitle, icon: <BarChart3 size={12} /> },
];

export const getLocalizedWorkbenchPanelTitle = (
  title: string,
  language: WorkbenchLanguagePreference,
) => {
  const getPanelGroups = (nextLanguage: WorkbenchLanguagePreference) => [
    createStandardPanels(workbenchCopies[nextLanguage]),
    createIdealPanels(workbenchCopies[nextLanguage]),
    createHeatCapacityPanels(workbenchCopies[nextLanguage], getHeatCapacityRealtimeCopy(nextLanguage)),
    createPistonOscillationPanels(
      workbenchCopies[nextLanguage],
      getPistonOscillationShellCopy(nextLanguage),
      getHeatCapacityRealtimeCopy(nextLanguage),
    ),
  ];
  for (const sourceLanguage of Object.keys(workbenchCopies) as WorkbenchLanguagePreference[]) {
    const sourceGroups = getPanelGroups(sourceLanguage);
    for (let groupIndex = 0; groupIndex < sourceGroups.length; groupIndex += 1) {
      const sourcePanel = sourceGroups[groupIndex].find((panel) => panel.title === title);
      if (!sourcePanel) continue;
      return getPanelGroups(language)[groupIndex]
        .find((panel) => panel.key === sourcePanel.key)?.title ?? title;
    }
  }
  return title;
};

export const getLocalizedWorkbenchTabTitle = (
  title: string,
  language: WorkbenchLanguagePreference,
) => {
  const getTabGroups = (nextLanguage: WorkbenchLanguagePreference) => [
    createResultsSections(workbenchCopies[nextLanguage]),
    createIdealPanels(workbenchCopies[nextLanguage]).filter((panel) => isIdealResultWindowKey(panel.key)),
    createHeatCapacityPanels(workbenchCopies[nextLanguage], getHeatCapacityRealtimeCopy(nextLanguage)),
    createPistonOscillationPanels(
      workbenchCopies[nextLanguage],
      getPistonOscillationShellCopy(nextLanguage),
      getHeatCapacityRealtimeCopy(nextLanguage),
    ),
  ];
  for (const sourceLanguage of Object.keys(workbenchCopies) as WorkbenchLanguagePreference[]) {
    const sourceGroups = getTabGroups(sourceLanguage);
    for (let groupIndex = 0; groupIndex < sourceGroups.length; groupIndex += 1) {
      const sourceTab = sourceGroups[groupIndex].find((tab) => tab.title === title || tab.key === title);
      if (!sourceTab) continue;
      return getTabGroups(language)[groupIndex]
        .find((tab) => tab.key === sourceTab.key)?.title ?? title;
    }
  }
  return getLocalizedWorkbenchPanelTitle(title, language);
};
