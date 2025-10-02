import { useState, useEffect } from 'react'

export interface SearchResult {
  id: string
  type: 'campaign' | 'vendor' | 'client' | 'playlist'
  title: string
  subtitle?: string
  url: string
}

export function useGlobalSearch() {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const search = async (query: string) => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      // Mock search results for now
      const mockResults: SearchResult[] = [
        {
          id: '1',
          type: 'campaign',
          title: 'Sample Campaign',
          subtitle: 'Spotify Promotion',
          url: '/campaigns/1'
        },
        {
          id: '2',
          type: 'vendor',
          title: 'Sample Vendor',
          subtitle: 'Playlist Provider',
          url: '/vendors/2'
        }
      ]
      
      setResults(mockResults)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return {
    results,
    loading,
    search
  }
}
