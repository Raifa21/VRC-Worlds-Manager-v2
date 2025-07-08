import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WorldDisplayData } from '@/lib/bindings';
import { WorldGrid } from '@/components/world-grid';
import { useLocalization } from '@/hooks/use-localization';

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
  const [selectedWorlds, setSelectedWorlds] = useState<string[]>([]);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // Clear selection when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedWorlds([]);
    }
  }, [open]);

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

        <div className="mt-4 max-h-[200px] overflow-y-auto" ref={containerRef}>
          <WorldGrid
            size="Compact"
            worlds={worlds}
            isSelectionMode={true}
            initialSelectedWorlds={selectedWorlds}
            containerRef={containerRef}
            folderName=""
            onOpenWorldDetails={() => {}}
            onSelectedWorldsChange={setSelectedWorlds}
            shouldClearSelection={!open}
          />
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('imported-folder:do-not-restore')}
          </Button>
          <Button
            onClick={() => {
              onConfirm(selectedWorlds);
              onOpenChange(false);
            }}
            disabled={selectedWorlds.length === 0}
          >
            {t('imported-folder:restore')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
