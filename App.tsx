import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Box, Activity, Globe, ChevronRight, Lock, Unlock, MousePointer2, User, Atom, AlertCircle, CheckCircle2, PanelLeftClose, SlidersHorizontal, X, Undo2, LayoutDashboard, Moon, Sun, ArrowLeft, Save, Download, Trash2, Archive, ShieldCheck, ChevronDown, LogOut, Info, Check, FolderPlus, MoreHorizontal, Pencil } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { PhysicsEngine } from './services/PhysicsEngine';
import { SimulationParams, SimulationStats, ChartData, LanguageCode, SavedConfig, InputCapabilities, Translation } from './types';
import { translations } from './services/translations';
import SimulationCanvas from './components/SimulationCanvas';
import CollapsibleCard from './components/CollapsibleCard';
import StatsPanel from './components/StatsPanel';
import Footer from './components/Footer';

// Default Constants
const DEFAULT_PARAMS: SimulationParams = {
  L: 15,
  N: 200,
  r: 0.2,
  m: 1.0,
  k: 1.0,
  dt: 0.01,
  nu: 1.0, 
  equilibriumTime: 10,
  statsDuration: 60
};

const APP_VERSION = '3.4.3';

const areParamsEqual = (a: SimulationParams, b: SimulationParams) => (
  a.N === b.N &&
  a.L === b.L &&
  a.r === b.r &&
  a.m === b.m &&
  a.k === b.k &&
  a.dt === b.dt &&
  a.nu === b.nu &&
  a.equilibriumTime === b.equilibriumTime &&
  a.statsDuration === b.statsDuration
);

const isEditableElement = (element: Element | null) => {
  if (!(element instanceof HTMLElement)) return false;
  const tagName = element.tagName;
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    element.isContentEditable
  );
};

const mediaMatches = (query: string) =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(query).matches;

const isTouchLikeViewport = () => {
  const coarsePointer = mediaMatches('(pointer: coarse)');
  const noHover = mediaMatches('(hover: none)');
  const finePointer = mediaMatches('(pointer: fine)');
  const supportsHover = mediaMatches('(hover: hover)');
  const hasTouchPoints = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;

  if (coarsePointer || noHover) return true;
  if (finePointer && supportsHover) return false;
  return hasTouchPoints;
};

const DistributionCharts = lazy(() => import('./components/DistributionCharts'));
const StackedResults = lazy(() => import('./components/StackedResults'));

const ChartPanelFallback: React.FC<{ heightClass: string }> = ({ heightClass }) => (
  <div className={`w-full ${heightClass} animate-pulse rounded-lg border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700/70 dark:bg-slate-800/60`}>
    <div className="mb-4 h-3 w-32 rounded bg-slate-200 dark:bg-slate-700" />
    <div className="grid h-[calc(100%-1rem)] grid-cols-6 gap-2">
      {Array.from({ length: 18 }).map((_, index) => (
        <div
          key={index}
          className="self-end rounded-t bg-gradient-to-t from-sciblue-200 to-sciblue-100 dark:from-sciblue-800/60 dark:to-sciblue-700/20"
          style={{ height: `${35 + ((index * 17) % 55)}%` }}
        />
      ))}
    </div>
  </div>
);

const ResultsPlaceholder: React.FC<{ t: Translation; lang: LanguageCode }> = ({ t, lang }) => {
  const isEnglishUI = lang.startsWith('en');

  return (
  <div className="relative overflow-hidden rounded-lg border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_45%)]" />
    <div className="relative">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className={`text-slate-400 dark:text-slate-500 ${isEnglishUI ? 'text-[10px] font-bold uppercase tracking-[0.18em]' : 'text-xs font-semibold tracking-[0.04em]'}`}>{t.views.finalStats}</div>
          <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{t.stats.collecting}</div>
        </div>
        <div className={`rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300 ${isEnglishUI ? 'text-[10px] font-bold uppercase tracking-[0.16em]' : 'text-[11px] font-semibold tracking-[0.04em]'}`}>
          {t.stats.overallProgress}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-700/80 dark:bg-slate-800/60">
            <div className="mb-3 h-3 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-44 animate-pulse rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700" />
          </div>
        ))}
      </div>
    </div>
  </div>
  );
};

