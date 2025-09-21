export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="w-14 h-14 bg-muted rounded-lg animate-pulse" />
        <div className="space-y-2">
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
          <div className="h-4 w-48 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </div>
    </div>
  )
}
