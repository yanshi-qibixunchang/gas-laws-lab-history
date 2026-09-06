import {
  PanelLeft,
  Folder,
  FolderOpen,
} from 'lucide-react';

export interface WorkbenchSectionTitleProps {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
  kind?: "files" | "panels";
}

export const WorkbenchSectionTitle = ({
  label,
  collapsed,
  onToggle,
  kind = 'files',
}: WorkbenchSectionTitleProps) => {
  return (
    <button
      type="button"
      className={`studio-tree-title-button studio-tree-title-button-${kind} ${collapsed ? 'studio-tree-title-collapsed' : ''}`}
      onClick={onToggle}
      aria-expanded={!collapsed}
    >
      {kind === 'panels' ? <PanelLeft size={14} /> : (
        <span className="studio-tree-folder-icon">
          <Folder size={14} className="studio-folder-closed" />
          <FolderOpen size={14} className="studio-folder-open" />
        </span>
      )}
      <span>{label}</span>
    </button>
  );
};
