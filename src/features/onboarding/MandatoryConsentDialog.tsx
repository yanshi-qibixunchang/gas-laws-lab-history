import { CheckCircle2, Circle } from 'lucide-react';
import { useEffect, useRef, useState, type UIEvent } from 'react';
import {
  WorkbenchBuildNoticeWindow,
  type WorkbenchBuildNoticeCopy,
} from '../workbench/WorkbenchBuildNoticeWindow.tsx';
import {
  buildNoticeLegalMaterialFiles,
  buildNoticeSections,
} from '../workbench/workbenchBuildNoticeContent.ts';
import type {
  WorkbenchBuildNoticeFilePreview,
  WorkbenchLegalMaterialId,
} from '../workbench/workbenchBuildNoticeContract.ts';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import type { FirstRunCopy } from './firstRunCopy.ts';
import {
  accumulateVisibleReadingTime,
  getMandatoryConsentRemainingSeconds,
  isMandatoryConsentReady,
  isMandatoryConsentScrollComplete,
} from './mandatoryConsentModel.ts';

interface MandatoryConsentDialogProps {
  language: WorkbenchLanguagePreference;
  copy: FirstRunCopy;
  onAccept: () => Promise<string | null>;
  onDisagree: () => Promise<void> | void;
}

const hasDesktopLegalBridge = () => Boolean(window.hardSphereLabLegal?.openLegalFile);
const hasDesktopLegalReadBridge = () => Boolean(window.hardSphereLabLegal?.readLegalFile);

