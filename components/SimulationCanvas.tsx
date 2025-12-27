import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Particle, Translation } from '../types';
import { MousePointer2, Lock, Unlock, Hand, Rotate3d, Maximize, AlertCircle } from 'lucide-react';

interface SimulationCanvasProps {
  particles: Particle[];
  L: number;
  r: number;
  isRunning: boolean;
  t: Translation;
  isFocused: boolean;
  onFocusChange: (focused: boolean) => void;
  showNotification: (text: string, duration?: number) => void;
  isMobile?: boolean; // New Prop
}

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ 
    particles, L, r, isRunning, t, 
    isFocused, onFocusChange, showNotification, isMobile = false 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Camera State
  const [rotation, setRotation] = useState({ x: -15, y: 30 }); // Degrees
  const [scale, setScale] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  // Interaction State
  const [isPanMode, setIsPanMode] = useState(false); 
  const [showPanHint, setShowPanHint] = useState(false);
  const hasToggledPan = useRef(false);
  
  // Mouse Refs
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  
  // Touch Refs (For Pinch Zoom)
  const lastTouchDist = useRef<number | null>(null);
  const lastTouchCenter = useRef<{x: number, y: number} | null>(null);

  // Notification Throttling for Scroll Warning
  const lastScrollWarningTime = useRef(0);

  // 1. Hint Logic: If focused > 2s and never toggled, show hint
  useEffect(() => {
      let timer: number;
      if (isFocused && !hasToggledPan.current) {
          timer = window.setTimeout(() => {
              if (!hasToggledPan.current && isFocused) {
                  setShowPanHint(true);
              }
          }, 2000);
      } else {
          setShowPanHint(false);
      }
      return () => clearTimeout(timer);
  }, [isFocused]);

  // Reset Pan mode when focus is lost
  useEffect(() => {
    if (!isFocused) setIsPanMode(false);
  }, [isFocused]);

  // Handle Click Outside to Exit Focus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isFocused && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onFocusChange(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFocused, onFocusChange]);

  // --- GLOBAL SCROLL LOCKING & AUTO-EXIT ---
  useEffect(() => {
      if (!isFocused) return;

      const handleGlobalMove = (e: TouchEvent) => {
          // If the target is NOT inside the canvas container, detect intent to scroll away
          if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
              // User is scrolling outside -> Auto Exit Interaction Mode
              onFocusChange(false);
              showNotification(t.canvas.autoExit, 1500);
          }
      };

      // Passive: false is required to use preventDefault(), though we are just detecting here mostly
      document.addEventListener('touchmove', handleGlobalMove, { passive: false });

      return () => {
          document.removeEventListener('touchmove', handleGlobalMove);
      };
  }, [isFocused, showNotification, t.canvas.autoExit, onFocusChange]);


  // Toggle Focus Logic
  const toggleFocus = () => {
    const newState = !isFocused;
    onFocusChange(newState);
    if (newState) {
        showNotification(t.canvas.locked);
    } else {
        showNotification(t.canvas.unlocked);
    }
  };

  const togglePanMode = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); 
    e.preventDefault();
    const newMode = !isPanMode;
    setIsPanMode(newMode);
    hasToggledPan.current = true;
    setShowPanHint(false);
    
    // Provide Feedback
    showNotification(newMode ? t.canvas.switchedToPan : t.canvas.switchedToRotate, 1500);
  };

  // 3D Projection Helpers
  const project = (x: number, y: number, z: number, logicalWidth: number, logicalHeight: number) => {
    // Center the system
    let px = x - L / 2;
    let py = y - L / 2;
    let pz = z - L / 2;

    const radY = (rotation.y * Math.PI) / 180;
    const radX = (rotation.x * Math.PI) / 180;

    // Rotation Order: Y then X
    let x1 = px * Math.cos(radY) - pz * Math.sin(radY);
    let z1 = px * Math.sin(radY) + pz * Math.cos(radY);
    
    let y1 = py * Math.cos(radX) - z1 * Math.sin(radX);
    let z2 = py * Math.sin(radX) + z1 * Math.cos(radX);

    const fov = 800; 
    
    // Auto-fit Logic: Use the smaller dimension to determine base scale to ensure cube fits
    const baseScale = Math.min(logicalWidth, logicalHeight) / (L * 1.8); 
    
    const perspective = fov / (fov + z2);
    
    const screenX = logicalWidth / 2 + x1 * baseScale * scale * perspective + pan.x;
    const screenY = logicalHeight / 2 + y1 * baseScale * scale * perspective + pan.y;
    
    return { x: screenX, y: screenY, depth: z2, scale: perspective * scale * baseScale };
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get current logical size (corrected for DPR in the resize observer)
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.clearRect(0, 0, width, height);
    
    // Draw Box Edges
    const vertices = [
      [0, 0, 0], [L, 0, 0], [L, L, 0], [0, L, 0],
      [0, 0, L], [L, 0, L], [L, L, L], [0, L, L]
    ];
    
    const projectedVertices = vertices.map(v => project(v[0], v[1], v[2], width, height));

    ctx.strokeStyle = '#94a3b8'; 
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    
    const edges = [
      [0,1], [1,2], [2,3], [3,0], 
      [4,5], [5,6], [6,7], [7,4], 
      [0,4], [1,5], [2,6], [3,7]  
    ];

    ctx.beginPath();
    edges.forEach(([i, j]) => {
      ctx.moveTo(projectedVertices[i].x, projectedVertices[i].y);
      ctx.lineTo(projectedVertices[j].x, projectedVertices[j].y);
    });
    ctx.stroke();

    // Draw Particles
    const projectedParticles = particles.map(p => {
        const proj = project(p.x, p.y, p.z, width, height);
        return { ...p, ...proj };
    }).sort((a, b) => b.depth - a.depth);

    projectedParticles.forEach(p => {
      ctx.beginPath();
      const radius = Math.max(1, r * p.scale);
      
      ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
      
      const grad = ctx.createRadialGradient(p.x - radius/3, p.y - radius/3, radius/5, p.x, p.y, radius);
      grad.addColorStop(0, `rgba(224, 242, 254, 0.9)`); 
      grad.addColorStop(1, `rgba(14, 165, 233, 0.9)`); 

      ctx.fillStyle = grad;
      ctx.fill();
      
      // Specular highlight
      ctx.beginPath();
      ctx.arc(p.x - radius/3, p.y - radius/3, radius/4, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(12, 74, 110, 0.3)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });

  }, [particles, rotation, scale, pan, L, r]);

  // Render Loop
  useEffect(() => {
    let animationFrameId: number;
    const render = () => {
      draw();
      animationFrameId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [draw]);

  // --- RESIZE OBSERVER (Fixes Aspect Ratio Distortion) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const updateSize = () => {
       const { width, height } = container.getBoundingClientRect();
       const dpr = window.devicePixelRatio || 1;
       
       // Only update if dimensions actually changed to avoid loop
       if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
           canvas.width = width * dpr;
           canvas.height = height * dpr;
           
           const ctx = canvas.getContext('2d');
           if (ctx) ctx.scale(dpr, dpr);
           
           // Force immediate redraw to prevent flickering/stretching frame
           draw(); 
       }
    };

    const resizeObserver = new ResizeObserver(() => {
        // Use requestAnimationFrame to sync with browser paint cycle
        requestAnimationFrame(updateSize);
    });

    resizeObserver.observe(container);
    // Initial size set
    updateSize();

    return () => resizeObserver.disconnect();
  }, [draw]); // Depend on draw so it can be called inside

  // --- MOUSE & WHEEL EVENTS (Desktop) ---
  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      if (!isFocused) return;
      
      const container = containerRef.current;
      const isOverCanvas = container && container.contains(e.target as Node);

      if (isOverCanvas) {
         // Inside Canvas: Zoom
         e.preventDefault(); 
         e.stopPropagation();
         const zoomSensitivity = 0.001;
         const zoomFactor = -e.deltaY * zoomSensitivity * 0.5;
         setScale(prev => Math.max(0.2, Math.min(5, prev + zoomFactor)));
      } else {
         // Outside Canvas: User wants to scroll page
         // Unlock interaction automatically
         onFocusChange(false);
         showNotification(t.canvas.autoExit, 1500);
      }
    };
    
    // Add non-passive listener to prevent default scroll
    window.addEventListener('wheel', handleGlobalWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleGlobalWheel);
  }, [isFocused, showNotification, t, isMobile, onFocusChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isFocused) { toggleFocus(); return; }
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isFocused || !isDragging.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    if (isPanMode || e.buttons === 2) { 
        setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    } else {
        setRotation(prev => ({ x: prev.x + dy * 0.5, y: prev.y + dx * 0.5 }));
    }
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // --- TOUCH EVENTS (Mobile) ---
  const handleTouchStart = (e: React.TouchEvent) => {
     // If not focused, do not block default behavior unless it's a 2-finger gesture meant to start interaction
     if (e.touches.length === 2) {
        if (!isFocused) onFocusChange(true);
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        lastTouchDist.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        lastTouchCenter.current = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
     } else if (e.touches.length === 1) {
         // CRITICAL FIX: Only capture drag if focused. Otherwise, let browser scroll.
         if (isFocused) {
            const t = e.touches[0];
            lastMousePos.current = { x: t.clientX, y: t.clientY };
            isDragging.current = true;
         }
     }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      // If not focused, let the browser handle scrolling (handled by CSS touch-action)
      if (!isFocused) return;

      // Prevent default scrolling *inside* the canvas (handled by touch-action: none, but reinforcement doesn't hurt)
      // Note: Global scroll prevention is handled by the useEffect above.

      if (e.touches.length === 2 && lastTouchDist.current !== null) {
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
          const scaleFactor = currentDist / lastTouchDist.current;
          setScale(prev => Math.max(0.2, Math.min(5, prev * scaleFactor))); 

          if (lastTouchCenter.current) {
              const currentCenter = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
              const dx = currentCenter.x - lastTouchCenter.current.x;
              const dy = currentCenter.y - lastTouchCenter.current.y;
              setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
              lastTouchCenter.current = currentCenter;
          }
          lastTouchDist.current = currentDist;
      } else if (e.touches.length === 1 && isDragging.current) {
          const t = e.touches[0];
          const dx = t.clientX - lastMousePos.current.x;
          const dy = t.clientY - lastMousePos.current.y;

          if (isPanMode) {
              setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
          } else {
              setRotation(prev => ({ x: prev.x + dy * 0.5, y: prev.y + dx * 0.5 }));
          }
          lastMousePos.current = { x: t.clientX, y: t.clientY };
      }
  };

  const handleTouchEnd = () => {
      lastTouchDist.current = null;
      lastTouchCenter.current = null;
      isDragging.current = false;
  };

  const resetView = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setRotation({ x: -15, y: 30 });
    setScale(1.0);
    setPan({ x: 0, y: 0 }); 
  };

  return (
    <div className="flex flex-col gap-2 relative">
        {/* Interaction Hint */}
        <div className="flex justify-between items-center px-1 text-[10px] text-sciblue-600 dark:text-sciblue-400 uppercase tracking-widest font-bold">
            <span className="flex items-center gap-1">
                {isFocused ? <Lock size={10}/> : <Unlock size={10}/>}
                {isFocused ? t.canvas.locked.split('·')[0] : t.canvas.scrollEnabled}
            </span>
            <span>{isFocused ? t.canvas.clickToRelease : t.canvas.clickToInteract}</span>
        </div>

        <div 
            ref={containerRef}
            // CRITICAL FIX: Explicit inline style for touch-action ensures browser respects scrolling when not focused
            // When focused, 'none' prevents browser processing, but our global listener handles outside touches.
            style={{ touchAction: isFocused ? 'none' : 'pan-y' }}
            className={`
                relative w-full rounded-lg overflow-hidden group bg-slate-900
                /* Modified Height Logic for Landscape Mobile: 65vh to fit screen */
                h-[45vh] landscape:h-[65vh] sm:h-[450px] md:landscape:h-[calc(100dvh-140px)] md:h-[500px] lg:h-[550px]
                transition-all duration-300 cubic-bezier(0.34, 1.56, 0.64, 1) select-none
                ${isFocused 
                    ? 'scale-[1.01] shadow-[0_0_0_4px_rgba(56,189,248,0.3)] ring-2 ring-sciblue-500 z-10' 
                    : 'scale-100 shadow-inner border border-slate-700 hover:border-sciblue-400/50'
                }
                ${isDragging.current ? 'cursor-grabbing' : 'cursor-grab'}
            `}
        >
            <canvas
                ref={canvasRef}
                className="w-full h-full block"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => { isDragging.current = false; }}
                onContextMenu={(e) => { e.preventDefault(); }} 
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ width: '100%', height: '100%' }}
            />
            
            {/* BOTTOM GRADIENT MASK */}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent pointer-events-none rounded-b-lg z-10" />

            {/* CENTERED OVERLAY FOR HINTS - New Request: Center of whole page/screen */}
            {isFocused && showPanHint && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[110] pointer-events-none flex flex-col items-center justify-center animate-fade-in">
                    <div className="bg-black/70 backdrop-blur-md border border-white/20 p-4 rounded-xl shadow-2xl flex flex-col items-center gap-2">
                        <Hand size={32} className="text-amber-400 animate-pulse"/>
                        <span className="text-white font-bold text-sm tracking-wide text-center">
                            {t.tooltips.tryToggle}
                        </span>
                        <div className="w-0 h-0 border-x-[8px] border-x-transparent border-t-[8px] border-t-black/70 mt-2 opacity-50"></div>
                    </div>
                </div>
            )}

            {/* Overlay Controls */}
            <div className={`absolute top-0 left-0 w-full p-4 flex justify-between pointer-events-none transition-opacity duration-300 ${isFocused || 'group-hover:opacity-100 opacity-0'}`}>
                <div className="pointer-events-auto relative z-[120]">
                    {isFocused && (
                        <>
                            <button
                                onClick={togglePanMode}
                                onMouseDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()} 
                                className={`
                                    p-3 rounded-full shadow-xl border backdrop-blur-md transition-all active:scale-95 flex items-center justify-center relative
                                    ${isPanMode 
                                        ? 'bg-sciblue-600 text-white border-sciblue-300 shadow-[0_0_20px_rgba(14,165,233,0.6)] scale-110' 
                                        : 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:scale-105'
                                    }
                                `}
                                title={isPanMode ? t.tooltips.rotateMode : t.tooltips.panMode}
                            >
                                {isPanMode ? <Hand size={22} strokeWidth={2.5} /> : <Rotate3d size={22} strokeWidth={2} />}
                                
                                {/* Pulse Effect when hint is active */}
                                {showPanHint && (
                                    <span className="absolute inset-0 rounded-full ring-4 ring-amber-400/50 animate-ping"></span>
                                )}
                            </button>
                        </>
                    )}
                </div>

                <div className="pointer-events-auto z-[120]">
                    <button 
                        onClick={resetView}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        className="bg-sciblue-600 hover:bg-sciblue-500 text-white text-xs px-3 py-1.5 rounded-full shadow-lg border border-sciblue-400/50 backdrop-blur-sm transition-transform active:scale-95 flex items-center gap-1"
                        title={t.tooltips.resetCamera}
                    >
                        <Maximize size={12}/> {t.canvas.resetView}
                    </button>
                </div>
            </div>

            {/* Instructions Overlay - CONDITIONAL TEXT BASED ON DEVICE */}
            <div className="absolute bottom-4 left-4 pointer-events-none select-none z-20">
                {isFocused ? (
                     <div className="text-xs text-sciblue-100 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 shadow-lg animate-fade-in-up">
                        <p className="font-medium">
                            {isMobile ? t.canvas.instructionsFocused_mobile : t.canvas.instructionsFocused_desktop}
                        </p>
                     </div>
                ) : (
                    <div className="flex items-center gap-2 text-xs text-amber-400 font-bold tracking-wide animate-pulse">
                        <MousePointer2 size={14}/> {t.canvas.instructionsIdle}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default SimulationCanvas;