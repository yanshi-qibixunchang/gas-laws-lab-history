import { useEffect, useRef } from 'react';

interface BrowserExperimentState {
  name: string;
  kind: string;
  panel: string;
}

// Optional browser API: expose only the same experiment identity visible in the UI.
// No answers, hidden simulation values, or teaching progress are changed.
export function useWorkbenchBrowserTools(enabled: boolean, state: BrowserExperimentState | null) {
  const current = useRef(state);
  current.current = state;
  useEffect(() => {
    if (!enabled) return;
    const context = (document as Document & {
      modelContext?: {
        registerTool: (tool: {
          name: string;
          description: string;
          inputSchema: object;
          annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
          execute: (input: unknown) => unknown;
        }, options: { signal: AbortSignal }) => void | Promise<void>;
      };
    }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(context.registerTool({
        name: 'read_current_experiment',
        description: 'Read the open experiment name, type and selected panel shown in Gas Laws Lab. Does not start experiments or change learning progress.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute(input) {
          if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) {
            throw new Error('Expected an empty object.');
          }
          return { experiment: current.current, exportAvailable: false };
        },
      }, { signal: lifecycle.signal })).catch(() => lifecycle.abort());
    } catch {
      lifecycle.abort();
    }
    return () => lifecycle.abort();
  }, [enabled]);
}
