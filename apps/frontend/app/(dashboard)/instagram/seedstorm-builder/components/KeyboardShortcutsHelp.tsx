import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Keyboard, Command } from "lucide-react";
import { KeyboardShortcut } from "../hooks/useKeyboardShortcuts";

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts?: KeyboardShortcut[];
}

export const KeyboardShortcutsHelp = ({ isOpen, onClose, shortcuts = [] }: KeyboardShortcutsHelpProps) => {
  const defaultShortcuts = [
    { key: 'Ctrl+K', description: 'Open global search' },
    { key: 'Ctrl+N', description: 'Add new creator' },
    { key: 'Ctrl+E', description: 'Export data' },
    { key: 'Ctrl+1', description: 'Go to homepage' },
    { key: 'Ctrl+2', description: 'Go to creators' },
    { key: 'Ctrl+3', description: 'Go to campaign builder' },
    { key: 'Ctrl+4', description: 'Go to campaigns' },
    { key: '?', description: 'Show this help' },
    { key: 'Escape', description: 'Close modals' },
    { key: 'Enter', description: 'Submit forms' },
    { key: 'Tab', description: 'Navigate form fields' }
  ];

  const formattedShortcuts = shortcuts.length > 0 
    ? shortcuts.map(s => ({
        key: `${s.ctrl ? 'Ctrl+' : ''}${s.alt ? 'Alt+' : ''}${s.shift ? 'Shift+' : ''}${s.key.toUpperCase()}`,
        description: s.description
      }))
    : defaultShortcuts;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Navigation
            </h4>
            {formattedShortcuts.filter(s => 
              s.description.includes('Go to') || s.description.includes('search') || s.description.includes('help')
            ).map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{shortcut.description}</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {shortcut.key}
                </Badge>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Actions
            </h4>
            {formattedShortcuts.filter(s => 
              !s.description.includes('Go to') && !s.description.includes('search') && !s.description.includes('help')
            ).map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{shortcut.description}</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {shortcut.key}
                </Badge>
              </div>
            ))}
          </div>

          <Separator />

          <div className="text-xs text-muted-foreground text-center">
            <p className="flex items-center justify-center gap-1">
              <Command className="h-3 w-3" />
              Use <kbd className="px-1 py-0.5 text-xs font-semibold text-foreground bg-muted border border-border rounded">Ctrl</kbd> or <kbd className="px-1 py-0.5 text-xs font-semibold text-foreground bg-muted border border-border rounded">Cmd</kbd> on Mac
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};