import React from 'react';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, AreaChart, Area
} from 'recharts';
import { ChartData, Translation } from '../types';

interface ChartProps {
  data: ChartData;
  type: 'speed' | 'energy' | 'semilog' | 'tempError' | 'totalEnergy';
  isFinal?: boolean;
  t: Translation;
  heightClass?: string; // Allow custom height
  isDarkMode?: boolean;
}

const CustomTooltip = ({ active, payload, label, isDarkMode }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={`
        border p-2 rounded shadow-lg text-[10px] z-50 relative
        ${isDarkMode 
            ? 'bg-slate-800 border-slate-700 text-slate-200' 
            : 'bg-white border-slate-200 text-slate-900'}
      `}>
        <p className={`font-bold mb-1 border-b pb-1 ${isDarkMode ? 'border-slate-700 text-slate-100' : 'border-slate-100 text-slate-900'}`}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-1.5 mb-0.5">
             <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
             <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{entry.name}:</span>
             <span className={`font-mono font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{Number(entry.value).toFixed(4)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const DistributionCharts: React.FC<ChartProps> = ({ data, type, isFinal = false, t, heightClass = "h-[220px]", isDarkMode = false }) => {
  const containerClass = `w-full ${heightClass} flex flex-col`;
  
  // High Contrast Color Palette - Adapted for Dark Mode
  const colors = {
      simulation: isFinal ? "#3b82f6" : "#60a5fa", // Blue
      theory: isDarkMode ? "#f87171" : "#ef4444",    // Red (lighter in dark mode)
      grid: isDarkMode ? "#334155" : "#e2e8f0",      // Slate 700 (dark) vs Slate 200 (light)
      axis: isDarkMode ? "#94a3b8" : "#64748b",      // Slate 400 (dark) vs Slate 500 (light)
      text: isDarkMode ? "#cbd5e1" : "#334155",      // Slate 300 (dark) vs Slate 700 (light)
      area: "#f59e0b"       // Amber
  };

  const axisStyle = {
      fontSize: 10, // Slightly larger
      fontFamily: '"Inter", sans-serif',
      fill: colors.axis,
      fontWeight: 500
  };

  const labelStyle = {
      fontSize: 11,
      fontFamily: '"Inter", sans-serif',
      fontWeight: 700,
      fill: colors.text
  };

  const formatTick = (val: any) => Number(val).toFixed(2);
  
  // Tighter margins to maximize space
  const commonMargin = { top: 5, right: 10, left: 0, bottom: 5 };

  if (type === 'speed') {
    const maxTheoretical = Math.max(...data.speed.map(b => b.theoretical || 0));
    const fixedDomain = [0, maxTheoretical * 1.2];

    const chartData = data.speed.map(bin => ({
      val: (bin.binStart + bin.binEnd) / 2,
      probability: bin.probability,
      theoretical: bin.theoretical,
    }));

    return (
      <div className={containerClass}>
        <h4 className={`text-center text-[11px] font-bold mb-2 uppercase tracking-wide ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            {isFinal ? t.charts.avgSpeed : t.charts.instSpeed}
        </h4>
        <div className="flex-1 min-h-0 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={commonMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis 
                dataKey="val" 
                tick={axisStyle}
                tickLine={false}
                axisLine={{ stroke: colors.grid }}
                tickFormatter={formatTick}
                label={{ value: t.charts.speedX, position: 'insideBottom', offset: -5, ...labelStyle, fontSize: 10 }}
              />
              <YAxis 
                 tick={axisStyle}
                 tickLine={false}
                 axisLine={false}
                 tickFormatter={formatTick}
                 domain={fixedDomain}
                 allowDataOverflow={true}
                 label={{ value: 'P(v)', angle: -90, position: 'insideLeft', ...labelStyle, offset: 10, fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} />
              <Legend verticalAlign="top" height={24} iconType="circle" wrapperStyle={{ fontSize: '10px', color: colors.text, fontWeight: 600 }}/>
              <Bar dataKey="probability" name={t.charts.simulation} fill={colors.simulation} opacity={0.8} barSize={8} isAnimationActive={false} radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="theoretical" name={t.charts.theory} stroke={colors.theory} strokeWidth={2} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (type === 'energy') {
    const maxTheoretical = Math.max(...data.energy.map(b => b.theoretical || 0));
    const fixedDomain = [0, maxTheoretical * 1.2];

    const chartData = data.energy.map(bin => ({
      val: (bin.binStart + bin.binEnd) / 2,
      probability: bin.probability,
      theoretical: bin.theoretical,
    }));

    return (
      <div className={containerClass}>
        <h4 className={`text-center text-[11px] font-bold mb-2 uppercase tracking-wide ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            {isFinal ? t.charts.avgEnergy : t.charts.instEnergy}
        </h4>
        <div className="flex-1 min-h-0 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={commonMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis 
                dataKey="val" 
                tick={axisStyle}
                tickLine={false}
                axisLine={{ stroke: colors.grid }}
                tickFormatter={formatTick}
                label={{ value: t.charts.energyX, position: 'insideBottom', offset: -5, ...labelStyle, fontSize: 10 }}
              />
              <YAxis 
                 tick={axisStyle}
                 tickLine={false}
                 axisLine={false}
                 tickFormatter={formatTick} 
                 domain={fixedDomain}
                 allowDataOverflow={true}
                 label={{ value: 'P(E)', angle: -90, position: 'insideLeft', ...labelStyle, offset: 10, fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} />
              <Legend verticalAlign="top" height={24} iconType="circle" wrapperStyle={{ fontSize: '10px', color: colors.text, fontWeight: 600 }}/>
              <Bar dataKey="probability" name={t.charts.simulation} fill={colors.simulation} opacity={0.8} barSize={8} isAnimationActive={false} radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="theoretical" name={t.charts.theory} stroke={colors.theory} strokeWidth={2} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (type === 'semilog') {
     return (
        <div className={containerClass}>
            <div className="flex-1 min-h-0 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart margin={commonMargin}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                      <XAxis 
                          type="number" 
                          dataKey="energy" 
                          name="Energy" 
                          tick={axisStyle}
                          tickLine={false}
                          axisLine={{ stroke: colors.grid }}
                          tickFormatter={formatTick}
                          domain={['dataMin', 'dataMax']}
                          label={{ value: t.charts.energyX, position: 'insideBottom', offset: -5, ...labelStyle, fontSize: 10 }}
                      />
                      <YAxis 
                          type="number" 
                          dataKey="logProb" 
                          name="ln(P)" 
                          tick={axisStyle}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={formatTick}
                          domain={['auto', 'auto']}
                          label={{ value: 'ln(P)', angle: -90, position: 'insideLeft', ...labelStyle, offset: 10, fontSize: 10 }}
                      />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip isDarkMode={isDarkMode} />} />
                      <Legend verticalAlign="top" height={24} iconType="circle" wrapperStyle={{ fontSize: '10px', color: colors.text, fontWeight: 600 }}/>
                      
                      <Line 
                          data={data.energyLog} 
                          type="monotone" 
                          dataKey="theoreticalLog" 
                          name={t.charts.theory} 
                          stroke={colors.theory} 
                          strokeWidth={2} 
                          dot={false} 
                          isAnimationActive={false}
                      />
                      
                      <Scatter 
                          data={data.energyLog} 
                          name={t.charts.simulation} 
                          fill={colors.simulation} 
                          shape="circle"
                          line={false}
                          isAnimationActive={false}
                      />
                  </ComposedChart>
              </ResponsiveContainer>
            </div>
        </div>
     )
  }

  if (type === 'tempError') {
      return (
        <div className={containerClass}>
            <div className="flex-1 min-h-0 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.tempHistory} margin={commonMargin}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                      <XAxis 
                          dataKey="time" 
                          tick={axisStyle}
                          tickLine={false}
                          axisLine={{ stroke: colors.grid }}
                          tickFormatter={formatTick}
                          label={{ value: t.charts.timeX, position: 'insideBottom', offset: -5, ...labelStyle, fontSize: 10 }}
                      />
                      <YAxis 
                          tick={axisStyle}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={formatTick}
                          label={{ value: '% Error', angle: -90, position: 'insideLeft', ...labelStyle, offset: 10, fontSize: 10 }}
                      />
                      <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} />
                      <Area type="monotone" dataKey="error" stroke={colors.area} fill={colors.area} fillOpacity={0.1} strokeWidth={2} isAnimationActive={false} name={t.charts.tempError} />
                  </AreaChart>
              </ResponsiveContainer>
            </div>
        </div>
      );
  }

  if (type === 'totalEnergy') {
    return (
      <div className={containerClass}>
          <div className="flex-1 min-h-0 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.tempHistory} margin={commonMargin}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                    <XAxis 
                        dataKey="time" 
                        tick={axisStyle}
                        tickLine={false}
                        axisLine={{ stroke: colors.grid }}
                        tickFormatter={formatTick}
                        label={{ value: t.charts.timeX, position: 'insideBottom', offset: -5, ...labelStyle, fontSize: 10 }}
                    />
                    <YAxis 
                        tick={axisStyle}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={formatTick}
                        domain={['auto', 'auto']}
                        label={{ value: 'Energy E', angle: -90, position: 'insideLeft', ...labelStyle, offset: 10, fontSize: 10 }}
                    />
                    <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} />
                    <Area type="monotone" dataKey="totalEnergy" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={2} isAnimationActive={false} name={t.charts.totalEnergy} />
                </AreaChart>
            </ResponsiveContainer>
          </div>
      </div>
    );
}

  return null;
};

export default DistributionCharts;