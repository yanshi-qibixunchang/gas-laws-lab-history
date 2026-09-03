import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import type { WorkbenchFileKind } from './workbenchFileKind.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';

export interface WorkbenchFileKindCopy {
  std: string;
  ideal: string;
  heat: string;
}

export interface WorkbenchSessionCacheCopy {
  about: {
    sessionCacheSummary: (total: number) => string;
    sessionCacheBreakdown: (ideal: number, heat: number, standard: number) => string;
  };
}

export const getWorkbenchFileKindLabel = (
  kind: WorkbenchFileKind,
  copy: WorkbenchFileKindCopy,
) => (({
  standard: copy.std,
  ideal: copy.ideal,
  heatCapacity: copy.heat,
  heatCapacityPistonOscillation: copy.heat,
}) satisfies Record<WorkbenchFileKind, string>)[kind];

export const formatWorkbenchLastOpenedAt = (
  timestamp: number,
  language: WorkbenchLanguagePreference,
) => {
  const date = new Date(timestamp);
  if (!Number.isFinite(timestamp) || Number.isNaN(date.getTime())) return '--';

  const formatter = new Intl.DateTimeFormat(language === 'en' ? 'en-US' : language, {
    year: 'numeric',
    month: language === 'en' ? 'short' : '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  if (language === 'en') return formatter.format(date);

  const parts = formatter.formatToParts(date).reduce<Record<string, string>>((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}年${parts.month}月${parts.day}日 ${parts.hour}:${parts.minute}`;
};

export const getWorkbenchSessionCacheSummary = (
  files: WorkbenchFileState[],
  copy: WorkbenchSessionCacheCopy,
) => {
  const counts = files.reduce(
    (nextCounts, file) => ({
      ideal: nextCounts.ideal + (file.kind === 'ideal' ? 1 : 0),
      heat: nextCounts.heat + (
        file.kind === 'heatCapacity' ||
        file.kind === 'heatCapacityPistonOscillation'
          ? 1
          : 0
      ),
      standard: nextCounts.standard + (file.kind === 'standard' ? 1 : 0),
    }),
    { ideal: 0, heat: 0, standard: 0 },
  );
  return {
    summary: copy.about.sessionCacheSummary(files.length),
    breakdown: copy.about.sessionCacheBreakdown(counts.ideal, counts.heat, counts.standard),
  };
};
