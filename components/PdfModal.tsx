import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileText, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerSrc;

const ZOOM_MIN = 0.8;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.2;
const PAGE_GAP = 24;
const HIGH_RES_NEARBY_PAGES = 1;
const LOW_RES_PREVIEW_SCALE = 0.4;
const LOW_RES_OUTPUT_SCALE = 0.75;

interface PdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfPath: string;
  title: string;
  exportLabel: string;
  exportFailedMessage: string;
  showNotification: (text: string, duration?: number, type?: 'info' | 'success' | 'warning') => void;
  supportsHover?: boolean;
}

const PdfModal: React.FC<PdfModalProps> = ({
  isOpen,
  onClose,
  pdfPath,
  title,
  exportLabel,
  exportFailedMessage,
  showNotification,
  supportsHover = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const resizeTimeoutRef = useRef<number | null>(null);
  const zoomRef = useRef(1);
  const pinchStateRef = useRef({
    active: false,
    startDist: 0,
    startZoom: 1,
    startScrollLeft: 0,
    startScrollTop: 0,
    offsetLeft: 0,
    offsetTop: 0,
    contentX: 0,
    contentY: 0,
    lastDist: 0,
    smoothDist: 0,
    lastCenterX: 0,
    lastCenterY: 0
  });
  const pinchRafRef = useRef<number | null>(null);
  const pendingPinchRef = useRef<{ dist: number; centerX: number; centerY: number } | null>(null);
  const pendingAnchorRef = useRef<{
    contentX: number;
    contentY: number;
    centerX: number;
    centerY: number;
  } | null>(null);
  const previewTransformRef = useRef<{ scale: number; tx: number; ty: number } | null>(null);
  const clearPreviewOnRenderRef = useRef(false);
  const releaseZoomRef = useRef<number | null>(null);
  const pinchZoomRef = useRef<number | null>(null);
  const latestPinchZoomRef = useRef(1);
  const pinchIdleTimeoutRef = useRef<number | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const focusPageRef = useRef(1);
  const renderTokenRef = useRef(0);
  const renderingRef = useRef(false);
  const pendingRenderRef = useRef<{ zoom: number; url: string } | null>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const pdfUrlRef = useRef<string | null>(null);
  const pdfLoadRef = useRef<Promise<PDFDocumentProxy> | null>(null);
  const pageSizesRef = useRef<Array<{ width: number; height: number }> | null>(null);
  const forceFullRenderRef = useRef(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [renderTick, setRenderTick] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pinchZoom, setPinchZoom] = useState<number | null>(null);

  const clampZoom = useCallback(
    (value: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(value.toFixed(2)))),
    []
  );

  const displayZoom = pinchZoom ?? zoom;
  const zoomPercent = Math.round(displayZoom * 100);
  const canZoomOut = displayZoom > ZOOM_MIN + 0.01;
  const canZoomIn = displayZoom < ZOOM_MAX - 0.01;

  const setPinchZoomValue = useCallback((value: number | null) => {
    if (value === null) {
      pinchZoomRef.current = null;
      setPinchZoom(null);
      return;
    }
    const previous = pinchZoomRef.current;
    if (previous !== null && Math.abs(previous - value) < 0.005) return;
    pinchZoomRef.current = value;
    setPinchZoom(value);
  }, []);

  const applyPreviewTransform = useCallback((scale: number, tx: number, ty: number) => {
    const container = containerRef.current;
    if (!container) return;
    container.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    container.style.transformOrigin = '0 0';
    container.style.willChange = 'transform';
    previewTransformRef.current = { scale, tx, ty };
  }, []);

  const clearPreviewTransform = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    container.style.transform = '';
    container.style.transformOrigin = '';
    container.style.willChange = '';
    previewTransformRef.current = null;
  }, []);

  const captureViewportAnchor = useCallback(() => {
    const scrollArea = scrollAreaRef.current;
    const container = containerRef.current;
    if (!scrollArea || !container) return null;

    const scrollRect = scrollArea.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const centerX = scrollArea.clientWidth / 2;
    const centerY = scrollArea.clientHeight / 2;
    const offsetLeft = containerRect.left - scrollRect.left + scrollArea.scrollLeft;
    const offsetTop = containerRect.top - scrollRect.top + scrollArea.scrollTop;

    return {
      contentX: (scrollArea.scrollLeft + centerX - offsetLeft) / zoomRef.current,
      contentY: (scrollArea.scrollTop + centerY - offsetTop) / zoomRef.current,
      centerX,
      centerY
    };
  }, []);

  const queueAnchoredZoom = useCallback((nextZoom: number) => {
    const clamped = clampZoom(nextZoom);
    const anchor = captureViewportAnchor();
    setPinchZoomValue(null);
    if (anchor) {
      pendingAnchorRef.current = anchor;
      clearPreviewOnRenderRef.current = true;
      releaseZoomRef.current = clamped;
    } else {
      pendingAnchorRef.current = null;
      clearPreviewOnRenderRef.current = false;
      releaseZoomRef.current = null;
    }
    latestPinchZoomRef.current = clamped;
    setZoom(clamped);
  }, [captureViewportAnchor, clampZoom, setPinchZoomValue]);

  const handleZoomOut = () => {
    queueAnchoredZoom(zoomRef.current - ZOOM_STEP);
  };
  const handleZoomIn = () => {
    queueAnchoredZoom(zoomRef.current + ZOOM_STEP);
  };
  const handleZoomReset = () => {
    queueAnchoredZoom(1);
  };

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
    if (isOpen) {
      setZoom(1);
      setPinchZoomValue(null);
      zoomRef.current = 1;
      latestPinchZoomRef.current = 1;
      forceFullRenderRef.current = false;
      releaseZoomRef.current = null;
    }
  }, [isOpen, setPinchZoomValue]);

  useEffect(() => {
    if (isOpen) return;
    if (containerRef.current) containerRef.current.innerHTML = '';
    clearPreviewTransform();
    clearPreviewOnRenderRef.current = false;
    if (pinchIdleTimeoutRef.current) {
      window.clearTimeout(pinchIdleTimeoutRef.current);
      pinchIdleTimeoutRef.current = null;
    }
    pendingAnchorRef.current = null;
    releaseZoomRef.current = null;
    pinchZoomRef.current = null;
    pageSizesRef.current = null;
    forceFullRenderRef.current = false;
    focusPageRef.current = 1;
    if (scrollRafRef.current) {
      window.cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
    renderTokenRef.current += 1;
    pendingRenderRef.current = null;
    renderingRef.current = false;
    pdfDocRef.current?.destroy();
    pdfDocRef.current = null;
    pdfUrlRef.current = null;
    pdfLoadRef.current = null;
  }, [isOpen, clearPreviewTransform]);

  useEffect(() => {
    if (!isOpen || !Capacitor.isNativePlatform()) return;
    let active = true;
    let listenerHandle: Awaited<ReturnType<typeof App.addListener>> | null = null;
    App.addListener('backButton', () => {
      onClose();
    }).then((handle) => {
      if (!active) {
        handle.remove();
        return;
      }
      listenerHandle = handle;
    });

    return () => {
      active = false;
      listenerHandle?.remove();
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
    const scrollArea = scrollAreaRef.current;
    const container = containerRef.current;
    if (!scrollArea || !container) return;

    const updateFocusedPage = () => {
      scrollRafRef.current = null;
      if (pinchStateRef.current.active) return;

      const wrappers = Array.from(container.querySelectorAll<HTMLDivElement>('[data-page]'));
      if (!wrappers.length) return;

      const centerY = scrollArea.scrollTop + scrollArea.clientHeight / 2;
      let nextFocusPage = Number(wrappers[0].dataset.page ?? 1);
      for (const wrapper of wrappers) {
        const top = wrapper.offsetTop;
        const bottom = top + wrapper.offsetHeight + PAGE_GAP / 2;
        nextFocusPage = Number(wrapper.dataset.page ?? nextFocusPage);
        if (centerY < bottom) break;
      }

      if (nextFocusPage !== focusPageRef.current) {
        focusPageRef.current = nextFocusPage;
        setRenderTick((prev) => prev + 1);
      }
    };

    const handleScroll = () => {
      if (scrollRafRef.current !== null) return;
      scrollRafRef.current = window.requestAnimationFrame(updateFocusedPage);
    };

    scrollArea.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollArea.removeEventListener('scroll', handleScroll);
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [isOpen]);

  const applyAnchorScroll = useCallback(
    (anchor: { contentX: number; contentY: number; centerX: number; centerY: number }, zoomValue: number) => {
      const scrollArea = scrollAreaRef.current;
      const container = containerRef.current;
      if (!scrollArea || !container) return;
      const scrollRect = scrollArea.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const offsetLeft = containerRect.left - scrollRect.left + scrollArea.scrollLeft;
      const offsetTop = containerRect.top - scrollRect.top + scrollArea.scrollTop;
      const targetLeft = offsetLeft + anchor.contentX * zoomValue - anchor.centerX;
      const targetTop = offsetTop + anchor.contentY * zoomValue - anchor.centerY;
      const maxLeft = Math.max(0, scrollArea.scrollWidth - scrollArea.clientWidth);
      const maxTop = Math.max(0, scrollArea.scrollHeight - scrollArea.clientHeight);
      scrollArea.scrollLeft = Math.max(0, Math.min(maxLeft, targetLeft));
      scrollArea.scrollTop = Math.max(0, Math.min(maxTop, targetTop));
    },
    []
  );

  // Real-time pinch preview: keep gestures responsive, render after pinch ends.
  useEffect(() => {
    if (!isOpen) return;
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const getDistance = (touches: TouchList) => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    };

    const distSmoothFactor = 0.22;
    const idleRenderDelayMs = 140;

    const scheduleIdleRender = () => {
      if (pinchIdleTimeoutRef.current) {
        window.clearTimeout(pinchIdleTimeoutRef.current);
      }
      pinchIdleTimeoutRef.current = window.setTimeout(() => {
        if (!pinchStateRef.current.active) return;
        const targetZoom = clampZoom(latestPinchZoomRef.current);
        setZoom(targetZoom);
      }, idleRenderDelayMs);
    };

    const applyPinch = () => {
      pinchRafRef.current = null;
      const pending = pendingPinchRef.current;
      if (!pending || !pinchStateRef.current.active) return;
      pendingPinchRef.current = null;

      const state = pinchStateRef.current;
      const prevSmoothDist = state.smoothDist || pending.dist;
      const smoothDist = prevSmoothDist + (pending.dist - prevSmoothDist) * distSmoothFactor;
      state.smoothDist = smoothDist;
      state.lastDist = pending.dist;
      state.lastCenterX = pending.centerX;
      state.lastCenterY = pending.centerY;

      const ratio = smoothDist / state.startDist;
      const nextZoom = clampZoom(state.startZoom * ratio);
      const scale = nextZoom / state.startZoom;
      const tx =
        pending.centerX +
        state.startScrollLeft -
        state.offsetLeft -
        state.contentX * nextZoom;
      const ty =
        pending.centerY +
        state.startScrollTop -
        state.offsetTop -
        state.contentY * nextZoom;
      applyPreviewTransform(scale, tx, ty);
      latestPinchZoomRef.current = nextZoom;
      pendingAnchorRef.current = {
        contentX: state.contentX,
        contentY: state.contentY,
        centerX: pending.centerX,
        centerY: pending.centerY
      };
      setPinchZoomValue(nextZoom);
      scheduleIdleRender();
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      const startDist = getDistance(event.touches);
      if (!startDist) return;
      const container = containerRef.current;
      if (!container) return;
      const scrollRect = scrollArea.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const centerX =
        (event.touches[0].clientX + event.touches[1].clientX) / 2 - scrollRect.left;
      const centerY =
        (event.touches[0].clientY + event.touches[1].clientY) / 2 - scrollRect.top;
      const baseZoom = zoomRef.current;
      const startScrollLeft = scrollArea.scrollLeft;
      const startScrollTop = scrollArea.scrollTop;
      const offsetLeft = containerRect.left - scrollRect.left + scrollArea.scrollLeft;
      const offsetTop = containerRect.top - scrollRect.top + scrollArea.scrollTop;
      const contentX = (scrollArea.scrollLeft + centerX - offsetLeft) / baseZoom;
      const contentY = (scrollArea.scrollTop + centerY - offsetTop) / baseZoom;
      pinchStateRef.current = {
        active: true,
        startDist,
        startZoom: baseZoom,
        startScrollLeft,
        startScrollTop,
        offsetLeft,
        offsetTop,
        contentX,
        contentY,
        lastDist: startDist,
        smoothDist: startDist,
        lastCenterX: centerX,
        lastCenterY: centerY
      };
      latestPinchZoomRef.current = baseZoom;
      applyPreviewTransform(1, 0, 0);
      clearPreviewOnRenderRef.current = false;
      releaseZoomRef.current = null;
      if (pinchIdleTimeoutRef.current) {
        window.clearTimeout(pinchIdleTimeoutRef.current);
        pinchIdleTimeoutRef.current = null;
      }
      forceFullRenderRef.current = false;
      setPinchZoomValue(baseZoom);
      event.preventDefault();
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!pinchStateRef.current.active || event.touches.length !== 2) return;
      const currentDist = getDistance(event.touches);
      const startDist = pinchStateRef.current.startDist;
      if (!currentDist || !startDist) return;
      const scrollRect = scrollArea.getBoundingClientRect();
      const centerX =
        (event.touches[0].clientX + event.touches[1].clientX) / 2 - scrollRect.left;
      const centerY =
        (event.touches[0].clientY + event.touches[1].clientY) / 2 - scrollRect.top;
      pendingPinchRef.current = { dist: currentDist, centerX, centerY };
      if (!pinchRafRef.current) {
        pinchRafRef.current = window.requestAnimationFrame(applyPinch);
      }
      event.preventDefault();
    };

    const endPinch = () => {
      if (!pinchStateRef.current.active) return;
      if (pinchRafRef.current) {
        window.cancelAnimationFrame(pinchRafRef.current);
        pinchRafRef.current = null;
      }
      if (pendingPinchRef.current) applyPinch();
      const state = pinchStateRef.current;
      const finalZoom = clampZoom(
        state.startDist ? state.startZoom * (state.lastDist / state.startDist) : state.startZoom
      );
      const centerX = state.lastCenterX;
      const centerY = state.lastCenterY;
      pinchStateRef.current.active = false;
      pendingPinchRef.current = null;
      if (pinchIdleTimeoutRef.current) {
        window.clearTimeout(pinchIdleTimeoutRef.current);
        pinchIdleTimeoutRef.current = null;
      }
      const scale = finalZoom / state.startZoom;
      const tx =
        centerX +
        state.startScrollLeft -
        state.offsetLeft -
        state.contentX * finalZoom;
      const ty =
        centerY +
        state.startScrollTop -
        state.offsetTop -
        state.contentY * finalZoom;
      applyPreviewTransform(scale, tx, ty);
      pendingAnchorRef.current = {
        contentX: state.contentX,
        contentY: state.contentY,
        centerX,
        centerY
      };
      clearPreviewOnRenderRef.current = true;
      releaseZoomRef.current = finalZoom;
      setPinchZoomValue(null);
      latestPinchZoomRef.current = finalZoom;
      setZoom(finalZoom);
      forceFullRenderRef.current = true;
      setRenderTick((prev) => prev + 1);
    };

    scrollArea.addEventListener('touchstart', handleTouchStart, { passive: false });
    scrollArea.addEventListener('touchmove', handleTouchMove, { passive: false });
    scrollArea.addEventListener('touchend', endPinch);
    scrollArea.addEventListener('touchcancel', endPinch);

    return () => {
      scrollArea.removeEventListener('touchstart', handleTouchStart);
      scrollArea.removeEventListener('touchmove', handleTouchMove);
      scrollArea.removeEventListener('touchend', endPinch);
      scrollArea.removeEventListener('touchcancel', endPinch);
      if (pinchRafRef.current) {
        window.cancelAnimationFrame(pinchRafRef.current);
        pinchRafRef.current = null;
      }
      pendingPinchRef.current = null;
      pendingAnchorRef.current = null;
      if (pinchIdleTimeoutRef.current) {
        window.clearTimeout(pinchIdleTimeoutRef.current);
        pinchIdleTimeoutRef.current = null;
      }
      clearPreviewTransform();
      setPinchZoomValue(null);
    };
  }, [isOpen, clampZoom, applyPreviewTransform, clearPreviewTransform, setPinchZoomValue]);

  const renderPdf = useCallback(
    async (targetZoom: number, targetUrl: string, token: number) => {
      const isStale = () => renderTokenRef.current !== token;
      try {
        if (isStale()) return;
        setLoadError(null);
        const container = containerRef.current;
        if (!container) return;

        let pdf = pdfDocRef.current;
        if (!pdf || pdfUrlRef.current !== targetUrl) {
          pdfUrlRef.current = targetUrl;
          const task = getDocument({ url: targetUrl });
          pdfLoadRef.current = task.promise;
          pdf = await task.promise;
          if (isStale()) return;
          pdfDocRef.current = pdf;
          pdfLoadRef.current = null;
        } else if (pdfLoadRef.current) {
          pdf = await pdfLoadRef.current;
        }
        if (isStale()) return;

        let pageSizes = pageSizesRef.current;
        if (!pageSizes || pageSizes.length !== pdf.numPages) {
          pageSizes = [];
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
            if (isStale()) return;
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1 });
            pageSizes.push({ width: viewport.width, height: viewport.height });
          }
          pageSizesRef.current = pageSizes;
        }

        const scrollArea = scrollAreaRef.current;
        const scrollStyles = scrollArea ? window.getComputedStyle(scrollArea) : null;
        const paddingX = scrollStyles
          ? parseFloat(scrollStyles.paddingLeft) + parseFloat(scrollStyles.paddingRight)
          : 0;
        const paddingTop = scrollStyles ? parseFloat(scrollStyles.paddingTop) : 0;
        const availableWidth = scrollArea ? scrollArea.clientWidth - paddingX : container.clientWidth;
        const baseWidth = availableWidth > 0 ? availableWidth : (container.clientWidth || 800);
        const scaledWidth = Math.max(1, Math.floor(baseWidth * targetZoom));
        const baseOutputScale = window.devicePixelRatio || 1;
        const fragment = document.createDocumentFragment();
        const isPinching = pinchStateRef.current.active;
        const highResOutputScale = isPinching ? Math.max(0.75, Math.min(1, baseOutputScale)) : baseOutputScale;
        const lowResOutputScale = Math.max(0.55, Math.min(LOW_RES_OUTPUT_SCALE, baseOutputScale));

        const pageLayouts: Array<{
          top: number;
          height: number;
          width: number;
          scale: number;
        }> = [];
        let cursorY = 0;
        for (const size of pageSizes) {
          const pageScale = (baseWidth / size.width) * targetZoom;
          const pageWidth = size.width * pageScale;
          const pageHeight = size.height * pageScale;
          pageLayouts.push({ top: cursorY, height: pageHeight, width: pageWidth, scale: pageScale });
          cursorY += pageHeight + PAGE_GAP;
        }

        let focusPage = focusPageRef.current;
        if (pageLayouts.length > 0 && scrollArea) {
          let focusY = scrollArea.scrollTop - paddingTop + scrollArea.clientHeight / 2;
          const anchor = pendingAnchorRef.current;
          if (anchor) {
            focusY = anchor.contentY * targetZoom;
          }
          focusY = Math.max(0, focusY);
          for (let index = 0; index < pageLayouts.length; index += 1) {
            const { top, height } = pageLayouts[index];
            focusPage = index + 1;
            if (focusY < top + height + PAGE_GAP / 2) {
              break;
            }
          }
        }
        focusPageRef.current = focusPage;

        const highResPages = new Set<number>();
        for (let offset = -HIGH_RES_NEARBY_PAGES; offset <= HIGH_RES_NEARBY_PAGES; offset += 1) {
          const pageNum = focusPage + offset;
          if (pageNum >= 1 && pageNum <= pdf.numPages) highResPages.add(pageNum);
        }

        const wrappers: HTMLDivElement[] = [];
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          if (isStale()) return;
          const layout = pageLayouts[pageNum - 1];
          const wrapper = document.createElement('div');
          wrapper.dataset.page = String(pageNum);
          wrapper.className =
            'w-full overflow-hidden rounded-lg bg-white shadow-sm dark:bg-slate-900/60';
          wrapper.style.height = `${layout.height}px`;
          wrapper.classList.add('bg-slate-100', 'dark:bg-slate-800/40');
          fragment.appendChild(wrapper);
          wrappers.push(wrapper);
        }

        if (isStale()) return;
        container.style.width = `${scaledWidth}px`;
        container.style.maxWidth = targetZoom > 1 ? 'none' : '';
        container.style.margin = targetZoom <= 1 ? '0 auto' : '0';
        container.replaceChildren(fragment);
        zoomRef.current = targetZoom;
        const shouldRestoreAnchorImmediately =
          clearPreviewOnRenderRef.current &&
          !previewTransformRef.current &&
          releaseZoomRef.current !== null &&
          Math.abs(releaseZoomRef.current - targetZoom) < 0.001;
        if (shouldRestoreAnchorImmediately) {
          const restore = pendingAnchorRef.current;
          if (restore && scrollArea) {
            applyAnchorScroll(restore, targetZoom);
            if (pendingAnchorRef.current === restore) {
              pendingAnchorRef.current = null;
            }
          }
          clearPreviewOnRenderRef.current = false;
          releaseZoomRef.current = null;
        }
        if (forceFullRenderRef.current && !pinchStateRef.current.active) {
          forceFullRenderRef.current = false;
        }

        const renderPageIntoWrapper = async (pageNum: number, mode: 'high' | 'preview') => {
          if (isStale()) return;
          const layout = pageLayouts[pageNum - 1];
          const wrapper = wrappers[pageNum - 1];
          if (!wrapper || !layout) return;
          const page = await pdf.getPage(pageNum);
          const viewportScale = mode === 'high' ? layout.scale : layout.scale * LOW_RES_PREVIEW_SCALE;
          const viewport = page.getViewport({ scale: viewportScale });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) return;
          const outputScale = mode === 'high' ? highResOutputScale : lowResOutputScale;
          canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
          canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
          canvas.style.width = `${layout.width}px`;
          canvas.style.height = `${layout.height}px`;
          canvas.className = mode === 'high' ? 'block h-full w-full' : 'block h-full w-full opacity-90';
          if (mode === 'preview') {
            canvas.style.filter = 'blur(0.25px)';
          }
          context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
          const renderTask = page.render({ canvasContext: context, viewport });
          await renderTask.promise;
          wrapper.classList.remove('bg-slate-100', 'dark:bg-slate-800/40');
          wrapper.replaceChildren(canvas);
        };

        const finalizePreviewAnchor = () => {
          const shouldFinalizePreview =
            clearPreviewOnRenderRef.current &&
            !pinchStateRef.current.active &&
            releaseZoomRef.current !== null &&
            Math.abs(releaseZoomRef.current - targetZoom) < 0.001;
          if (!shouldFinalizePreview) return;

          const restore = pendingAnchorRef.current;
          if (restore && scrollArea && container) {
            applyAnchorScroll(restore, targetZoom);
            if (pendingAnchorRef.current === restore) {
              pendingAnchorRef.current = null;
            }
          }
          clearPreviewOnRenderRef.current = false;
          releaseZoomRef.current = null;
          clearPreviewTransform();
        };

        const orderedHighResPages = Array.from(highResPages).sort((a, b) => Math.abs(a - focusPage) - Math.abs(b - focusPage));
        for (const pageNum of orderedHighResPages) {
          await renderPageIntoWrapper(pageNum, 'high');
        }

        if (isStale()) return;
        finalizePreviewAnchor();

        if (!isPinching) {
          const previewPages: number[] = [];
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
            if (!highResPages.has(pageNum)) previewPages.push(pageNum);
          }

          for (const pageNum of previewPages) {
            await renderPageIntoWrapper(pageNum, 'preview');
            if (isStale()) return;
            await new Promise<void>((resolve) => {
              window.requestAnimationFrame(() => resolve());
            });
          }
        }

        if (isStale()) return;
        finalizePreviewAnchor();
      } catch (err) {
        console.error(err);
        if (renderTokenRef.current === token) setLoadError('Failed to load PDF');
      }
    },
    [applyAnchorScroll, clearPreviewTransform]
  );

  const startRender = useCallback(async () => {
    if (renderingRef.current) return;
    renderingRef.current = true;
    while (pendingRenderRef.current) {
      const next = pendingRenderRef.current;
      pendingRenderRef.current = null;
      const token = (renderTokenRef.current += 1);
      await renderPdf(next.zoom, next.url, token);
    }
    renderingRef.current = false;
  }, [renderPdf]);

  const requestRender = useCallback(
    (targetZoom: number, targetUrl: string) => {
      pendingRenderRef.current = { zoom: targetZoom, url: targetUrl };
      if (renderingRef.current) {
        renderTokenRef.current += 1;
        return;
      }
      startRender();
    },
    [startRender]
  );

  useEffect(() => {
    if (!isOpen) return;
    requestRender(zoom, pdfUrl);
  }, [isOpen, pdfUrl, renderTick, zoom, requestRender]);

  const handleExport = useCallback(async () => {
    try {
      if (!Capacitor.isNativePlatform()) {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = fileName;
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
        showNotification(exportFailedMessage, 2000, 'warning');
      }
  }, [exportFailedMessage, fileName, pdfUrl, showNotification, title]);

  if (!isOpen || typeof document === 'undefined') return null;

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="pdf-modal relative z-[201] flex h-full w-full flex-col bg-white dark:bg-slate-900 md:h-[92vh] md:w-[92vw] md:rounded-2xl md:border md:border-slate-200 md:shadow-2xl dark:md:border-slate-800">
        <div className="pdf-modal-toolbar flex items-center justify-between border-b border-slate-200 bg-white/80 pb-2 pt-[calc(env(safe-area-inset-top)+6px)] pl-[calc(12px+env(safe-area-inset-left))] pr-[calc(12px+env(safe-area-inset-right))] backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:pb-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <FileText size={16} className="text-sciblue-500" />
            <span className="truncate">{title}</span>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1 py-1 text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={!canZoomOut}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${supportsHover ? 'hover:text-sciblue-600' : ''}`}
                title="Zoom out"
                aria-label="Zoom out"
              >
                <ZoomOut size={14} />
              </button>
              <button
                type="button"
                onClick={handleZoomReset}
                className={`w-12 px-2 text-center text-[10px] font-semibold uppercase tabular-nums tracking-wide text-slate-500 transition dark:text-slate-300 ${supportsHover ? 'hover:text-sciblue-600' : ''}`}
                title="Reset zoom"
                aria-label="Reset zoom"
              >
                {zoomPercent}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={!canZoomIn}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${supportsHover ? 'hover:text-sciblue-600' : ''}`}
                title="Zoom in"
                aria-label="Zoom in"
              >
                <ZoomIn size={14} />
              </button>
            </div>
            <button
              type="button"
              onClick={handleExport}
              className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 ${supportsHover ? 'hover:border-sciblue-400 hover:text-sciblue-600 dark:hover:border-sciblue-400' : ''}`}
                aria-label={exportLabel}
              >
                <Download size={14} />
                <span className="hidden sm:inline">{exportLabel}</span>
              </button>
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 ${supportsHover ? 'hover:text-slate-800' : ''}`}
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <div
          ref={scrollAreaRef}
          className="pdf-modal-scroll flex-1 overflow-y-auto overflow-x-auto px-4 py-6 md:px-6"
          style={{ touchAction: 'pan-x pan-y' }}
        >
          {loadError && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-900/30 dark:text-amber-300">
              {loadError}
            </div>
          )}
          <div ref={containerRef} className="pdf-modal-pages mx-auto w-full max-w-4xl space-y-6" />
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default PdfModal;
