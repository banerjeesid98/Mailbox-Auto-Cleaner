import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  declare props: Props;
  declare state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    (this as React.Component<Props, State>).setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#141414] border border-[#262626] rounded-xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-950/50 border border-red-800 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 className="font-serif italic text-xl text-white">Something went wrong</h2>
              <p className="text-xs text-[#aaa] mt-2 font-mono">
                {this.state.error?.message || 'An unexpected rendering error occurred.'}
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded bg-amber-400 text-black hover:bg-amber-300 font-mono text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center space-x-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
