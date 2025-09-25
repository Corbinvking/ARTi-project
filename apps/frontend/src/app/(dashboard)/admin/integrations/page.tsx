import { Metadata } from 'next'
import { SpotifyScraperManager } from '@/components/providers/SpotifyScraperManager'

export const metadata: Metadata = {
  title: 'Integrations',
  description: 'Manage provider integrations and data scraping'
}

export default function IntegrationsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Platform Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Manage your data providers, API connections, and scraping operations
        </p>
      </div>

      <div className="space-y-8">
        {/* Spotify Integration */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Spotify Integration</h2>
            <p className="text-muted-foreground">
              Scrape playlist data from Spotify for Artists to analyze your song performance
            </p>
          </div>
          <SpotifyScraperManager />
        </section>

        {/* Future Integrations */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Coming Soon</h2>
            <p className="text-muted-foreground">
              Additional provider integrations and data sources
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'Instagram API', status: 'Planned' },
              { name: 'YouTube Analytics', status: 'Planned' },
              { name: 'SoundCloud Metrics', status: 'Planned' }
            ].map((provider) => (
              <div key={provider.name} className="border rounded-lg p-4 opacity-50">
                <h3 className="font-medium">{provider.name}</h3>
                <p className="text-sm text-muted-foreground">{provider.status}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
