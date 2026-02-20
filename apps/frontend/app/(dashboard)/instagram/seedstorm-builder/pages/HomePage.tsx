import { Button } from "../components/ui/button";
import { Search, HelpCircle } from "lucide-react";
import { useState, useCallback } from "react";
import { InstagramDashboardTab } from "../components/InstagramDashboardTab";
import { GlobalSearch } from "../components/GlobalSearch";
import { KeyboardShortcutsHelp } from "../components/KeyboardShortcutsHelp";
import { useGlobalShortcuts } from "../hooks/useKeyboardShortcuts";

const HomePage = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const handleOpenSearch = useCallback(() => setIsSearchOpen(true), []);
  const handleOpenHelp = useCallback(() => setIsHelpOpen(true), []);

  useGlobalShortcuts(
    handleOpenSearch,
    undefined,
    undefined,
    handleOpenHelp
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Compact header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent tracking-wide">
              INSTAGRAM SEEDING CAMPAIGN BUILDER
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Internal operator dashboard for campaign management
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Search
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-muted border border-border rounded">
                Ctrl+K
              </kbd>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsHelpOpen(true)}>
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <InstagramDashboardTab />

        <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        <KeyboardShortcutsHelp isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      </div>
    </div>
  );
};

export default HomePage;
