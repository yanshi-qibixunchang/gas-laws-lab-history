

export interface WorkbenchParameterSymbolProps {
  parts: import('./workbenchParameterPresentation.ts').WorkbenchParameterSymbolPart[];
}

export const WorkbenchParameterSymbol = ({
  parts,
}: WorkbenchParameterSymbolProps) => {
  return (
    <span className="studio-param-symbol">
      {parts.map((part, index) => (
        typeof part === 'string'
          ? <span key={index}>{part}</span>
          : <sub key={index}>{part.sub}</sub>
      ))}
    </span>
  );
};
