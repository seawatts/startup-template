import type { PropsWithChildren, ReactNode } from 'react';
import { Component } from 'react';

import { sentry } from '~/utils/sentry';
import { WelcomeCard } from './header/card';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps extends PropsWithChildren {
  fallback?: ReactNode;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      error: null,
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      error,
      hasError: true,
    };
  }

  componentDidCatch(error: Error) {
    console.error('componentDidCatch', error);
    sentry.captureException(error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="mx-auto mt-4 w-full max-w-[1200px]">
          <div className="flex flex-col gap-8 px-6">
            <WelcomeCard
              error={this.state.error}
              onTryAgain={() => this.setState({ error: null, hasError: false })}
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
