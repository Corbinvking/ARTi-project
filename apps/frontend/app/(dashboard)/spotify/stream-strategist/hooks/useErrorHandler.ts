import { useCallback } from 'react';
import { useToast } from '../hooks/use-toast';

export interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
}

export const useErrorHandler = () => {
  const { toast } = useToast();

  const handleError = useCallback((error: Error, errorInfo?: ErrorInfo) => {
    console.error('Application Error:', error);
    console.error('Error Info:', errorInfo);

    // Show user-friendly error message
    toast({
      title: "Something went wrong",
      description: getErrorMessage(error),
      variant: "destructive",
      duration: 5000,
    });

    // In production, you might want to send error to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to error monitoring service (e.g., Sentry, LogRocket)
      // reportError(error, errorInfo);
    }
  }, [toast]);

  const handleAsyncError = useCallback(async (asyncOperation: () => Promise<void>) => {
    try {
      await asyncOperation();
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Unknown async error'));
    }
  }, [handleError]);

  return {
    handleError,
    handleAsyncError
  };
};

function getErrorMessage(error: Error): string {
  // Common error patterns and user-friendly messages
  if (error.message.includes('Failed to fetch')) {
    return 'Network connection error. Please check your internet connection and try again.';
  }
  
  if (error.message.includes('unauthorized') || error.message.includes('401')) {
    return 'You are not authorized to perform this action. Please log in again.';
  }
  
  if (error.message.includes('not found') || error.message.includes('404')) {
    return 'The requested resource was not found.';
  }
  
  if (error.message.includes('timeout')) {
    return 'The request timed out. Please try again.';
  }
  
  if (error.message.includes('rate limit')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  
  if (error.message.includes('validation')) {
    return 'Please check your input and try again.';
  }
  
  // Generic fallback
  return 'An unexpected error occurred. Our team has been notified.';
}







