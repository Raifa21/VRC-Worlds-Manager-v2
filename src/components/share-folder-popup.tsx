import React, { useEffect, useState } from 'react';
import { useLocalization } from '@/hooks/use-localization';
import { commands } from '@/lib/bindings';
import { info, error } from '@tauri-apps/plugin-log';
import { FolderOpen, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from './ui/alert-dialog';

interface ShareFolderPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderName: string;
}

export function ShareFolderPopup({
  open,
  onOpenChange,
  folderName,
}: ShareFolderPopupProps) {
  const { t } = useLocalization();
  const [infoLoading, setInfoLoading] = useState(false);
  const [folderInfo, setFolderInfo] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrorMessage(null);
    setFolderInfo(null);
    setInfoLoading(true);
    const fetchFolderInfo = async () => {
      const result = await commands.getWorlds(folderName);
      if (result.status === 'ok') {
        info(`Fetched folder info for "${folderName}"`);
        setFolderInfo(result.data.length);
      } else {
        setErrorMessage(t(`share-folder:error-message ${result.error}`));
      }
      setInfoLoading(false);
    };
    fetchFolderInfo();
  }, [open, folderName]);

  const handleShare = async () => {
    setErrorMessage(null);
    setShareLoading(true);
    const id = await commands.shareFolder(folderName);
    if (id.status === 'ok') {
      info(`Shared folder "${folderName}" as ${id}`);
      setShareId(id.data);
    } else {
      setErrorMessage(t(`share-folder:error-message ${id.error}`));
    }
    setShareLoading(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('share-folder:title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('share-folder:description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Folder Info */}
          {infoLoading && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{t('share-folder:loading-info')}</span>
            </div>
          )}

          {errorMessage && !folderInfo && (
            <div className="flex items-start bg-destructive/10 text-destructive rounded p-3">
              <AlertTriangle className="h-5 w-5 mr-2 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {folderInfo && (
            <div className="flex flex-col gap-2 bg-muted rounded p-3">
              <div className="flex flex-row items-center gap-2">
                <Label className="text-sm font-medium">
                  {t('share-folder:folder-name')}:
                </Label>
                <Label className="text-sm">{folderName}</Label>
              </div>
              <div className="flex flex-row items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                <Label className="text-sm font-medium">
                  {t('share-folder:worlds-count')}:
                </Label>
                <Label className="text-sm">{folderInfo}</Label>
              </div>
            </div>
          )}

          {/* Share Success */}
          {shareId && (
            <div className="flex items-start bg-green-50 text-green-800 rounded p-3">
              <CheckCircle2 className="h-5 w-5 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">{t('share-folder:success-title')}</p>
                <p className="text-sm">
                  {t('share-folder:success-message', { id: shareId })}
                </p>
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={shareLoading || infoLoading}>
            {t('general:cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-primary gap-2"
            onClick={handleShare}
            disabled={
              shareLoading || infoLoading || !folderInfo || shareId !== null
            }
          >
            {shareLoading
              ? t('general:sharing') + '...'
              : t('share-folder:share-button')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
