export type WorkbenchLegalMaterialId = DesktopLegalFileId;

export interface WorkbenchBuildNoticeTable {
  headers: string[];
  rows: string[][];
}

export interface WorkbenchBuildNoticeMaterial {
  id: WorkbenchLegalMaterialId;
  title: string;
  description: string;
}

export interface WorkbenchBuildNoticeSection {
  id: string;
  title: string;
  eyebrow: string;
  paragraphs: string[];
  bullets?: string[];
  tables?: WorkbenchBuildNoticeTable[];
  materials?: WorkbenchBuildNoticeMaterial[];
}

export interface WorkbenchBuildNoticeLegalFile {
  previewPath?: string;
  previewKind?: 'html' | 'text';
  largeFile?: boolean;
}

export interface WorkbenchBuildNoticeFilePreview {
  id: WorkbenchLegalMaterialId;
  kind: 'html' | 'text';
  content: string;
}
