import { Component } from 'react';
import type { ReactNode } from 'react';
import { useT } from '@/hooks/useT';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

const CrashScreen = () => {
  const t = useT();
  return (
    <div
      role="alert"
      className="grid h-dvh place-content-center gap-3 bg-canvas p-8 text-center text-fg"
    >
      <h1 className="text-lg font-medium">{t('errorTitle')}</h1>
      <p className="max-w-sm text-sm text-fg-muted">{t('errorBody')}</p>
      <Button
        variant="primary"
        className="mx-auto"
        onClick={() => window.location.reload()}
      >
        {t('reload')}
      </Button>
    </div>
  );
};

/**
 * Error boundaries still need a class component in React 19. Without it an
 * error while rendering leaves a blank window.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? <CrashScreen /> : this.props.children;
  }
}
