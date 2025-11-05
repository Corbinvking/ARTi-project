import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Table Skeleton Loader
export const TableSkeleton = ({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
    <div className="border rounded-lg overflow-hidden">
      <div className="grid gap-4 p-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-6 w-full" />
        ))}
        {Array.from({ length: rows * columns }).map((_, i) => (
          <Skeleton key={`cell-${i}`} className="h-4 w-full" />
        ))}
      </div>
    </div>
  </div>
);

// Card Grid Skeleton
export const CardGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// Progress Indicator
export const ProgressIndicator = ({ 
  progress, 
  label, 
  showPercentage = true 
}: { 
  progress: number; 
  label?: string; 
  showPercentage?: boolean;
}) => (
  <div className="space-y-2">
    {label && <div className="text-sm font-medium text-foreground">{label}</div>}
    <div className="w-full bg-muted rounded-full h-2">
      <div 
        className="bg-gradient-to-r from-primary to-primary-glow h-2 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
    {showPercentage && (
      <div className="text-xs text-muted-foreground text-right">
        {Math.round(progress)}%
      </div>
    )}
  </div>
);

// Spinner with message
export const LoadingSpinner = ({ message }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-12 space-y-4">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    {message && (
      <p className="text-sm text-muted-foreground font-medium">{message}</p>
    )}
  </div>
);

// Upload Progress
export const UploadProgress = ({ 
  fileName, 
  progress, 
  status = 'uploading' 
}: { 
  fileName: string; 
  progress: number; 
  status?: 'uploading' | 'processing' | 'complete' | 'error';
}) => (
  <div className="p-4 border border-border rounded-lg bg-card/50 backdrop-blur-sm">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-foreground truncate">{fileName}</span>
      <span className="text-xs text-muted-foreground">
        {status === 'uploading' && `${Math.round(progress)}%`}
        {status === 'processing' && 'Processing...'}
        {status === 'complete' && 'Complete'}
        {status === 'error' && 'Error'}
      </span>
    </div>
    <div className="w-full bg-muted rounded-full h-1">
      <div 
        className={`h-1 rounded-full transition-all duration-300 ${
          status === 'error' ? 'bg-destructive' : 
          status === 'complete' ? 'bg-success' : 
          'bg-gradient-to-r from-primary to-primary-glow'
        }`}
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  </div>
);