// Utility functions for storing and retrieving tags

export interface TagCollections {
  genres: string[];
  contentTypes: string[];
  territoryPreferences: string[];
}

const STORAGE_KEY = 'creator_tags';

const defaultTags: TagCollections = {
  genres: [
    'EDM', 'House', 'Tech House', 'Techno', 'Dubstep', 'Trance', 'Progressive House',
    'Future Bass', 'Trap', 'DnB', 'Afro', 'Deep House', 'Minimal', 'Garage', 'Breakbeat',
    'Hip Hop', 'R&B', 'Pop', 'Rock', 'Indie', 'Alternative', 'Country', 'Jazz',
    'Classical', 'Reggae', 'Folk', 'Metal', 'Punk', 'Funk', 'Soul', 'Blues'
  ],
  contentTypes: [
    'DJ Footage', 'Festival Content', 'Studio Sessions', 'Behind The Scenes',
    'Music Video', 'Lifestyle', 'Fashion', 'Beauty', 'Travel', 'Food', 'Fitness',
    'Comedy', 'Education', 'Dance', 'Art', 'Technology', 'Gaming', 'Sports',
    'Producer Content', 'Equipment Reviews', 'Tutorial', 'Live Performance'
  ],
  territoryPreferences: [
    'North America', 'Europe', 'Latin America', 'Asia Pacific', 'Middle East', 
    'Africa', 'US Primary', 'Global', 'English Speaking', 'Spanish Speaking'
  ]
};

export function getAllTags(): TagCollections {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure we have base tags
      return {
        genres: [...new Set([...defaultTags.genres, ...(parsed.genres || [])])],
        contentTypes: [...new Set([...defaultTags.contentTypes, ...(parsed.contentTypes || [])])],
        territoryPreferences: [...new Set([...defaultTags.territoryPreferences, ...(parsed.territoryPreferences || [])])]
      };
    }
    return defaultTags;
  } catch (error) {
    console.error('Error loading tags from storage:', error);
    return defaultTags;
  }
}

export function saveTagToCollection(tag: string, collection: keyof TagCollections) {
  try {
    const tags = getAllTags();
    if (!tags[collection].includes(tag)) {
      tags[collection].push(tag);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
      // Trigger sync event
      window.dispatchEvent(new CustomEvent('tagsUpdated'));
    }
  } catch (error) {
    console.error('Error saving tag to storage:', error);
  }
}

export function saveMultipleTagsToCollection(newTags: string[], collection: keyof TagCollections) {
  try {
    const tags = getAllTags();
    const uniqueNewTags = newTags.filter(tag => !tags[collection].includes(tag));
    if (uniqueNewTags.length > 0) {
      tags[collection].push(...uniqueNewTags);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
      // Trigger sync event
      window.dispatchEvent(new CustomEvent('tagsUpdated'));
    }
  } catch (error) {
    console.error('Error saving tags to storage:', error);
  }
}

export function deleteTagFromCollection(tag: string, collection: keyof TagCollections) {
  try {
    const tags = getAllTags();
    tags[collection] = tags[collection].filter(t => t !== tag);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
    // Trigger sync event
    window.dispatchEvent(new CustomEvent('tagsUpdated'));
  } catch (error) {
    console.error('Error deleting tag from storage:', error);
  }
}

export function getTagsForCollection(collection: keyof TagCollections): string[] {
  return getAllTags()[collection];
}

// Sync content types and genres from creators into the tag system
export async function syncCreatorDataToTags() {
  try {
    // Import here to avoid circular dependency
    const { getCreators } = await import('./localStorage');
    const creators = await getCreators();
    
    const existingTags = getAllTags();
    let hasUpdates = false;
    
    // Collect all unique content types from creators
    const allContentTypes = new Set(existingTags.contentTypes);
    const allGenres = new Set(existingTags.genres);
    
    creators.forEach(creator => {
      // Add content types
      if (creator.content_types) {
        creator.content_types.forEach(type => {
          if (type && !allContentTypes.has(type)) {
            allContentTypes.add(type);
            hasUpdates = true;
          }
        });
      }
      
      // Add music genres
      if (creator.music_genres) {
        creator.music_genres.forEach(genre => {
          if (genre && !allGenres.has(genre)) {
            allGenres.add(genre);
            hasUpdates = true;
          }
        });
      }
    });
    
    // Save updated tags if there are new ones
    if (hasUpdates) {
      const updatedTags: TagCollections = {
        genres: Array.from(allGenres).sort(),
        contentTypes: Array.from(allContentTypes).sort(),
        territoryPreferences: existingTags.territoryPreferences
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTags));
      // Trigger sync event
      window.dispatchEvent(new CustomEvent('tagsUpdated'));
      console.log('Synced creator data to tags:', {
        contentTypes: Array.from(allContentTypes).length,
        genres: Array.from(allGenres).length
      });
    }
    
  } catch (error) {
    console.error('Error syncing creator data to tags:', error);
  }
}