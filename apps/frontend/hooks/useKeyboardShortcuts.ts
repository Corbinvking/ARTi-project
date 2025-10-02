import { useEffect } from 'react'

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        // Focus search input
        const searchInput = document.getElementById('global-search')
        if (searchInput) {
          searchInput.focus()
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        // Navigate to new campaign
        window.location.href = '/spotify/campaign/new'
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault()
        // Export data
        console.log('Export triggered')
      }

      // Number shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault()
        window.location.href = '/spotify'
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '2') {
        e.preventDefault()
        window.location.href = '/spotify/playlists'
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '3') {
        e.preventDefault()
        window.location.href = '/spotify/campaign/new'
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '4') {
        e.preventDefault()
        window.location.href = '/spotify/campaigns'
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '5') {
        e.preventDefault()
        window.location.href = '/spotify/clients'
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
}
