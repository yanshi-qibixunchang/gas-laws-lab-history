import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Particle, Translation } from '../types';
import { MousePointer2, Lock, Unlock, Hand, Rotate3d, Maximize } from 'lucide-react';

interface SimulationCanvasProps {
  particles: Particle[];
  L: number;
  r: number;
  isRunning: boolean;
  t: Translation;
  isFocused: boolean;
  onFocusChange: (focused: boolean) => void;
  showNotification: (text: string, duration?: number) => void;
  supportsHover?: boolean;
  touchLike?: boolean;
  isCompactLandscape?: boolean;
  canvasHeight?: number | null;
}

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  particles,
  L,
  r,
  isRunning,
  t,
  isFocused,
  onFocusChange,
  showNotification,
  supportsHover = true,
  touchLike = false,
  isCompactLandscape = false,
  canvasHeight = null
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [rotation, setRotation] = useState({ x: -15, y: 30 });
  const [scale, setScale] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const [isPanMode, setIsPanMode] = useState(false);
  const [showPanHint, setShowPanHint] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const hasToggledPan = useRef(false);

  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const lastTouchDist = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);
  const pendingTapRef = useRef<{ x: number; y: number; moved: boolean; time: number } | null>(null);

  const enterInteraction = useCallback(() => {
    if (isFocused) return;
    onFocusChange(true);
    showNotification(t.canvas.locked);
  }, [isFocused, onFocusChange, showNotification, t.canvas.locked]);

  useEffect(() => {
    let timer: number;
    if (isFocused && touchLike && !hasToggledPan.current) {
      timer = window.setTimeout(() => {
        if (!hasToggledPan.current && isFocused) {
          setShowPanHint(true);
        }
      }, 2000);
    } else {
      setShowPanHint(false);
    }
    return () => clearTimeout(timer);
  }, [isFocused, touchLike]);

  useEffect(() => {
    if (!isFocused) {
      setIsPanMode(false);
      setShowPanHint(false);
    }
  }, [isFocused]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (touchLike) return;
      if (isFocused && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onFocusChange(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFocused, onFocusChange, touchLike]);

  useEffect(() => {
    if (!isFocused || !touchLike) return;

    const handleGlobalMove = (event: TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onFocusChange(false);
        showNotification(t.canvas.autoExit, 1500);
      }
    };

    document.addEventListener('touchmove', handleGlobalMove, { passive: false });
    return () => {
      document.removeEventListener('touchmove', handleGlobalMove);
    };
  }, [isFocused, onFocusChange, showNotification, t.canvas.autoExit, touchLike]);

  const togglePanMode = (event: React.MouseEvent | React.TouchEvent) => {
    event.stopPropagation();
    event.preventDefault();
    const newMode = !isPanMode;
    setIsPanMode(newMode);
    hasToggledPan.current = true;
    setShowPanHint(false);
    showNotification(newMode ? t.canvas.switchedToPan : t.canvas.switchedToRotate, 1500);
  };

  const project = (x: number, y: number, z: number, logicalWidth: number, logicalHeight: number) => {
    let px = x - L / 2;
    let py = y - L / 2;
    let pz = z - L / 2;

    const radY = (rotation.y * Math.PI) / 180;
    const radX = (rotation.x * Math.PI) / 180;

    const x1 = px * Math.cos(radY) - pz * Math.sin(radY);
    const z1 = px * Math.sin(radY) + pz * Math.cos(radY);
    const y1 = py * Math.cos(radX) - z1 * Math.sin(radX);
    const z2 = py * Math.sin(radX) + z1 * Math.cos(radX);

    const fov = 800;
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

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.clearRect(0, 0, width, height);

    const vertices = [
      [0, 0, 0], [L, 0, 0], [L, L, 0], [0, L, 0],
      [0, 0, L], [L, 0, L], [L, L, L], [0, L, L]
    ];

    const projectedVertices = vertices.map((vertex) => project(vertex[0], vertex[1], vertex[2], width, height));

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';

    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];

    ctx.beginPath();
    edges.forEach(([i, j]) => {
      ctx.moveTo(projectedVertices[i].x, projectedVertices[i].y);
      ctx.lineTo(projectedVertices[j].x, projectedVertices[j].y);
    });
    ctx.stroke();

    const projectedParticles = particles.map((particle) => {
      const projection = project(particle.x, particle.y, particle.z, width, height);
      return { ...particle, ...projection };
    }).sort((a, b) => b.depth - a.depth);

    projectedParticles.forEach((particle) => {
      ctx.beginPath();
      const radius = Math.max(1, r * particle.scale);

      ctx.arc(particle.x, particle.y, radius, 0, 2 * Math.PI);

      const grad = ctx.createRadialGradient(particle.x - radius / 3, particle.y - radius / 3, radius / 5, particle.x, particle.y, radius);
      grad.addColorStop(0, 'rgba(224, 242, 254, 0.9)');
      grad.addColorStop(1, 'rgba(14, 165, 233, 0.9)');

      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(particle.x - radius / 3, particle.y - radius / 3, radius / 4, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fill();

      ctx.strokeStyle = 'rgba(12, 74, 110, 0.3)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });
  }, [particles, rotation, scale, pan, L, r]);

  useEffect(() => {
    let animationFrameId: number;
    const render = () => {
      draw();
      animationFrameId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const updateSize = () => {
      const { width, height } = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;

        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
        draw();
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateSize);
    });

    resizeObserver.observe(container);
    updateSize();

    return () => resizeObserver.disconnect();
  }, [draw]);

  useEffect(() => {
    const handleGlobalWheel = (event: WheelEvent) => {
      if (!isFocused || touchLike) return;

      const container = containerRef.current;
      const isOverCanvas = container && container.contains(event.target as Node);

      if (isOverCanvas) {
        event.preventDefault();
        event.stopPropagation();
        const zoomSensitivity = 0.001;
        const zoomFactor = -event.deltaY * zoomSensitivity * 0.5;
        setScale((prev) => Math.max(0.2, Math.min(5, prev + zoomFactor)));
      } else {
        onFocusChange(false);
        showNotification(t.canvas.autoExit, 1500);
      }
    };

    window.addEventListener('wheel', handleGlobalWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleGlobalWheel);
  }, [isFocused, onFocusChange, showNotification, t.canvas.autoExit, touchLike]);

  const handleMouseDown = (event: React.MouseEvent) => {
    if (touchLike) return;
    if (!isFocused) {
      enterInteraction();
      return;
    }
    isDragging.current = true;
    lastMousePos.current = { x: event.clientX, y: event.clientY };
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (touchLike || !isFocused || !isDragging.current) return;
    const dx = event.clientX - lastMousePos.current.x;
    const dy = event.clientY - lastMousePos.current.y;
    if (isPanMode || event.buttons === 2) {
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    } else {
      setRotation((prev) => ({ x: prev.x + dy * 0.5, y: prev.y + dx * 0.5 }));
    }
    lastMousePos.current = { x: event.clientX, y: event.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    if (!touchLike) return;

    if (!isFocused) {
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        pendingTapRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          moved: false,
          time: Date.now()
        };
      } else {
        pendingTapRef.current = null;
      }
      return;
    }

    if (event.touches.length === 2) {
      const t1 = event.touches[0];
      const t2 = event.touches[1];
      lastTouchDist.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      lastTouchCenter.current = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
      event.preventDefault();
    } else if (event.touches.length === 1) {
      const touch = event.touches[0];
      lastMousePos.current = { x: touch.clientX, y: touch.clientY };
      isDragging.current = true;
      event.preventDefault();
    }
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!touchLike) return;

    if (!isFocused) {
      if (event.touches.length === 1 && pendingTapRef.current) {
        const touch = event.touches[0];
        const dx = Math.abs(touch.clientX - pendingTapRef.current.x);
        const dy = Math.abs(touch.clientY - pendingTapRef.current.y);
        if (dx > 10 || dy > 10) {
          pendingTapRef.current.moved = true;
        }
      }
      return;
    }

    event.preventDefault();

    if (event.touches.length === 2 && lastTouchDist.current !== null) {
      const t1 = event.touches[0];
      const t2 = event.touches[1];
      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const scaleFactor = currentDist / lastTouchDist.current;
      setScale((prev) => Math.max(0.2, Math.min(5, prev * scaleFactor)));

      if (lastTouchCenter.current) {
        const currentCenter = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };
        const dx = currentCenter.x - lastTouchCenter.current.x;
        const dy = currentCenter.y - lastTouchCenter.current.y;
        setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        lastTouchCenter.current = currentCenter;
      }

      lastTouchDist.current = currentDist;
    } else if (event.touches.length === 1 && isDragging.current) {
      const touch = event.touches[0];
      const dx = touch.clientX - lastMousePos.current.x;
      const dy = touch.clientY - lastMousePos.current.y;

      if (isPanMode) {
        setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      } else {
        setRotation((prev) => ({ x: prev.x + dy * 0.5, y: prev.y + dx * 0.5 }));
      }
      lastMousePos.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchEnd = () => {
    if (!touchLike) return;

    if (!isFocused) {
      if (pendingTapRef.current && !pendingTapRef.current.moved && Date.now() - pendingTapRef.current.time < 280) {
        enterInteraction();
      }
      pendingTapRef.current = null;
      return;
    }

    pendingTapRef.current = null;
    lastTouchDist.current = null;
    lastTouchCenter.current = null;
    isDragging.current = false;
  };

  const resetView = (event: React.MouseEvent | React.TouchEvent) => {
    event.stopPropagation();
    event.preventDefault();
    setRotation({ x: -15, y: 30 });
    setScale(1.0);
    setPan({ x: 0, y: 0 });
  };

  const showDesktopHoverHint = supportsHover && !touchLike && !isFocused && isHovering;
  const showControls = isFocused || (supportsHover && !touchLike && isHovering);
  const containerHeightStyle = canvasHeight ? { height: `${canvasHeight}px` } : undefined;
  const containerHoverClass = supportsHover ? 'hover:border-sciblue-400/50' : '';
  const controlButtonHoverClass = supportsHover ? 'hover:bg-white/20 hover:scale-105' : '';
  const resetButtonHoverClass = supportsHover ? 'hover:bg-sciblue-500' : '';

  return (
    <div className="flex flex-col gap-2 relative">
      <div className="flex justify-between items-center px-1 text-[10px] text-sciblue-600 dark:text-sciblue-400 uppercase tracking-widest font-bold">
        <span className="flex items-center gap-1">
          {isFocused ? <Lock size={10} /> : <Unlock size={10} />}
          {isFocused ? t.canvas.locked : t.canvas.scrollEnabled}
        </span>
        <span>{isFocused ? t.canvas.clickToRelease : t.canvas.clickToInteract}</span>
      </div>

      <div
        ref={containerRef}
        style={{ touchAction: isFocused ? 'none' : 'pan-x pan-y', ...containerHeightStyle }}
        onMouseEnter={() => {
          if (supportsHover && !touchLike) setIsHovering(true);
        }}
        onMouseLeave={() => {
          setIsHovering(false);
          isDragging.current = false;
        }}
        className={`
          relative w-full rounded-lg overflow-hidden bg-slate-900 select-none
          h-[45vh] sm:h-[450px] md:h-[500px] lg:h-[550px]
          transition-all duration-300 cubic-bezier(0.34, 1.56, 0.64, 1)
          ${isFocused
            ? 'scale-[1.01] shadow-[0_0_0_4px_rgba(56,189,248,0.3)] ring-2 ring-sciblue-500 z-10'
            : `scale-100 shadow-inner border border-slate-700 ${containerHoverClass}`
          }
          ${touchLike ? 'cursor-default' : isDragging.current ? 'cursor-grabbing' : 'cursor-grab'}
          ${isCompactLandscape ? 'rounded-xl' : ''}
        `}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { isDragging.current = false; }}
          onContextMenu={(event) => { event.preventDefault(); }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          style={{ width: '100%', height: '100%' }}
        />

        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent pointer-events-none rounded-b-lg z-10" />

        {showDesktopHoverHint && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="max-w-[min(90vw,420px)] rounded-xl border border-white/15 bg-slate-950/70 px-4 py-3 text-center shadow-2xl backdrop-blur-md">
              <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-sciblue-300 mb-1">
                {t.canvas.clickToInteract}
              </p>
              <p className="text-xs text-slate-100 leading-relaxed">
                {t.canvas.instructionsFocused_desktop}
              </p>
            </div>
          </div>
        )}

        {isFocused && showPanHint && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[110] pointer-events-none flex flex-col items-center justify-center animate-fade-in">
            <div className="bg-black/70 backdrop-blur-md border border-white/20 p-4 rounded-xl shadow-2xl flex flex-col items-center gap-2">
              <Hand size={32} className="text-amber-400 animate-pulse" />
              <span className="text-white font-bold text-sm tracking-wide text-center">
                {t.tooltips.tryToggle}
              </span>
              <div className="w-0 h-0 border-x-[8px] border-x-transparent border-t-[8px] border-t-black/70 mt-2 opacity-50" />
            </div>
          </div>
        )}

        <div className={`absolute top-0 left-0 w-full p-4 flex justify-between pointer-events-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="pointer-events-auto relative z-[120]">
            {isFocused && (
              <button
                onClick={togglePanMode}
                onMouseDown={(event) => event.stopPropagation()}
                onTouchStart={(event) => event.stopPropagation()}
                className={`
                  p-3 rounded-full shadow-xl border backdrop-blur-md transition-all active:scale-95 flex items-center justify-center relative
                  ${isPanMode
                    ? 'bg-sciblue-600 text-white border-sciblue-300 shadow-[0_0_20px_rgba(14,165,233,0.6)] scale-110'
                    : `bg-white/10 text-white border-white/20 ${controlButtonHoverClass}`
                  }
                `}
                title={isPanMode ? t.tooltips.rotateMode : t.tooltips.panMode}
              >
                {isPanMode ? <Hand size={22} strokeWidth={2.5} /> : <Rotate3d size={22} strokeWidth={2} />}
                {showPanHint && (
                  <span className="absolute inset-0 rounded-full ring-4 ring-amber-400/50 animate-ping" />
                )}
              </button>
            )}
          </div>

          <div className="pointer-events-auto z-[120]">
            <button
              onClick={resetView}
              onMouseDown={(event) => event.stopPropagation()}
              onTouchStart={(event) => event.stopPropagation()}
              className={`bg-sciblue-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg border border-sciblue-400/50 backdrop-blur-sm transition-transform active:scale-95 flex items-center gap-1 ${resetButtonHoverClass}`}
              title={t.tooltips.resetCamera}
            >
              <Maximize size={12} /> {t.canvas.resetView}
            </button>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 pointer-events-none select-none z-20">
          {isFocused ? (
            <div className="text-xs text-sciblue-100 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 shadow-lg animate-fade-in-up">
              <p className="font-medium">
                {touchLike ? t.canvas.instructionsFocused_mobile : t.canvas.instructionsFocused_desktop}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-400 font-bold tracking-wide animate-pulse">
              <MousePointer2 size={14} /> {t.canvas.instructionsIdle}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimulationCanvas;
