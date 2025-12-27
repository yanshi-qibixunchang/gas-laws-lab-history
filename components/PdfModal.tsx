import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FileText, Loader2, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerSrc;

interface PdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfPath: string;
  title: string;
  showNotification: (text: string, duration?: number, type?: 'info' | 'success' | 'warning') => void;
}

const PdfModal: React.FC<PdfModalProps> = ({ isOpen, onClose, pdfPath, title, showNotification }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeTimeoutRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [renderTick, setRenderTick] = useState(0);

  const pdfUrl = new URL(pdfPath, window.location.origin).toString();
  const fileName = pdfPath.split('/').pop() ?? 'report.pdf';

  const blobToBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const scheduleRender = () => {
      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = window.setTimeout(() => {
        setRenderTick((prev) => prev + 1);
      }, 150);
    };

    window.addEventListener('resize', scheduleRender);
    window.addEventListener('orientationchange', scheduleRender);
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener('resize', scheduleRender);

    return () => {
      window.removeEventListener('resize', scheduleRender);
      window.removeEventListener('orientationchange', scheduleRender);
      visualViewport?.removeEventListener('resize', scheduleRender);
      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    let loadingTask: ReturnType<typeof getDocument> | null = null;

    const renderPdf = async () => {
      setIsLoading(true);
      setLoadError(null);
      const container = containerRef.current;
      if (!container) {
        setIsLoading(false);
        return;
      }
      container.innerHTML = '';

      loadingTask = getDocument({ url: pdfUrl });
      const pdf = await loadingTask.promise;
      const containerWidth = container.clientWidth || 800;
      const outputScale = window.devicePixelRatio || 1;

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        if (cancelled) break;
        const page = await pdf.getPage(pageNum);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) continue;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        canvas.className = 'w-full h-auto rounded-lg shadow-sm bg-white';
        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        const renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;
        container.appendChild(canvas);
      }
    };

    renderPdf()
      .catch((err) => {
        console.error(err);
        if (!cancelled) setLoadError('Failed to load PDF');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      if (loadingTask) loadingTask.destroy();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [isOpen, pdfUrl, renderTick]);

  const handleExport = useCallback(async () => {
    try {
      if (!Capacitor.isNativePlatform()) {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }

      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status}`);
      }
      const blob = await response.blob();
      const dataUrl = await blobToBase64(blob);
      const base64 = dataUrl.split(',')[1] ?? dataUrl;

      await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache
      });

      const fileUri = await Filesystem.getUri({
        directory: Directory.Cache,
        path: fileName
      });

      await Share.share({
        title,
        url: fileUri.uri,
        dialogTitle: title
      });
    } catch (err) {
      console.error(err);
      showNotification('Export failed', 2000, 'warning');
    }
  }, [fileName, pdfUrl, showNotification, title]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-[121] flex h-full w-full flex-col bg-white dark:bg-slate-900 md:h-[92vh] md:w-[92vw] md:rounded-2xl md:border md:border-slate-200 md:shadow-2xl dark:md:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <FileText size={16} className="text-sciblue-500" />
            <span className="truncate">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-sciblue-400 hover:text-sciblue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-sciblue-400"
              aria-label="Export"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
          {isLoading && (
            <div className="mb-6 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 size={16} className="animate-spin" />
              Loading PDF...
            </div>
          )}
          {loadError && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-900/30 dark:text-amber-300">
              {loadError}
            </div>
          )}
          <div ref={containerRef} className="mx-auto w-full max-w-4xl space-y-6" />
        </div>
      </div>
    </div>
  );
};

export default PdfModal;
