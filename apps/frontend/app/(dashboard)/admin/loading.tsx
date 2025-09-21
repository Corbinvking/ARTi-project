export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse" />
      </div>
      <div className="space-y-6">
        <div className="h-96 bg-muted rounded-lg animate-pulse" />
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
        <div className="h-80 bg-muted rounded-lg animate-pulse" />
      </div>
    </div>
  )
}