export const MandatoryConsentDialog = ({
  language,
  copy,
  onAccept,
  onDisagree,
}: MandatoryConsentDialogProps) => {
  const [navOpen, setNavOpen] = useState(false);
  const [activeMaterialId, setActiveMaterialId] = useState<WorkbenchLegalMaterialId | null>(null);
  const [filePreview, setFilePreview] = useState<WorkbenchBuildNoticeFilePreview | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [elapsedVisibleMs, setElapsedVisibleMs] = useState(0);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const mainScrollTopRef = useRef(0);

  useEffect(() => {
    let lastTimestamp = performance.now();
    let visible = document.visibilityState === 'visible';
    const commitInterval = (now: number) => {
      setElapsedVisibleMs((current) => accumulateVisibleReadingTime({
        elapsedMs: current,
        intervalStartMs: lastTimestamp,
        intervalEndMs: now,
        visible,
      }));
      lastTimestamp = now;
    };
    const intervalId = window.setInterval(() => commitInterval(performance.now()), 250);
    const handleVisibilityChange = () => {
      const now = performance.now();
      commitInterval(now);
      visible = document.visibilityState === 'visible';
      lastTimestamp = now;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (activeMaterialId !== null) return undefined;
    const frameId = window.requestAnimationFrame(() => {
      const body = bodyRef.current;
      if (!body) return;
      if (isMandatoryConsentScrollComplete(body)) setScrolledToBottom(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [activeMaterialId]);

  const buildNoticeCopy: WorkbenchBuildNoticeCopy = {
    closeBuildNotice: copy.consent.disagree,
    buildNoticeTitle: copy.consent.title,
    buildNoticeSubtitle: copy.consent.subtitle,
    buildNoticeNavToggle: copy.consent.navigationToggle,
    buildNoticeNavTitle: copy.consent.navigation,
    buildNoticeBack: copy.consent.back,
    buildNoticeOpenLocalFile: copy.consent.openLocalFile,
    buildNoticeOpenInBrowser: copy.consent.openInBrowser,
    buildNoticeLargeFileBody: copy.consent.largeFileBody,
    buildNoticePreviewUnavailable: copy.consent.previewUnavailable,
  };

  const handleBodyScroll = (event: UIEvent<HTMLDivElement>) => {
    if (activeMaterialId !== null) return;
    mainScrollTopRef.current = event.currentTarget.scrollTop;
    if (isMandatoryConsentScrollComplete(event.currentTarget)) setScrolledToBottom(true);
  };

  const openMaterial = async (materialId: WorkbenchLegalMaterialId) => {
    mainScrollTopRef.current = bodyRef.current?.scrollTop ?? mainScrollTopRef.current;
    setActiveMaterialId(materialId);
    setNavOpen(false);
    setFilePreview(null);
    setOpenError(null);
    window.requestAnimationFrame(() => {
      if (bodyRef.current) bodyRef.current.scrollTop = 0;
    });

    const file = buildNoticeLegalMaterialFiles[materialId];
    if (hasDesktopLegalReadBridge()) {
      const result = await window.hardSphereLabLegal!.readLegalFile(materialId).catch((cause) => ({
        status: 'error' as const,
        message: cause instanceof Error ? cause.message : String(cause),
      }));
      if (result.status === 'ok' && typeof result.content === 'string') {
        setFilePreview({
          id: materialId,
          kind: file.previewKind === 'html' ? 'html' : 'text',
          content: result.content,
        });
      } else if (result.status === 'error') {
        setOpenError(result.message ?? copy.consent.previewUnavailable);
      }
      return;
    }
    if (file.previewKind === 'text' && file.previewPath) {
      try {
        const response = await fetch(file.previewPath);
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        setFilePreview({ id: materialId, kind: 'text', content: await response.text() });
      } catch (cause) {
        setOpenError(cause instanceof Error ? cause.message : String(cause));
      }
    }
  };

  const closeMaterial = () => {
    setActiveMaterialId(null);
    setFilePreview(null);
    setOpenError(null);
    window.requestAnimationFrame(() => {
      if (bodyRef.current) bodyRef.current.scrollTop = mainScrollTopRef.current;
    });
  };

  const jumpToSection = (sectionId: string) => {
    const scrollToTarget = () => {
      const target = document.getElementById(`studio-build-notice-section-${sectionId}`);
      if (!target || !bodyRef.current) return;
      bodyRef.current.scrollTo({ top: target.offsetTop - 18, behavior: 'smooth' });
    };
    if (activeMaterialId !== null) {
      setActiveMaterialId(null);
      setFilePreview(null);
      window.requestAnimationFrame(scrollToTarget);
    } else {
      scrollToTarget();
    }
    setNavOpen(false);
  };

  const openLegalFile = async (materialId: WorkbenchLegalMaterialId) => {
    setOpenError(null);
    if (hasDesktopLegalBridge()) {
      const result = await window.hardSphereLabLegal!.openLegalFile(materialId).catch((cause) => ({
        status: 'error' as const,
        message: cause instanceof Error ? cause.message : String(cause),
      }));
      if (result.status === 'error') setOpenError(result.message ?? copy.consent.previewUnavailable);
      return;
    }
    const previewPath = buildNoticeLegalMaterialFiles[materialId].previewPath;
    if (previewPath) {
      window.open(new URL(previewPath, window.location.href).href, '_blank', 'noopener,noreferrer');
    } else {
      setOpenError(copy.consent.previewUnavailable);
    }
  };

  const ready = isMandatoryConsentReady({ elapsedVisibleMs, scrolledToBottom });
  const remainingSeconds = getMandatoryConsentRemainingSeconds(elapsedVisibleMs);
  const accept = async () => {
    if (!ready || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const error = await onAccept();
    if (error) {
      setSubmitError(error);
      setSubmitting(false);
    }
  };

  const footer = (
    <footer className="mandatory-consent-footer">
      <div className="mandatory-consent-requirements" aria-live="polite">
        <span data-complete={scrolledToBottom ? 'true' : 'false'}>
          {scrolledToBottom ? <CheckCircle2 size={14} /> : <Circle size={14} />}
          {scrolledToBottom ? copy.consent.scrollComplete : copy.consent.scrollPending}
        </span>
        <span data-complete={remainingSeconds === 0 ? 'true' : 'false'}>
          {remainingSeconds === 0 ? <CheckCircle2 size={14} /> : <Circle size={14} />}
          {remainingSeconds === 0 ? copy.consent.timeComplete : copy.consent.timePending(remainingSeconds)}
        </span>
        {submitError ? (
          <strong role="alert">{copy.consent.submitErrorTitle}：{submitError}</strong>
        ) : null}
      </div>
      <div className="mandatory-consent-actions">
        <button
          type="button"
          className="first-run-action first-run-action-secondary"
          disabled={submitting}
          onClick={() => { void onDisagree(); }}
        >
          {copy.consent.disagree}
        </button>
        <button
          type="button"
          className="first-run-action first-run-action-primary"
          disabled={!ready || submitting}
          onClick={() => { void accept(); }}
        >
          {submitting ? copy.consent.saving : copy.consent.agree}
        </button>
      </div>
    </footer>
  );

  return (
    <WorkbenchBuildNoticeWindow
      open
      copy={buildNoticeCopy}
      sections={buildNoticeSections[language]}
      legalMaterialFiles={buildNoticeLegalMaterialFiles}
      navOpen={navOpen}
      activeMaterialId={activeMaterialId}
      filePreview={filePreview}
      openError={openError}
      desktopLegalBridgeAvailable={hasDesktopLegalBridge()}
      desktopLegalReadAvailable={hasDesktopLegalReadBridge()}
      dismiss={{ closeButton: false, escape: false, backdrop: false }}
      bodyRef={bodyRef}
      onBodyScroll={handleBodyScroll}
      footer={footer}
      extraDialogClassName="mandatory-consent-window"
      onClose={() => undefined}
      onNavOpenChange={setNavOpen}
      onJumpToSection={jumpToSection}
      onOpenMaterial={(materialId) => { void openMaterial(materialId); }}
      onCloseMaterial={closeMaterial}
      onOpenLegalFile={(materialId) => { void openLegalFile(materialId); }}
    />
  );
};
