"use client"

import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-destructive">Something went wrong</CardTitle>
              <CardDescription>
                We're sorry, but something unexpected happened. Please try again or return to the home page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="bg-muted p-3 rounded-md text-sm">
                  <summary className="cursor-pointer font-medium mb-2">
                    Error Details (Development)
                  </summary>
                  <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                    {this.state.error.message}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => this.setState({ hasError: false })}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/'}
                  className="flex-1"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const useErrorHandler = () => {
  const handleError = (error: Error, context?: string) => {
    console.error(`Error in ${context || 'component'}:`, error);
    
    // You could integrate with an error reporting service here
    // like Sentry, LogRocket, or Bugsnag
    
    return {
      message: getUserFriendlyMessage(error),
      canRetry: isRetryableError(error)
    };
  };

  return { handleError };
};

const getUserFriendlyMessage = (error: Error): string => {
  if (error.message.includes('network') || error.message.includes('fetch')) {
    return 'Network connection issue. Please check your internet connection and try again.';
  }
  
  if (error.message.includes('permission') || error.message.includes('unauthorized')) {
    return 'You don\'t have permission to perform this action. Please contact an administrator.';
  }
  
  if (error.message.includes('validation') || error.message.includes('invalid')) {
    return 'Please check your input and try again.';
  }
  
  if (error.message.includes('timeout')) {
    return 'The request is taking longer than expected. Please try again.';
  }

  return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
};

const isRetryableError = (error: Error): boolean => {
  const retryablePatterns = ['network', 'timeout', 'fetch', 'connection'];
  return retryablePatterns.some(pattern => 
    error.message.toLowerCase().includes(pattern)
  );
};








