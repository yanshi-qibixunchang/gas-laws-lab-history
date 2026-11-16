import { useEffect, useRef, useState } from 'react';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import { getProcessReviewCompletionKey, ProcessReviewCompletionTracker, PROCESS_REVIEW_INTRO_STORAGE_KEY } from './workbenchProcessReviewCompletion.ts';

export const useWorkbenchProcessReviewCompletion = ({ files, activeFile, blocked, onOpen }: {
  files: readonly WorkbenchFileState[];
  activeFile: WorkbenchFileState;
  blocked: boolean;
  onOpen: () => void;
}) => {
  const [tracker] = useState(() => new ProcessReviewCompletionTracker(files));
  const pending = useRef<{ fileId: string; key: string } | null>(null);
  const seen = useRef(false);
  const [introFileId, setIntroFileId] = useState<string | null>(null);
  useEffect(() => { setIntroFileId(null); }, [activeFile.id]);
  useEffect(() => {
    const completed = tracker.observe(files);
    const key = getProcessReviewCompletionKey(activeFile);
    if (completed.includes(activeFile.id) && key !== null) pending.current = { fileId: activeFile.id, key };
    if (pending.current && (pending.current.fileId !== activeFile.id || pending.current.key !== key)) pending.current = null;
    if (blocked || !pending.current) return;
    pending.current = null;
    onOpen();
    try { seen.current ||= localStorage.getItem(PROCESS_REVIEW_INTRO_STORAGE_KEY) === '1'; } catch { /* Session-only fallback. */ }
    if (!seen.current) setIntroFileId(activeFile.id);
  }, [activeFile, blocked, files, onOpen, tracker]);

  const markIntroShown = () => {
    seen.current = true;
    try { localStorage.setItem(PROCESS_REVIEW_INTRO_STORAGE_KEY, '1'); } catch { /* Do not block experiment completion. */ }
  };
  return { introFileId, markIntroShown, dismissIntro: () => setIntroFileId(null) };
};
