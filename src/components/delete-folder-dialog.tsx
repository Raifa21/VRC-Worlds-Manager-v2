import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useFolders } from '@/hooks/use-folders';
import { useLocalization } from '@/hooks/use-localization';

interface DeleteFolderDialogProps {
  folderName: string | null;
  onOpenChange: (open: boolean) => void;
}

export function DeleteFolderDialog({
  folderName,
  onOpenChange,
}: DeleteFolderDialogProps) {
  const { t } = useLocalization();
  const { deleteFolder } = useFolders();
  return (
    <AlertDialog open={!!folderName} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('delete-folder:title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {folderName && t('delete-folder:description', folderName)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            {t('general:cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => folderName && deleteFolder(folderName)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('general:delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
