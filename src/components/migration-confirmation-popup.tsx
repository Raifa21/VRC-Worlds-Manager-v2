import { useState } from 'react';
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
  const [keepExisting, setKeepExisting] = useState<[boolean, boolean]>([
    true,
    true,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Existing Data Detected</DialogTitle>
          <DialogDescription>
            Toggle which existing data you want to keep:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {hasExistingData[0] && (
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="worlds" className="flex flex-col space-y-1">
                <span>Worlds Data</span>
                <span className="font-normal text-sm text-muted-foreground">
                  {keepExisting[0] ? 'Keep existing data' : 'Import new data'}
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
                <span>Folders Data</span>
                <span className="font-normal text-sm text-muted-foreground">
                  {keepExisting[1] ? 'Keep existing data' : 'Import new data'}
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
            Cancel
          </Button>
          <Button onClick={() => onConfirm(keepExisting)} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Migrating...
              </>
            ) : (
              'Confirm'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
