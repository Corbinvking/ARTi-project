"use client"

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Keyboard } from 'lucide-react';
import { KEYBOARD_SHORTCUTS } from '../hooks/useKeyboardShortcuts';

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleShowShortcuts = () => setIsOpen(true);
    
    window.addEventListener('show-shortcuts', handleShowShortcuts);
    return () => window.removeEventListener('show-shortcuts', handleShowShortcuts);
  }, []);

  const shortcutGroups = [
    {
      title: 'Navigation',
      shortcuts: KEYBOARD_SHORTCUTS.filter(s => 
        s.description.includes('Go to') || s.description.includes('search')
      )
    },
    {
      title: 'Actions',
      shortcuts: KEYBOARD_SHORTCUTS.filter(s => 
        s.description.includes('Create') || s.description.includes('Export')
      )
    },
    {
      title: 'General',
      shortcuts: KEYBOARD_SHORTCUTS.filter(s => 
        s.description.includes('help') || s.description.includes('shortcuts') || s.description.includes('Close')
      )
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and work more efficiently
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, index) => (
                  <Card key={index} className="p-3">
                    <CardContent className="p-0 flex items-center justify-between">
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <div key={keyIndex} className="flex items-center">
                            <Badge variant="outline" className="px-2 py-1 text-xs font-mono">
                              {key}
                            </Badge>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="mx-1 text-muted-foreground">+</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          Press <Badge variant="outline" className="mx-1">Esc</Badge> to close this dialog
        </div>
      </DialogContent>
    </Dialog>
  );
}








