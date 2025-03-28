import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import QPc from '@/../public/icons/VennColorQPc.svg';
import QPcQ from '@/../public/icons/VennColorQPcQ.svg';
import QQ from '@/../public/icons/VennColorQQ.svg';

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
      <DialogContent className="min-w-[80vw] max-h-[80vh] overflow-y-auto">
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
                <div className="w-3/5">
                  <div className="aspect-video relative overflow-hidden rounded-lg mb-4">
                    <a
                      href={`https://vrchat.com/home/world/${worldDetails.worldId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <div className="absolute top-2 right-2 z-10 bg-black/50 rounded-full p-1">
                        {worldDetails.platform == Platform.CrossPlatform ? (
                          <Image src={QPcQ} alt="Cross-platform" width={35} />
                        ) : worldDetails.platform == Platform.PC ? (
                          <Image src={QPc} alt="PC" width={35} />
                        ) : (
                          <Image src={QQ} alt="Quest" width={35} />
                        )}
                      </div>
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
                <div className="w-2/5">
                  <div className="text-sm font-semibold mb-2">
                    Create Instance
                  </div>
                  <div className="space-y-6">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        Instance Type
                      </Label>
                      <ToggleGroup
                        type="single"
                        value={selectedInstanceType}
                        onValueChange={(value) => {
                          if (value)
                            setSelectedInstanceType(value as InstanceType);
                        }}
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
                          <ToggleGroupItem
                            key={value}
                            value={value}
                            aria-label={label}
                            className="border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary"
                          >
                            {label}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        Region
                      </Label>
                      <ToggleGroup
                        type="single"
                        value={selectedRegion}
                        onValueChange={(value) => {
                          if (value) setSelectedRegion(value as Region);
                        }}
                        className="flex gap-2"
                      >
                        {['USW', 'USE', 'EU', 'JP'].map((region) => (
                          <ToggleGroupItem
                            key={region}
                            value={region}
                            aria-label={region}
                            className="flex-1 border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary"
                          >
                            {region}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </div>

                    <div className="pt-2">
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
              </div>
              <Separator className="my-4" />
              <div className="flex gap-4">
                <div className="flex flex-col gap-4 w-2/3">
                  <div>
                    <div className="text-sm font-semibold mb-2">
                      Description
                    </div>
                    <div className="text-sm">{worldDetails.description}</div>
                  </div>
                  <Separator className="my-2" />
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
                <Separator orientation="vertical" />
                <div className="flex flex-col gap-4 w-1/3">
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
