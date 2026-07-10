export const isPersistenceRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

export const isPersistenceFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

export const normalizePersistenceNullableNumber = (value: unknown): number | null => (
  isPersistenceFiniteNumber(value) ? value : null
);

export const clonePersistenceValue = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => clonePersistenceValue(item)) as T;
  }
  if (isPersistenceRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clonePersistenceValue(item)]),
    ) as T;
  }
  return value;
};
