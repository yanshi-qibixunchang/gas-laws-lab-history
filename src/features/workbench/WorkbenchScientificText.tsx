import { type HeatCapacityFreeParameterSymbolPart } from '../heatCapacity/heatCapacityFreeParameterPanelModel.ts';
import React from 'react';

export const renderHeatCapacityParameterSymbol = (
  parts: HeatCapacityFreeParameterSymbolPart[],
) => {
  const hasParts = parts.length > 0;
  return (
    <span
      className={`studio-param-symbol ${hasParts ? '' : 'studio-param-symbol-empty'}`}
      aria-hidden={hasParts ? undefined : true}
    >
      {parts.map((part, index) => (
        typeof part === 'string'
          ? <span key={index}>{part}</span>
          : <sub key={index}>{part.sub}</sub>
      ))}
    </span>
  );
};

export const renderScientificText = (text: string): React.ReactNode => {
  const parts = text.split(/(Uₜ₁|Uₜ₂|Uₜ|Uₚ|t₁|t₂|T²|\bT\b|\bN\b)/g);
  return parts.map((part, index) => {
    if (part === 'Uₜ₁') return <React.Fragment key={`${part}-${index}`}>U<sub>T1</sub></React.Fragment>;
    if (part === 'Uₜ₂') return <React.Fragment key={`${part}-${index}`}>U<sub>T2</sub></React.Fragment>;
    if (part === 'Uₜ') return <React.Fragment key={`${part}-${index}`}>U<sub>T</sub></React.Fragment>;
    if (part === 'Uₚ') return <React.Fragment key={`${part}-${index}`}>U<sub>p</sub></React.Fragment>;
    if (part === 't₁') return <React.Fragment key={`${part}-${index}`}><i>t</i><sub>1</sub></React.Fragment>;
    if (part === 't₂') return <React.Fragment key={`${part}-${index}`}><i>t</i><sub>2</sub></React.Fragment>;
    if (part === 'T²') return <React.Fragment key={`${part}-${index}`}><i>T</i><sup>2</sup></React.Fragment>;
    if (part === 'T' || part === 'N') return <i key={`${part}-${index}`}>{part}</i>;
    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
};
