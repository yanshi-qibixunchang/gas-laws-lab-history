import { hasDesktopLegalReadBridge } from './workbenchDesktopCapabilities.ts';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { type PromptFeedbackKind } from '../../components/prompts/promptFeedbackPolicy.ts';
import type { WorkbenchBuildNoticeFilePreview, WorkbenchLegalMaterialId } from './workbenchBuildNoticeContract.ts';
import { buildNoticeLegalMaterialFiles } from './workbenchBuildNoticeContent.ts';
import { type WorkbenchHeatCapacityRefreshSession } from './workbenchHeatCapacityRefreshSession.ts';
import { getHeatCapacityRefreshBoolean, getHeatCapacityRefreshObject, getHeatCapacityRefreshString } from './workbenchHeatCapacityUiCheckpoint.ts';
import type { WorkbenchCopy } from './workbenchStudioCopy.ts';
import { createWorkbenchAuxiliaryWindowActions } from './workbenchAuxiliaryWindowActions.ts';

export const useWorkbenchAuxiliaryWindows = ({ initialHeatCapacityRefreshWindows, aboutCopy, setSettingsLanguageMenuOpen, setOpenTopMenu }: {
  initialHeatCapacityRefreshWindows: WorkbenchHeatCapacityRefreshSession['ui']['windows'];
  aboutCopy: WorkbenchCopy['about'];
  setSettingsLanguageMenuOpen: (open: boolean) => void;
  setOpenTopMenu: (menu: null) => void;
}) => {
  const [settingsGeneralOpen, setSettingsGeneralOpen] = useState(() => (
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshWindows, 'settingsGeneralOpen')
  ));
  const [aboutWindowOpen, setAboutWindowOpen] = useState(() => (
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshWindows, 'aboutWindowOpen')
  ));
  const [buildNoticeWindowOpen, setBuildNoticeWindowOpen] = useState(() => (
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshWindows, 'buildNoticeWindowOpen')
  ));
  const [buildNoticeNavOpen, setBuildNoticeNavOpen] = useState(() => (
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshWindows, 'buildNoticeNavOpen')
  ));
  const [activeBuildNoticeMaterialId, setActiveBuildNoticeMaterialId] = useState<WorkbenchLegalMaterialId | null>(() => (
    getHeatCapacityRefreshString(initialHeatCapacityRefreshWindows, 'activeBuildNoticeMaterialId') as WorkbenchLegalMaterialId | null
  ));
  const [buildNoticeFilePreview, setBuildNoticeFilePreview] = useState<WorkbenchBuildNoticeFilePreview | null>(() => (
    getHeatCapacityRefreshObject(initialHeatCapacityRefreshWindows, 'buildNoticeFilePreview') as unknown as WorkbenchBuildNoticeFilePreview | null
  ));
  const [buildNoticeOpenError, setBuildNoticeOpenError] = useState<string | null>(() => (
    getHeatCapacityRefreshString(initialHeatCapacityRefreshWindows, 'buildNoticeOpenError')
  ));
  const [aboutResultNotice, setAboutResultNotice] = useState<{
    title: string;
    body: string;
    kind: PromptFeedbackKind;
  } | null>(() => {
    const restored = getHeatCapacityRefreshObject(
      initialHeatCapacityRefreshWindows,
      'aboutResultNotice',
    ) as Partial<{ title: string; body: string; kind: PromptFeedbackKind }> | null;
    if (typeof restored?.title !== 'string' || typeof restored.body !== 'string') return null;
    const restoredKind = restored.kind === 'success' || restored.kind === 'warning' || restored.kind === 'danger'
      ? restored.kind
      : 'info';
    return { title: restored.title, body: restored.body, kind: restoredKind };
  });
  const buildNoticeReturnScrollTopRef = useRef(0);
  const buildNoticeRestoreScrollOnReturnRef = useRef(false);
  const aboutResultNoticeTimerRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    const container = document.querySelector<HTMLDivElement>('.studio-build-notice-body');
    if (!container) return;

    if (activeBuildNoticeMaterialId) {
      container.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    if (buildNoticeRestoreScrollOnReturnRef.current) {
      const restoredScrollTop = buildNoticeReturnScrollTopRef.current;
      buildNoticeRestoreScrollOnReturnRef.current = false;
      container.scrollTo({ top: restoredScrollTop, behavior: 'auto' });
    }
  }, [activeBuildNoticeMaterialId]);
  useEffect(() => {
    if (!activeBuildNoticeMaterialId) {
      setBuildNoticeFilePreview(null);
      return;
    }

    const fileConfig = buildNoticeLegalMaterialFiles[activeBuildNoticeMaterialId];
    const previewKind = fileConfig.previewKind;
    if (!previewKind || fileConfig.largeFile || !fileConfig.previewPath) {
      setBuildNoticeFilePreview(null);
      return;
    }

    let cancelled = false;

    const loadPreview = async () => {
      if (hasDesktopLegalReadBridge()) {
        const result = await window.hardSphereLabLegal!.readLegalFile(activeBuildNoticeMaterialId);
        if (!cancelled && result.status === 'ok' && typeof result.content === 'string') {
          setBuildNoticeFilePreview({ id: activeBuildNoticeMaterialId, kind: previewKind, content: result.content });
        } else if (!cancelled) {
          setBuildNoticeFilePreview(null);
        }
        return;
      }

      const response = await fetch(fileConfig.previewPath!);
      if (!response.ok) throw new Error(response.statusText);
      const content = await response.text();
      if (!cancelled) {
        setBuildNoticeFilePreview({ id: activeBuildNoticeMaterialId, kind: previewKind, content });
      }
    };

    loadPreview().catch(() => {
      if (!cancelled) setBuildNoticeFilePreview(null);
    });

    return () => {
      cancelled = true;
    };
  }, [activeBuildNoticeMaterialId]);
  useEffect(() => () => {
    if (aboutResultNoticeTimerRef.current !== null) {
      window.clearTimeout(aboutResultNoticeTimerRef.current);
      aboutResultNoticeTimerRef.current = null;
    }
  }, []);
  const actions = createWorkbenchAuxiliaryWindowActions({
    window, document, aboutCopy, setSettingsGeneralOpen, setSettingsLanguageMenuOpen, setOpenTopMenu, setAboutWindowOpen, setBuildNoticeWindowOpen, setBuildNoticeNavOpen, setActiveBuildNoticeMaterialId, setBuildNoticeFilePreview, setBuildNoticeOpenError, setAboutResultNotice, aboutResultNoticeTimerRef, buildNoticeReturnScrollTopRef, buildNoticeRestoreScrollOnReturnRef,
  });
  return {
    view: { settingsGeneralOpen, aboutWindowOpen, buildNoticeWindowOpen, buildNoticeNavOpen, activeBuildNoticeMaterialId, buildNoticeFilePreview, buildNoticeOpenError, aboutResultNotice },
    actions: { ...actions, hideGeneralSettings: () => setSettingsGeneralOpen(false),
      setBuildNoticeNavigationOpen: (open: boolean) => setBuildNoticeNavOpen(open),
      dismissAboutResultNotice: () => setAboutResultNotice(null),
    },
  };
};
