import type { WorkbenchConsoleMessageInput } from './workbenchConsoleLocalization.ts';
export type WorkbenchMutableRef<T> = { current: T };
export type WorkbenchStateSetter<T> = (next: T | ((current: T) => T)) => void;
export type WorkbenchLogWriter = (message: WorkbenchConsoleMessageInput, kind?: 'info' | 'warning' | 'success' | 'error') => void;
