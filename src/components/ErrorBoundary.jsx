// src/components/ErrorBoundary.jsx
// React Error Boundary - prevents component errors from crashing the entire app

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900">
          <div className="text-center p-8 max-w-md">
            <AlertTriangle className="w-16 h-16 text-red-500 mb-4 mx-auto" />
            <h2 className="text-xl text-white mb-2">出现错误</h2>
            <p className="text-gray-400 mb-4 text-sm">
              {this.state.error?.message || '未知错误'}
            </p>
            {this.props.showDetails && this.state.errorInfo && (
              <pre className="bg-black/30 p-4 rounded-lg text-xs text-gray-300 overflow-auto max-h-40 mb-4">
                {this.state.errorInfo.componentStack}
              </pre>
            )}
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 rounded-lg text-white hover:bg-purple-600 transition-colors mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;