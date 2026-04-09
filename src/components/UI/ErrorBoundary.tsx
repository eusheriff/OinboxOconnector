import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught an error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
            <div className="mb-4 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="mb-2 text-center text-xl font-semibold text-gray-900">
              Algo deu errado
            </h2>
            <p className="mb-4 text-center text-sm text-gray-600">
              Ocorreu um erro inesperado. Tente recarregar a pagina.
            </p>
            {this.state.error && (
              <details className="mb-4 rounded bg-gray-50 p-3">
                <summary className="cursor-pointer text-xs font-medium text-gray-700">
                  Detalhes do erro
                </summary>
                <pre className="mt-2 overflow-x-auto text-xs text-red-600">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleRetry}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Recarregar pagina
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
