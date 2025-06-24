import React, { useEffect, useState } from 'react';
import { useLocalization } from '@/hooks/use-localization';
import { commands } from '@/lib/bindings';
import { info, error } from '@tauri-apps/plugin-log';
import { open as openUrl } from '@tauri-apps/plugin-shell';
import {
  FolderOpen,
  Loader2,
  AlertTriangle,
  Copy,
  Eye,
  Twitter,
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
      setInfoLoading(false); // Add this
      return;
    }

    // 1) Fetch folder info FIRST
    setErrorMessage(null);
    setFolderInfo(null);
    setInfoLoading(true);

    const fetchFolderInfo = async () => {
      info(`Fetching folder info for: ${folderName}`);
      try {
        const result = await commands.getWorlds(folderName);
        info(`getWorlds result: ${JSON.stringify(result)}`);

        if (result.status === 'ok') {
          setFolderInfo(result.data.length);

          // 2) ONLY THEN fetch/create share ID
          setShareLoading(true);
          try {
            const shareRes = await commands.updateFolderShare(folderName);
            if (shareRes.status === 'ok') {
              setShareId(shareRes.data);
            } else {
              setErrorMessage(t('share-folder:error-message', shareRes.error));
            }
          } catch (e) {
            setErrorMessage('Failed to create share');
          }
          setShareLoading(false);
        } else {
          error(`getWorlds error: ${result.error}`);
          setErrorMessage(t('share-folder:error-message', result.error));
        }
      } catch (e) {
        error(`Failed to fetch folder info: ${e}`);
        setErrorMessage('Failed to fetch folder info');
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
      info(`Shared folder "${folderName}" as ${id.data}`);
      setShareId(id.data);
    } else {
      setErrorMessage(t('share-folder:error-message', id.error));
    }
    setShareLoading(false);
  };

  // Handler to copy the share ID to clipboard
  const handleCopyId = async () => {
    if (shareId) {
      try {
        await navigator.clipboard.writeText(shareId);
        info('Copied share ID to clipboard');
      } catch (e) {
        error(`Clipboard copy failed: ${e}`);
      }
    }
  };

  // Handler to copy the share link to clipboard
  const handleCopyLink = async () => {
    if (shareLink) {
      try {
        await navigator.clipboard.writeText(shareLink);
        info('Copied share link to clipboard');
      } catch (e) {
        error(`Clipboard copy failed: ${e}`);
      }
    }
  };

  // Handler to preview folder in browser
  const handlePreviewFolder = async () => {
    if (shareLink) {
      try {
        await openUrl(shareLink);
        info('Opened folder preview in browser');
      } catch (e) {
        error(`Failed to open browser: ${e}`);
      }
    }
  };

  const shareLink = shareId
    ? `https://vrcwm.raifaworks.com/folder/${shareId}`
    : '';

  const shareText = shareId
    ? t('share-folder:share-text', folderName, shareLink)
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
              {/* Share ID */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('share-folder:UUID')}
                </Label>
                <div className="flex items-center gap-2">
                  <Input className="flex-1" value={shareId} readOnly />
                  <Button onClick={handleCopyId} size="sm" variant="outline">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Share Link */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('share-folder:share-link')}
                </Label>
                <div className="flex items-center gap-2">
                  <Input className="flex-1" value={shareLink} readOnly />
                  <Button onClick={handleCopyLink} size="sm" variant="outline">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handlePreviewFolder}
                    size="sm"
                    variant="outline"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Social Sharing Options */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('share-folder:share-options')}
                </Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={handleCopyLink}
                  >
                    <Copy className="h-4 w-4" />
                    {t('share-folder:copy-link')}
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2" asChild>
                    <a
                      href={tweetIntentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Twitter className="h-4 w-4" />
                      {t('share-folder:share-twitter')}
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
