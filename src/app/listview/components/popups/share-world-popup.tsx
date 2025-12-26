import React from 'react';
import { useLocalization } from '@/hooks/use-localization';
import { info, error } from '@tauri-apps/plugin-log';
import { Copy, Twitter } from 'lucide-react';
import { open as openUrl } from '@tauri-apps/plugin-shell';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../../components/ui/dialog';

interface ShareWorldPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worldId: string;
  worldName: string;
}

export function ShareWorldPopup({
  open,
  onOpenChange,
  worldId,
  worldName,
}: ShareWorldPopupProps) {
  const { t } = useLocalization();

  const worldUrl = `https://vrchat.com/home/world/${worldId}`;

  const shareText = t('share-world:share-text', worldName, worldUrl);

  const tweetText = t('share-world:twitter-text', worldName, worldUrl);

  const tweetIntentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  // Handler to copy the world URL to clipboard
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(worldUrl);
      info('Copied world URL to clipboard');
      toast.success(t('share-world:toast-url-copied', worldName));
      onOpenChange(false);
    } catch (e) {
      error(`Clipboard copy failed: ${e}`);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      info('Copied share text to clipboard');
      toast.success(t('share-world:toast-share-text-copied', worldName));
      onOpenChange(false);
    } catch (e) {
      error(`Clipboard copy failed: ${e}`);
    }
  };
  const handleTweetShare = async () => {
    if (!tweetIntentUrl) return;
    try {
      await openUrl(tweetIntentUrl);
      toast.success(t('share-world:toast-twitter-opened', worldName));
      onOpenChange(false);
    } catch (e) {
      error(`Twitter share failed: ${e}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('share-world:title')}</DialogTitle>
          <DialogDescription>
            {t('share-world:description', worldName)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* World URL */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t('share-world:world-url')}
            </Label>
            <div className="flex items-center gap-2">
              <Input className="flex-1" value={worldUrl} readOnly />
              <Button onClick={handleCopyUrl} size="sm" variant="outline">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Social Sharing Options */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t('share-world:share-options')}
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleCopyText}
                >
                  <Copy className="h-4 w-4" />
                  {t('share-world:copy-share-text')}
                </Button>
              </div>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleTweetShare}
              >
                <Twitter className="h-4 w-4" />
                {t('share-world:share-twitter')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
