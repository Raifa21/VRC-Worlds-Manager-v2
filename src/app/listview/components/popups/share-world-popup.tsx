import React, { useState } from 'react';
import { useLocalization } from '@/hooks/use-localization';
import { info, error } from '@tauri-apps/plugin-log';
import { Copy, Twitter } from 'lucide-react';
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
  const [showCopied, setShowCopied] = useState<string | null>(null);

  const worldUrl = `https://vrchat.com/home/world/${worldId}`;

  const shareText = t('share-world:share-text', worldName, worldUrl);

  const tweetText = t('share-world:twitter-text', worldName, worldUrl);

  const tweetIntentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  // Handler to copy the world URL to clipboard
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(worldUrl);
      info('Copied world URL to clipboard');
      setShowCopied('url');
      setTimeout(() => setShowCopied(null), 2000);
    } catch (e) {
      error(`Clipboard copy failed: ${e}`);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      info('Copied share text to clipboard');
      setShowCopied('text');
      setTimeout(() => setShowCopied(null), 2000);
    } catch (e) {
      error(`Clipboard copy failed: ${e}`);
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
              <div className="relative">
                <Button onClick={handleCopyUrl} size="sm" variant="outline">
                  <Copy className="h-4 w-4" />
                </Button>
                {showCopied === 'url' && (
                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 z-10">
                    <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
                      {t('general:copied')}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                )}
              </div>
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
                {showCopied === 'text' && (
                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 z-10">
                    <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
                      {t('general:copied')}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                )}
              </div>
              <Button variant="outline" className="flex-1 gap-2" asChild>
                <a
                  href={tweetIntentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Twitter className="h-4 w-4" />
                  {t('share-world:share-twitter')}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
