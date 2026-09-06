import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const moduleCache = new Map<string, { exports: unknown }>();

// Execute the real hook-free TSX view without writing build artifacts or mounting its heavy children.
export const loadWorkbenchView = <T>(url: URL): T => {
  const filename = fileURLToPath(url);
  const cached = moduleCache.get(filename);
  if (cached) return cached.exports as T;
  const localRequire = createRequire(url);
  const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} as unknown };
  moduleCache.set(filename, module);
  const requireView = (specifier: string): unknown => {
    const resolved = localRequire.resolve(specifier);
    return extname(resolved) === '.tsx'
      ? loadWorkbenchView(new URL(specifier, url))
      : localRequire(specifier);
  };
  new Function('require', 'module', 'exports', '__filename', '__dirname', compiled)(
    requireView, module, module.exports, filename, dirname(filename),
  );
  return module.exports as T;
};
