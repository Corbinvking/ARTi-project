import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "../hooks/use-toast";
import { parsePostsCsv, downloadCsvTemplate, CsvImportResult } from "../lib/postCsvUtils";
import { supabase } from '../integrations/supabase/client';

interface BulkPostImportProps {
  campaignId: string;
  onImportComplete: () => void;
}

const BulkPostImport = ({ campaignId, onImportComplete }: BulkPostImportProps) => {
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const result = await parsePostsCsv(file);
      setImportResult(result);
      
      toast({
        title: "CSV Parsed Successfully",
        description: `Found ${result.data.length} valid posts${result.errors.length > 0 ? ` with ${result.errors.length} errors` : ''}`,
      });
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast({
        title: "Parse Error",
        description: error instanceof Error ? error.message : "Failed to parse CSV file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: false
  });

  const handleImport = async () => {
    if (!importResult?.data.length) return;

    setIsImporting(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const postData of importResult.data) {
        try {
          // Insert campaign post
          const { data: postDbData, error: postError } = await supabase
            .from('campaign_posts')
            .insert([{
              campaign_id: campaignId,
              instagram_handle: postData.instagram_handle,
              post_url: postData.post_url,
              post_type: postData.post_type,
              content_description: postData.content_description || null,
              posted_at: postData.posted_at || new Date().toISOString(),
              status: 'live'
            }])
            .select()
            .single();

          if (postError) throw postError;

          // Insert analytics if provided
          if (postData.views || postData.likes || postData.comments) {
            const { error: analyticsError } = await supabase
              .from('post_analytics')
              .insert([{
                post_id: postDbData.id,
                views: postData.views || 0,
                likes: postData.likes || 0,
                comments: postData.comments || 0,
                shares: postData.shares || 0,
                engagement_rate: postData.engagement_rate || 0
              }]);

            if (analyticsError) {
              console.warn('Failed to insert analytics for post:', analyticsError);
            }
          }

          successCount++;
        } catch (error) {
          console.error('Error importing post:', error);
          errorCount++;
        }
      }

      toast({
        title: "Import Complete",
        description: `Successfully imported ${successCount} posts${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      });

      if (successCount > 0) {
        onImportComplete();
        setImportResult(null);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import posts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import Posts
          </CardTitle>
          <CardDescription>
            Import multiple Instagram posts from a CSV file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Need a template? Download our CSV template to get started.
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={downloadCsvTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
          >
            <input {...getInputProps()} />
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p>Drop your CSV file here...</p>
            ) : (
              <div>
                <p className="font-medium mb-2">Drag & drop your CSV file here</p>
                <p className="text-sm text-muted-foreground mb-4">or click to select a file</p>
                <Button variant="secondary" disabled={isUploading}>
                  {isUploading ? "Processing..." : "Choose File"}
                </Button>
              </div>
            )}
          </div>

          {importResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Import Preview</h4>
                <div className="flex gap-2">
                  <Badge variant="default" className="bg-success">
                    {importResult.data.length} Valid
                  </Badge>
                  {importResult.errors.length > 0 && (
                    <Badge variant="destructive">
                      {importResult.errors.length} Errors
                    </Badge>
                  )}
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">
                      {importResult.errors.length} rows have errors:
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {importResult.errors.slice(0, 5).map((error, idx) => (
                        <div key={idx} className="text-xs">
                          Row {error.row}: {error.error}
                        </div>
                      ))}
                      {importResult.errors.length > 5 && (
                        <div className="text-xs opacity-75">
                          ...and {importResult.errors.length - 5} more errors
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {importResult.data.length > 0 && (
                <div>
                  <h5 className="font-medium mb-2">Sample of valid posts:</h5>
                  <div className="bg-muted rounded-lg p-3 max-h-32 overflow-y-auto">
                    {importResult.data.slice(0, 3).map((post, idx) => (
                      <div key={idx} className="text-sm py-1">
                        {post.instagram_handle} - {post.post_type} - {post.views || 0} views
                      </div>
                    ))}
                    {importResult.data.length > 3 && (
                      <div className="text-xs opacity-75">
                        ...and {importResult.data.length - 3} more posts
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setImportResult(null)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={isImporting || importResult.data.length === 0}
                >
                  {isImporting ? "Importing..." : `Import ${importResult.data.length} Posts`}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkPostImport;