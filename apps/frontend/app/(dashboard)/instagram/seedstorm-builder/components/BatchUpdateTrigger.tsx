import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";

interface UpdateResult {
  success: boolean;
  message: string;
  totalAnalyzed?: number;
  updated?: number;
  errors?: number;
  updates?: { id: string; newType: string }[];
}

const BatchUpdateTrigger = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastResult, setLastResult] = useState<UpdateResult | null>(null);

  const triggerBatchUpdate = async () => {
    setIsUpdating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('update-post-types');
      
      if (error) {
        console.error('Error invoking function:', error);
        toast.error('Failed to update post types');
        return;
      }

      setLastResult(data);
      
      if (data.success && data.updated > 0) {
        toast.success(`Successfully updated ${data.updated} post types!`);
      } else if (data.success && data.updated === 0) {
        toast.info('All post types are already correct!');
      } else {
        toast.error(data.message || 'Update failed');
      }
      
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to trigger batch update');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Post Type Batch Update
        </CardTitle>
        <CardDescription>
          Update existing posts with correct post types (reel, story, carousel)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={triggerBatchUpdate}
          disabled={isUpdating}
          className="w-full"
          variant="outline"
        >
          {isUpdating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Update Post Types
            </>
          )}
        </Button>
        
        {lastResult && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {lastResult.success ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              <span className="text-sm font-medium">
                {lastResult.success ? 'Success' : 'Error'}
              </span>
            </div>
            
            {lastResult.success && lastResult.totalAnalyzed !== undefined && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Badge variant="secondary">
                  Analyzed: {lastResult.totalAnalyzed}
                </Badge>
                <Badge variant="default">
                  Updated: {lastResult.updated || 0}
                </Badge>
                {lastResult.errors && lastResult.errors > 0 && (
                  <Badge variant="destructive" className="col-span-2">
                    Errors: {lastResult.errors}
                  </Badge>
                )}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              {lastResult.message}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BatchUpdateTrigger;