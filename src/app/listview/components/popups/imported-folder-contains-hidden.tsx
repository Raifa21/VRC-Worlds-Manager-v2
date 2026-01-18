import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WorldDisplayData } from '@/lib/bindings';
import { WorldGrid } from '../world-grid';
import { useLocalization } from '@/hooks/use-localization';
import { useSelectedWorldsStore } from '../../hook/use-selected-worlds';
import { SpecialFolders } from '@/types/folders';

interface ImportedFolderContainsHiddenProps {
  open: boolean;
  worlds: WorldDisplayData[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (selectedWorldIds: string[]) => void;
}

export function ImportedFolderContainsHidden({
  open,
  worlds,
  onOpenChange,
  onConfirm,
}: ImportedFolderContainsHiddenProps) {
  const { t } = useLocalization();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  // Use a synthetic folder key to track selection within the dialog without colliding with real folders
  const dialogFolderKey = SpecialFolders.NotFolder;
  const { getSelectedWorlds, clearFolderSelections } = useSelectedWorldsStore();

  // Clear selection when dialog closes
  useEffect(() => {
    if (!open) {
      clearFolderSelections(dialogFolderKey);
    }
  }, [open, clearFolderSelections]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('imported-folder:hidden-title')}</DialogTitle>
        </DialogHeader>

        <p className="mt-2 text-sm text-muted-foreground">
          {t('imported-folder:hidden-description')}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          {t('imported-folder:select-restore')}
        </p>

        <div
          className="mt-4 max-h-[200px] overflow-y-auto no-webview-scroll-bar"
          ref={containerRef}
        >
          <WorldGrid
            worlds={worlds}
            containerRef={containerRef}
            currentFolder={dialogFolderKey}
            disableCardClick
            alwaysShowSelection
          />
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('imported-folder:do-not-restore')}
          </Button>
          <Button
            onClick={() => {
              const selected = Array.from(
                getSelectedWorlds(dialogFolderKey) ?? new Set<string>(),
              );
              onConfirm(selected);
              onOpenChange(false);
            }}
            disabled={getSelectedWorlds(dialogFolderKey).size === 0}
          >
            {t('imported-folder:restore')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
