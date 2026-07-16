import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { useFrame, type RenderCallback } from '@react-three/fiber';

export type HeatCapacityRuntimeFailureState = {
  revision: number;
  failed: boolean;
};

type HeatCapacityRuntimeGuardContextValue = {
  revision: number;
  stateRef: MutableRefObject<HeatCapacityRuntimeFailureState>;
  report: (error: unknown, sourceRevision: number) => void;
};

const defaultRuntimeStateRef = { current: { revision: 0, failed: false } };
const HeatCapacityRuntimeGuardContext = createContext<HeatCapacityRuntimeGuardContextValue>({
  revision: 0,
  stateRef: defaultRuntimeStateRef,
  report: () => undefined,
});

export const reportHeatCapacityRuntimeFailure = (
  stateRef: MutableRefObject<HeatCapacityRuntimeFailureState>,
  sourceRevision: number,
  onError: (error: unknown) => void,
  error: unknown,
) => {
  const state = stateRef.current;
  if (state.revision !== sourceRevision || state.failed) return false;
  state.failed = true;
  onError(error);
  return true;
};

export const runHeatCapacityRuntimeGuarded = <Result,>(
  stateRef: MutableRefObject<HeatCapacityRuntimeFailureState>,
  revision: number,
  report: (error: unknown, sourceRevision: number) => void,
  run: () => Result,
): Result | null => {
  if (stateRef.current.revision !== revision || stateRef.current.failed) return null;
  try {
    return run();
  } catch (error) {
    report(error, revision);
    return null;
  }
};

export const HeatCapacityRuntimeGuardProvider = ({
  children,
  revision,
  onError,
}: {
  children: ReactNode;
  revision: number;
  onError: (error: unknown) => void;
}) => {
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const stateRef = useRef({ revision, failed: false });
  if (stateRef.current.revision !== revision) {
    stateRef.current = { revision, failed: false };
  }
  const report = useCallback((error: unknown, sourceRevision: number) => {
    reportHeatCapacityRuntimeFailure(stateRef, sourceRevision, onErrorRef.current, error);
  }, []);
  return createElement(
    HeatCapacityRuntimeGuardContext.Provider,
    { value: { revision, stateRef, report } },
    children,
  );
};

export const useHeatCapacityRuntimeGuard = () => {
  const { revision, stateRef, report } = useContext(HeatCapacityRuntimeGuardContext);
  return useCallback(<Result,>(run: () => Result): Result | null => (
    runHeatCapacityRuntimeGuarded(stateRef, revision, report, run)
  ), [report, revision, stateRef]);
};

export const useHeatCapacityRuntimeFailureReporter = () => {
  const { report, revision } = useContext(HeatCapacityRuntimeGuardContext);
  return useCallback((error: unknown) => report(error, revision), [report, revision]);
};

export const useHeatCapacityGuardedFrame = (
  callback: RenderCallback,
  renderPriority = 0,
) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const runGuarded = useHeatCapacityRuntimeGuard();
  useFrame((state, delta, frame) => {
    runGuarded(() => callbackRef.current(state, delta, frame));
  }, renderPriority);
};
