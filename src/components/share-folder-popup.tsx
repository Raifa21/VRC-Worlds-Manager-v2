import React, { useEffect, useState } from 'react';
import { useLocalization } from '@/hooks/use-localization';
import { commands } from '@/lib/bindings';
import { info, error } from '@tauri-apps/plugin-log';
import {
  FolderOpen,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

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
    if (!open) {
      // Reset state when dialog closes
      setShareId(null);
      setErrorMessage(null);
      setShareLoading(false);
      return;
    }

    // 1) Fetch folder info
    setErrorMessage(null);
    setFolderInfo(null);
    setInfoLoading(true);
    const fetchFolderInfo = async () => {
      const result = await commands.getWorlds(folderName);
      if (result.status === 'ok') {
        setFolderInfo(result.data.length);
      } else {
        setErrorMessage(t('share-folder:error-message', result.error));
      }
      setInfoLoading(false);
    };
    fetchFolderInfo();

    // 2) Fetch or create share ID immediately on open
    setShareLoading(true);
    commands
      .updateFolderShare(folderName)
      .then((res) => {
        if (res.status === 'ok') {
          setShareId(res.data);
        } else {
          setErrorMessage(t('share-folder:error-message', res.error));
        }
      })
      .finally(() => setShareLoading(false));
  }, [open, folderName]);

  const handleShare = async () => {
    setErrorMessage(null);
    setShareLoading(true);
    const id = await commands.shareFolder(folderName);
    if (id.status === 'ok') {
      info(`Shared folder "${folderName}" as ${id}`);
      setShareId(id.data);
    } else {
      setErrorMessage(t('share-folder:error-message', id.error));
    }
    setShareLoading(false);
  };

  // Handler to copy the share ID to clipboard
  const handleCopy = async () => {
    if (shareId) {
      try {
        await navigator.clipboard.writeText(shareId);
        info('Copied share ID to clipboard');
      } catch (e) {
        error(`Clipboard copy failed: ${e}`);
      }
    }
  };
  const shareLink = shareId
    ? `https://www.raifaworks.com/vrc-worlds-manager/folder/${shareId}`
    : '';
  const tweetText = shareId
    ? t('share-folder:twitter-text', folderName, shareLink)
    : '';
  const tweetIntentUrl = shareId
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {!shareId ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('share-folder:title')}</DialogTitle>
              <DialogDescription>
                {t('share-folder:description')}
              </DialogDescription>
            </DialogHeader>

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
                      {t('share-folder:folder-name')}
                    </Label>
                    <Label className="text-sm">{folderName}</Label>
                  </div>
                  <div className="flex flex-row items-center gap-2">
                    <FolderOpen className="h-5 w-5" />
                    <Label className="text-sm font-medium">
                      {t('share-folder:worlds-count')}
                    </Label>
                    <Label className="text-sm">{folderInfo}</Label>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={shareLoading || infoLoading}
              >
                {t('general:cancel')}
              </Button>
              <Button
                className="bg-primary gap-2"
                onClick={handleShare}
                disabled={
                  shareLoading || infoLoading || !folderInfo || shareId !== null
                }
              >
                {shareLoading
                  ? t('share-folder:sharing')
                  : t('share-folder:share-button')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="relative">
              <DialogTitle>{t('share-folder:success-title')}</DialogTitle>
              <DialogDescription>
                {t('share-folder:success-message')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">
                  {t('share-folder:UUID')}
                </Label>
                <Input className="flex-1" value={shareId} readOnly />
                <Button onClick={handleCopy}>
                  {t('share-folder:copy-button')}
                </Button>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <a
                  href={tweetIntentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('share-folder:share-twitter')}
                </a>
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
