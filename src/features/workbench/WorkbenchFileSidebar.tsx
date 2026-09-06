import type React from 'react';
import type { WorkbenchCopy } from './workbenchStudioCopy.ts';

export interface WorkbenchFileSidebarProps {
  workbenchCopy: WorkbenchCopy;
  children: React.ReactNode;
  setLeftCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  startSidebarResize: (side: 'left' | 'params', event: React.MouseEvent) => void;
}

export const WorkbenchFileSidebar = ({ workbenchCopy, children, setLeftCollapsed, startSidebarResize }: WorkbenchFileSidebarProps) => (
<aside className="studio-sidebar" aria-label={`${workbenchCopy.files.openFiles} ${workbenchCopy.files.panels}`}>
            <div className="studio-panel-header">
              <span>{workbenchCopy.files.openFiles}</span>
              <button
                type="button"
                className="studio-panel-collapse"
                aria-label={`${workbenchCopy.actions.hide} ${workbenchCopy.files.openFiles}`}
                onClick={() => setLeftCollapsed(true)}
              >
                {workbenchCopy.actions.hide}
              </button>
            </div>
            <div className="studio-sidebar-body">{children}</div>
            <div className="studio-sidebar-usage-hint" aria-label={workbenchCopy.files.usageHintAria}>
              <span>{workbenchCopy.files.clickSelectHint}</span>
              <span>{workbenchCopy.files.doubleClickOpenHint}</span>
            </div>
            <div
              className="studio-sidebar-resizer"
              role="separator"
              aria-orientation="vertical"
              onMouseDown={(event) => startSidebarResize('left', event)}
            />
          </aside>
);
