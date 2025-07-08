import { useLocalization } from '@/hooks/use-localization';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';

interface MigrationConfirmationPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function MigrationConfirmationPopup({
  open,
  onOpenChange,
  onCancel,
  onConfirm,
}: MigrationConfirmationPopupProps) {
  const { t } = useLocalization();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{t('setup-page:migration-exists-title')}</DialogTitle>
        <DialogDescription>
          {t('setup-page:migration-exists-description')}
        </DialogDescription>
        <DialogFooter>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={onCancel}>
              {t('setup-page:migration-exists-cancel')}
            </Button>
            <Button onClick={onConfirm}>
              {t('setup-page:migration-exists-continue')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
