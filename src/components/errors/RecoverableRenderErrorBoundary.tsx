import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';

export interface RecoverableRenderErrorFallbackContext {
  error: Error;
  retry: () => void;
}

export interface RecoverableRenderErrorBoundaryProps {
  children: ReactNode;
  fallback: (context: RecoverableRenderErrorFallbackContext) => ReactNode;
  resetKeys?: readonly unknown[];
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface RecoverableRenderErrorBoundaryState {
  error: Error | null;
  recoveryRevision: number;
}

const resetKeysChanged = (
  previous: readonly unknown[] | undefined,
  next: readonly unknown[] | undefined,
) => {
  if (previous === next) return false;
  if (!previous || !next || previous.length !== next.length) return true;
  return previous.some((value, index) => !Object.is(value, next[index]));
};

export class RecoverableRenderErrorBoundary extends Component<
  RecoverableRenderErrorBoundaryProps,
  RecoverableRenderErrorBoundaryState
> {
  state: RecoverableRenderErrorBoundaryState = {
    error: null,
    recoveryRevision: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<RecoverableRenderErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[render-recovery] A protected view failed to render.', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(previousProps: RecoverableRenderErrorBoundaryProps) {
    if (
      this.state.error
      && resetKeysChanged(previousProps.resetKeys, this.props.resetKeys)
    ) {
      this.setState((current) => ({
        error: null,
        recoveryRevision: current.recoveryRevision + 1,
      }));
    }
  }

  private retry = () => {
    this.setState((current) => ({
      error: null,
      recoveryRevision: current.recoveryRevision + 1,
    }));
  };

  render() {
    if (this.state.error) {
      return this.props.fallback({
        error: this.state.error,
        retry: this.retry,
      });
    }
    return (
      <Fragment key={this.state.recoveryRevision}>
        {this.props.children}
      </Fragment>
    );
  }
}

export default RecoverableRenderErrorBoundary;
