import { hasDesktopLegalBridge } from './workbenchDesktopCapabilities.ts';
import { PROMPT_TOAST_DURATION_MS, type PromptFeedbackKind } from '../../components/prompts/promptFeedbackPolicy.ts';
import type { WorkbenchBuildNoticeFilePreview, WorkbenchLegalMaterialId } from './workbenchBuildNoticeContract.ts';
import { buildNoticeLegalMaterialFiles } from './workbenchBuildNoticeContent.ts';
import type { WorkbenchCopy } from './workbenchStudioCopy.ts';

export interface WorkbenchAboutResultNotice { title: string; body: string; kind: PromptFeedbackKind; }
type Ref<T> = { current: T };
export interface WorkbenchAuxiliaryWindowActionPorts {
  window: Window;
  document: Document;
  aboutCopy: WorkbenchCopy['about'];
  setSettingsGeneralOpen: (open: boolean) => void;
  setSettingsLanguageMenuOpen: (open: boolean) => void;
  setOpenTopMenu: (menu: null) => void;
  setAboutWindowOpen: (open: boolean) => void;
  setBuildNoticeWindowOpen: (open: boolean) => void;
  setBuildNoticeNavOpen: (open: boolean) => void;
  setActiveBuildNoticeMaterialId: (id: WorkbenchLegalMaterialId | null) => void;
  setBuildNoticeFilePreview: (preview: WorkbenchBuildNoticeFilePreview | null) => void;
  setBuildNoticeOpenError: (message: string | null) => void;
  setAboutResultNotice: (notice: WorkbenchAboutResultNotice | null) => void;
  aboutResultNoticeTimerRef: Ref<number | null>;
  buildNoticeReturnScrollTopRef: Ref<number>;
  buildNoticeRestoreScrollOnReturnRef: Ref<boolean>;
}

export const createWorkbenchAuxiliaryWindowActions = ({ window, document, aboutCopy, setSettingsGeneralOpen, setSettingsLanguageMenuOpen, setOpenTopMenu, setAboutWindowOpen, setBuildNoticeWindowOpen, setBuildNoticeNavOpen, setActiveBuildNoticeMaterialId, setBuildNoticeFilePreview, setBuildNoticeOpenError, setAboutResultNotice, aboutResultNoticeTimerRef, buildNoticeReturnScrollTopRef, buildNoticeRestoreScrollOnReturnRef }: WorkbenchAuxiliaryWindowActionPorts) => {
  const closeGeneralSettings = () => {
    setSettingsGeneralOpen(false);
    setSettingsLanguageMenuOpen(false);
  };

  const openGeneralSettings = () => {
    setOpenTopMenu(null);
    setAboutWindowOpen(false);
    setSettingsLanguageMenuOpen(false);
    setSettingsGeneralOpen(true);
  };

  const showAboutResultNotice = (
    title: string,
    body: string,
    kind: PromptFeedbackKind = 'info',
  ) => {
    if (aboutResultNoticeTimerRef.current !== null) {
      window.clearTimeout(aboutResultNoticeTimerRef.current);
    }
    setAboutResultNotice({ title, body, kind });
    aboutResultNoticeTimerRef.current = window.setTimeout(() => {
      setAboutResultNotice(null);
      aboutResultNoticeTimerRef.current = null;
    }, PROMPT_TOAST_DURATION_MS.short);
  };

  const closeAboutWindow = () => {
    setAboutWindowOpen(false);
    setBuildNoticeWindowOpen(false);
    resetBuildNoticeTransientState();
    setAboutResultNotice(null);
    if (aboutResultNoticeTimerRef.current !== null) {
      window.clearTimeout(aboutResultNoticeTimerRef.current);
      aboutResultNoticeTimerRef.current = null;
    }
  };

  const openAboutWindow = () => {
    setOpenTopMenu(null);
    setSettingsGeneralOpen(false);
    setSettingsLanguageMenuOpen(false);
    setBuildNoticeWindowOpen(false);
    resetBuildNoticeTransientState();
    setAboutWindowOpen(true);
  };

  const resetBuildNoticeTransientState = () => {
    setBuildNoticeNavOpen(false);
    setActiveBuildNoticeMaterialId(null);
    setBuildNoticeFilePreview(null);
    setBuildNoticeOpenError(null);
    buildNoticeReturnScrollTopRef.current = 0;
    buildNoticeRestoreScrollOnReturnRef.current = false;
  };

  const openBuildNoticeWindow = () => {
    setBuildNoticeWindowOpen(true);
    resetBuildNoticeTransientState();
  };

  const closeBuildNoticeWindow = () => {
    setBuildNoticeWindowOpen(false);
    resetBuildNoticeTransientState();
  };

  const jumpToBuildNoticeSection = (sectionId: string) => {
    setActiveBuildNoticeMaterialId(null);
    setBuildNoticeOpenError(null);
    setBuildNoticeNavOpen(false);
    window.setTimeout(() => {
      const container = document.querySelector<HTMLDivElement>('.studio-build-notice-body');
      const target = document.getElementById(`studio-build-notice-section-${sectionId}`);
      if (!container || !target) return;

      const containerTop = container.getBoundingClientRect().top;
      const targetTop = target.getBoundingClientRect().top;
      const scrollMarginTop = Number.parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0;
      const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
      const nextScrollTop = Math.min(
        maxScrollTop,
        Math.max(0, container.scrollTop + targetTop - containerTop - scrollMarginTop),
      );
      container.scrollTo({ top: nextScrollTop, behavior: 'smooth' });
    }, 90);
  };

  const openBuildNoticeMaterial = (materialId: WorkbenchLegalMaterialId) => {
    const container = document.querySelector<HTMLDivElement>('.studio-build-notice-body');
    buildNoticeReturnScrollTopRef.current = container?.scrollTop ?? 0;
    buildNoticeRestoreScrollOnReturnRef.current = false;
    setActiveBuildNoticeMaterialId(materialId);
    setBuildNoticeNavOpen(false);
    setBuildNoticeOpenError(null);
  };

  const closeBuildNoticeMaterial = () => {
    buildNoticeRestoreScrollOnReturnRef.current = true;
    setActiveBuildNoticeMaterialId(null);
    setBuildNoticeFilePreview(null);
    setBuildNoticeOpenError(null);
  };

  const openBuildNoticeLegalFile = async (materialId: WorkbenchLegalMaterialId) => {
    setBuildNoticeOpenError(null);
    const fileConfig = buildNoticeLegalMaterialFiles[materialId];

    if (hasDesktopLegalBridge()) {
      const result = await window.hardSphereLabLegal!.openLegalFile(materialId);
      if (result.status === 'error') {
        console.error('[Workbench] Failed to open legal material:', result.message);
        setBuildNoticeOpenError(aboutCopy.buildNoticeOpenUnavailable);
      }
      return;
    }

    if (fileConfig.previewPath) {
      window.open(fileConfig.previewPath, '_blank', 'noopener,noreferrer');
      return;
    }

    setBuildNoticeOpenError(aboutCopy.buildNoticeOpenUnavailable);
  };

  return { closeGeneralSettings, openGeneralSettings, showAboutResultNotice, closeAboutWindow, openAboutWindow, resetBuildNoticeTransientState, openBuildNoticeWindow, closeBuildNoticeWindow, jumpToBuildNoticeSection, openBuildNoticeMaterial, closeBuildNoticeMaterial, openBuildNoticeLegalFile };
};
