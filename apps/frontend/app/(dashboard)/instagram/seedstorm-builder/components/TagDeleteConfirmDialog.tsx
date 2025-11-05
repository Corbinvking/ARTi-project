import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TagDeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tagName: string;
  tagType: string;
}

export const TagDeleteConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  tagName, 
  tagType 
}: TagDeleteConfirmDialogProps) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Tag</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the {tagType.toLowerCase()} tag "{tagName}"? 
            This will remove it from the global tag list and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Tag
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};