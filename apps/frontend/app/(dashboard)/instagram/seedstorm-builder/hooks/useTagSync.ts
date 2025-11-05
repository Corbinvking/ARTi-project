import { useState, useEffect } from "react";
import { getAllTags, TagCollections } from "../lib/tagStorage";

// Custom hook to keep tags synchronized across components
export const useTagSync = () => {
  const [tags, setTags] = useState<TagCollections>(getAllTags());

  const refreshTags = () => {
    setTags(getAllTags());
  };

  // Listen for localStorage changes to keep tags in sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'creator_tags') {
        refreshTags();
      }
    };

    // Listen for custom events when tags are updated
    const handleTagUpdate = () => {
      refreshTags();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('tagsUpdated', handleTagUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tagsUpdated', handleTagUpdate);
    };
  }, []);

  return { tags, refreshTags };
};

// Utility function to trigger tag sync across components
export const triggerTagSync = () => {
  window.dispatchEvent(new CustomEvent('tagsUpdated'));
};
