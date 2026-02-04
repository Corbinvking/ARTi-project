import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, File, X, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CommentsCSVUploadProps {
  campaignId: string;
  currentFilePath?: string | null;
  onUploadComplete: (filePath: string) => void;
  onClear?: () => void;
}

export const CommentsCSVUpload = ({
  campaignId,
  currentFilePath,
  onUploadComplete,
  onClear,
}: CommentsCSVUploadProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const timestamp = Date.now();
      const fileName = `${campaignId}_comments_${timestamp}.csv`;
      const filePath = `youtube-comments/${campaignId}/${fileName}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('campaign-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Upload Successful",
        description: "Comments CSV has been uploaded successfully.",
      });

      onUploadComplete(filePath);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload the file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleClear = async () => {
    if (currentFilePath && onClear) {
      try {
        // Optionally delete from storage
        await supabase.storage
          .from('campaign-files')
          .remove([currentFilePath]);
      } catch (error) {
        console.warn('Failed to delete file from storage:', error);
      }
      onClear();
    }
  };

  const getFileName = (path: string) => {
    return path.split('/').pop() || path;
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        Comments CSV File
        {currentFilePath ? (
          <Badge variant="outline" className="text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            Uploaded
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">Optional</Badge>
        )}
      </Label>

      {currentFilePath ? (
        <Card className="bg-muted/50">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <File className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium truncate max-w-[200px]">
                {getFileName(currentFilePath)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                Replace
              </Button>
              {onClear && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-colors duration-200
            ${dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'}
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {uploading ? 'Uploading...' : 'Drag & drop a CSV file or click to browse'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Max file size: 10MB
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleInputChange}
        disabled={uploading}
      />

      <p className="text-xs text-muted-foreground">
        Alternative to Google Sheets URL. Upload scraped comments directly.
      </p>
    </div>
  );
};
