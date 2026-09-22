// Serialization-only cleanup for the first ten-question course snapshots.
// These unused pressure fields never contributed to that course's calculation.
// Keep their recognition here, outside the active instrument/precision models.
type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => !!value && typeof value === 'object' && !Array.isArray(value);
const owns = (value: RecordValue, key: string) => Object.hasOwn(value, key);

export const LEGACY_PISTON_PRESSURE_METADATA = {
  pressureExpandedPa: 200, pressureCoverage: 2, pressureStepPa: 10,
} as const;

const cleanProfile = (value: unknown): unknown => {
  if (!record(value) || value.version !== 'piston-free-uncertainty-v2' || value.pressureStandardPa !== 100
    || !Object.entries(LEGACY_PISTON_PRESSURE_METADATA).every(([key, expected]) => value[key] === expected)) return value;
  const next = { ...value };
  for (const key of Object.keys(LEGACY_PISTON_PRESSURE_METADATA)) delete next[key];
  return next;
};
const cleanPlan = (value: unknown): unknown => {
  if (!record(value) || value.version !== 'piston-continuous-precision-v1' || !record(value.digits)) return value;
  const keys = ['pressureCalibration', 'pressureReadout'];
  if (!keys.every(key => Number.isInteger(value.digits && (value.digits as RecordValue)[key])
    && Number((value.digits as RecordValue)[key]) >= 3 && Number((value.digits as RecordValue)[key]) <= 12)) return value;
  const digits = { ...value.digits };
  for (const key of keys) delete digits[key];
  return { ...value, digits };
};
const cleanFingerprint = (value: unknown): unknown => {
  if (typeof value !== 'string' || !value) return value;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!record(parsed) || parsed.version !== 'piston-free-uncertainty-v2') return value;
    const profile = cleanProfile(parsed.profile);
    const precision = cleanPlan(parsed.precision);
    return profile !== parsed.profile || precision !== parsed.precision
      ? JSON.stringify({ ...parsed, profile, precision }) : value;
  } catch { return value; }
};

/** Preserve all observations, answers and unknown fields for the existing
 * canonical restore checks. Never repair invalid instrument metadata. */
export const cleanPistonUncertaintySnapshot = (value: unknown): unknown => {
  if (!record(value) || value.uncertaintyCourseVersion !== 'piston-free-uncertainty-v2') return value;
  let next = value;
  if (record(value.linearFitResult)) {
    const precisionPlan = cleanPlan(value.linearFitResult.precisionPlan);
    if (precisionPlan !== value.linearFitResult.precisionPlan) next = { ...next, linearFitResult: { ...value.linearFitResult, precisionPlan } };
  }
  if (record(value.calculationSession) && record(value.calculationSession.uncertainty)) {
    const course = value.calculationSession.uncertainty;
    if (course.version !== 'piston-free-uncertainty-v2') return value;
    // A partial or altered legacy profile is not a recognised migration.
    const profile = cleanProfile(course.profile);
    if (record(course.profile) && Object.keys(LEGACY_PISTON_PRESSURE_METADATA).some(key => owns(course.profile as RecordValue, key))
      && profile === course.profile) return value;
    const fingerprint = cleanFingerprint(course.fingerprint);
    if (profile !== course.profile || fingerprint !== course.fingerprint) next = {
      ...next, calculationSession: { ...value.calculationSession, uncertainty: { ...course, profile, fingerprint } },
    };
  }
  return next;
};
