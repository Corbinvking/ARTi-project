import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useRouter } from "next/navigation";
import { Activity, Target, Users, Zap, Database, BarChart3, Search, HelpCircle } from "lucide-react";

import { useState, useCallback, useMemo } from "react";
import { EnhancedDashboard } from "../components/EnhancedDashboard";
import { GlobalSearch } from "../components/GlobalSearch";
import { KeyboardShortcutsHelp } from "../components/KeyboardShortcutsHelp";
import { CampaignDetailsModal } from "../components/CampaignDetailsModal";
import { useGlobalShortcuts } from "../hooks/useKeyboardShortcuts";
import { useToast } from "../hooks/use-toast";
import { useInstagramCampaigns } from "../hooks/useInstagramCampaigns";
import { useInstagramCreators } from "../hooks/useInstagramCreators";

const HomePage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Fetch real Instagram campaigns from database
  const {
    campaigns,
    loading: campaignsLoading,
    totalCampaigns,
    activeCampaigns,
    completedCampaigns,
    totalBudget,
    totalSpend
  } = useInstagramCampaigns();

  // Fetch real creators from database
  const {
    creators,
    loading: creatorsLoading,
    totalCreators,
    totalReach,
    averageEngagement
  } = useInstagramCreators();

  // Calculate stats using useMemo to avoid infinite loops
  const stats = useMemo(() => {
    // Calculate algorithm accuracy based on campaign success rate
    const accuracy = totalCampaigns > 0 
      ? Math.round((completedCampaigns / totalCampaigns) * 100) 
      : 95;

    return { 
      totalCreators, 
      totalReach, 
      algorithmAccuracy: accuracy,
      totalCampaigns,
      activeCampaigns,
      totalBudget,
      totalSpend,
      averageEngagement
    };
  }, [totalCreators, totalReach, totalCampaigns, activeCampaigns, completedCampaigns, totalBudget, totalSpend, averageEngagement]);

  // Memoize keyboard shortcut callbacks
  const handleOpenSearch = useCallback(() => setIsSearchOpen(true), []);
  const handleOpenHelp = useCallback(() => setIsHelpOpen(true), []);

  // Global keyboard shortcuts
  useGlobalShortcuts(
    handleOpenSearch,
    undefined, // Add creator - will be handled by specific pages
    undefined, // Export - will be handled by specific pages
    handleOpenHelp
  );

  const handleCampaignClick = (campaign: any) => {
    setSelectedCampaign(campaign);
    setIsDetailsModalOpen(true);
  };

  const handleStatusUpdate = async (campaignId: string, newStatus: string) => {
    // TODO: Implement with React Query mutation to update campaign in Supabase
    toast({
      title: "Update Campaign",
      description: "Campaign status update will be implemented with React Query mutations",
    });
  };

  const featureCards = [
    {
      icon: <Zap className="h-8 w-8 text-primary" />,
      title: "Smart Algorithms",
      description: "AI-powered creator matching based on genre, territory, and performance data"
    },
    {
      icon: <Target className="h-8 w-8 text-accent" />,
      title: "Budget Optimization", 
      description: "Maximize reach within budget using cost-per-view analysis and efficiency scoring"
    },
    {
      icon: <Users className="h-8 w-8 text-success" />,
      title: "Creator Database",
      description: "Performance tracking and analytics for continuous algorithm improvement"
    },
    {
      icon: <Activity className="h-8 w-8 text-warning" />,
      title: "Campaign Analytics",
      description: "Track actual performance vs predictions to improve future recommendations"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-end mb-4 gap-2">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsHelpOpen(true)}
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
          <h1 className="text-6xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent mb-6 tracking-wider">
            INSTAGRAM SEEDING
          </h1>
          <h2 className="text-4xl font-bold text-foreground mb-4 tracking-wide">
            CAMPAIGN BUILDER
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-pink-500 mx-auto mb-6"></div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Internal operator dashboard for campaign management and creator analytics
          </p>
        </div>

        {/* Main Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
          <Button 
            variant="default" 
            size="lg"
            onClick={() => router.push('/instagram/campaign-builder')}
            className="flex items-center gap-3 text-xl"
          >
            <Target className="h-6 w-6" />
            BUILD CAMPAIGN
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => router.push('/instagram/creators')}
            className="flex items-center gap-3 text-xl"
          >
            <Database className="h-6 w-6" />
            BROWSE CREATORS
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => router.push('/instagram/campaigns')}
            className="flex items-center gap-3 text-xl"
          >
            <BarChart3 className="h-6 w-6" />
            VIEW CAMPAIGNS
          </Button>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {featureCards.map((feature, index) => (
            <Card key={index} className="hover:border-primary transition-all duration-300 hover:shadow-lg bg-card/50 backdrop-blur">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <CardTitle className="text-lg tracking-wide">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Data Status Indicator */}
        {(campaignsLoading || creatorsLoading) && (
          <Card className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <Database className="h-5 w-5 animate-pulse" />
                Loading Instagram Data...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Fetching {campaignsLoading ? "campaigns" : ""}
                {campaignsLoading && creatorsLoading ? " and " : ""}
                {creatorsLoading ? "creators" : ""} from database...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Data Summary Card */}
        {!campaignsLoading && !creatorsLoading && (totalCampaigns > 0 || totalCreators > 0) && (
          <Card className="mb-6 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="text-green-900 dark:text-green-100 flex items-center gap-2">
                <Database className="h-5 w-5" />
                Live Database Connection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-green-700 dark:text-green-300 font-semibold">Total Campaigns</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{totalCampaigns}</p>
                </div>
                <div>
                  <p className="text-green-700 dark:text-green-300 font-semibold">Active</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{activeCampaigns}</p>
                </div>
                <div>
                  <p className="text-green-700 dark:text-green-300 font-semibold">Total Budget</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    ${totalBudget.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-green-700 dark:text-green-300 font-semibold">Creators</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{totalCreators}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Dashboard */}
        <div className="mb-12">
          <EnhancedDashboard 
            creators={creators} 
            campaigns={campaigns} 
            onCampaignClick={handleCampaignClick}
          />
        </div>


        {/* Global Search Modal */}
        <GlobalSearch 
          isOpen={isSearchOpen} 
          onClose={() => setIsSearchOpen(false)} 
        />

        {/* Keyboard Shortcuts Help */}
        <KeyboardShortcutsHelp 
          isOpen={isHelpOpen} 
          onClose={() => setIsHelpOpen(false)} 
        />

        {/* Campaign Details Modal */}
        <CampaignDetailsModal
          campaign={selectedCampaign}
          isOpen={isDetailsModalOpen}
          onOpenChange={setIsDetailsModalOpen}
          onStatusUpdate={handleStatusUpdate}
        />
      </div>
    </div>
  );
};

export default HomePage;