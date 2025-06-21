import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WorldDisplayData } from '@/lib/bindings';
import { useLocalization } from '@/hooks/use-localization';

interface ImportedFolderContainsHiddenProps {
  open: boolean;
  worlds: WorldDisplayData[];
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ImportedFolderContainsHidden({
  open,
  worlds,
  onOpenChange,
  onConfirm,
}: ImportedFolderContainsHiddenProps) {
  const { t } = useLocalization();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t(
              'imported-folder:hidden-title',
              'The imported folder contains hidden worlds',
            )}
          </DialogTitle>
        </DialogHeader>

        <p className="mt-2 text-sm text-muted-foreground">
          {t(
            'imported-folder:hidden-description',
            'These worlds are marked hidden in your library:',
          )}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
          {worlds.map((w) => (
            <div
              key={w.worldId}
              className="flex flex-col items-center space-y-1"
            >
              <img
                src={w.thumbnailUrl}
                alt={w.name}
                className="w-full h-24 object-cover rounded-md border"
              />
              <p className="text-sm font-medium text-center">{w.name}</p>
            </div>
          ))}
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('general:cancel', 'Cancel')}
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {t('imported-folder:continue', 'Continue')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
