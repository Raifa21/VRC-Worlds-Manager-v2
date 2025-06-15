import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { commands, WorldDetails } from '@/lib/bindings';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Badge } from './ui/badge';
import { WorldCardPreview } from './world-card';
import { CardSize } from '@/types/preferences';
import { useLocalization } from '@/hooks/use-localization';
import { info, error as logError } from '@tauri-apps/plugin-log';

interface AddWorldPopupProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (worldId: string) => void;
  existingWorlds?: string[];
}

export function AddWorldPopup({
  open,
  onClose,
  onConfirm,
  existingWorlds = [],
}: AddWorldPopupProps) {
  const { t } = useLocalization();
  const [worldInput, setWorldInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [previewWorld, setPreviewWorld] = useState<WorldDetails | null>(null);
  const [isDuplicate, setIsDuplicate] = useState<boolean>(false);

  // Parse input to extract world ID
  const parseWorldId = (input: string): string | null => {
    // Remove trailing slashes and whitespace
    const cleaned = input.trim();

    // Extract world ID from URL or direct input
    const worldIdMatch = cleaned.match(
      /wrld_[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}/,
    );

    if (worldIdMatch) {
      return worldIdMatch[0];
    }

    // If there's a slash, try extracting from a URL pattern
    if (cleaned.includes('/')) {
      // Handle URLs like vrchat.com/home/world/wrld_1234...
      const parts = cleaned.split('/');
      for (const part of parts) {
        if (part.startsWith('wrld_')) {
          // Further clean up any query parameters
          return part.split('?')[0];
        }
      }
    }

    // Check if it's just a simple wrld_ ID
    if (cleaned.startsWith('wrld_')) {
      return cleaned;
    }

    return null;
  };

  const handleCheckWorldId = async (input: string) => {
    setIsLoading(true);
    setError(null);
    setPreviewWorld(null);
    setIsDuplicate(false);

    const parsedWorldId = parseWorldId(input);
    info(`Checking world ID: ${parsedWorldId}`);

    if (!parsedWorldId) {
      setError(
        'Invalid world ID format. Please enter a valid VRChat world ID (wrld_...)',
      );
      logError('Invalid world ID format');
      setIsLoading(false);
      return;
    }

    // Check if the world is already in the collection
    if (existingWorlds.includes(parsedWorldId)) {
      setIsDuplicate(true);
    }

    try {
      // Invoke the Tauri command to fetch world details
      const worldDetails = await commands.checkWorldInfo(parsedWorldId);
      if (!worldDetails) {
        setError('World not found. Please check the ID or URL.');
        setIsLoading(false);
        return;
      }

      if (worldDetails.status === 'ok') {
        setPreviewWorld(worldDetails.data);
      } else {
        setError(worldDetails.error);
      }
    } catch (err) {
      setError(`Failed to fetch world details: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    // If we have a preview world, use its ID
    if (previewWorld) {
      onConfirm(previewWorld.worldId);
      setWorldInput('');
      setPreviewWorld(null);
      onClose();
      return;
    }
  };

  const handleCancel = () => {
    setWorldInput('');
    setError(null);
    setPreviewWorld(null);
    setIsDuplicate(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('add-world-dialog:add')}</DialogTitle>
          <DialogDescription>
            {t('add-world-dialog:description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Input
              id="world-id"
              value={worldInput}
              onChange={(e) => setWorldInput(e.target.value)}
              placeholder={t('add-world-dialog:placeholder')}
              className="col-span-3"
              autoFocus
            />
            <Button
              variant="outline"
              className="col-span-1"
              onClick={() => handleCheckWorldId(worldInput)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('add-world-dialog:check')
              )}
            </Button>
          </div>

          {/* Error message */}
          {error && (
            <Alert variant="destructive" className="col-span-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* World preview card */}
          {previewWorld && (
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>{t('add-world-dialog:preview')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between">
                  <WorldCardPreview
                    size={CardSize.Compact}
                    world={{
                      worldId: previewWorld.worldId,
                      name: previewWorld.name,
                      thumbnailUrl: previewWorld.thumbnailUrl,
                      authorName: previewWorld.authorName,
                      favorites: previewWorld.favorites,
                      lastUpdated: previewWorld.lastUpdated,
                      visits: previewWorld.visits,
                      dateAdded: '',
                      platform:
                        previewWorld.platform as unknown as import('@/types/worlds').Platform,
                      folders: [],
                      tags: previewWorld.tags || [],
                    }}
                  />
                  <div className="flex flex-col gap-4">
                    <div>
                      <div className="text-sm font-semibold mb-2">
                        {t('world-detail:details')}
                      </div>
                      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                        <div className="text-gray-500">
                          {' '}
                          {t('add-world-dialog:author')}{' '}
                        </div>
                        <div className="truncate w-[100px]">
                          {previewWorld.authorName}
                        </div>

                        <div className="text-gray-500">
                          {t('world-detail:visits')}
                        </div>
                        <div>{previewWorld.visits}</div>

                        <div className="text-gray-500">
                          {t('world-detail:capacity')}
                        </div>
                        <div>
                          {previewWorld.recommendedCapacity
                            ? `${previewWorld.recommendedCapacity} (${t('world-detail:max')} ${previewWorld.capacity})`
                            : previewWorld.capacity}
                        </div>

                        {previewWorld.publicationDate && (
                          <>
                            <div className="text-gray-500">
                              {t('world-detail:published')}
                            </div>
                            <div>
                              {
                                new Date(previewWorld.publicationDate)
                                  .toISOString()
                                  .split('T')[0]
                              }
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Duplicate warning */}
          {isDuplicate && (
            <Alert className="col-span-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="pt-1">
                {t('add-world-dialog:duplicate-warning')}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleCancel}>
            {t('general:cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              isLoading ||
              !worldInput ||
              !!error ||
              !!isDuplicate ||
              !previewWorld
            }
          >
            {t('add-world-dialog:add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