function App() {
  // Language State
  const [lang, setLang] = useState<LanguageCode>('zh-CN');
  const t = translations[lang];

  // Dark Mode State - Default to FALSE (Light Mode)
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Simulation State
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [activeParams, setActiveParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [isRunning, setIsRunning] = useState(false);
  
  // UI Control State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [needsReset, setNeedsReset] = useState(false);
  const [isLandscapeMode, setIsLandscapeMode] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0, visualHeight: 0, visualOffsetTop: 0 });
  const [inputCapabilities, setInputCapabilities] = useState<InputCapabilities>({
    supportsHover: false,
    finePointer: false,
    touchLike: false,
    isCompactLandscape: false,
    isCompactWidth: false
  });
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  
  // KEYBOARD/SHORT SCREEN DETECTION
  // When keyboard is open, height shrinks significantly. We need to detect this to change layout.
  const [isShortHeight, setIsShortHeight] = useState(false);
  const viewportBaselineRef = useRef({ portrait: 0, landscape: 0 });
  const keyboardOpenRef = useRef(false);
  const keyboardResetRef = useRef<number | null>(null);

  // SECTION COLLAPSE STATES
  // Default: Storage Expanded, Params Expanded
  const [isStorageOpen, setIsStorageOpen] = useState(true);
  const [isParamsOpen, setIsParamsOpen] = useState(true);
  
  // Startup guide state
  const [showSidebarGuide, setShowSidebarGuide] = useState(false);
  const [hasOpenedSidebarOnce, setHasOpenedSidebarOnce] = useState(false);
  const [hasStartedOnce, setHasStartedOnce] = useState(false);

  // Storage State
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [newConfigName, setNewConfigName] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isCreatePresetModalOpen, setIsCreatePresetModalOpen] = useState(false);
  const [presetModalMode, setPresetModalMode] = useState<'create' | 'rename'>('create');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetActionMenu, setPresetActionMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const [deleteConfirmConfig, setDeleteConfirmConfig] = useState<SavedConfig | null>(null);
  const [isPdfOpen, setIsPdfOpen] = useState(false);

  const [stats, setStats] = useState<SimulationStats>({
    time: 0, temperature: 0, pressure: 0, meanSpeed: 0, rmsSpeed: 0,
    isEquilibrated: false, progress: 0, phase: 'idle'
  });
  
  const [chartData, setChartData] = useState<ChartData>({ speed: [], energy: [], energyLog: [], tempHistory: [] });
  const [finalChartData, setFinalChartData] = useState<ChartData | null>(null);

  // Interaction State
  const [isCanvasLocked, setIsCanvasLocked] = useState(false);
  
  // Notification State with unique ID for animation resetting
  const [notification, setNotification] = useState<{text: string, visible: boolean, type?: 'info'|'success'|'warning', id: number, position: 'bottom'|'center'}>({ text: '', visible: false, type: 'info', id: 0, position: 'bottom' });
  const notificationTimeoutRef = useRef<number>(0);
  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const topElasticRef = useRef<HTMLDivElement | null>(null);
  const bottomElasticRef = useRef<HTMLDivElement | null>(null);
  const edgeElasticStateRef = useRef({
    top: { current: 0, target: 0 },
    bottom: { current: 0, target: 0 },
    raf: 0
  });
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const langMenuRef = useRef<HTMLDivElement | null>(null);
  const presetNameInputRef = useRef<HTMLInputElement | null>(null);
  const presetActionMenuRef = useRef<HTMLDivElement | null>(null);
  const interactionRafRef = useRef<number>(0);
  const [interactionRect, setInteractionRect] = useState<{
    top: number;
    left: number;
    right: number;
    bottom: number;
  } | null>(null);
  const [hideVersionBadge, setHideVersionBadge] = useState(false);
  const stretchStateRef = useRef({
    startY: 0,
    active: false,
    atTop: false,
    atBottom: false,
    edge: null as 'top' | 'bottom' | null,
    edgeStartY: 0,
    currentOffset: 0,
    raf: 0
  });

  const [showVisitorToast, setShowVisitorToast] = useState(false);

  const engineRef = useRef<PhysicsEngine | null>(null);
  const reqRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  // Define Immutable System Preset
  const SYSTEM_PRESET: SavedConfig = {
      id: 'system_preset_001',
      name: t.storage.systemPresetName,
      params: DEFAULT_PARAMS,
      date: 0,
      isSystem: true
  };

  const showNotification = (text: string, duration = 1500, type: 'info'|'success'|'warning' = 'info', position: 'bottom'|'center' = 'bottom') => {
    // Clear existing timer to prevent premature closing of new notification
    if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
    
    // Use Date.now() as a unique ID.
    // When ID changes, React re-mounts the component (via key prop), forcing the CSS animation to replay instantly.
    const newId = Date.now();
    setNotification({ text, visible: true, type, id: newId, position });

    notificationTimeoutRef.current = window.setTimeout(() => {
        setNotification(prev => ({ ...prev, visible: false }));
    }, duration);
  };

  const handleInteractionBackdropClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setIsCanvasLocked(false);
    showNotification(t.canvas.autoExit, 1500);
  }, [t.canvas.autoExit]);

  const updateInteractionRect = useCallback(() => {
    if (!isCanvasLocked) return;
    const container = canvasContainerRef.current;
    if (!container) {
      setInteractionRect(null);
      return;
    }
    const rect = container.getBoundingClientRect();
    const minSize = 80;
    if (rect.width < minSize || rect.height < minSize) {
      setInteractionRect(null);
      if (!interactionRafRef.current) {
        interactionRafRef.current = window.requestAnimationFrame(() => {
          interactionRafRef.current = 0;
          updateInteractionRect();
        });
      }
      return;
    }
    setInteractionRect({
      top: Math.max(0, rect.top),
      left: Math.max(0, rect.left),
      right: Math.min(window.innerWidth, rect.right),
      bottom: Math.min(window.innerHeight, rect.bottom)
    });
  }, [isCanvasLocked]);

  const handleMainScroll = useCallback(() => {
    const scrollTop = mainScrollRef.current?.scrollTop ?? 0;
    const shouldHide = scrollTop > 24;
    setHideVersionBadge(prev => (prev !== shouldHide ? shouldHide : prev));
    if (isCanvasLocked) updateInteractionRect();
  }, [isCanvasLocked, updateInteractionRect]);

  useEffect(() => {
    if (!isCanvasLocked) {
      if (interactionRect) setInteractionRect(null);
      if (interactionRafRef.current) {
        window.cancelAnimationFrame(interactionRafRef.current);
        interactionRafRef.current = 0;
      }
      return;
    }
    updateInteractionRect();
    const handleResize = () => updateInteractionRect();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [interactionRect, isCanvasLocked, updateInteractionRect]);

  const applyMainStretch = useCallback((offset: number) => {
    const container = mainContentRef.current;
    if (!container) return;
    const clamped = Math.max(-70, Math.min(70, offset));
    container.style.transition = 'none';
    if (Math.abs(clamped) < 0.01) {
      container.style.transform = 'translateY(0px) scaleY(1)';
      container.style.transformOrigin = 'center';
      return;
    }
    if (clamped > 0) {
      const scale = 1 + Math.min(clamped / 360, 0.09);
      container.style.transform = `translateY(${clamped}px) scaleY(${scale})`;
      container.style.transformOrigin = 'top';
      return;
    }
    const translate = clamped * 0.72;
    container.style.transform = `translateY(${translate}px)`;
    container.style.transformOrigin = 'bottom';
  }, []);

  const getDampedStretch = useCallback((delta: number) => {
    const magnitude = Math.abs(delta);
    if (magnitude < 1) return 0;
    const maxStretch = 72;
    const resistance = 180;
    const eased = 1 - Math.exp(-magnitude / resistance);
    return Math.sign(delta) * maxStretch * eased;
  }, []);

  const applyEdgeElastic = useCallback((edge: 'top' | 'bottom', height: number) => {
    const indicator = edge === 'top' ? topElasticRef.current : bottomElasticRef.current;
    if (!indicator) return;
    const maxHeight = edge === 'bottom' ? 120 : 90;
    const clamped = Math.max(0, Math.min(maxHeight, height));
    const ratio = clamped / maxHeight;
    indicator.style.height = `${clamped}px`;
    indicator.style.opacity = clamped > 0 ? `${edge === 'bottom' ? 0.18 + ratio * 0.68 : 0.1 + ratio * 0.6}` : '0';
    indicator.style.transform = `scaleY(${1 + ratio * (edge === 'bottom' ? 0.18 : 0.12)})`;
  }, []);

  const stepEdgeElastic = useCallback(() => {
    const state = edgeElasticStateRef.current;
    const topDiff = state.top.target - state.top.current;
    const bottomDiff = state.bottom.target - state.bottom.current;

    state.top.current += topDiff * 0.22;
    state.bottom.current += bottomDiff * 0.22;

    if (Math.abs(topDiff) < 0.4) {
      state.top.current = state.top.target;
    }
    if (Math.abs(bottomDiff) < 0.4) {
      state.bottom.current = state.bottom.target;
    }

    applyEdgeElastic('top', state.top.current);
    applyEdgeElastic('bottom', state.bottom.current);

    if (
      Math.abs(state.top.current - state.top.target) > 0.4 ||
      Math.abs(state.bottom.current - state.bottom.target) > 0.4
    ) {
      state.raf = window.requestAnimationFrame(stepEdgeElastic);
    } else {
      state.raf = 0;
    }
  }, [applyEdgeElastic]);

  const scheduleEdgeElastic = useCallback((edge: 'top' | 'bottom', height: number) => {
    const state = edgeElasticStateRef.current;
    state[edge].target = height;
    if (state.raf) return;
    state.raf = window.requestAnimationFrame(stepEdgeElastic);
  }, [stepEdgeElastic]);

  const releaseEdgeElastic = useCallback((edge?: 'top' | 'bottom') => {
    if (edge) {
      scheduleEdgeElastic(edge, 0);
      return;
    }
    scheduleEdgeElastic('top', 0);
    scheduleEdgeElastic('bottom', 0);
  }, [scheduleEdgeElastic]);

  const cancelMainStretch = useCallback(() => {
    const state = stretchStateRef.current;
    if (state.raf) {
      window.cancelAnimationFrame(state.raf);
      state.raf = 0;
    }
  }, []);

  const releaseMainStretch = useCallback(() => {
    const state = stretchStateRef.current;
    cancelMainStretch();
    const startOffset = state.currentOffset;
    if (Math.abs(startOffset) < 0.5) {
      state.currentOffset = 0;
      applyMainStretch(0);
      return;
    }
    const duration = 220;
    const startTime = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = startOffset * (1 - eased);
      state.currentOffset = next;
      applyMainStretch(next);
      if (!state.active && t < 1) {
        state.raf = window.requestAnimationFrame(step);
      } else {
        state.raf = 0;
        state.currentOffset = 0;
        applyMainStretch(0);
      }
    };
    state.raf = window.requestAnimationFrame(step);
  }, [applyMainStretch, cancelMainStretch]);

  const handleMainTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) return;
    const scrollEl = mainScrollRef.current;
    const state = stretchStateRef.current;
    cancelMainStretch();
    releaseEdgeElastic();
    state.active = true;
    state.startY = event.touches[0].clientY;
    state.edgeStartY = event.touches[0].clientY;
    if (Math.abs(state.currentOffset) > 0.5) {
      state.currentOffset = 0;
      applyMainStretch(0);
    }
    if (!scrollEl) {
      state.atTop = false;
      state.atBottom = false;
      state.edge = null;
      return;
    }
    const edgeThreshold = 1;
    state.atTop = scrollEl.scrollTop <= edgeThreshold;
    state.atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - edgeThreshold;
    state.edge = state.atTop ? 'top' : state.atBottom ? 'bottom' : null;
    if (state.edge) {
      state.edgeStartY = event.touches[0].clientY;
    }
  }, [applyMainStretch, cancelMainStretch, releaseEdgeElastic]);

  const handleMainTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const state = stretchStateRef.current;
    if (!state.active || event.touches.length !== 1) return;
    const scrollEl = mainScrollRef.current;
    if (!scrollEl) return;

    const touchY = event.touches[0].clientY;
    const delta = touchY - state.startY;
    const edgeThreshold = 1;
    const atTop = scrollEl.scrollTop <= edgeThreshold;
    const atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - edgeThreshold;
    state.atTop = atTop;
    state.atBottom = atBottom;

    if (!state.edge) {
      if (atTop && delta > 0) {
        state.edge = 'top';
        state.edgeStartY = touchY;
      } else if (atBottom && delta < 0) {
        state.edge = 'bottom';
        state.edgeStartY = touchY;
      }
    }

    if (state.edge === 'top') {
      const edgeDelta = touchY - state.edgeStartY;
      if (edgeDelta <= 0) {
        state.edge = null;
        state.currentOffset = 0;
        applyMainStretch(0);
        releaseEdgeElastic('top');
        return;
      }
      const stretch = getDampedStretch(edgeDelta);
      state.currentOffset = stretch;
      applyMainStretch(stretch);
      scheduleEdgeElastic('top', Math.abs(stretch));
      scheduleEdgeElastic('bottom', 0);
      event.preventDefault();
      return;
    }

    if (state.edge === 'bottom') {
      const edgeDelta = touchY - state.edgeStartY;
      if (edgeDelta >= 0) {
        state.edge = null;
        state.currentOffset = 0;
        applyMainStretch(0);
        releaseEdgeElastic('bottom');
        return;
      }
      const stretch = getDampedStretch(edgeDelta) * 1.18;
      state.currentOffset = stretch;
      applyMainStretch(stretch);
      scheduleEdgeElastic('bottom', Math.abs(stretch) * 1.3);
      scheduleEdgeElastic('top', 0);
      event.preventDefault();
      return;
    }

    if (state.currentOffset !== 0) {
      state.currentOffset = 0;
      applyMainStretch(0);
    }
    releaseEdgeElastic();
  }, [applyMainStretch, getDampedStretch, releaseEdgeElastic, scheduleEdgeElastic]);

  const handleMainTouchEnd = useCallback(() => {
    const state = stretchStateRef.current;
    state.active = false;
    state.atTop = false;
    state.atBottom = false;
    state.edge = null;
    state.edgeStartY = 0;
    releaseMainStretch();
    releaseEdgeElastic();
  }, [releaseEdgeElastic, releaseMainStretch]);

  const supportsHover = inputCapabilities.supportsHover;
  const finePointer = inputCapabilities.finePointer;
  const touchLike = inputCapabilities.touchLike;
  const isCompactLandscape = inputCapabilities.isCompactLandscape;
  const isCompactWidth = inputCapabilities.isCompactWidth;
  const isMobile = isCompactWidth;
  const isDesktopLike = supportsHover && finePointer;
  const isEnglishUI = lang.startsWith('en');
  const versionLabel = lang.startsWith('en') ? 'Official Release' : '\u6b63\u5f0f\u7248';
  const versionBadgeText = `${t.header.systemOp} \u00b7 v${APP_VERSION} ${versionLabel}`;

  const isSidebarOverlay = touchLike && (isCompactWidth || isLandscapeMode);
  const keyboardOverlayActive = touchLike && keyboardOpenRef.current;
  const activeOrientationKey = isLandscapeMode ? 'landscape' : 'portrait';
  const stableViewportHeight = viewportBaselineRef.current[activeOrientationKey] || viewportSize.height || viewportSize.visualHeight || 0;
  const isSidebarInputMode = touchLike && isShortHeight;
  const resolvedViewportHeight = touchLike
    ? (keyboardOverlayActive ? stableViewportHeight : (viewportSize.visualHeight || viewportSize.height || 0))
    : (viewportSize.height || 0);
  const appFrameStyle = resolvedViewportHeight
    ? { height: `${resolvedViewportHeight}px` }
    : undefined;
  const overlayFrameStyle = resolvedViewportHeight
    ? {
        height: `${resolvedViewportHeight}px`,
        top: keyboardOverlayActive ? '0px' : (touchLike ? `${viewportSize.visualOffsetTop}px` : '0px')
      }
    : undefined;
  const sidebarFrameStyle = resolvedViewportHeight
    ? {
        height: `${resolvedViewportHeight}px`,
        top: keyboardOverlayActive ? '0px' : (touchLike ? `${viewportSize.visualOffsetTop}px` : '0px')
      }
    : undefined;
  const sidebarWidthClass = isSidebarOverlay ? 'w-[85vw] max-w-[360px]' : 'w-[300px]';
  const sidebarHeaderPaddingClass = isSidebarInputMode ? 'pt-6' : 'pt-8';
  const sidebarHeaderStackClass = isSidebarInputMode ? 'flex flex-col gap-4' : 'flex flex-col gap-6';
  const sidebarSubtitleClass = isEnglishUI
    ? 'text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-[0.16em]'
    : 'text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-[0.04em]';
  const sidebarSectionSpacingClass = 'space-y-4';
  const sidebarContentWidthClass = isSidebarInputMode ? 'w-full px-4' : 'w-full px-3 md:px-4';
  const paramLayoutClass = 'space-y-2';
  const paramItemWidthClass = 'w-full';
  const sidebarSectionBottomPaddingClass = isSidebarInputMode ? 'pb-5' : 'pb-6';
  const bottomPaddingClass = isSidebarInputMode ? 'pb-[calc(env(safe-area-inset-bottom)+12px)]' : 'pb-[calc(env(safe-area-inset-bottom)+16px)]';
  const actionButtonWrapClass = isShortHeight
    ? 'grid w-full grid-cols-2 gap-2 px-3 md:px-4'
    : 'flex w-full flex-col items-center gap-2 px-3 md:px-4';
  const actionButtonWidthClass = 'w-full';
  const actionButtonPaddingClass = 'py-2';
  const actionButtonTextClass = 'text-xs md:text-sm';
  const actionCollapseClass = `justify-center text-[10px] w-full ${isShortHeight ? 'col-span-2 mt-0' : 'mt-1'}`;
  const sidebarToggleButtonClass = 'w-8 h-8 flex items-center justify-center rounded-full';
  const sidebarInputTextClass = touchLike ? 'text-base md:text-sm' : 'text-xs md:text-sm';
  const sidebarInputPaddingClass = touchLike ? 'py-2' : 'py-1';
  const sectionTitleClass = isEnglishUI
    ? 'min-w-0 flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-[0.14em] transition-colors'
    : 'min-w-0 flex items-center gap-2 text-slate-600 dark:text-slate-300 font-semibold text-sm tracking-[0.04em] transition-colors';
  const defaultActionTextClass = isEnglishUI
    ? 'text-[10px] font-medium tracking-[0.08em]'
    : 'text-[11px] font-medium tracking-[0.03em]';
  const fieldLabelClass = isEnglishUI
    ? 'mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400'
    : 'mb-0.5 block text-[11px] font-semibold tracking-[0.04em] text-slate-500 dark:text-slate-400';
  const collapseActionTextClass = isEnglishUI
    ? 'uppercase tracking-[0.16em]'
    : 'tracking-[0.05em]';
  const versionBadgeClass = isEnglishUI
    ? `inline-flex items-center justify-center gap-2 rounded-2xl bg-white/70 px-4 py-1.5 text-slate-600 shadow-sm ring-1 ring-slate-100 backdrop-blur-md dark:bg-slate-800/70 dark:text-slate-200 dark:ring-slate-800 border border-slate-200/70 dark:border-slate-700/70 text-[9px] sm:text-[10px] font-bold tracking-[0.12em] ${isMobile ? 'max-w-[min(92vw,18rem)]' : 'max-w-[90vw]'}`
    : `inline-flex items-center justify-center gap-2 rounded-2xl bg-white/70 px-4 py-1.5 text-slate-600 shadow-sm ring-1 ring-slate-100 backdrop-blur-md dark:bg-slate-800/70 dark:text-slate-200 dark:ring-slate-800 border border-slate-200/70 dark:border-slate-700/70 text-[10px] sm:text-[11px] font-semibold tracking-[0.05em] ${isMobile ? 'max-w-[min(92vw,18rem)]' : 'max-w-[90vw]'}`;
  const versionBadgeTextClass = isMobile
    ? 'min-w-0 max-w-[22ch] text-center leading-tight break-words [overflow-wrap:anywhere]'
    : 'truncate whitespace-nowrap';
  const guideBubbleTextWidthClass = isEnglishUI ? 'max-w-[24ch]' : 'max-w-[20ch]';
  const notificationTextWidthClass = isEnglishUI ? 'max-w-[24ch]' : 'max-w-[16ch]';
  const deleteDialogTextWidthClass = isEnglishUI ? 'max-w-[28ch]' : 'max-w-[18ch]';
  const presetActionTextWidthClass = isEnglishUI ? 'max-w-[12ch]' : 'max-w-[7ch]';
  const sidebarInputScrollMarginStyle = {
    scrollMarginTop: isSidebarInputMode ? '96px' : '72px',
    scrollMarginBottom: isSidebarInputMode ? '160px' : '112px'
  };
  const compactLandscapeCanvasHeight = isCompactLandscape
    ? Math.max(220, Math.min(viewportSize.visualHeight - 230, 320))
    : null;
  const mainHeaderSpacingClass = isCompactLandscape
    ? 'pt-14 pb-2'
    : isMobile
      ? 'pt-28 pb-3'
      : 'pt-24 pb-4 landscape:pt-6 landscape:pb-1 md:pt-24 md:pb-6';
  const overlayControlHidden = isSidebarOverlay && isSidebarOpen;
  const activePresetMenuConfig = presetActionMenu
  ? savedConfigs.find((config) => config.id === presetActionMenu.id) ?? null
  : null;
  const systemPresetConfig = savedConfigs.find((config) => config.isSystem) ?? null;
  const customSavedConfigs = savedConfigs.filter((config) => !config.isSystem);
  const sidebarHoverClass = isDesktopLike ? 'hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800' : '';
  const sectionHoverTextClass = isDesktopLike ? 'group-hover:text-sciblue-600 dark:group-hover:text-sciblue-400' : '';
  const sectionHoverIconClass = isDesktopLike ? 'group-hover:text-sciblue-500 group-hover:scale-110' : '';
  const sectionHoverButtonClass = isDesktopLike ? 'group-hover:bg-slate-100 dark:group-hover:bg-slate-800' : '';
  const floatingButtonHoverClass = isDesktopLike ? 'hover:shadow-[0_8px_30px_rgb(14,165,233,0.15)] hover:scale-105' : '';
  const floatingTextHoverClass = isDesktopLike ? 'group-hover:text-sciblue-600 dark:group-hover:text-sciblue-400' : '';
  const floatingAccentHoverClass = isDesktopLike ? 'group-hover:text-sciblue-400 dark:group-hover:text-sciblue-300' : '';
  const floatingIconHoverClass = isDesktopLike ? 'group-hover:rotate-12' : '';
  const surfaceHoverClass = isDesktopLike ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors' : '';
  const toolButtonHoverClass = isDesktopLike ? 'hover:bg-white/90 dark:hover:bg-slate-900/80 hover:text-slate-800 dark:hover:text-slate-200' : '';
  const themeButtonHoverClass = isDesktopLike ? 'hover:bg-white/90 dark:hover:bg-slate-900/80 hover:text-amber-500 dark:hover:text-sciblue-300' : '';
  const languageItemHoverClass = isDesktopLike ? 'hover:bg-slate-50 dark:hover:bg-slate-700' : '';
  const shouldHideVersionBadge = hideVersionBadge || (isMobile && showSidebarGuide && !isCanvasLocked);

  // Dark Mode Logic: always start in light mode
  useEffect(() => {
    setIsDarkMode(false);
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }, []);

  const toggleDarkMode = () => {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      if (newMode) {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
          showNotification(t.common.modeDark, 1500, 'success');
      } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
          showNotification(t.common.modeLight, 1500, 'success');
      }
  };

  const updateViewportState = useCallback(() => {
    const layoutHeight = window.innerHeight;
    const layoutWidth = window.innerWidth;
    const orientationIsLandscape = layoutWidth > layoutHeight;
    const visualViewport = window.visualViewport;
    const visualHeight = visualViewport ? Math.round(visualViewport.height) : layoutHeight;
    const visualOffsetTop = visualViewport ? Math.round(visualViewport.offsetTop) : 0;
    const supportsHoverMedia = mediaMatches('(hover: hover)');
    const finePointerMedia = mediaMatches('(pointer: fine)');
    const touchLikeViewport = isTouchLikeViewport();
    const compactWidth = layoutWidth < 768;
    const orientationKey = orientationIsLandscape ? 'landscape' : 'portrait';

    const baselineCandidate = Math.max(visualHeight, layoutHeight);
    const previousBaseline = viewportBaselineRef.current[orientationKey];
    const nextBaseline = previousBaseline ? Math.max(previousBaseline, baselineCandidate) : baselineCandidate;
    viewportBaselineRef.current[orientationKey] = nextBaseline;

    let heightDelta = nextBaseline - visualHeight;
    const activeElement = typeof document !== 'undefined' ? document.activeElement : null;
    const hasEditableFocus = isEditableElement(activeElement);
    const keyboardThreshold = Math.max(80, nextBaseline * 0.18);

    if (!hasEditableFocus && !keyboardOpenRef.current && heightDelta > keyboardThreshold) {
      viewportBaselineRef.current[orientationKey] = baselineCandidate;
      heightDelta = baselineCandidate - visualHeight;
    }

    const keyboardLikely = heightDelta > keyboardThreshold;
    const keyboardActive = keyboardLikely && (hasEditableFocus || keyboardOpenRef.current);
    const effectiveLayoutHeight = keyboardActive ? nextBaseline : visualHeight;
    const compactLandscape = touchLikeViewport && orientationIsLandscape && effectiveLayoutHeight < 560;
    const shortHeightThreshold = orientationIsLandscape ? 480 : 600;
    const constrainedHeight = effectiveLayoutHeight < shortHeightThreshold;

    if (keyboardOpenRef.current && !keyboardLikely && !hasEditableFocus && heightDelta < keyboardThreshold * 0.5) {
      keyboardOpenRef.current = false;
    }

    setViewportSize({ width: layoutWidth, height: layoutHeight, visualHeight, visualOffsetTop });
    setInputCapabilities({
      supportsHover: supportsHoverMedia,
      finePointer: finePointerMedia,
      touchLike: touchLikeViewport,
      isCompactLandscape: compactLandscape,
      isCompactWidth: compactWidth
    });
    setIsLandscapeMode(orientationIsLandscape);
    setIsShortHeight(constrainedHeight);
  }, []);

  // Screen Size Listener & Mobile Init Logic
  useEffect(() => {
    const handleResize = () => updateViewportState();

    const handleFocusIn = (event: FocusEvent) => {
      if (!isTouchLikeViewport()) return;
      const focusTarget = event.target instanceof Element ? event.target : null;
      if (!isEditableElement(focusTarget)) return;
      if (keyboardResetRef.current) {
        window.clearTimeout(keyboardResetRef.current);
        keyboardResetRef.current = null;
      }
      keyboardOpenRef.current = true;
      updateViewportState();
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (!isTouchLikeViewport()) return;
      const focusTarget = event.target instanceof Element ? event.target : null;
      if (!isEditableElement(focusTarget)) return;
      if (keyboardResetRef.current) {
        window.clearTimeout(keyboardResetRef.current);
      }
      keyboardResetRef.current = window.setTimeout(() => {
        keyboardOpenRef.current = false;
        updateViewportState();
      }, 150);
    };

    // 1. Initial Check on Mount
    updateViewportState();
    
    // 2. Resize/Viewport/Keyboard Listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);

    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener('resize', handleResize);
    visualViewport?.addEventListener('scroll', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      visualViewport?.removeEventListener('resize', handleResize);
      visualViewport?.removeEventListener('scroll', handleResize);
      if (keyboardResetRef.current) {
        window.clearTimeout(keyboardResetRef.current);
        keyboardResetRef.current = null;
      }
    };
  }, [updateViewportState]);

  useEffect(() => {
    if (!isLangMenuOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!langMenuRef.current) return;
      if (!langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsLangMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLangMenuOpen]);

  useEffect(() => {
    if (!presetActionMenu) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!presetActionMenuRef.current) return;
      if (!presetActionMenuRef.current.contains(event.target as Node)) {
        setPresetActionMenu(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPresetActionMenu(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [presetActionMenu]);

  useEffect(() => {
    if (!isCreatePresetModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      presetNameInputRef.current?.focus();
      presetNameInputRef.current?.select();
    }, 60);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCreatePresetModalOpen(false);
        setPresetModalMode('create');
        setEditingPresetId(null);
        setNewConfigName('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCreatePresetModalOpen]);

  useEffect(() => {
    if (!deleteConfirmConfig) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDeleteConfirm();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteConfirmConfig]);

  // Storage Logic: Load on Mount (Merge System + Local)
  useEffect(() => {
    // Ensure the system preset name updates with language change
    const currentSystemPreset = { ...SYSTEM_PRESET, name: t.storage.systemPresetName };
    
    const saved = localStorage.getItem('hsl_favorites');
    let loadedConfigs: SavedConfig[] = [];
    if (saved) {
        try {
            // Filter out any old system presets saved to LS by mistake to avoid duplicates
            loadedConfigs = JSON.parse(saved).filter((c: SavedConfig) => !c.isSystem);
        } catch(e) { console.error("Failed to load configs", e); }
    }
    setSavedConfigs([currentSystemPreset, ...loadedConfigs]);

    // Load Custom Default
    const customDefault = localStorage.getItem('hsl_custom_default');
    if (customDefault) {
        try {
            const parsed = JSON.parse(customDefault);
            setParams(parsed);
            setActiveParams(parsed); 
        } catch(e) { console.error("Failed to load default", e); }
    }
  }, [lang]); // Re-run when lang changes to update System Preset name

  // Startup Guide Timer Logic
  useEffect(() => {
    let timer: number;
    if (!isSidebarOpen && !isRunning && !hasOpenedSidebarOnce && !hasStartedOnce) {
        timer = window.setTimeout(() => {
            setShowSidebarGuide(true);
        }, 5000);
    } else {
        setShowSidebarGuide(false);
    }
    return () => clearTimeout(timer);
  }, [isSidebarOpen, isRunning, hasOpenedSidebarOnce, hasStartedOnce]);

  // Initial Load & Animation smoothing
  useEffect(() => {
    // Init Engine
    // Note: If we loaded custom params, params is already set. engine uses current params state.
    engineRef.current = new PhysicsEngine(params);
    setChartData(engineRef.current.getHistogramData(false));
    setNeedsReset(false);

    const showToastTimer = window.setTimeout(() => {
        setShowVisitorToast(true);
        window.setTimeout(() => setShowVisitorToast(false), 6000);
    }, 1500);

    return () => {
      window.clearTimeout(showToastTimer);
    };
  }, []); 

  // --- Interaction Checker ---
  const checkInteractionLock = (e?: React.MouseEvent) => {
      if (isCanvasLocked) {
          if (e) e.stopPropagation();
          showNotification(t.canvas.interactionLocked, 2000, 'warning');
          return true;
      }
      return false;
  };

  // --- Mobile Keyboard Helper ---
  // When input is focused on mobile, ensure it scrolls into view
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (touchLike) {
          // Add a delay to allow keyboard animation to start/finish
          setTimeout(() => {
              e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
          }, 300);
      }
  };

  // --- Storage Handlers ---
  const closeCreatePresetModal = () => {
      setIsCreatePresetModalOpen(false);
      setPresetModalMode('create');
      setEditingPresetId(null);
      setNewConfigName('');
  };
  const closeDeleteConfirm = () => {
      setDeleteConfirmConfig(null);
  };

  const openCreatePresetModal = () => {
      setIsStorageOpen(true);
      setPresetActionMenu(null);
      setPresetModalMode('create');
      setEditingPresetId(null);
      setNewConfigName('');
      setIsCreatePresetModalOpen(true);
  };

  const openRenamePresetModal = (config: SavedConfig) => {
      if (config.isSystem) return;
      setPresetActionMenu(null);
      setSelectedPresetId(config.id);
      setPresetModalMode('rename');
      setEditingPresetId(config.id);
      setNewConfigName(config.name);
      setIsCreatePresetModalOpen(true);
  };

  const openPresetActionMenu = (config: SavedConfig, top: number, left: number) => {
      const menuWidth = 196;
      const menuHeight = config.isSystem ? 64 : 148;
      const maxLeft = Math.max(12, window.innerWidth - menuWidth - 12);
      const maxTop = Math.max(12, window.innerHeight - menuHeight - 12);

      setSelectedPresetId(config.id);
      setPresetActionMenu({
          id: config.id,
          top: Math.max(12, Math.min(top, maxTop)),
          left: Math.max(12, Math.min(left, maxLeft))
      });
  };

  const handleSaveConfig = (rawName = newConfigName) => {
      const nameToSave = rawName.trim();
      if (!nameToSave) {
          showNotification(t.messages.checkInputs, 1800, 'warning');
          return false;
      }

      const isNameDuplicate = savedConfigs.some(c => c.name === nameToSave && c.id !== editingPresetId);
      if (isNameDuplicate) {
          showNotification(t.storage.duplicateName, 2200, 'warning');
          return false;
      }

      if (presetModalMode === 'rename' && editingPresetId) {
          const targetConfig = savedConfigs.find((config) => config.id === editingPresetId);
          if (!targetConfig || targetConfig.isSystem) {
              return false;
          }

          const updated = savedConfigs.map((config) =>
              config.id === editingPresetId ? { ...config, name: nameToSave } : config
          );

          const userConfigs = updated.filter(c => !c.isSystem);
          setSavedConfigs(updated);
          localStorage.setItem('hsl_favorites', JSON.stringify(userConfigs));
          setSelectedPresetId(editingPresetId);
          closeCreatePresetModal();
          showNotification(t.storage.renameSuccess, 2000, 'success');
          return true;
      }

      const isParamsDuplicate = savedConfigs.some(c => areParamsEqual(c.params, params));
      if (isParamsDuplicate) {
          showNotification(t.storage.duplicateParams, 2600, 'warning');
          return false;
      }

      const newConfig: SavedConfig = {
          id: Date.now().toString(),
          name: nameToSave,
          params: { ...params },
          date: Date.now(),
          isSystem: false
      };
      
      // Keep system preset at top, add new user config
      const userConfigs = savedConfigs.filter(c => !c.isSystem);
      const updated = [savedConfigs[0], ...userConfigs, newConfig]; 
      
      setSavedConfigs(updated);
      localStorage.setItem('hsl_favorites', JSON.stringify([...userConfigs, newConfig]));
      setNewConfigName('');
      // Auto-select the newly saved config
      setSelectedPresetId(newConfig.id);
      closeCreatePresetModal();
      showNotification(t.storage.saveSuccess, 2000, 'success');
      return true;
  };

  const handleSelectPreset = (config: SavedConfig) => {
      setPresetActionMenu(null);
      setSelectedPresetId(config.id);
      // Automatically load parameters when selected
      setParams(config.params);
      setNeedsReset(true);
  };

  const requestDeleteConfig = (config: SavedConfig) => {
      if (config.isSystem) return;
      setPresetActionMenu(null);
      setDeleteConfirmConfig(config);
  };

  const handleDeleteConfig = () => {
      const configToDelete = deleteConfirmConfig;
      if (!configToDelete || configToDelete.isSystem) return;
      const { id } = configToDelete;

      const userConfigs = savedConfigs.filter(c => !c.isSystem && c.id !== id);
      const storedDefault = localStorage.getItem('hsl_custom_default');

      if (storedDefault) {
          try {
              const parsedDefault = JSON.parse(storedDefault) as SimulationParams;
              if (areParamsEqual(parsedDefault, configToDelete.params)) {
                  localStorage.removeItem('hsl_custom_default');
              }
          } catch (error) {
              console.error('Failed to parse startup default', error);
          }
      }

      setSavedConfigs([savedConfigs[0], ...userConfigs]);
      localStorage.setItem('hsl_favorites', JSON.stringify(userConfigs));
      if (selectedPresetId === id) setSelectedPresetId(null);
      closeDeleteConfirm();
  };

  const handleSetStartupPreset = (config: SavedConfig) => {
      if (config.isSystem) {
          localStorage.removeItem('hsl_custom_default');
      } else {
          localStorage.setItem('hsl_custom_default', JSON.stringify(config.params));
      }

      setSelectedPresetId(config.id);
      setPresetActionMenu(null);
      showNotification(t.storage.defaultSet, 2000, 'success');
  };

  // --- Standard Handlers ---
  const handleParamChange = (key: keyof SimulationParams, valueStr: string) => {
      let val = valueStr === '' ? NaN : parseFloat(valueStr);
      // Basic Sanity Check: Ensure no negative numbers for physics parameters
      if (!isNaN(val)) {
         if (key === 'N' || key === 'L' || key === 'r' || key === 'm') {
             val = Math.max(0.1, val); // Prevent 0 or negative
         } else {
             val = Math.max(0, val);
         }
      }
      setParams(prev => ({...prev, [key]: val}));
      setNeedsReset(true); 
  };
  
  const handleRestoreDefaults = (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if(checkInteractionLock(e)) return;

      // FIXED LOGIC: Check for custom default first
      const customDefault = localStorage.getItem('hsl_custom_default');
      if (customDefault) {
          try {
              const parsed = JSON.parse(customDefault);
              setParams(parsed);
              showNotification(t.storage.loadSuccess, 2000, 'success');
          } catch(err) {
              setParams(DEFAULT_PARAMS);
          }
      } else {
          setParams(DEFAULT_PARAMS);
      }
      setNeedsReset(true);
  };

  const handleReset = (e?: React.MouseEvent) => {
    if(checkInteractionLock(e)) return;
    
    if (isRunning) {
        showNotification(t.messages.pauseRequired, 2500, 'warning');
        return;
    }
    const invalidValues = Object.values(params).some(v => Number.isNaN(v));
    if (invalidValues) {
        showNotification(t.messages.checkInputs, 2000, 'warning');
        return;
    }

    try {
        // Critical: Stop old loop first
        if (reqRef.current) cancelAnimationFrame(reqRef.current);
        setIsRunning(false);
        
        setFinalChartData(null);
        
        setActiveParams(params);
        engineRef.current = new PhysicsEngine(params);
        setStats(engineRef.current.getStats());
        setChartData(engineRef.current.getHistogramData(false));
        setNeedsReset(false); 
        showNotification(t.messages.resetSuccess, 2000, 'success');
    } catch (e) {
        showNotification(t.messages.resetFailed, 3000, 'warning');
    }
  };

  const handleStartPause = (e?: React.MouseEvent) => {
      // NOTE: Removed checkInteractionLock check here to allow start/pause during interaction
      setHasStartedOnce(true);
      
      if (needsReset) {
          showNotification(t.messages.resetBeforeStart, 2500, 'warning');
          if (!isSidebarOpen) setIsSidebarOpen(true);
          return;
      }

      if (!isRunning) {
          setIsRunning(true);
          if (isSidebarOpen && isSidebarOverlay) {
              setIsSidebarOpen(false); 
          }
      } else {
          setIsRunning(false);
      }
  };

  const handleOpenSidebar = (e?: React.MouseEvent) => {
      if(checkInteractionLock(e)) return;
      setHasOpenedSidebarOnce(true);
      setIsSidebarOpen(true);
  };
  
  const handleCloseSidebar = (e?: React.MouseEvent) => {
      if(checkInteractionLock(e)) return;
      setIsSidebarOpen(false);
  }

  const handleOpenPdf = useCallback(() => {
    setIsPdfOpen(true);
  }, []);

  const handleClosePdf = useCallback(() => {
    setIsPdfOpen(false);
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    let listenerHandle: Awaited<ReturnType<typeof CapacitorApp.addListener>> | null = null;

    CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (deleteConfirmConfig) {
        closeDeleteConfirm();
        return;
      }
      if (isCreatePresetModalOpen) {
        closeCreatePresetModal();
        return;
      }
      if (presetActionMenu) {
        setPresetActionMenu(null);
        return;
      }
      if (isLangMenuOpen) {
        setIsLangMenuOpen(false);
        return;
      }
      if (isPdfOpen) {
        setIsPdfOpen(false);
        return;
      }
      if (isSidebarOpen) {
        setIsSidebarOpen(false);
        return;
      }

      if (canGoBack) {
        window.history.back();
        return;
      }

      CapacitorApp.exitApp();
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
  }, [deleteConfirmConfig, isCreatePresetModalOpen, presetActionMenu, isLangMenuOpen, isPdfOpen, isSidebarOpen]);

  const getLangName = (l: string) => {
    switch(l) {
        case 'zh-CN': return '简体中文';
        case 'zh-TW': return '繁體中文';
        case 'en-GB': return 'English (UK)';
        case 'en-US': return 'English (US)';
        default: return l;
    }
  };

  const getLangLabel = (l: LanguageCode | string) => {
    switch (l) {
      case 'zh-CN':
        return '简体中文';
      case 'zh-TW':
        return '繁體中文';
      case 'en-GB':
        return 'English (UK)';
      case 'en-US':
        return 'English (US)';
      default:
        return l;
    }
  };

  const formatLangLabel = (l: LanguageCode | string) => {
    switch (l) {
      case 'zh-CN':
        return '简体中文';
      case 'zh-TW':
        return '繁體中文';
      case 'en-GB':
        return 'English (UK)';
      case 'en-US':
        return 'English (US)';
      default:
        return l;
    }
  };

  const handleLangChange = (l: LanguageCode) => {
      if (lang !== l) {
          setLang(l);
      }
      setIsLangMenuOpen(false);
      showNotification(formatLangLabel(l), 1500, 'success');
  };

  const handleLangMenuToggle = () => {
      setIsLangMenuOpen(prev => !prev);
  };

  const tick = useCallback(() => {
    if (!engineRef.current || !isRunning) return;
    
    const engine = engineRef.current;
    const subSteps = 5; 
    for(let i=0; i<subSteps; i++) {
        engine.step();
        if (engine.time >= params.equilibriumTime && 
            engine.time < params.equilibriumTime + params.statsDuration) {
               engine.collectSamples();
        }
    }

    const currentStats = engine.getStats();
    setStats(currentStats);

    frameCountRef.current += 1;
    if (frameCountRef.current % 5 === 0) {
        setChartData(engine.getHistogramData(false));
    }

    if (currentStats.phase === 'finished') {
        setIsRunning(false);
        setFinalChartData(engine.getHistogramData(true));
        setNeedsReset(true);
    } else {
        reqRef.current = requestAnimationFrame(tick);
    }
  }, [isRunning, params]);

  useEffect(() => {
    if (isRunning) {
      reqRef.current = requestAnimationFrame(tick);
      setNeedsReset(false); 
    } else {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    }
    return () => {
        if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [isRunning, tick]);

  const handleOverlayClick = () => {
      if (isSidebarOverlay && isSidebarOpen) setIsSidebarOpen(false);
  };

  const showResultsPlaceholder = stats.phase === 'collecting' && !finalChartData;
  const showFinalResults = !!finalChartData;

  return (
    <div
      className="w-screen font-sans flex overflow-hidden relative selection:bg-sciblue-200 selection:text-sciblue-900 dark:selection:bg-sciblue-900 dark:selection:text-sciblue-100 transition-colors duration-800"
      style={appFrameStyle}
    >
      
      {/* GLOBAL INTERACTION LOCK BACKDROP (OUTSIDE CANVAS ONLY) */}
      {isCanvasLocked && interactionRect && (
        <>
          <div
            className="fixed left-0 right-0 top-0 z-[110] bg-black/10 cursor-crosshair backdrop-blur-[1px]"
            style={{ height: Math.max(0, interactionRect.top) }}
            onClick={handleInteractionBackdropClick}
            title={t.canvas.clickToRelease}
          />
          <div
            className="fixed left-0 right-0 z-[110] bg-black/10 cursor-crosshair backdrop-blur-[1px]"
            style={{
              top: interactionRect.bottom,
              height: Math.max(0, window.innerHeight - interactionRect.bottom)
            }}
            onClick={handleInteractionBackdropClick}
            title={t.canvas.clickToRelease}
          />
          <div
            className="fixed left-0 z-[110] bg-black/10 cursor-crosshair backdrop-blur-[1px]"
            style={{
              top: interactionRect.top,
              height: Math.max(0, interactionRect.bottom - interactionRect.top),
              width: Math.max(0, interactionRect.left)
            }}
            onClick={handleInteractionBackdropClick}
            title={t.canvas.clickToRelease}
          />
          <div
            className="fixed z-[110] bg-black/10 cursor-crosshair backdrop-blur-[1px]"
            style={{
              top: interactionRect.top,
              height: Math.max(0, interactionRect.bottom - interactionRect.top),
              left: interactionRect.right,
              width: Math.max(0, window.innerWidth - interactionRect.right)
            }}
            onClick={handleInteractionBackdropClick}
            title={t.canvas.clickToRelease}
          />
        </>
      )}

      {/* --- SIDEBAR (CONTROLS) --- */}
      <div 
        className={`fixed inset-x-0 left-0 bg-slate-900/40 backdrop-blur-md z-40 transition-opacity duration-500 ${isSidebarOverlay ? 'block' : 'hidden'} ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={overlayFrameStyle}
        onClick={handleOverlayClick}
      />

      {!isSidebarOverlay && (
        <div
          aria-hidden="true"
          className={`shrink-0 transition-[width] duration-500 cubic-bezier(0.25,1,0.5,1) ${isSidebarOpen ? 'w-[300px]' : 'w-0'}`}
        />
      )}

      <aside 
        className={`
            fixed left-0 z-[45] ${sidebarWidthClass}
            bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl
            transition-[transform,opacity,background-color] duration-500 cubic-bezier(0.25, 1, 0.5, 1) flex flex-col overflow-hidden
            ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-[calc(100%+24px)] opacity-0 pointer-events-none'}
        `}
        style={sidebarFrameStyle}
      >
        <div className="flex h-full min-h-0 flex-col bg-transparent">
            <div className={`shrink-0 ${sidebarHeaderPaddingClass} pb-3 md:pb-4`}>
                <div className={sidebarHeaderStackClass}>
                    <div className={`flex items-center justify-between gap-3 ${sidebarContentWidthClass}`}>
                        <div className="flex min-w-0 items-center gap-3 select-none">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sciblue-500 to-indigo-600 flex items-center justify-center border border-white/20 text-white shadow-inner">
                                <Atom size={18} />
                            </div>
                            <div className="flex min-w-0 flex-col leading-none">
                              <span className="truncate whitespace-nowrap text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">{t.brand.name}</span>
                              <span className={sidebarSubtitleClass}>{t.brand.subtitle}</span>
                            </div>
                        </div>
                        <button onClick={handleCloseSidebar} className={`${sidebarToggleButtonClass} text-slate-400 dark:text-slate-500 transition-colors ${sidebarHoverClass} ${isCanvasLocked ? 'opacity-50 cursor-not-allowed' : ''}`} title={t.tooltips.closeSidebar}>
                            <X size={14}/>
                        </button>
                    </div>
                </div>
            </div>

            <div className={`min-h-0 flex-1 overflow-y-auto sidebar-scroll ${isCanvasLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className={`space-y-4 ${sidebarSectionBottomPaddingClass}`}>
                    <div className={`${sidebarSectionSpacingClass}`}>
                        {/* STORAGE SECTION (COLLAPSIBLE) */}
                        <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
                            {/* Align section header with content width */}
                            <div 
                                onClick={() => setIsStorageOpen(!isStorageOpen)}
                                className={`${sidebarContentWidthClass} flex items-center justify-between gap-3 cursor-pointer group mb-2 py-1 select-none`}
                            >
                                <div className={`${sectionTitleClass} ${sectionHoverTextClass}`}>
                                    <Archive size={14} className={`text-slate-400 dark:text-slate-500 transition-colors duration-300 ${sectionHoverIconClass}`}/> 
                                    <span className="truncate whitespace-nowrap">{t.storage.title}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            openCreatePresetModal();
                                        }}
                                        aria-label={t.storage.newPreset}
                                        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 ${isDesktopLike ? 'hover:border-sciblue-300 hover:text-sciblue-600 dark:hover:border-sciblue-500 dark:hover:text-sciblue-300' : 'active:scale-95'}`}
                                        title={t.storage.newPreset}
                                    >
                                        <FolderPlus size={15} strokeWidth={1.8} />
                                        <span className="sr-only">{t.storage.newPreset}</span>
                                    </button>
                                    <div className={`${sidebarToggleButtonClass} transition-colors ${sectionHoverButtonClass}`}>
                                        <ChevronDown 
                                            size={14} 
                                            className={`text-slate-400 dark:text-slate-500 transition-transform duration-300 ${isStorageOpen ? 'rotate-180 text-sciblue-500' : 'rotate-0'}`}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Smoother cubic-bezier transition for collapse */}
                            <div className={`overflow-hidden transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isStorageOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                {/* List */}
                                <div className={`space-y-2 pb-2 ${sidebarContentWidthClass}`}>
                                    {systemPresetConfig && (
                                        <div 
                                            key={systemPresetConfig.id} 
                                            onClick={() => handleSelectPreset(systemPresetConfig)}
                                            onContextMenu={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                openPresetActionMenu(systemPresetConfig, event.clientY, event.clientX);
                                            }}
                                            className={`
                                                relative flex items-center justify-between p-1.5 rounded border cursor-pointer transition-all duration-200 group
                                                ${selectedPresetId === systemPresetConfig.id
                                                    ? 'bg-sciblue-50 dark:bg-sciblue-900/20 border-sciblue-400 dark:border-sciblue-600 ring-1 ring-sciblue-400 dark:ring-sciblue-600'
                                                    : `bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/50 ${isDesktopLike ? 'hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:scale-[1.02] hover:shadow-sm' : ''}`
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <ShieldCheck size={12} className="text-indigo-400 shrink-0"/>
                                                <span className="text-xs font-medium truncate max-w-[100px] text-indigo-600 dark:text-indigo-300">{systemPresetConfig.name}</span>
                                            </div>
                                            <div className="flex gap-1 relative z-10">
                                                <button 
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        event.stopPropagation();
                                                        const rect = event.currentTarget.getBoundingClientRect();
                                                        openPresetActionMenu(systemPresetConfig, rect.bottom + 8, rect.left - 160);
                                                    }}
                                                    className={`p-1 rounded transition-colors ${isDesktopLike ? 'hover:bg-indigo-100 dark:hover:bg-indigo-800/40' : ''}`}
                                                    title={t.storage.actions}
                                                >
                                                    <MoreHorizontal size={12} className="text-slate-400"/>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {customSavedConfigs.length === 0 && <div className="text-[10px] text-center text-slate-400 italic py-2">{t.storage.empty}</div>}
                                    {customSavedConfigs.map(config => (
                                        <div 
                                            key={config.id} 
                                            onClick={() => handleSelectPreset(config)}
                                            onContextMenu={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                openPresetActionMenu(config, event.clientY, event.clientX);
                                            }}
                                            className={`
                                                relative flex items-center justify-between p-1.5 rounded border cursor-pointer transition-all duration-200 group
                                                ${selectedPresetId === config.id 
                                                    ? 'bg-sciblue-50 dark:bg-sciblue-900/20 border-sciblue-400 dark:border-sciblue-600 ring-1 ring-sciblue-400 dark:ring-sciblue-600' 
                                                    : `bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 ${isDesktopLike ? 'hover:bg-white dark:hover:bg-slate-800 hover:scale-[1.02] hover:shadow-sm' : ''}`
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <span className="text-xs font-medium truncate max-w-[100px] text-slate-600 dark:text-slate-300">{config.name}</span>
                                            </div>
                                            <div className="flex gap-1 relative z-10">
                                                <button 
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        event.stopPropagation();
                                                        const rect = event.currentTarget.getBoundingClientRect();
                                                        const menuTop = rect.bottom + 8;
                                                        const menuLeft = rect.right - 188;
                                                        if (presetActionMenu?.id === config.id) {
                                                            setPresetActionMenu(null);
                                                            return;
                                                        }
                                                        openPresetActionMenu(config, menuTop, menuLeft);
                                                    }} 
                                                    className={`text-slate-400 p-1 rounded transition-colors ${isDesktopLike ? 'hover:text-sciblue-600 hover:bg-sciblue-50 dark:hover:bg-sciblue-900/30' : ''}`} 
                                                    title={t.storage.moreActions}
                                                >
                                                    <MoreHorizontal size={13}/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* PARAMETER SECTION (COLLAPSIBLE) */}
                        <div className="pt-2">
                            {/* Align section header with content width */}
                            <div 
                                onClick={() => setIsParamsOpen(!isParamsOpen)}
                                className={`${sidebarContentWidthClass} flex items-start justify-between gap-3 cursor-pointer group mb-2 py-1 select-none`}
                            >
                                <div className={`${sectionTitleClass} flex-1 ${sectionHoverTextClass}`}>
                                    <SlidersHorizontal size={14} className={`text-slate-400 dark:text-slate-500 transition-colors duration-300 ${sectionHoverIconClass}`}/> 
                                    <span className="truncate whitespace-nowrap">{t.controls.title}</span>
                                </div>
                                <div className="shrink-0 flex items-center gap-1 md:gap-2">
                                     <button 
                                        onClick={handleRestoreDefaults}
                                        disabled={isRunning}
                                        className={`flex items-center gap-1 py-0.5 px-2 rounded transition-colors z-10 relative whitespace-nowrap ${defaultActionTextClass} ${isDesktopLike ? 'hover:bg-slate-100 dark:hover:bg-slate-800' : ''} ${isRunning ? 'text-slate-300 dark:text-slate-600' : isCanvasLocked ? 'text-slate-400 dark:text-slate-600 opacity-50 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400'}`}
                                        title={t.controls.restoreDefaults}
                                    >
                                        <Undo2 size={12}/> {t.controls.default}
                                    </button>
                                    <div className={`${sidebarToggleButtonClass} transition-colors ${sectionHoverButtonClass}`}>
                                        <ChevronDown 
                                            size={14} 
                                            className={`text-slate-400 dark:text-slate-500 transition-transform duration-300 ${isParamsOpen ? 'rotate-180 text-sciblue-500' : 'rotate-0'}`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Smoother cubic-bezier transition for collapse */}
                            <div className={`overflow-hidden transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isParamsOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className={`${paramLayoutClass} pb-2 ${sidebarContentWidthClass}`}>
                                    {[
                                    { key: 'N', label: t.controls.particles, step: 1, min: 1 },
                                    { key: 'r', label: t.controls.radius, step: 0.05, min: 0.01 },
                                    { key: 'L', label: t.controls.boxSize, step: 1, min: 1 },
                                    { key: 'equilibriumTime', label: t.controls.equilTime, min: 0 },
                                    { key: 'statsDuration', label: t.controls.statsDuration, min: 0 },
                                    ].map((field) => (
                                        // Centered input container
                                        <div key={field.key} className={`group relative last:mb-0 ${paramItemWidthClass}`}>
                                            {/* Reduced label margin */}
                                            <label className={fieldLabelClass}>{field.label}</label>
                                            <div className="relative">
                                                <input 
                                                type="number" step={field.step} min={field.min}
                                                value={isNaN(params[field.key as keyof SimulationParams]) ? '' : params[field.key as keyof SimulationParams]}
                                                disabled={isRunning || isCanvasLocked}
                                                onChange={(e) => handleParamChange(field.key as keyof SimulationParams, e.target.value)}
                                                onFocus={handleInputFocus} // ADDED FOCUS HANDLER
                                                style={sidebarInputScrollMarginStyle}
                                                /* MODIFIED: Compact input styles (text-xs, py-1, px-2) to fit 70vw */
                                                className={`w-full rounded-md border border-slate-200 bg-slate-50 px-3 font-mono text-slate-700 outline-none transition-all focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-700 ${sidebarInputTextClass} ${sidebarInputPaddingClass} ${isRunning ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900' : 'focus:border-sciblue-500 focus:ring-1 focus:ring-sciblue-500/20 hover:border-slate-300 dark:hover:border-slate-600'}`}
                                                />
                                                {isRunning && <Lock size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/>}
                                            </div>
                                            {isRunning && <div className="absolute inset-0 z-10 cursor-not-allowed" onClick={() => showNotification(t.messages.pauseRequired, 2000, 'warning')} />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. BOTTOM BUTTONS (PINNED TO BOTTOM NORMALLY, STATIC FLOW IN SHORT HEIGHT/MOBILE LANDSCAPE) */}
            <div className={`
                shrink-0 border-t border-slate-100 bg-white/95 p-3 pt-2 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95 z-10
                ${bottomPaddingClass}
            `}>
                 <div className={actionButtonWrapClass}>
                    <button 
                        onClick={handleStartPause}
                        aria-disabled={needsReset}
                        className={`
                            ${actionButtonWidthClass} font-bold ${actionButtonPaddingClass} px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${actionButtonTextClass} shadow-sm
                            ${needsReset 
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700' 
                                : !isRunning 
                                    ? `${isDesktopLike ? 'hover:bg-slate-800 dark:hover:bg-sciblue-500' : ''} bg-slate-900 dark:bg-sciblue-600 text-white active:scale-95`
                                    : `${isDesktopLike ? 'hover:bg-amber-50 dark:hover:bg-slate-700' : ''} bg-white dark:bg-slate-800 border-2 border-amber-500 text-amber-600 dark:text-amber-500`
                            }
                            ${isCanvasLocked ? 'hover:scale-105 shadow-md ring-2 ring-sciblue-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : ''}
                        `}
                        title={isRunning ? t.controls.pause : t.controls.start}
                    >
                        {!isRunning ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />} 
                        {isRunning 
                            ? t.controls.pause 
                            : (stats.time > 0 && !needsReset) ? t.controls.resume : t.controls.start
                        }
                    </button>
                    
                    <button 
                    onClick={handleReset}
                    className={`
                        ${actionButtonWidthClass} font-medium ${actionButtonPaddingClass} px-4 rounded-lg flex items-center justify-center gap-2 transition-all border ${actionButtonTextClass}
                        ${isRunning 
                            ? 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-slate-100 dark:border-slate-800 cursor-not-allowed'
                            : needsReset 
                                ? `${isDesktopLike ? 'hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:border-amber-300' : ''} bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 border-amber-200 dark:border-amber-800 shadow-sm` 
                                : `${isDesktopLike ? 'hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white' : ''} bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700`
                        }
                        ${isCanvasLocked ? 'opacity-50 cursor-not-allowed hover:bg-auto' : ''}
                    `}
                    title={t.controls.reset}
                    >
                    <RotateCcw size={14} className={needsReset ? "animate-spin-slow" : ""} /> {t.controls.reset}
                    </button>
                    
                    <button 
                        onClick={handleCloseSidebar}
                        className={`flex items-center ${actionCollapseClass} font-bold text-slate-400 dark:text-slate-500 transition-colors py-1 ${collapseActionTextClass} ${isDesktopLike ? 'hover:text-sciblue-600 dark:hover:text-sciblue-400' : ''} ${isCanvasLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={t.common.collapse}
                    >
                        <PanelLeftClose size={12}/> {t.common.collapse}
                    </button>
                 </div>
            </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      {/* REMOVED Z-0 TO FIX STACKING CONTEXT ISSUE WITH BACKDROP */}
      <main
        ref={mainScrollRef}
        onScroll={handleMainScroll}
        onTouchStart={handleMainTouchStart}
        onTouchMove={handleMainTouchMove}
        onTouchEnd={handleMainTouchEnd}
        onTouchCancel={handleMainTouchEnd}
        className="flex-1 h-full overflow-y-auto overflow-x-hidden relative flex flex-col scroll-smooth main-scroll"
      >
        <div ref={mainContentRef} className="flex flex-col min-h-full will-change-transform">
        <header className={`px-6 max-w-4xl mx-auto text-center animate-fade-in w-full shrink-0 ${mainHeaderSpacingClass}`}>
            {/* Version Badge - Centered Above Title */}
            <div className={`flex justify-center overflow-hidden transition-all duration-300 ${shouldHideVersionBadge ? 'mb-0 max-h-0 opacity-0 -translate-y-2' : 'mb-3 landscape:mb-2 max-h-20 opacity-100 translate-y-0'}`}>
                <div className={versionBadgeClass}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
                    <span className={versionBadgeTextClass} title={versionBadgeText}>{versionBadgeText}</span>
                </div>
            </div>
            
            <h1 className={`font-serif font-black tracking-tight text-metallic leading-tight ${isCompactLandscape ? 'text-2xl mb-2' : 'text-2xl sm:text-4xl landscape:text-3xl md:text-6xl mb-4 landscape:mb-1'} sm:whitespace-nowrap`}>
                {t.title}
            </h1>
            
            <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base font-medium max-w-2xl mx-auto leading-relaxed">
                {t.subtitle}
            </p>
        </header>

        {/* Content Container */}
        <div className={`flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 ${isCompactLandscape ? 'pb-4 space-y-4' : 'pb-10 landscape:pb-4 space-y-6'}`}>
            
            {/* 3D View Card - Z-Index 100 when locked ensures it sits ABOVE the global z-[90] backdrop */}
            <div ref={canvasContainerRef} className={`${isCanvasLocked ? 'relative z-[120]' : ''}`}>
                <CollapsibleCard 
                title={t.views.mdView} icon={<Box size={18} className="text-sciblue-600 dark:text-sciblue-400"/>} t={t}
                isLocked={isCanvasLocked || isRunning} // Locked during interaction OR running
                lockedWarningText={isRunning ? t.canvas.runningLocked : t.canvas.foldingLocked} 
                showNotification={(txt) => showNotification(txt, 2000, 'warning')}
                className="border-slate-200 shadow-sm bg-white"
                expandText={t.common.expandView}
                supportsHover={isDesktopLike}
                >
                <SimulationCanvas 
                    particles={engineRef.current?.particles || []} L={activeParams.L} r={activeParams.r} isRunning={isRunning} t={t}
                    isFocused={isCanvasLocked} onFocusChange={setIsCanvasLocked} showNotification={(txt, dur) => showNotification(txt, dur, 'info')}
                    supportsHover={isDesktopLike}
                    touchLike={touchLike}
                    isCompactLandscape={isCompactLandscape}
                    canvasHeight={compactLandscapeCanvasHeight}
                />
                <div className="mt-4">
                    <StatsPanel stats={stats} eqTime={params.equilibriumTime} statDuration={params.statsDuration} t={t} lang={lang} supportsHover={isDesktopLike} />
                </div>
                </CollapsibleCard>
            </div>

            {/* Realtime Monitor */}
            {!showFinalResults && (
                <CollapsibleCard 
                    title={t.views.realtimeCharts} 
                    icon={<Activity size={18} className="text-emerald-500"/>} 
                    t={t} 
                    contentClassName="p-0"
                    className="border-slate-200 shadow-sm bg-white overflow-hidden"
                    expandText={t.common.expandCharts}
                    supportsHover={isDesktopLike}
                >
                   <div className="grid grid-cols-1 divide-slate-100 dark:divide-slate-800 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                      <div className={`p-4 md:p-6 ${surfaceHoverClass}`}>
                        <Suspense fallback={<ChartPanelFallback heightClass="h-[240px] md:h-[260px]" />}>
                          <DistributionCharts data={chartData} type="speed" t={t} heightClass="h-[240px] md:h-[260px]" isDarkMode={isDarkMode}/>
                        </Suspense>
                      </div>
                      <div className={`p-4 md:p-6 ${surfaceHoverClass}`}>
                        <Suspense fallback={<ChartPanelFallback heightClass="h-[240px] md:h-[260px]" />}>
                          <DistributionCharts data={chartData} type="energy" t={t} heightClass="h-[240px] md:h-[260px]" isDarkMode={isDarkMode} />
                        </Suspense>
                      </div>
                   </div>
                </CollapsibleCard>
            )}

            {(showResultsPlaceholder || showFinalResults) && (
              <div className={showFinalResults ? 'animate-slide-up' : ''}>
                <CollapsibleCard 
                    title={t.views.finalStats} 
                    icon={<LayoutDashboard size={18} className="text-amber-500"/>} 
                    t={t}
                    expandText={t.common.expandResults}
                    supportsHover={isDesktopLike}
                >
                  {showFinalResults && finalChartData ? (
                    <Suspense fallback={<ResultsPlaceholder t={t} lang={lang} />}>
                      <StackedResults data={finalChartData} t={t} isDarkMode={isDarkMode} supportsHover={isDesktopLike} />
                    </Suspense>
                  ) : (
                    <ResultsPlaceholder t={t} lang={lang} />
                  )}
                </CollapsibleCard>
              </div>
            )}
            
        </div>
        
        {/* Footer (Also check interaction lock on footer links if needed, but usually just footer actions) */}
        <div onClick={(e) => { if(isCanvasLocked) { e.preventDefault(); e.stopPropagation(); showNotification(t.canvas.interactionLocked, 2000, 'warning'); } }}>
            <Footer 
              t={t}
              lang={lang}
              showNotification={(msg, dur, type) => showNotification(msg, dur, type)}
              supportsHover={isDesktopLike}
              compactLinks={isSidebarOpen && !isSidebarOverlay}
              isPdfOpen={isPdfOpen}
              onOpenPdf={handleOpenPdf}
              onClosePdf={handleClosePdf}
            />
        </div>
        </div>

        {/* --- FLOATING CONTROLS (Left Top) --- */}
        <div 
            className={`
                fixed top-14 md:top-6 left-4 z-50 flex items-center gap-3 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
                ${!isSidebarOpen ? 'translate-x-0 opacity-100' : 'translate-x-[-150%] opacity-0 pointer-events-none'}
            `}
        >
            <div className="relative">
                {/* Mobile Hint Ping Animation Layer */}
                {showSidebarGuide && !isCanvasLocked && (
                    <span className="animate-breathe-attention absolute inset-0 inline-flex rounded-full bg-sciblue-400/20"></span>
                )}
                
                <button
                    onClick={handleOpenSidebar}
                    title={t.tooltips.openSidebar}
                    className={`
                        relative flex items-center gap-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md pr-3 pl-1 py-1 md:pr-5 md:pl-1.5 md:py-1.5 rounded-full border shadow-[0_8px_30px_rgb(0,0,0,0.08)] active:scale-95 transition-all group z-10
                        ${floatingButtonHoverClass}
                        ${showSidebarGuide && !isCanvasLocked ? 'animate-breathe-attention border-sciblue-400 ring-2 ring-sciblue-400/30' : 'border-slate-200/60 dark:border-slate-700/60'}
                        ${isCanvasLocked ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}
                    `}
                >
                     <div className={`w-6 h-6 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-sciblue-500 to-indigo-600 flex items-center justify-center border border-white/20 text-white shadow-inner transition-transform duration-500 ${floatingIconHoverClass}`}>
                        <Atom size={isMobile ? 12 : 18} />
                     </div>
                     <div className={`flex flex-col items-start leading-none transition-colors duration-300 ${floatingTextHoverClass}`}>
                       <span className={`text-[8px] md:text-[11px] font-extrabold text-slate-700 dark:text-slate-200 tracking-widest uppercase font-mono ${floatingTextHoverClass}`}>Project Institution</span>
                       <span className={`text-[8px] md:text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wide ${floatingAccentHoverClass}`}>WEIHAI</span>
                    </div>
                </button>

                {/* Mobile Tooltip Guide - MOVED INSIDE RELATIVE WRAPPER & POSITIONED BELOW */}
                {showSidebarGuide && !isCanvasLocked && (
                   <div className="absolute top-full left-0 mt-2 flex w-max max-w-[min(92vw,360px)] flex-col items-start animate-fade-in pointer-events-none z-50">
                      {/* Arrow pointing up */}
                      <div className="ml-3 h-0 w-0 border-x-[6px] border-x-transparent border-b-[8px] border-b-white/80 drop-shadow-sm dark:border-b-slate-900/70"></div>
                      {/* Text Bubble */}
                      <div className="min-w-[10rem] max-w-full rounded-lg border border-sciblue-400/60 bg-white/[0.8] px-3 py-2.5 shadow-lg backdrop-blur-md dark:bg-slate-900/[0.72]">
                        <p className={`mx-auto text-center text-[11px] font-bold leading-snug text-sciblue-700 dark:text-sciblue-50 break-words [overflow-wrap:anywhere] ${guideBubbleTextWidthClass}`}>
                          {t.hints.sidebarTitle}
                        </p>
                        <p className={`mx-auto mt-1.5 text-center text-[9.5px] leading-[1.45] text-sciblue-700/85 dark:text-sciblue-100/80 break-words [overflow-wrap:anywhere] sm:text-[10px] ${guideBubbleTextWidthClass}`}>
                          {t.hints.sidebarBody}
                        </p>
                      </div>
                   </div>
                )}
            </div>

            {!needsReset && (
                <button
                    onClick={handleStartPause}
                    title={isRunning ? t.controls.pause : t.controls.start}
                    // Reduced size: w-8 h-8 on mobile
                    className={`
                        w-8 h-8 md:w-11 md:h-11 rounded-full shadow-lg border backdrop-blur-md transition-all active:scale-90 flex items-center justify-center
                        ${isRunning 
                            ? `${isDesktopLike ? 'hover:bg-amber-400/90 hover:shadow-amber-200/40' : ''} bg-amber-400/80 dark:bg-amber-400/25 border-amber-300/70 dark:border-amber-300/40 text-amber-900 dark:text-amber-200`
                            : `${isDesktopLike ? 'hover:bg-slate-800/80 dark:hover:bg-white/15 hover:shadow-slate-300/40' : ''} bg-slate-900/70 dark:bg-white/10 border-slate-700/60 dark:border-white/20 text-white dark:text-slate-100`
                        }
                        ${isCanvasLocked ? 'opacity-50 cursor-not-allowed hover:bg-auto' : ''}
                    `}
                >
                    {isRunning ? <Pause size={isMobile ? 14 : 18} fill="currentColor"/> : <Play size={isMobile ? 14 : 18} fill="currentColor" className="ml-0.5"/>}
                </button>
            )}
        </div>

      </main>

      <div
        ref={topElasticRef}
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 z-[70] pointer-events-none"
        style={{
          height: 0,
          opacity: 0,
          transform: 'scaleY(1)',
          transformOrigin: 'top',
          background: 'linear-gradient(to bottom, rgba(14,165,233,0.24), rgba(14,165,233,0))',
          boxShadow: '0 18px 40px rgba(14,165,233,0.14)'
        }}
      />

      <div
        ref={bottomElasticRef}
        aria-hidden="true"
        className="fixed bottom-0 left-0 right-0 z-[90] pointer-events-none"
        style={{
          height: 0,
          opacity: 0,
          transform: 'scaleY(1)',
          transformOrigin: 'bottom',
          background: 'linear-gradient(to top, rgba(14,165,233,0.34), rgba(14,165,233,0.08) 48%, rgba(14,165,233,0))',
          boxShadow: '0 -24px 52px rgba(14,165,233,0.22)'
        }}
      />

      {/* VISITOR TOAST - MOVED TO BOTTOM */}
      <div className={`fixed bottom-24 md:bottom-10 left-1/2 transform -translate-x-1/2 z-[100] transition-all duration-700 ease-in-out ${showVisitorToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-slate-600 dark:text-slate-200 px-5 py-2 rounded-full shadow-xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
            <span className="bg-emerald-100 dark:bg-emerald-900/40 p-1 rounded-full"><User size={12} className="text-emerald-600 dark:text-emerald-400"/></span>
            <span className="text-xs font-medium tracking-wide">
                {t.footer.visitorCount}
            </span>
        </div>
      </div>

      {/* NOTIFICATION */}
      <div className={`fixed pointer-events-none ${isCreatePresetModalOpen ? 'z-[150]' : 'z-[100]'} ${notification.position === 'center' ? 'inset-0 flex items-center justify-center px-4' : 'inset-x-0 bottom-8 flex justify-center px-4'}`}>
        <div 
            key={notification.id}
            className={`
                transition-all duration-500 ease-out
                ${notification.visible 
                    ? (notification.position === 'center' ? 'animate-fade-in opacity-100 scale-100' : 'animate-slide-up opacity-100') 
                    : (notification.position === 'center' ? 'opacity-0 scale-95' : 'opacity-0 translate-y-8')
                }
            `}
        >
            <div className={`
                min-h-[48px] max-w-[min(92vw,24rem)] px-4 py-2.5 rounded-lg shadow-xl flex items-center justify-center gap-3 border backdrop-blur-md
                ${notification.type === 'success' ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900' : 
                  notification.type === 'warning' ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900' : 
                  'bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-slate-700 dark:border-slate-200'}
            `}>
                {notification.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-500"/> :
                 notification.type === 'warning' ? <AlertCircle size={16} className="text-amber-500"/> :
                 (notification.text.includes(t.canvas.locked.split('·')[0]) ? <Lock size={16} className="text-sciblue-400"/> : <MousePointer2 size={16} className="text-amber-400"/>)}
                <span className={`font-medium text-sm leading-snug text-center break-words [overflow-wrap:anywhere] ${notificationTextWidthClass}`}>{notification.text}</span>
            </div>
        </div>
      </div>

      {/* RIGHT TOP CONTROLS: Dark Mode + Language */}
      {/* Increased z-index to 60 to stay above canvas interaction when locked */}
      <div className={`fixed top-14 right-4 md:top-6 md:right-6 z-[60] flex items-center gap-3 transition-opacity duration-300 ${overlayControlHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* Dark Mode Toggle */}
        <button 
            onClick={toggleDarkMode}
            title={t.tooltips.themeToggle}
            className={`flex items-center justify-center w-9 h-9 md:w-11 md:h-11 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md text-slate-600 dark:text-slate-100 rounded-full border border-slate-200/60 dark:border-slate-700/60 transition-all active:scale-95 shadow-sm ${themeButtonHoverClass}`}
        >
            {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
            <span className="sr-only">{isDarkMode ? t.common.modeDark : t.common.modeLight}</span>
        </button>
        {/* Language Menu */}
        <div
            ref={langMenuRef}
            className="relative"
        >
            <button 
                type="button"
                title={t.tooltips.langToggle}
                aria-expanded={isLangMenuOpen}
                aria-haspopup="menu"
                onClick={handleLangMenuToggle}
                className={`flex items-center justify-center w-9 h-9 md:w-11 md:h-11 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md text-slate-600 dark:text-slate-100 rounded-full border border-slate-200/60 dark:border-slate-700/60 transition-all active:scale-95 shadow-sm ${toolButtonHoverClass}`}
            >
                <Globe size={16} />
                <span className="sr-only">{t.header.language}</span>
            </button>
            <div className={`absolute right-0 top-full w-48 pt-2 transition-all duration-200 origin-top-right z-50 ${isLangMenuOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95 pointer-events-none'}`}>
                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden py-1">
                    {['zh-CN', 'zh-TW', 'en-GB', 'en-US'].map((l) => (
                        <button
                            type="button"
                            key={l}
                            onClick={() => handleLangChange(l as LanguageCode)}
                            className={`w-full px-4 py-3 text-left text-sm font-medium ${languageItemHoverClass} ${lang === l ? 'text-sciblue-600 dark:text-sciblue-400' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                            <span className="flex items-center justify-between">
                                <span>{formatLangLabel(l)}</span>
                                {lang === l && <ChevronRight size={14}/>}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {isCreatePresetModalOpen && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center px-4"
          style={overlayFrameStyle}
          onClick={closeCreatePresetModal}
        >
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-preset-title"
            className="relative z-10 w-full max-w-sm rounded-lg border border-slate-200/80 bg-white/95 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/95"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id="create-preset-title" className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {presetModalMode === 'rename' ? t.storage.renameTitle : t.storage.createTitle}
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t.storage.placeholder}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreatePresetModal}
                className={`flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 ${sidebarHoverClass}`}
                title={t.common.closeCard}
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <input
                ref={presetNameInputRef}
                type="text"
                placeholder={t.storage.placeholder}
                value={newConfigName}
                onChange={(event) => setNewConfigName(event.target.value)}
                onFocus={handleInputFocus}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSaveConfig(newConfigName);
                  }
                }}
                style={sidebarInputScrollMarginStyle}
                className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-700 focus:border-sciblue-500 focus:outline-none focus:ring-2 focus:ring-sciblue-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 ${sidebarInputTextClass} ${sidebarInputPaddingClass}`}
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={closeCreatePresetModal}
                  className={`inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-500 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 ${isDesktopLike ? 'hover:border-slate-300 hover:text-slate-700 dark:hover:border-slate-600 dark:hover:text-slate-100' : 'active:scale-95'}`}
                >
                  <span className={`mx-auto text-center leading-tight break-words [overflow-wrap:anywhere] ${presetActionTextWidthClass}`}>{t.storage.cancel}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveConfig(newConfigName)}
                  className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-sciblue-500 bg-sciblue-500 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition-all ${isDesktopLike ? 'hover:bg-sciblue-600 hover:border-sciblue-600' : 'active:scale-95'}`}
                >
                  {presetModalMode === 'rename' ? <Pencil size={14} className="hidden shrink-0 sm:block" /> : <Save size={14} className="hidden shrink-0 sm:block" />}
                  <span className={`mx-auto text-center leading-tight break-words [overflow-wrap:anywhere] ${presetActionTextWidthClass}`}>{presetModalMode === 'rename' ? t.storage.confirmRename : t.storage.confirmCreate}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmConfig && (
        <div
          className="fixed inset-0 z-[132] flex items-center justify-center px-4"
          style={overlayFrameStyle}
          onClick={closeDeleteConfirm}
        >
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-preset-title"
            className="relative z-10 w-full max-w-sm rounded-lg border border-slate-200/80 bg-white/95 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/95"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id="delete-preset-title" className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {t.storage.delete}
                </h2>
                <p className={`mt-2 text-sm leading-[1.45] text-slate-500 dark:text-slate-400 break-words [overflow-wrap:anywhere] ${deleteDialogTextWidthClass}`}>
                  {t.storage.confirmDelete}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDeleteConfirm}
                className={`flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 ${sidebarHoverClass}`}
                title={t.common.closeCard}
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-4 rounded-lg border border-rose-100 bg-rose-50/80 px-4 py-3 text-rose-600 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200">
              <div className="flex items-center gap-2">
                <Trash2 size={16} className="shrink-0" />
                <span className={`text-sm font-semibold leading-snug break-words [overflow-wrap:anywhere] ${deleteDialogTextWidthClass}`}>
                  {deleteConfirmConfig.name}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                className={`inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-500 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 ${isDesktopLike ? 'hover:border-slate-300 hover:text-slate-700 dark:hover:border-slate-600 dark:hover:text-slate-100' : 'active:scale-95'}`}
              >
                <span className={`mx-auto text-center leading-tight break-words [overflow-wrap:anywhere] ${presetActionTextWidthClass}`}>{t.storage.cancel}</span>
              </button>
              <button
                type="button"
                onClick={handleDeleteConfig}
                className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-rose-500 bg-rose-500 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition-all ${isDesktopLike ? 'hover:border-rose-600 hover:bg-rose-600' : 'active:scale-95'}`}
              >
                <Trash2 size={14} className="hidden shrink-0 sm:block" />
                <span className={`mx-auto text-center leading-tight break-words [overflow-wrap:anywhere] ${presetActionTextWidthClass}`}>{t.storage.delete}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {presetActionMenu && activePresetMenuConfig && (
        <div
          ref={presetActionMenuRef}
          className="fixed z-[128] w-48 overflow-hidden rounded-lg border border-slate-200/80 bg-white/95 p-1 shadow-[0_20px_50px_rgba(15,23,42,0.22)] backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/95"
          style={{ top: `${presetActionMenu.top}px`, left: `${presetActionMenu.left}px` }}
        >
          <button
            type="button"
            onClick={() => handleSetStartupPreset(activePresetMenuConfig)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-600 transition-colors dark:text-slate-200 ${isDesktopLike ? 'hover:bg-slate-100 dark:hover:bg-slate-800' : 'active:scale-[0.99]'}`}
          >
            <Check size={14} className="text-emerald-500" />
            <span>{t.storage.setDefault}</span>
          </button>

          {!activePresetMenuConfig.isSystem && (
            <>
              <button
                type="button"
                onClick={() => openRenamePresetModal(activePresetMenuConfig)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-600 transition-colors dark:text-slate-200 ${isDesktopLike ? 'hover:bg-slate-100 dark:hover:bg-slate-800' : 'active:scale-[0.99]'}`}
              >
                <Pencil size={14} className="text-sciblue-500" />
                <span>{t.storage.rename}</span>
              </button>

              <button
                type="button"
                onClick={() => requestDeleteConfig(activePresetMenuConfig)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-rose-500 transition-colors ${isDesktopLike ? 'hover:bg-rose-50 dark:hover:bg-rose-900/20' : 'active:scale-[0.99]'}`}
              >
                <Trash2 size={14} />
                <span>{t.storage.delete}</span>
              </button>
            </>
          )}
        </div>
      )}

    </div>
  );
}

export default App;
