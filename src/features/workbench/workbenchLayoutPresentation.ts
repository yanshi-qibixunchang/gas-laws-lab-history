import type React from 'react';
import { clampWorkbenchLiveSplitRatio } from './workbenchFileState.ts';
export const selectWorkbenchLayoutPresentation = (ports: { activeFile: { liveWorkspaceSplitRatio: number }; leftSidebarWidth: number; parameterSidebarWidth: number; consoleCollapsed: boolean; consoleHeightPx: number; }) => {
 const { activeFile, leftSidebarWidth, parameterSidebarWidth, consoleCollapsed, consoleHeightPx } = ports;
 const workbenchStyle = {
    '--studio-left-width': `${leftSidebarWidth}px`,
    '--studio-params-width': `${parameterSidebarWidth}px`,
    '--studio-left-resize-ghost-x': `${leftSidebarWidth}px`,
    '--studio-params-resize-ghost-x': `calc(100% - ${parameterSidebarWidth}px)`,
  } as React.CSSProperties & Record<
    '--studio-left-width' | '--studio-params-width' | '--studio-left-resize-ghost-x' | '--studio-params-resize-ghost-x',
    string
  >;
 const shellStyle = {
    '--studio-console-height': consoleCollapsed ? '32px' : `${consoleHeightPx}px`,
    '--studio-console-resize-ghost-y': `calc(100% - ${consoleCollapsed ? '32px' : `${consoleHeightPx}px`} - 24px)`,
  } as React.CSSProperties & Record<'--studio-console-height' | '--studio-console-resize-ghost-y', string>;
 const liveWorkspaceSplitRatio = clampWorkbenchLiveSplitRatio(activeFile.liveWorkspaceSplitRatio);
 const liveWorkspaceStyle = {
    '--studio-live-preview-ratio': `${(liveWorkspaceSplitRatio * 100).toFixed(3)}%`,
    '--studio-live-realtime-ratio': `${((1 - liveWorkspaceSplitRatio) * 100).toFixed(3)}%`,
    '--studio-live-resize-ghost-x': `${(liveWorkspaceSplitRatio * 100).toFixed(3)}%`,
  } as React.CSSProperties & Record<'--studio-live-preview-ratio' | '--studio-live-realtime-ratio' | '--studio-live-resize-ghost-x', string>;
 return { workbenchStyle, shellStyle, liveWorkspaceSplitRatio, liveWorkspaceStyle };
};
