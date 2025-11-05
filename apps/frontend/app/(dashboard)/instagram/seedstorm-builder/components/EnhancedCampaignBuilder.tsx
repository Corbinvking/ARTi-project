import React from 'react';
import { Creator, CampaignForm, CampaignResults } from '../lib/types';
import { useEnhancedCreatorData } from '../hooks/useEnhancedCreatorData';
import { generateEnhancedCampaign } from '../lib/enhancedCampaignAlgorithm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Brain, Database, TrendingUp, AlertCircle } from 'lucide-react';

interface EnhancedCampaignBuilderProps {
  formData: CampaignForm;
  creators: Creator[];
  onResults: (results: CampaignResults) => void;
}

export const EnhancedCampaignBuilder = ({ 
  formData, 
  creators, 
  onResults 
}: EnhancedCampaignBuilderProps) => {
  const { enhancedData, loading } = useEnhancedCreatorData(creators);

  React.useEffect(() => {
    if (!loading && Object.keys(enhancedData).length > 0) {
      console.log('🚀 Running Enhanced Campaign Algorithm...');
      
      // Generate campaign using enhanced algorithm
      const results = generateEnhancedCampaign(formData, creators, enhancedData);
      
      // Add ML enhancement indicators to the results
      const enhancedResults = {
        ...results,
        selectedCreators: results.selectedCreators.map(creator => ({
          ...creator,
          mlEnhanced: !!enhancedData[creator.id]?.mlFeatures,
          reliabilityScore: enhancedData[creator.id]?.reliability_score || 0.5,
          hasPerformanceHistory: (enhancedData[creator.id]?.performanceHistory?.length || 0) > 0
        })),
        enhancementStats: {
          totalCreators: creators.length,
          creatorsWithMLData: Object.values(enhancedData).filter(d => d.mlFeatures).length,
          creatorsWithPerformanceHistory: Object.values(enhancedData).filter(d => 
            d.performanceHistory.length > 0
          ).length,
          averageReliabilityScore: Object.values(enhancedData).reduce((sum, d) => 
            sum + d.reliability_score, 0) / Object.values(enhancedData).length
        }
      };
      
      onResults(enhancedResults);
    }
  }, [loading, enhancedData, formData, creators, onResults]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="font-semibold mb-2">Loading Enhanced Campaign Data</h3>
              <p className="text-sm text-muted-foreground">
                Fetching ML features and performance history from database...
              </p>
            </div>
            <div className="w-full max-w-md space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-500" />
                <span>Loading creator ML features</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span>Loading performance history</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" />
                <span>Calculating reliability scores</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show enhancement status
  const mlDataCount = Object.values(enhancedData).filter(d => d.mlFeatures).length;
  const performanceDataCount = Object.values(enhancedData).filter(d => d.performanceHistory.length > 0).length;
  const avgReliability = Object.values(enhancedData).reduce((sum, d) => sum + d.reliability_score, 0) / Object.values(enhancedData).length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Enhanced Algorithm Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{mlDataCount}</div>
            <div className="text-sm text-muted-foreground">Creators with ML Data</div>
            <Badge variant={mlDataCount > creators.length * 0.5 ? 'default' : 'secondary'} className="mt-1">
              {((mlDataCount / creators.length) * 100).toFixed(0)}% Coverage
            </Badge>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{performanceDataCount}</div>
            <div className="text-sm text-muted-foreground">Performance History</div>
            <Badge variant={performanceDataCount > creators.length * 0.3 ? 'default' : 'secondary'} className="mt-1">
              {((performanceDataCount / creators.length) * 100).toFixed(0)}% Coverage
            </Badge>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{(avgReliability * 100).toFixed(0)}%</div>
            <div className="text-sm text-muted-foreground">Avg Reliability Score</div>
            <Badge variant={avgReliability > 0.7 ? 'default' : avgReliability > 0.5 ? 'secondary' : 'destructive'} className="mt-1">
              {avgReliability > 0.7 ? 'High' : avgReliability > 0.5 ? 'Medium' : 'Low'}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>Enhanced Algorithm Active:</strong> This campaign is using ML-powered creator selection 
            with performance history, genre affinity scores, and predictive analytics for optimal results.
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground text-center">
          Campaign generation in progress with enhanced scoring...
        </div>
      </CardContent>
    </Card>
  );
};