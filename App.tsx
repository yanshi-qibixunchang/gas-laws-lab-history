import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Box, Activity, Globe, ChevronRight, Lock, Unlock, MousePointer2, User, Atom, AlertCircle, CheckCircle2, PanelLeftClose, SlidersHorizontal, X, Undo2, LayoutDashboard, Moon, Sun, ArrowLeft, Save, Download, Trash2, Archive, ShieldCheck, ChevronDown, LogOut, Info, Check } from 'lucide-react';
import { PhysicsEngine } from './services/PhysicsEngine';
import { SimulationParams, SimulationStats, ChartData, LanguageCode, SavedConfig } from './types';
import { translations } from './services/translations';
import SimulationCanvas from './components/SimulationCanvas';
import CollapsibleCard from './components/CollapsibleCard';
import DistributionCharts from './components/DistributionCharts';
import StatsPanel from './components/StatsPanel';
import StackedResults from './components/StackedResults';
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

const isTouchLikeViewport = () =>
  mediaMatches('(pointer: coarse)') ||
  mediaMatches('(hover: none)') ||
  (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [needsReset, setNeedsReset] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscapeMode, setIsLandscapeMode] = useState(false);
  
  // KEYBOARD/SHORT SCREEN DETECTION
  // When keyboard is open, height shrinks significantly. We need to detect this to change layout.
  const [isShortHeight, setIsShortHeight] = useState(false);
  const viewportBaselineRef = useRef({ portrait: 0, landscape: 0 });
  const keyboardOpenRef = useRef(false);
  const keyboardResetRef = useRef<number | null>(null);

  // SECTION COLLAPSE STATES
  // Default: Storage Collapsed (false), Params Expanded (true)
  const [isStorageOpen, setIsStorageOpen] = useState(false);
  const [isParamsOpen, setIsParamsOpen] = useState(true);
  
  // New State: Mobile Hint Guide & Interaction Tracking
  const [showMobileHint, setShowMobileHint] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Storage State
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [newConfigName, setNewConfigName] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const [stats, setStats] = useState<SimulationStats>({
    time: 0, temperature: 0, pressure: 0, meanSpeed: 0, rmsSpeed: 0,
    isEquilibrated: false, progress: 0, phase: 'idle'
  });
  
  const [chartData, setChartData] = useState<ChartData>({ speed: [], energy: [], energyLog: [], tempHistory: [] });
  const [finalChartData, setFinalChartData] = useState<ChartData | null>(null);

  // Interaction State
  const [isCanvasLocked, setIsCanvasLocked] = useState(false);
  
  // Notification State with unique ID for animation resetting
  const [notification, setNotification] = useState<{text: string, visible: boolean, type?: 'info'|'success'|'warning', id: number}>({ text: '', visible: false, type: 'info', id: 0 });
  const notificationTimeoutRef = useRef<number>(0);

  // Visitor Counter
  const [visitorCount, setVisitorCount] = useState<number>(0);
  const [showVisitorToast, setShowVisitorToast] = useState(false);

  const engineRef = useRef<PhysicsEngine | null>(null);
  const reqRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  // Define Immutable System Preset
  const SYSTEM_PRESET: SavedConfig = {
      id: 'system_preset_001',
      name: t.storage.systemPresetName,
      params: DEFAULT_PARAMS,
      date: 0,
      isSystem: true
  };

  const showNotification = (text: string, duration = 1500, type: 'info'|'success'|'warning' = 'info') => {
    // Clear existing timer to prevent premature closing of new notification
    if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
    
    // Use Date.now() as a unique ID.
    // When ID changes, React re-mounts the component (via key prop), forcing the CSS animation to replay instantly.
    const newId = Date.now();
    setNotification({ text, visible: true, type, id: newId });

    notificationTimeoutRef.current = window.setTimeout(() => {
        setNotification(prev => ({ ...prev, visible: false }));
    }, duration);
  };

  const isSidebarOverlay = isMobile || (isLandscapeMode && isTouchLikeViewport());
  const sidebarWidthClass = isSidebarOverlay ? 'w-[85vw]' : 'w-[300px]';
  const sidebarInnerWidthClass = isSidebarOverlay ? 'w-[85vw] min-w-[300px]' : 'w-[300px] min-w-[300px]';
  const sidebarHeaderPaddingClass = 'pt-14';
  const sidebarHeaderStackClass = 'flex flex-col gap-6 mb-4';
  const sidebarSubtitleClass = 'text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider';
  const sidebarSectionSpacingClass = 'space-y-4';
  const sidebarContentWidthClass = 'w-[85%] mx-auto';
  const paramLayoutClass = 'space-y-2';
  const paramItemWidthClass = 'w-[85%] mx-auto';
  const bottomPaddingClass = 'pb-8';
  const actionButtonWrapClass = 'flex flex-col gap-2 items-center';
  const actionButtonWidthClass = 'w-[85%]';
  const actionButtonPaddingClass = 'py-2';
  const actionButtonTextClass = 'text-xs md:text-sm';
  const actionCollapseClass = 'justify-center text-[10px] mt-1';

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
    const orientationKey = orientationIsLandscape ? 'landscape' : 'portrait';

    const baselineCandidate = Math.max(visualHeight, layoutHeight);
    const previousBaseline = viewportBaselineRef.current[orientationKey];
    const nextBaseline = previousBaseline ? Math.max(previousBaseline, baselineCandidate) : baselineCandidate;
    viewportBaselineRef.current[orientationKey] = nextBaseline;

    let heightDelta = nextBaseline - visualHeight;
    const activeElement = typeof document !== 'undefined' ? document.activeElement : null;
    const hasEditableFocus = isEditableElement(activeElement);
    const keyboardThreshold = Math.max(80, nextBaseline * 0.18);
    const shortHeightThreshold = orientationIsLandscape ? 480 : 600;
    const constrainedHeight = visualHeight < shortHeightThreshold;

    if (!hasEditableFocus && !keyboardOpenRef.current && heightDelta > keyboardThreshold) {
      viewportBaselineRef.current[orientationKey] = baselineCandidate;
      heightDelta = baselineCandidate - visualHeight;
    }

    const keyboardLikely = heightDelta > keyboardThreshold;
    const keyboardActive = keyboardLikely && (hasEditableFocus || keyboardOpenRef.current);

    if (keyboardOpenRef.current && !keyboardLikely && !hasEditableFocus && heightDelta < keyboardThreshold * 0.5) {
      keyboardOpenRef.current = false;
    }

    setIsMobile(layoutWidth < 768);
    setIsLandscapeMode(orientationIsLandscape);
    setIsShortHeight(constrainedHeight || keyboardActive || keyboardOpenRef.current);
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
    
    // Only set Sidebar to closed INITIALLY if on mobile.
    if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
    }

    // 2. Resize/Viewport/Keyboard Listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);

    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      visualViewport?.removeEventListener('resize', handleResize);
      if (keyboardResetRef.current) {
        window.clearTimeout(keyboardResetRef.current);
        keyboardResetRef.current = null;
      }
    };
  }, [updateViewportState]);

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

  // Mobile Hint Timer Logic
  useEffect(() => {
    let timer: number;
    if (isMobile && !isSidebarOpen && !isRunning && !hasUserInteracted) {
        timer = window.setTimeout(() => {
            setShowMobileHint(true);
        }, 2000);
    } else {
        setShowMobileHint(false);
    }
    return () => clearTimeout(timer);
  }, [isMobile, isSidebarOpen, isRunning, hasUserInteracted]);

  // Initial Load & Animation smoothing
  useEffect(() => {
    const storedCount = localStorage.getItem('hs_visitor_count');
    const storedDate = localStorage.getItem('hs_visitor_date');
    const today = new Date().toDateString();
    let finalCount = 0;
    if (storedCount && storedDate === today) {
        finalCount = parseInt(storedCount);
    } else {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 0);
        const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
        finalCount = 3500 + (dayOfYear * 25) + Math.floor(Math.random() * 15);
        localStorage.setItem('hs_visitor_count', finalCount.toString());
        localStorage.setItem('hs_visitor_date', today);
    }
    setVisitorCount(finalCount);
    
    // Init Engine
    // Note: If we loaded custom params, params is already set. engine uses current params state.
    engineRef.current = new PhysicsEngine(params);
    setChartData(engineRef.current.getHistogramData(false));
    setNeedsReset(false);

    setTimeout(() => {
        setShowVisitorToast(true);
        setTimeout(() => setShowVisitorToast(false), 6000);
    }, 1500);
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
      if (isMobile) {
          // Add a delay to allow keyboard animation to start/finish
          setTimeout(() => {
              e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
      }
  };

  // --- Storage Handlers ---
  const handleSaveConfig = () => {
      const nameToSave = newConfigName.trim();
      if (!nameToSave) {
          showNotification(t.messages.checkInputs, 1500, 'warning');
          return;
      }
      
      // 1. Check for duplicate NAMES (including system preset)
      const isNameDuplicate = savedConfigs.some(c => c.name === nameToSave);
      if (isNameDuplicate) {
          showNotification(t.storage.duplicateName, 2000, 'warning');
          return;
      }

      // 2. Check for duplicate PARAMETERS (including system preset)
      const isParamsDuplicate = savedConfigs.some(c => {
          const p = c.params;
          return (
              p.N === params.N &&
              p.L === params.L &&
              p.r === params.r &&
              p.m === params.m &&
              p.k === params.k &&
              p.dt === params.dt &&
              p.nu === params.nu &&
              p.equilibriumTime === params.equilibriumTime &&
              p.statsDuration === params.statsDuration
          );
      });

      if (isParamsDuplicate) {
          showNotification(t.storage.duplicateParams, 2500, 'warning');
          return;
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
      showNotification(t.storage.saveSuccess, 2000, 'success');
  };

  const handleSelectPreset = (config: SavedConfig) => {
      setSelectedPresetId(config.id);
      // Automatically load parameters when selected
      setParams(config.params);
      setNeedsReset(true);
  };

  const handleDeleteConfig = (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent selection when deleting
      if(confirm(t.storage.confirmDelete)) {
          const userConfigs = savedConfigs.filter(c => !c.isSystem && c.id !== id);
          // Re-add system preset + remaining user configs
          setSavedConfigs([savedConfigs[0], ...userConfigs]);
          localStorage.setItem('hsl_favorites', JSON.stringify(userConfigs));
          if (selectedPresetId === id) setSelectedPresetId(null);
      }
  };

  const handleSetCustomDefault = () => {
      if (!selectedPresetId) {
          showNotification(t.storage.selectFirst, 2000, 'warning');
          return;
      }
      
      const configToSet = savedConfigs.find(c => c.id === selectedPresetId);
      if (configToSet) {
          localStorage.setItem('hsl_custom_default', JSON.stringify(configToSet.params));
          showNotification(t.storage.defaultSet, 2000, 'success');
      }
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
      setHasUserInteracted(true);
      
      if (needsReset) {
          showNotification(t.messages.resetBeforeStart, 2500, 'warning');
          if (!isSidebarOpen) setIsSidebarOpen(true);
          return;
      }

      if (!isRunning) {
          setIsRunning(true);
          // Smoother close for sidebar
          if (isSidebarOpen && isMobile) {
              setIsSidebarOpen(false); 
          }
      } else {
          setIsRunning(false);
      }
  };

  const handleOpenSidebar = (e?: React.MouseEvent) => {
      if(checkInteractionLock(e)) return;
      setIsSidebarOpen(true);
      setHasUserInteracted(true); 
  };
  
  const handleCloseSidebar = (e?: React.MouseEvent) => {
      if(checkInteractionLock(e)) return;
      setIsSidebarOpen(false);
  }

  const getLangName = (l: string) => {
    switch(l) {
        case 'zh-CN': return '简体中文';
        case 'zh-TW': return '繁體中文';
        case 'en-GB': return 'English (UK)';
        case 'en-US': return 'English (US)';
        default: return l;
    }
  };

  const handleLangChange = (l: LanguageCode) => {
      if (lang !== l) {
          setLang(l);
          showNotification(getLangName(l), 1500, 'success');
      }
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

  return (
    <div className="h-screen w-screen font-sans flex overflow-hidden relative selection:bg-sciblue-200 selection:text-sciblue-900 dark:selection:bg-sciblue-900 dark:selection:text-sciblue-100 transition-colors duration-500">
      
      {/* GLOBAL INTERACTION LOCK BACKDROP - z-[90] */}
      {isCanvasLocked && (
        <div 
            className="fixed inset-0 z-[90] bg-black/10 cursor-crosshair backdrop-blur-[1px]" 
            onClick={(e) => {
                e.stopPropagation();
                setIsCanvasLocked(false);
                showNotification(t.canvas.autoExit, 1500); // Trigger Notification on Click Outside
            }}
            title={t.canvas.clickToRelease}
        />
      )}

      {/* --- SIDEBAR (CONTROLS) --- */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-md z-40 transition-opacity duration-500 ${isSidebarOverlay ? 'block' : 'hidden'} ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={handleOverlayClick}
      />

      <aside 
        className={`
            ${isSidebarOverlay ? 'fixed' : 'fixed md:relative'} z-[45] h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl md:shadow-none
            transition-[width,transform,background-color] duration-500 cubic-bezier(0.25, 1, 0.5, 1) flex flex-col
            /* MODIFIED: Sidebar overlays content in landscape touch mode */
            ${isSidebarOpen ? `${sidebarWidthClass} translate-x-0` : 'w-0 -translate-x-full'}
            overflow-hidden
            landscape:block landscape:overflow-y-auto landscape:md:flex landscape:md:overflow-hidden
        `}
      >
        {/* NEW LAYOUT: Dynamic Container Mode based on Height */}
        {/* If isShortHeight (keyboard open or landscape mobile), use BLOCK layout with scrolling, else FLEX layout with fixed footer */}
        <div className={`
            ${sidebarInnerWidthClass} bg-white dark:bg-slate-900
            ${isShortHeight ? 'block h-full overflow-y-auto' : 'flex flex-col h-full'}
            landscape:block landscape:h-auto landscape:md:h-full landscape:md:flex
        `}>
            
            {/* 1. TOP & MIDDLE: Header + Scrollable Parameters */}
            <div 
                className={`
                    min-h-0 flex flex-col 
                    ${isShortHeight ? 'overflow-visible' : 'flex-1 overflow-y-auto'}
                    landscape:flex-none landscape:overflow-visible landscape:md:flex-1 landscape:md:overflow-y-auto
                `}
            >
                {/* Compact Padding for sidebar header */}
                <div className={`p-3 ${sidebarHeaderPaddingClass} md:p-5 md:pt-5 pb-2`}>
                    
                    {/* Header */}
                    <div className={sidebarHeaderStackClass}>
                        {/* Align header width with form content */}
                        <div className={`flex items-center justify-between ${sidebarContentWidthClass}`}>
                            <div className="flex items-center gap-3 select-none">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sciblue-500 to-indigo-600 flex items-center justify-center border border-white/20 text-white shadow-inner">
                                    <Atom size={18} />
                                </div>
                                <div className="flex flex-col leading-none">
                                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t.brand.name}</span>
                                <span className={sidebarSubtitleClass}>{t.brand.subtitle}</span>
                                </div>
                            </div>
                            <button onClick={handleCloseSidebar} className={`p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors ${isCanvasLocked ? 'opacity-50 cursor-not-allowed' : ''}`} title={t.tooltips.closeSidebar}>
                                <X size={18}/>
                            </button>
                        </div>
                    </div>

                    {/* Inputs Group */}
                    <div className={`${sidebarSectionSpacingClass} ${isCanvasLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                        
                        {/* STORAGE SECTION (COLLAPSIBLE) */}
                        <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                            {/* Align section header with content width */}
                            <div 
                                onClick={() => setIsStorageOpen(!isStorageOpen)}
                                className={`${sidebarContentWidthClass} flex items-center justify-between cursor-pointer group mb-2 py-1 select-none`}
                            >
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider group-hover:text-sciblue-600 dark:group-hover:text-sciblue-400 transition-colors">
                                    <Archive size={14} className="text-slate-400 dark:text-slate-500 group-hover:text-sciblue-500 transition-colors group-hover:scale-110 duration-300"/> 
                                    {t.storage.title}
                                </div>
                                <div className="p-1 rounded-full group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
                                    <ChevronDown 
                                        size={14} 
                                        className={`text-slate-400 dark:text-slate-500 transition-transform duration-300 ${isStorageOpen ? 'rotate-180 text-sciblue-500' : 'rotate-0'}`}
                                    />
                                </div>
                            </div>
                            
                            {/* Smoother cubic-bezier transition for collapse */}
                            <div className={`overflow-hidden transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isStorageOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                {/* Save Current */}
                                <div className={`flex gap-2 mb-3 mt-1 ${sidebarContentWidthClass}`}>
                                    <input 
                                        type="text" 
                                        placeholder={t.storage.placeholder}
                                        value={newConfigName}
                                        onChange={(e) => setNewConfigName(e.target.value)}
                                        onFocus={handleInputFocus} // ADDED FOCUS HANDLER
                                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-sciblue-500 w-full"
                                    />
                                    <button onClick={handleSaveConfig} className="bg-slate-100 dark:bg-slate-800 hover:bg-sciblue-500 hover:text-white text-slate-500 dark:text-slate-400 p-1.5 rounded-md border border-slate-200 dark:border-slate-700 transition-colors shadow-sm shrink-0">
                                        <Save size={16} />
                                    </button>
                                </div>

                                {/* Default Button */}
                                <button 
                                    onClick={handleSetCustomDefault} 
                                    className={`${sidebarContentWidthClass} mb-3 text-[10px] text-slate-400 hover:text-sciblue-600 dark:hover:text-sciblue-400 flex items-center justify-center gap-1 py-1 border border-dashed border-slate-200 dark:border-slate-700 rounded hover:border-sciblue-300 transition-colors group`}
                                    title={t.storage.setDefault}
                                >
                                    <CheckCircle2 size={10} className="text-slate-300 group-hover:text-sciblue-500 transition-colors"/> 
                                    <span className="group-hover:font-semibold transition-all">{t.storage.setDefault}</span>
                                </button>

                                {/* List */}
                                <div className={`space-y-2 pb-2 ${sidebarContentWidthClass}`}>
                                    {savedConfigs.length === 1 && <div className="text-[10px] text-center text-slate-400 italic py-2">{t.storage.empty}</div>}
                                    {savedConfigs.map(config => (
                                        <div 
                                            key={config.id} 
                                            onClick={() => handleSelectPreset(config)}
                                            className={`
                                                relative flex items-center justify-between p-1.5 rounded border cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-sm group
                                                ${selectedPresetId === config.id 
                                                    ? 'bg-sciblue-50 dark:bg-sciblue-900/20 border-sciblue-400 dark:border-sciblue-600 ring-1 ring-sciblue-400 dark:ring-sciblue-600' 
                                                    : config.isSystem 
                                                        ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30' 
                                                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                {config.isSystem ? <ShieldCheck size={12} className="text-indigo-400 shrink-0"/> : null}
                                                <span className={`text-xs font-medium truncate max-w-[100px] ${config.isSystem ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300'}`}>{config.name}</span>
                                            </div>
                                            <div className="flex gap-1 relative z-10">
                                                {!config.isSystem && (
                                                    <>
                                                        <button 
                                                            onClick={(e) => handleDeleteConfig(config.id, e)} 
                                                            className="text-rose-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 p-1 rounded transition-colors" 
                                                            title={t.storage.delete}
                                                        >
                                                            <Trash2 size={12}/>
                                                        </button>
                                                    </>
                                                )}
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
                                className={`${sidebarContentWidthClass} flex items-center justify-between cursor-pointer group mb-2 py-1 select-none`}
                            >
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider group-hover:text-sciblue-600 dark:group-hover:text-sciblue-400 transition-colors">
                                    <SlidersHorizontal size={14} className="text-slate-400 dark:text-slate-500 group-hover:text-sciblue-500 transition-colors group-hover:scale-110 duration-300"/> 
                                    <span>{t.controls.title}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                     <button 
                                        onClick={handleRestoreDefaults}
                                        disabled={isRunning}
                                        className={`text-[10px] font-medium flex items-center gap-1 py-0.5 px-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10 relative ${isRunning ? 'text-slate-300 dark:text-slate-600' : isCanvasLocked ? 'text-slate-400 dark:text-slate-600 opacity-50 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400'}`}
                                        title={t.controls.restoreDefaults}
                                    >
                                        <Undo2 size={12}/> {t.controls.default}
                                    </button>
                                    <div className="p-1 rounded-full group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
                                        <ChevronDown 
                                            size={14} 
                                            className={`text-slate-400 dark:text-slate-500 transition-transform duration-300 ${isParamsOpen ? 'rotate-180 text-sciblue-500' : 'rotate-0'}`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Smoother cubic-bezier transition for collapse */}
                            <div className={`overflow-hidden transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isParamsOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className={`${paramLayoutClass} pb-2 px-0.5`}>
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
                                            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase block mb-0.5">{field.label}</label>
                                            <div className="relative">
                                                <input 
                                                type="number" step={field.step} min={field.min}
                                                value={isNaN(params[field.key as keyof SimulationParams]) ? '' : params[field.key as keyof SimulationParams]}
                                                disabled={isRunning || isCanvasLocked}
                                                onChange={(e) => handleParamChange(field.key as keyof SimulationParams, e.target.value)}
                                                onFocus={handleInputFocus} // ADDED FOCUS HANDLER
                                                /* MODIFIED: Compact input styles (text-xs, py-1, px-2) to fit 70vw */
                                                className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs md:text-sm text-slate-700 dark:text-slate-200 font-mono outline-none transition-all focus:bg-white dark:focus:bg-slate-700 ${isRunning ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900' : 'focus:border-sciblue-500 focus:ring-1 focus:ring-sciblue-500/20 hover:border-slate-300 dark:hover:border-slate-600'}`}
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
                p-3 pt-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 
                ${isShortHeight ? `static ${bottomPaddingClass} border-t-0` : 'flex-none'}
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
                                    ? 'bg-slate-900 dark:bg-sciblue-600 hover:bg-slate-800 dark:hover:bg-sciblue-500 text-white active:scale-95'
                                    : 'bg-white dark:bg-slate-800 border-2 border-amber-500 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-700'
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
                                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:border-amber-300 shadow-sm' 
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                        }
                        ${isCanvasLocked ? 'opacity-50 cursor-not-allowed hover:bg-auto' : ''}
                    `}
                    title={t.controls.reset}
                    >
                    <RotateCcw size={14} className={needsReset ? "animate-spin-slow" : ""} /> {t.controls.reset}
                    </button>
                    
                    <button 
                        onClick={handleCloseSidebar}
                        className={`flex items-center ${actionCollapseClass} font-bold text-slate-400 dark:text-slate-500 hover:text-sciblue-600 dark:hover:text-sciblue-400 transition-colors py-1 uppercase tracking-widest ${isCanvasLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
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
      <main className="flex-1 h-full overflow-y-auto overflow-x-hidden relative flex flex-col scroll-smooth">
        
        {/* Modern Header Area */}
        {/* Landscape Optimization: Reduced top/bottom padding to maximize vertical space */}
        <header className="pt-24 pb-4 landscape:pt-6 landscape:pb-1 md:pt-24 md:pb-6 px-6 max-w-4xl mx-auto text-center animate-fade-in w-full shrink-0">
            {/* Version Badge - Centered Above Title */}
            <div className="flex justify-center mb-5 landscape:mb-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold tracking-[0.2em] uppercase shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
                    {t.header.systemOp} · v2.2
                </div>
            </div>
            
            {/* Metallic Title with CSS Animation - Adjusted for mobile wrapping */}
            <h1 className="text-2xl sm:text-4xl landscape:text-3xl md:text-6xl font-serif font-black mb-4 landscape:mb-1 tracking-tight text-metallic whitespace-nowrap">
                {t.title}
            </h1>
            
            <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base font-medium max-w-2xl mx-auto leading-relaxed">
                {t.subtitle}
            </p>
        </header>

        {/* Content Container */}
        <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-10 landscape:pb-4 space-y-6">
            
            {/* 3D View Card - Z-Index 100 when locked ensures it sits ABOVE the global z-[90] backdrop */}
            <div className={`${isCanvasLocked ? 'relative z-[100]' : ''}`}>
                <CollapsibleCard 
                title={t.views.mdView} icon={<Box size={18} className="text-sciblue-600 dark:text-sciblue-400"/>} t={t}
                isLocked={isCanvasLocked || isRunning} // Locked during interaction OR running
                lockedWarningText={isRunning ? t.canvas.runningLocked : t.canvas.foldingLocked} 
                showNotification={(txt) => showNotification(txt, 2000, 'warning')}
                className="border-slate-200 shadow-sm bg-white"
                expandText={t.common.expandView}
                >
                {/* PASS isMobile PROP */}
                <SimulationCanvas 
                    particles={engineRef.current?.particles || []} L={activeParams.L} r={activeParams.r} isRunning={isRunning} t={t}
                    isFocused={isCanvasLocked} onFocusChange={setIsCanvasLocked} showNotification={(txt, dur) => showNotification(txt, dur, 'info')}
                    isMobile={isMobile}
                />
                <div className="mt-4">
                    <StatsPanel stats={stats} eqTime={params.equilibriumTime} statDuration={params.statsDuration} t={t} />
                </div>
                </CollapsibleCard>
            </div>

            {/* Realtime Monitor */}
            {!finalChartData ? (
                <CollapsibleCard 
                    title={t.views.realtimeCharts} 
                    icon={<Activity size={18} className="text-emerald-500"/>} 
                    t={t} 
                    contentClassName="p-0"
                    className="border-slate-200 shadow-sm bg-white overflow-hidden"
                    expandText={t.common.expandCharts}
                >
                   <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800">
                      <div className="p-4 md:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                         <DistributionCharts data={chartData} type="speed" t={t} heightClass="h-[240px] md:h-[260px]" isDarkMode={isDarkMode}/>
                      </div>
                      <div className="p-4 md:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                         <DistributionCharts data={chartData} type="energy" t={t} heightClass="h-[240px] md:h-[260px]" isDarkMode={isDarkMode} />
                      </div>
                   </div>
                </CollapsibleCard>
            ) : (
                <div className="animate-slide-up">
                    <CollapsibleCard 
                        title={t.views.finalStats} 
                        icon={<LayoutDashboard size={18} className="text-amber-500"/>} 
                        t={t}
                        expandText={t.common.expandResults}
                    >
                        <StackedResults data={finalChartData} t={t} isDarkMode={isDarkMode} />
                    </CollapsibleCard>
                </div>
            )}
            
        </div>
        
        {/* Footer (Also check interaction lock on footer links if needed, but usually just footer actions) */}
        <div onClick={(e) => { if(isCanvasLocked) { e.preventDefault(); e.stopPropagation(); showNotification(t.canvas.interactionLocked, 2000, 'warning'); } }}>
             <Footer t={t} showNotification={(msg, dur, type) => showNotification(msg, dur, type)} />
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
                {showMobileHint && !isCanvasLocked && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sciblue-400 opacity-75"></span>
                )}
                
                <button
                    onClick={handleOpenSidebar}
                    title={t.tooltips.openSidebar}
                    // Reduced padding on mobile: pr-3 pl-1 py-1
                    // Added ring animation support for mobile hint
                    className={`
                        relative flex items-center gap-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md pr-3 pl-1 py-1 md:pr-5 md:pl-1.5 md:py-1.5 rounded-full border shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgb(14,165,233,0.15)] hover:scale-105 active:scale-95 transition-all group z-10
                        ${showMobileHint && !isCanvasLocked ? 'border-sciblue-400 ring-2 ring-sciblue-400/30' : 'border-slate-200/60 dark:border-slate-700/60'}
                        ${isCanvasLocked ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}
                    `}
                >
                     {/* Reduced size: w-6 h-6 on mobile */}
                     <div className="w-6 h-6 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-sciblue-500 to-indigo-600 flex items-center justify-center border border-white/20 text-white shadow-inner group-hover:rotate-12 transition-transform duration-500">
                        <Atom size={isMobile ? 12 : 18} />
                     </div>
                     <div className="flex flex-col items-start leading-none group-hover:text-sciblue-600 dark:group-hover:text-sciblue-400 transition-colors duration-300">
                       {/* Reduced font size */}
                       <span className="text-[8px] md:text-[11px] font-extrabold text-slate-700 dark:text-slate-200 tracking-widest uppercase font-mono group-hover:text-sciblue-600 dark:group-hover:text-sciblue-400">Project Institution</span>
                       <span className="text-[8px] md:text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wide group-hover:text-sciblue-400 dark:group-hover:text-sciblue-300">WEIHAI</span>
                    </div>
                </button>

                {/* Mobile Tooltip Guide - MOVED INSIDE RELATIVE WRAPPER & POSITIONED BELOW */}
                {showMobileHint && !isCanvasLocked && (
                   <div className="absolute top-full left-0 mt-2 flex flex-col items-start animate-fade-in pointer-events-none z-50 w-max">
                      {/* Arrow pointing up */}
                      <div className="w-0 h-0 border-x-[6px] border-x-transparent border-b-[8px] border-b-sciblue-500 ml-3 drop-shadow-sm"></div>
                      {/* Text Bubble */}
                      <span className="bg-sciblue-50 dark:bg-sciblue-900/95 text-sciblue-700 dark:text-sciblue-100 text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-lg border border-sciblue-500 whitespace-nowrap">
                         {t.tooltips.openSidebar}
                      </span>
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
                            ? 'bg-amber-500 border-amber-400 text-white hover:bg-amber-400 hover:shadow-amber-200/50' 
                            : 'bg-slate-800 dark:bg-sciblue-600 border-slate-700 dark:border-sciblue-500 text-white hover:bg-slate-700 dark:hover:bg-sciblue-500 hover:shadow-slate-300/50'
                        }
                        ${isCanvasLocked ? 'opacity-50 cursor-not-allowed hover:bg-auto' : ''}
                    `}
                >
                    {isRunning ? <Pause size={isMobile ? 14 : 18} fill="currentColor"/> : <Play size={isMobile ? 14 : 18} fill="currentColor" className="ml-0.5"/>}
                </button>
            )}
        </div>

      </main>

      {/* VISITOR TOAST - MOVED TO BOTTOM */}
      <div className={`fixed bottom-24 md:bottom-10 left-1/2 transform -translate-x-1/2 z-[100] transition-all duration-700 ease-in-out ${showVisitorToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-slate-600 dark:text-slate-200 px-5 py-2 rounded-full shadow-xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
            <span className="bg-emerald-100 dark:bg-emerald-900/40 p-1 rounded-full"><User size={12} className="text-emerald-600 dark:text-emerald-400"/></span>
            {/* Localized Visitor String */}
            <span className="text-xs font-medium tracking-wide">
                {t.footer.visitorCount.replace('{count}', visitorCount.toLocaleString())}
            </span>
        </div>
      </div>

      {/* NOTIFICATION */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[100] pointer-events-none">
        <div 
            key={notification.id}
            className={`
                transition-all duration-500 ease-out
                ${notification.visible ? 'animate-slide-up opacity-100' : 'opacity-0 translate-y-8'}
            `}
        >
            <div className={`
                px-5 py-2.5 rounded-lg shadow-xl flex items-center gap-3 border backdrop-blur-md
                ${notification.type === 'success' ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900' : 
                  notification.type === 'warning' ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900' : 
                  'bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-slate-700 dark:border-slate-200'}
            `}>
                {notification.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-500"/> :
                 notification.type === 'warning' ? <AlertCircle size={16} className="text-amber-500"/> :
                 (notification.text.includes(t.canvas.locked.split('·')[0]) ? <Lock size={16} className="text-sciblue-400"/> : <MousePointer2 size={16} className="text-amber-400"/>)}
                <span className="font-medium text-sm">{notification.text}</span>
            </div>
        </div>
      </div>

      {/* RIGHT TOP CONTROLS: Dark Mode + Language */}
      {/* Increased z-index to 60 to stay above canvas interaction when locked */}
      <div className={`fixed top-14 right-4 md:top-6 md:right-6 z-[60] flex items-center gap-3 transition-opacity duration-300 ${isMobile && isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* Dark Mode Toggle */}
        <button 
            onClick={toggleDarkMode}
            title={t.tooltips.themeToggle}
            className="flex items-center justify-center w-8 h-8 md:w-auto md:px-3 md:py-1.5 bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-sm text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-sciblue-400 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all active:scale-95 shadow-sm"
        >
            {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
            <span className="hidden md:inline-block text-xs font-bold tracking-wide ml-2">{isDarkMode ? t.common.modeDark : t.common.modeLight}</span>
        </button>

        {/* Language Menu */}
        <div className="group relative">
            <button 
                title={t.tooltips.langToggle}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all active:scale-95 shadow-sm"
            >
                <Globe size={16} />
                {/* HIDDEN ON MOBILE */}
                <span className="hidden md:inline-block text-xs font-bold tracking-wide">{t.header.language}</span>
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right scale-95 group-hover:scale-100 z-50">
                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden py-1">
                    {['zh-CN', 'zh-TW', 'en-GB', 'en-US'].map((l) => (
                        <button key={l} onClick={() => handleLangChange(l as LanguageCode)} className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 font-medium ${lang === l ? 'text-sciblue-600 dark:text-sciblue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                            {l === 'zh-CN' ? '简体中文' : l === 'zh-TW' ? '繁體中文' : l === 'en-GB' ? 'English (UK)' : 'English (US)'}
                            {lang === l && <ChevronRight size={14}/>}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      </div>

    </div>
  );
}

export default App;
