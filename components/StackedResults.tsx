import React, { useState, useRef, useEffect } from 'react';
import { ChartData, Translation } from '../types';
import DistributionCharts from './DistributionCharts';
import { ChevronUp, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';

interface StackedResultsProps {
  data: ChartData;
  t: Translation;
  isDarkMode?: boolean;
}

const StackedResults: React.FC<StackedResultsProps> = ({ data, t, isDarkMode = false }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Drag/Touch State
  const isDragging = useRef(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);

  // --- HEIGHT MANAGEMENT ---
  // Optimized heights for mobile visibility
  // Mobile Portrait: Taller (h-[600px]) to stack charts vertically.
  // Mobile Landscape: Shorter (h-[340px]) but wider layout to fit screen.
  
  // Chart container heights inside the cards
  // Portrait: 250px (Tall)
  // Landscape: 130px (Compact, side-by-side)
  // Desktop: 160px
  const histHeight = isFullscreen ? "h-[320px]" : "h-[250px] landscape:h-[130px] md:h-[160px]"; 
  const singleHeight = isFullscreen ? "h-[450px]" : "h-[420px] landscape:h-[260px] md:h-[260px]";

  // Group 1: Histograms (Speed + Energy) - Compact Grid
  // Mobile Landscape: Force grid-cols-2 (side-by-side) to save vertical space
  const HistogramGroup = () => (
    <div className={`grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 gap-2 h-full ${isFullscreen ? 'p-4' : 'p-0 overflow-y-hidden'}`}>
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2 border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
         <DistributionCharts data={data} type="speed" isFinal={true} t={t} heightClass={histHeight} isDarkMode={isDarkMode} />
      </div>
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2 border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
         <DistributionCharts data={data} type="energy" isFinal={true} t={t} heightClass={histHeight} isDarkMode={isDarkMode} />
      </div>
    </div>
  );

  const cardGroups = [
    { id: 'histograms', content: <HistogramGroup />, title: t.charts.distributions },
    { id: 'semilog', content: <DistributionCharts data={data} type="semilog" isFinal={true} t={t} heightClass={singleHeight} isDarkMode={isDarkMode} />, title: t.charts.semilog },
    { id: 'totalEnergy', content: <DistributionCharts data={data} type="totalEnergy" t={t} heightClass={singleHeight} isDarkMode={isDarkMode} />, title: t.charts.totalEnergy },
    { id: 'tempError', content: <DistributionCharts data={data} type="tempError" t={t} heightClass={singleHeight} isDarkMode={isDarkMode} />, title: t.charts.tempError },
  ];

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % cardGroups.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + cardGroups.length) % cardGroups.length);
  };

  // --- MOUSE HANDLERS ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if(isFullscreen) return; 
    isDragging.current = true;
    startY.current = e.clientY;
    setDragOffset(0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || isFullscreen) return;
    currentY.current = e.clientY;
    setDragOffset(currentY.current - startY.current);
  };

  const handleMouseUp = () => {
    endDrag();
  };

  const handleMouseLeave = () => {
      isDragging.current = false;
      setDragOffset(0);
  };

  // --- TOUCH HANDLERS (Mobile Swipe) ---
  const handleTouchStart = (e: React.TouchEvent) => {
      if(isFullscreen) return;
      isDragging.current = true;
      startY.current = e.touches[0].clientY;
      setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (!isDragging.current || isFullscreen) return;
      currentY.current = e.touches[0].clientY;
      setDragOffset(currentY.current - startY.current);
  };

  const handleTouchEnd = () => {
      endDrag();
  };

  // Shared End Logic
  const endDrag = () => {
    if (!isDragging.current || isFullscreen) return;
    isDragging.current = false;
    
    const threshold = 50; 
    if (dragOffset < -threshold) {
       handleNext(); 
    } else if (dragOffset > threshold) {
       handlePrev(); 
    }
    setDragOffset(0);
  };

  // Fullscreen Logic
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const getCardStyle = (index: number) => {
    if (isFullscreen) return {};

    let offset = index - activeIndex;
    if (offset < 0) offset += cardGroups.length;

    const isActive = index === activeIndex;
    const isNext = index === (activeIndex + 1) % cardGroups.length;
    const isPrev = index === (activeIndex - 1 + cardGroups.length) % cardGroups.length;

    let zIndex = 0;
    let opacity = 0;
    let scale = 0.8;
    let translateY = 0; 

    if (isActive) {
        zIndex = 10;
        opacity = 1;
        scale = 1;
        translateY = dragOffset; 
    } else if (isNext) {
        zIndex = 5;
        opacity = 0.6;
        scale = 0.95;
        translateY = 35; // Tighter stack
    } else if (isPrev) {
        zIndex = 1; 
        opacity = 0; 
        scale = 0.9;
        translateY = -35;
    } else {
        zIndex = 0;
        opacity = 0;
    }

    return {
        zIndex,
        opacity,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        transition: isDragging.current && isActive ? 'none' : 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)',
        pointerEvents: isActive ? 'auto' : 'none'
    } as React.CSSProperties;
  };

  return (
    <div 
        ref={containerRef} 
        // Landscape Optimization: h-[340px] for mobile landscape (usually ~360-400px height)
        // Mobile Portrait: h-[660px]
        className={`relative transition-all duration-500 bg-white dark:bg-slate-900 ${isFullscreen ? 'p-10 overflow-y-auto' : 'h-[660px] landscape:h-[340px] md:h-[400px] perspective-[1000px] select-none'}`}
    >
        <button 
            onClick={toggleFullscreen}
            className="absolute top-3 right-3 z-50 p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all border border-slate-200 dark:border-slate-700"
            title={isFullscreen ? t.common.collapse : t.common.expandAll}
        >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>

        {isFullscreen ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-7xl mx-auto pt-10">
                {cardGroups.map((group) => (
                    <div key={group.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-800">
                         <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 px-3 border-l-4 border-sciblue-500">{group.title}</h3>
                        <div className="h-full">
                            {group.content}
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div 
                className="w-full h-full relative flex items-center justify-center touch-none" 
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {cardGroups.map((group, index) => (
                    <div
                        key={group.id}
                        // Mobile Landscape Card: Adjusted to h-[300px] to fit within the h-[340px] container with margins
                        className="absolute w-full max-w-4xl h-[600px] landscape:h-[300px] md:h-[360px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] dark:shadow-none overflow-hidden flex flex-col cursor-grab active:cursor-grabbing"
                        style={getCardStyle(index)}
                    >
                        <div className="h-6 w-full flex items-center justify-center cursor-ns-resize opacity-30 hover:opacity-60 shrink-0">
                             <div className="w-8 h-1 bg-slate-400 rounded-full"></div>
                        </div>
                        <div className="flex-1 px-3 pb-3 pt-0 relative flex flex-col min-h-0">
                             <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 select-none text-center">{group.title}</div>
                             <div className="flex-1 min-h-0 w-full relative">
                                {group.content}
                             </div>
                        </div>
                    </div>
                ))}

                {/* Navigation Buttons */}
                {/* 
                   Portrait Mobile: Bottom Center, Horizontal (flex-row).
                   Landscape Mobile: Right Center, Vertical (flex-col) - Mimics Desktop behavior to save vertical space.
                   Desktop: Right Center, Vertical.
                */}
                <div className="absolute z-20 pointer-events-none flex 
                    bottom-4 left-1/2 -translate-x-1/2 flex-row gap-8
                    landscape:top-1/2 landscape:right-4 landscape:bottom-auto landscape:left-auto landscape:translate-x-0 landscape:-translate-y-1/2 landscape:flex-col landscape:gap-2
                    md:top-1/2 md:right-4 md:bottom-auto md:left-auto md:translate-x-0 md:-translate-y-1/2 md:flex-col md:gap-2"
                >
                     <button 
                        onClick={handlePrev}
                        className="pointer-events-auto w-10 h-10 md:w-8 md:h-8 bg-white dark:bg-slate-800 shadow-lg md:shadow-sm rounded-full text-slate-500 dark:text-slate-400 hover:text-sciblue-600 dark:hover:text-sciblue-400 hover:border-sciblue-200 dark:hover:border-sciblue-800 hover:shadow-md transition-all border border-slate-200 dark:border-slate-700 active:scale-95 flex items-center justify-center"
                        title={t.common.prev}
                     >
                        <ChevronUp size={20} />
                     </button>
                     <button 
                        onClick={handleNext}
                        className="pointer-events-auto w-10 h-10 md:w-8 md:h-8 bg-white dark:bg-slate-800 shadow-lg md:shadow-sm rounded-full text-slate-500 dark:text-slate-400 hover:text-sciblue-600 dark:hover:text-sciblue-400 hover:border-sciblue-200 dark:hover:border-sciblue-800 hover:shadow-md transition-all border border-slate-200 dark:border-slate-700 active:scale-95 flex items-center justify-center"
                        title={t.common.next}
                     >
                        <ChevronDown size={20} />
                     </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default StackedResults;