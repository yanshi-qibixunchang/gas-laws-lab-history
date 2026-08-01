export const MANDATORY_CONSENT_READING_MS = 15_000;

export const accumulateVisibleReadingTime = ({
  elapsedMs,
  intervalStartMs,
  intervalEndMs,
  visible,
}: {
  elapsedMs: number;
  intervalStartMs: number;
  intervalEndMs: number;
  visible: boolean;
}) => {
  if (!visible) return Math.max(0, elapsedMs);
  return Math.min(
    MANDATORY_CONSENT_READING_MS,
    Math.max(0, elapsedMs) + Math.max(0, intervalEndMs - intervalStartMs),
  );
};

export const isMandatoryConsentScrollComplete = ({
  scrollTop,
  clientHeight,
  scrollHeight,
  tolerancePx = 2,
}: {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
  tolerancePx?: number;
}) => scrollTop + clientHeight >= scrollHeight - tolerancePx;

export const isMandatoryConsentReady = ({
  elapsedVisibleMs,
  scrolledToBottom,
}: {
  elapsedVisibleMs: number;
  scrolledToBottom: boolean;
}) => elapsedVisibleMs >= MANDATORY_CONSENT_READING_MS && scrolledToBottom;

export const getMandatoryConsentRemainingSeconds = (elapsedVisibleMs: number) => (
  Math.max(0, Math.ceil((MANDATORY_CONSENT_READING_MS - elapsedVisibleMs) / 1000))
);
