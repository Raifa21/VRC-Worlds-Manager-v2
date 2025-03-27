import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface WorldDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worldId: String;
}

export enum Platform {
  PC = 'PC',
  Quest = 'Quest',
  CrossPlatform = 'Cross-Platform',
}

export interface WorldDetails {
  worldId: string;
  name: string;
  thumbnailUrl: string;
  authorName: string;
  authorId: string;
  favorites: number;
  lastUpdated: string;
  visits?: number;
  platform: Platform;
  description: string;
  tags: string[];
  capacity: number;
  recommendedCapacity?: number;
  publicationDate?: string;
}
export function WorldDetailPopup({
  open,
  onOpenChange,
  worldId,
}: WorldDetailDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [worldDetails, setWorldDetails] = useState<WorldDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorldDetails = async () => {
      if (!open) return;

      setIsLoading(true);
      setError(null);

      try {
        const details = await invoke<WorldDetails>('get_world', { worldId });
        setWorldDetails(details);
      } catch (err) {
        setError(err as string);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorldDetails();
  }, [open, worldId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isLoading ? 'Loading...' : worldDetails?.name || 'World Details'}
          </DialogTitle>
        </DialogHeader>

        {error && <div className="text-red-500 text-sm">{error}</div>}

        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <span>Loading world details...</span>
          </div>
        ) : (
          worldDetails && (
            <div className="grid gap-4 py-4">
              <div className="aspect-video relative overflow-hidden rounded-lg">
                <img
                  src={worldDetails.thumbnailUrl}
                  alt={worldDetails.name}
                  className="object-cover w-full h-full"
                />
              </div>

              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="font-semibold">Author</div>
                <div className="col-span-3">{worldDetails.authorName}</div>

                <div className="font-semibold">Platform</div>
                <div className="col-span-3">
                  {worldDetails.platform.includes('pc') &&
                  worldDetails.platform.includes('android')
                    ? 'Cross-Platform'
                    : worldDetails.platform.includes('android')
                      ? 'Quest'
                      : 'PC'}
                </div>

                <div className="font-semibold">Capacity</div>
                <div className="col-span-3">
                  {worldDetails.recommendedCapacity ?? 0} (max:{' '}
                  {worldDetails.capacity})
                </div>

                <div className="font-semibold">Stats</div>
                <div className="col-span-3">
                  ❤️ {worldDetails.favorites} • 👥 {worldDetails.visits ?? 0}
                </div>

                <div className="font-semibold">Updated</div>
                <div className="col-span-3">
                  {new Date(worldDetails.lastUpdated).toLocaleString()}
                </div>

                {worldDetails.description && (
                  <>
                    <div className="font-semibold">Description</div>
                    <div className="col-span-3 whitespace-pre-wrap">
                      {worldDetails.description}
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
