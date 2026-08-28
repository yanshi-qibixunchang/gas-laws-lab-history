export type DevelopmentRenderFaultTarget = 'data-processing' | 'workbench';

const DEVELOPMENT_RENDER_FAULT_QUERY_KEY = 'hslDevRenderFault';
const recoveredTargets = new Set<DevelopmentRenderFaultTarget>();

export const isDevelopmentRenderFaultRequested = (
  target: DevelopmentRenderFaultTarget,
) => import.meta.env.DEV
  && typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get(
    DEVELOPMENT_RENDER_FAULT_QUERY_KEY,
  ) === target;

export const DevelopmentRenderFault = ({
  target,
}: {
  target: DevelopmentRenderFaultTarget;
}) => {
  if (
    isDevelopmentRenderFaultRequested(target)
    && !recoveredTargets.has(target)
  ) {
    throw new Error(`Development-only ${target} render fault.`);
  }
  return null;
};

export const recoverDevelopmentRenderFault = (
  target: DevelopmentRenderFaultTarget,
) => {
  if (import.meta.env.DEV) {
    recoveredTargets.add(target);
  }
};
