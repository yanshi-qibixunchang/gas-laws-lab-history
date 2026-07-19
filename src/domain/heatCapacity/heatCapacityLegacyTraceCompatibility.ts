export const HEAT_CAPACITY_LEGACY_423_DISPLAY_EVENT_SAMPLE_RELATION_PROVENANCE =
  'legacy-4.2.3/display-event-sample-relation' as const;

const LEGACY_TRACE_TIME_TOLERANCE_S = 0.000001;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const areTimesClose = (left: unknown, right: unknown) => (
  typeof left === 'number' &&
  Number.isFinite(left) &&
  typeof right === 'number' &&
  Number.isFinite(right) &&
  Math.abs(left - right) <= LEGACY_TRACE_TIME_TOLERANCE_S
);

/**
 * A v4.2.3 sparse trace could record an event between retained sensor samples.
 * This tagged relation preserves that historical display linkage without
 * inventing a sensor sample at the event time.
 */
export const isHeatCapacityLegacy423DisplayEventSampleRelation = (
  event: unknown,
  referencedSample: unknown,
) => {
  if (!isRecord(event) || !isRecord(referencedSample) || !isRecord(event.payload)) {
    return false;
  }
  const payload = event.payload;
  return (
    payload.hslLegacyDisplayRelationProvenance ===
      HEAT_CAPACITY_LEGACY_423_DISPLAY_EVENT_SAMPLE_RELATION_PROVENANCE &&
    payload.hslLegacyRelationUsage === 'display-only' &&
    areTimesClose(payload.hslLegacySourceEventAtS, event.atS) &&
    typeof payload.hslLegacySourceTraceSampleId === 'string' &&
    typeof event.traceSampleId === 'string' &&
    payload.hslLegacyLinkedTraceSampleId === event.traceSampleId &&
    areTimesClose(payload.hslLegacySourceTraceSampleAtS, referencedSample.atS) &&
    !areTimesClose(event.atS, referencedSample.atS)
  );
};
