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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

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

type InstanceType =
  | 'public'
  | 'group'
  | 'friends+'
  | 'friends'
  | 'invite+'
  | 'invite';
type Region = 'USW' | 'USE' | 'EU' | 'JP';

export function WorldDetailPopup({
  open,
  onOpenChange,
  worldId,
}: WorldDetailDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [worldDetails, setWorldDetails] = useState<WorldDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedInstanceType, setSelectedInstanceType] =
    useState<InstanceType>('public');
  const [selectedRegion, setSelectedRegion] = useState<Region>('JP');

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
      <DialogContent className="min-w-[80vw] min-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {isLoading ? 'Loading...' : 'World Details'}
          </DialogTitle>
        </DialogHeader>

        {error && <div className="text-red-500 text-sm">{error}</div>}

        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <span>Loading world details...</span>
          </div>
        ) : (
          worldDetails && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-4 py-4">
                <div className="w-2/3">
                  <div className="aspect-video relative overflow-hidden rounded-lg mb-4">
                    <a
                      href={`https://vrchat.com/home/world/${worldDetails.worldId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={worldDetails.thumbnailUrl}
                        alt={worldDetails.name}
                        className="object-cover w-full h-full"
                      />
                    </a>
                  </div>
                  <div className="text-md font-semibold">
                    {worldDetails.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    by{' '}
                    <a
                      className="text-blue"
                      href={`https://vrchat.com/home/user/${worldDetails.authorId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {worldDetails.authorName}
                    </a>
                  </div>
                </div>
                {/* Right section - 1/3 width */}
                <div className="w-1/3">
                  <div className="text-sm font-semibold mb-2">
                    Create Instance
                  </div>

                  <div className="space-y-4">
                    <RadioGroup
                      value={selectedInstanceType}
                      onValueChange={(value) =>
                        setSelectedInstanceType(value as InstanceType)
                      }
                      className="grid grid-cols-2 gap-2"
                    >
                      {[
                        { value: 'public', label: 'Public' },
                        { value: 'group', label: 'Group' },
                        { value: 'friends+', label: 'Friends+' },
                        { value: 'friends', label: 'Friends' },
                        { value: 'invite+', label: 'Invite+' },
                        { value: 'invite', label: 'Invite' },
                      ].map(({ value, label }) => (
                        <div
                          key={value}
                          className="flex items-center space-x-2 rounded-md border p-2"
                        >
                          <RadioGroupItem
                            value={value}
                            id={`instance-${value}`}
                          />
                          <Label htmlFor={`instance-${value}`}>{label}</Label>
                        </div>
                      ))}
                    </RadioGroup>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Region</Label>
                      <RadioGroup
                        value={selectedRegion}
                        onValueChange={(value) =>
                          setSelectedRegion(value as Region)
                        }
                        className="flex gap-2"
                      >
                        {['USW', 'USE', 'EU', 'JP'].map((region) => (
                          <div
                            key={region}
                            className="flex items-center space-x-2 rounded-md border p-2"
                          >
                            <RadioGroupItem
                              value={region}
                              id={`region-${region}`}
                            />
                            <Label htmlFor={`region-${region}`}>{region}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => {
                        // TODO: Implement instance creation
                        console.log(
                          `Creating ${selectedInstanceType} instance in ${selectedRegion}`,
                        );
                      }}
                    >
                      Create Instance
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 py-4">
                <div className="flex flex-col gap-4 py-4 w-2/3">
                  <div>
                    <div className="text-sm font-semibold mb-2">
                      Description
                    </div>
                    <div className="text-sm">{worldDetails.description}</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold mb-2">Tags</div>
                    <div className="flex flex-wrap gap-2">
                      {worldDetails.tags
                        .filter((tag) => tag.startsWith('author_tag_'))
                        .map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-1.5 py-0.5 text-xs bg-gray-500 text-white rounded-full"
                          >
                            {tag.replace('author_tag_', '')}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-4 py-4 w-1/3">
                  <div>
                    <div className="text-sm font-semibold mb-2">Details</div>
                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                      <div className="text-gray-500">Visits:</div>
                      <div>{worldDetails.visits}</div>

                      <div className="text-gray-500">Favorites:</div>
                      <div>{worldDetails.favorites}</div>
                      <div className="text-gray-500">Capacity:</div>
                      <div>
                        {worldDetails.recommendedCapacity
                          ? `${worldDetails.recommendedCapacity} (max ${worldDetails.capacity})`
                          : worldDetails.capacity}
                      </div>

                      {worldDetails.publicationDate && (
                        <>
                          <div className="text-gray-500">Published:</div>
                          <div>
                            {
                              new Date(worldDetails.publicationDate)
                                .toISOString()
                                .split('T')[0]
                            }
                          </div>
                        </>
                      )}

                      <div className="text-gray-500">Last Updated:</div>
                      <div>
                        {
                          new Date(worldDetails.lastUpdated)
                            .toISOString()
                            .split('T')[0]
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
