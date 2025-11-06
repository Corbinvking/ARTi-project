import * as React from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCanonicalYouTubeUrl, getYouTubeEmbedUrl } from "../../lib/youtube";

interface YouTubePlayerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  youtubeUrl: string;
  title?: string;
}

export function YouTubePlayerDialog({
  isOpen,
  onClose,
  youtubeUrl,
  title = "YouTube Video"
}: YouTubePlayerDialogProps) {
  const embedUrl = getYouTubeEmbedUrl(youtubeUrl);
  const watchUrl = getCanonicalYouTubeUrl(youtubeUrl);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{title}</span>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="ml-2"
            >
              <a 
                href={watchUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open on YouTube
              </a>
            </Button>
          </DialogTitle>
          <DialogDescription>
            Video player with option to open in YouTube
          </DialogDescription>
        </DialogHeader>
        
        <div className="aspect-video w-full">
          <iframe
            src={embedUrl}
            className="w-full h-full rounded-lg"
            allowFullScreen
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}