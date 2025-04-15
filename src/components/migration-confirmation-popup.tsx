import { useState } from 'react';
import { useLocalization } from '@/hooks/use-localization';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MigrationConfirmationPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (keepExisting: [boolean, boolean]) => Promise<void>;
  hasExistingData: [boolean, boolean];
  isLoading?: boolean;
}

export function MigrationConfirmationPopup({
  open,
  onOpenChange,
  onConfirm,
  hasExistingData,
  isLoading = false,
}: MigrationConfirmationPopupProps) {
  const { t } = useLocalization();
  const [keepExisting, setKeepExisting] = useState<[boolean, boolean]>([
    true,
    true,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('migration-confirmation-popup:title')}</DialogTitle>
          <DialogDescription>
            {t('migration-confirmation-popup:description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {hasExistingData[0] && (
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="worlds" className="flex flex-col space-y-1">
                <span>{t('migration-confirmation-popup:worlds-data')}</span>
                <span className="font-normal text-sm text-muted-foreground">
                  {keepExisting[0]
                    ? t('migration-confirmation-popup:keep-existing')
                    : t('migration-confirmation-popup:import-new')}
                </span>
              </Label>
              <Switch
                id="worlds"
                checked={keepExisting[0]}
                onCheckedChange={(checked) =>
                  setKeepExisting([checked, keepExisting[1]])
                }
                defaultChecked
              />
            </div>
          )}
          {hasExistingData[1] && (
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="folders" className="flex flex-col space-y-1">
                <span>{t('migration-confirmation-popup:folders-data')}</span>
                <span className="font-normal text-sm text-muted-foreground">
                  {keepExisting[1]
                    ? t('migration-confirmation-popup:keep-existing')
                    : t('migration-confirmation-popup:import-new')}
                </span>
              </Label>
              <Switch
                id="folders"
                checked={keepExisting[1]}
                onCheckedChange={(checked) =>
                  setKeepExisting([keepExisting[0], checked])
                }
                defaultChecked
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {t('migration-confirmation-popup:cancel')}
          </Button>
          <Button onClick={() => onConfirm(keepExisting)} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('migration-confirmation-popup:migrating')}
              </>
            ) : (
              t('migration-confirmation-popup:confirm')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
