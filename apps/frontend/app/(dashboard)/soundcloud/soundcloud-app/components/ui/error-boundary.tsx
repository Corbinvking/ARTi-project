import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, Home, Bug, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send error to monitoring service (placeholder)
    this.reportError(error, errorInfo);
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // In a real app, send to error monitoring service like Sentry
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // Placeholder for error reporting
      console.log('Error reported:', errorReport);
      
      // Store in localStorage for debugging
      const existingErrors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      existingErrors.push(errorReport);
      localStorage.setItem('app_errors', JSON.stringify(existingErrors.slice(-10))); // Keep last 10 errors
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private copyErrorDetails = () => {
    const errorDetails = `
Error ID: ${this.state.errorId}
Time: ${new Date().toISOString()}
Error: ${this.state.error?.message}
Stack: ${this.state.error?.stack}
Component Stack: ${this.state.errorInfo?.componentStack}
    `.trim();

    navigator.clipboard.writeText(errorDetails).then(() => {
      // Would use toast here but we're in a class component
      console.log('Error details copied to clipboard');
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
              <CardDescription>
                We apologize for the inconvenience. An unexpected error has occurred.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Error ID */}
              <div className="flex items-center justify-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  ID: {this.state.errorId}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={this.copyErrorDetails}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>

              {/* Error Message */}
              {this.state.error && (
                <Card className="bg-destructive/5 border-destructive/20">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-destructive mb-2">
                      Error Message:
                    </p>
                    <p className="text-xs font-mono text-muted-foreground break-all">
                      {this.state.error.message}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Error Details (if enabled) */}
              {this.props.showDetails && this.state.error?.stack && (
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    Technical Details
                  </summary>
                  <Card className="mt-2 bg-muted/50">
                    <CardContent className="p-4">
                      <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                        {this.state.error.stack}
                      </pre>
                    </CardContent>
                  </Card>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button onClick={this.handleRetry} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={this.handleGoHome} className="flex-1">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {/* Help Text */}
              <p className="text-xs text-muted-foreground text-center">
                If this problem persists, please contact support with the error ID above.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook-based wrapper for functional components
interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
}

export const ErrorBoundaryWrapper: React.FC<ErrorBoundaryWrapperProps> = ({
  children,
  fallback,
  showDetails = false
}) => {
  const { toast } = useToast();

  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    toast({
      title: "An error occurred",
      description: "The error has been logged and will be investigated.",
      variant: "destructive"
    });
  };

  return (
    <ErrorBoundary
      fallback={fallback}
      onError={handleError}
      showDetails={showDetails}
    >
      {children}
    </ErrorBoundary>
  );
};