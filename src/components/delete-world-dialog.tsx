import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLocalization } from '@/hooks/use-localization';

interface DeleteWorldDialogProps {
  worldName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteWorldDialog({
  worldName,
  isOpen,
  onOpenChange,
  onConfirm,
}: DeleteWorldDialogProps) {
  const { t } = useLocalization();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('listview-page:delete-world-title')}</DialogTitle>
          <DialogDescription>
            {t('listview-page:delete-world-description')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('general:cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t('general:delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
