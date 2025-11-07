'use client'

import { useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      (event.target as HTMLElement)?.contentEditable === 'true'
    ) {
      return;
    }

    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      
      return keyMatch && ctrlMatch && altMatch && shiftMatch;
    });

    if (matchingShortcut) {
      event.preventDefault();
      matchingShortcut.action();
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

// Global keyboard shortcuts hook for common actions
export const useGlobalShortcuts = (
  openSearch?: () => void,
  openNewCreator?: () => void,
  openExport?: () => void,
  openHelp?: () => void
) => {
  const router = useRouter();

  const shortcuts: KeyboardShortcut[] = useMemo(() => [
    {
      key: 'k',
      ctrl: true,
      description: 'Open global search',
      action: () => openSearch?.()
    },
    {
      key: 'n',
      ctrl: true,
      description: 'Add new creator',
      action: () => openNewCreator?.()
    },
    {
      key: 'e',
      ctrl: true,
      description: 'Export data',
      action: () => openExport?.()
    },
    {
      key: '?',
      description: 'Show keyboard shortcuts',
      action: () => openHelp?.()
    },
    {
      key: '1',
      ctrl: true,
      description: 'Go to homepage',
      action: () => router.push('/instagram')
    },
    {
      key: '2',
      ctrl: true,
      description: 'Go to creators',
      action: () => router.push('/instagram/creators')
    },
    {
      key: '3',
      ctrl: true,
      description: 'Go to campaign builder',
      action: () => router.push('/instagram/campaign-builder')
    },
    {
      key: '4',
      ctrl: true,
      description: 'Go to QA dashboard',
      action: () => router.push('/instagram/qa')
    },
    {
      key: '5',
      ctrl: true,
      description: 'Go to campaigns history',
      action: () => router.push('/instagram/campaigns')
    }
  ], [router, openSearch, openNewCreator, openExport, openHelp]);

  useKeyboardShortcuts(shortcuts);
  return shortcuts;
};