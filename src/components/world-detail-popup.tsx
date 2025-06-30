import { useState, useEffect } from 'react';
import { info, error } from '@tauri-apps/plugin-log';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ExternalLink } from 'lucide-react';
import QPc from '@/../public/icons/VennColorQPc.svg';
import QPcQ from '@/../public/icons/VennColorQPcQ.svg';
import QQ from '@/../public/icons/VennColorQQ.svg';
import { ChevronRight } from 'lucide-react';
import {
  GroupInstanceCreatePermission,
  UserGroup,
  GroupInstancePermissionInfo,
  GroupRole,
  commands,
} from '@/lib/bindings';
import { WorldDisplayData } from '@/lib/bindings';
import { WorldDetails } from '@/lib/bindings';
import { WorldCardPreview } from './world-card';
import { CardSize } from '@/types/preferences';
import { GroupInstanceCreator } from './group-instance-creator';
import { Platform } from '@/types/worlds';
import { GroupInstanceType, InstanceType } from '@/types/instances';
import { InstanceRegion } from '@/lib/bindings';
import { useLocalization } from '@/hooks/use-localization';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export interface WorldDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worldId: string;
  onCreateInstance: (
    worldId: string,
    instanceType: Exclude<InstanceType, 'group'>,
    region: InstanceRegion,
  ) => void;
  onCreateGroupInstance: (
    worldId: string,
    region: InstanceRegion,
    groupId: string,
    instanceType: GroupInstanceType,
    queueEnabled: boolean,
    selectedRoles?: string[],
  ) => void;
  onGetGroups: () => Promise<UserGroup[]>;
  onGetGroupPermissions: (
    groupId: string,
  ) => Promise<GroupInstancePermissionInfo>;
  dontSaveToLocal?: boolean;
  onDeleteWorld: (worldId: string) => void;
  onSelectAuthor?: (author: string) => void;
  onSelectTag?: (tag: string) => void;
}

interface GroupInstance {
  groups: UserGroup[];
  selectedGroupId: string | null;
  permission: GroupInstanceCreatePermission | null;
  roles: GroupRole[];
  isLoading: boolean;
}

// Add this function at the top of your file or in a separate utils file
const mapRegion = {
  // UI to backend mapping
  toBackend: (uiRegion: string): InstanceRegion => {
    const mapping: Record<string, InstanceRegion> = {
      USW: 'us' as InstanceRegion,
      USE: 'use' as InstanceRegion,
      EU: 'eu' as InstanceRegion,
      JP: 'jp' as InstanceRegion,
    };
    return mapping[uiRegion] || ('jp' as InstanceRegion);
  },

  // Backend to UI mapping
  toUI: (backendRegion: InstanceRegion): string => {
    const mapping: Record<InstanceRegion, string> = {
      us: 'USW',
      use: 'USE',
      eu: 'EU',
      jp: 'JP',
    };
    return mapping[backendRegion] || 'JP';
  },
};

export function WorldDetailPopup({
  open,
  onOpenChange,
  worldId,
  onCreateInstance,
  onCreateGroupInstance,
  onGetGroups,
  onGetGroupPermissions,
  dontSaveToLocal,
  onDeleteWorld,
  onSelectAuthor,
  onSelectTag,
}: WorldDetailDialogProps) {
  const { t } = useLocalization();
  const [isLoading, setIsLoading] = useState(false);
  const [worldDetails, setWorldDetails] = useState<WorldDetails | null>(null);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [selectedInstanceType, setSelectedInstanceType] =
    useState<InstanceType>('public');
  const [selectedRegion, setSelectedRegion] = useState<InstanceRegion>('jp');
  const [groupInstanceState, setGroupInstanceState] = useState<GroupInstance>({
    groups: [],
    selectedGroupId: null,
    permission: null,
    roles: [],
    isLoading: true,
  });
  const [instanceCreationType, setInstanceCreationType] = useState<
    'normal' | 'group'
  >('normal');

  const [isWorldNotPublic, setIsWorldNotPublic] = useState<boolean>(false);
  const [cachedWorldData, setCachedWorldData] =
    useState<WorldDisplayData | null>(null);

  useEffect(() => {
    const fetchWorldDetails = async () => {
      if (!open) return;

      setIsLoading(true);
      setErrorState(null);
      setIsWorldNotPublic(false);

      try {
        info(`Is dontSaveToLocal: ${dontSaveToLocal}`);
        const result = await commands.getWorld(
          worldId,
          dontSaveToLocal ?? false,
        );

        if (result.status === 'ok') {
          setWorldDetails(result.data);
        } else {
          if (result.error.includes('World is not public')) {
            setIsWorldNotPublic(true);
            // Get cached world data
            try {
              const allWorldsResult = await commands.getAllWorlds();
              const hiddenWorldsResult = await commands.getHiddenWorlds();

              let worldsList: WorldDisplayData[] = [];
              if (allWorldsResult.status === 'ok') {
                worldsList = allWorldsResult.data;
              }

              if (hiddenWorldsResult.status === 'ok') {
                worldsList = [...worldsList, ...hiddenWorldsResult.data];
              }

              const cachedWorld = worldsList.find((w) => w.worldId === worldId);
              if (cachedWorld) {
                setCachedWorldData(cachedWorld);
              }
            } catch (cacheError) {
              error(`Failed to fetch cached world data: ${cacheError}`);
            }
          }
          setErrorState(result.error);
        }
      } catch (e) {
        error(`Failed to fetch world details: ${e}`);
        setErrorState(e as string);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorldDetails();
  }, [open, worldId]);

  // Add this useEffect near your other useEffects
  useEffect(() => {
    const loadRegionPreference = async () => {
      try {
        const regionResult = await commands.getRegion();
        if (regionResult.status === 'ok') {
          setSelectedRegion(regionResult.data);
          info(`Loaded region preference: ${regionResult.data}`);
        }
      } catch (e) {
        error(`Failed to load region preference: ${e}`);
        // Fall back to JP if we can't load the preference
        setSelectedRegion('jp' as InstanceRegion);
      }
    };

    loadRegionPreference();
  }, []); // Empty dependency array means this runs once on mount

  const setRegionPreference = async (region: InstanceRegion) => {
    try {
      await commands.setRegion(region);
      info(`Region preference set to ${region}`);
    } catch (e) {
      error(`Failed to set region preference: ${e}`);
    }
  };

  const handleInstanceClick = () => {
    try {
      setInstanceCreationType('normal');
      onCreateInstance(
        worldId,
        selectedInstanceType as Exclude<InstanceType, 'group'>,
        selectedRegion,
      );
      setRegionPreference(selectedRegion);
    } catch (e) {
      error(`Failed to create instance: ${e}`);
      setErrorState(`Failed to create instance: ${e}`);
    }
  };

  const handleGroupInstanceClick = async () => {
    try {
      setInstanceCreationType('group');
      setGroupInstanceState((prev) => ({
        ...prev,
        groups: [],
        selectedGroupId: null,
        permission: null,
        roles: [],
        isLoading: true,
      }));
      const groups = await onGetGroups();
      info(`Loaded ${groups.length} groups`);
      setGroupInstanceState((prev) => ({
        ...prev,
        groups,
        isLoading: false,
      }));
      setRegionPreference(selectedRegion);
    } catch (e) {
      error(`Failed to load groups: ${e}`);
      setGroupInstanceState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  };

  const handleGroupSelect = async (groupId: string) => {
    const permission = await onGetGroupPermissions(groupId);

    setGroupInstanceState((prev) => ({
      ...prev,
      selectedGroupId: groupId,
      permission: permission.permission,
      roles: permission.roles,
    }));
  };

  const handleCreateGroupInstance = (
    groupId: string,
    instanceType: GroupInstanceType,
    region: InstanceRegion,
    queueEnabled: boolean,
    selectedRoles?: string[],
  ) => {
    onCreateGroupInstance(
      worldId,
      region,
      groupId,
      instanceType,
      queueEnabled,
      selectedRoles,
    );
    // Reset state after creating instance
    setInstanceCreationType('normal');
    onOpenChange(false); // Close dialog after creating instance
  };

  const handleDeleteWorld = (worldId: string) => {
    onDeleteWorld(worldId);
    onOpenChange(false); // Close dialog after deletion is initiated
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          setInstanceCreationType('normal');
          setGroupInstanceState({
            groups: [],
            selectedGroupId: null,
            permission: null,
            roles: [],
            isLoading: true, // Add this
          });
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-[800px] h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isLoading
              ? t('general:loading')
              : instanceCreationType === 'group'
                ? t('world-detail:create-group-instance')
                : t('world-detail:world-details')}
          </DialogTitle>
        </DialogHeader>

        {instanceCreationType === 'group' ? (
          <GroupInstanceCreator
            groups={groupInstanceState.groups}
            selectedGroupId={groupInstanceState.selectedGroupId}
            permission={groupInstanceState.permission}
            onBack={() => setInstanceCreationType('normal')}
            onGroupSelect={handleGroupSelect}
            onCreateInstance={handleCreateGroupInstance}
            roles={groupInstanceState.roles}
            isLoading={groupInstanceState.isLoading}
          />
        ) : (
          <>
            {errorState && (
              <div className="text-red-500 text-sm">{errorState}</div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <span>{t('world-detail:loading-details')}</span>
              </div>
            ) : isWorldNotPublic && cachedWorldData ? (
              // Show the 'world not public' display with cached data
              <div className="flex flex-col gap-4">
                <Card className="w-full">
                  <CardHeader>
                    <Alert className="flex">
                      <span className="flex items-center h-full mr-2">
                        <AlertCircle className="h-5 w-5" />
                      </span>
                      <AlertDescription>
                        {t('world-detail:world-not-public')}
                      </AlertDescription>
                    </Alert>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-6 justify-between">
                      <div className="flex justify-center items-center pl-8 w-full sm:w-1/3">
                        <WorldCardPreview
                          size={CardSize.Normal}
                          world={{
                            worldId: cachedWorldData.worldId,
                            name: cachedWorldData.name,
                            thumbnailUrl: cachedWorldData.thumbnailUrl,
                            authorName: cachedWorldData.authorName,
                            favorites: cachedWorldData.favorites,
                            lastUpdated: cachedWorldData.lastUpdated,
                            visits: cachedWorldData.visits,
                            dateAdded: cachedWorldData.dateAdded,
                            platform:
                              cachedWorldData.platform as unknown as import('@/types/worlds').Platform,
                            folders: [],
                            tags: cachedWorldData.tags,
                          }}
                        />
                      </div>
                      <div className="ml-8 sm:pl-8 sm:border-l border-border sm:w-2/3">
                        <div className="flex flex-col gap-4">
                          <div>
                            <div className="text-sm font-semibold mb-3">
                              {t('world-detail:details')}
                            </div>
                            <div className="grid grid-cols-[1fr_1.5fr] sm:grid-cols-[120px_1fr] gap-x-6 gap-y-2 text-sm">
                              <div className="text-gray-500">
                                {t('world-detail:world-name')}:
                              </div>
                              <div className="truncate">
                                {cachedWorldData.name}
                              </div>

                              <div className="text-gray-500">
                                {t('general:author')}:
                              </div>
                              <div className="truncate">
                                {cachedWorldData.authorName}
                              </div>

                              <div className="text-gray-500">
                                {t('general:date-added')}:
                              </div>
                              <div>
                                {cachedWorldData.dateAdded
                                  ? (() => {
                                      const [date, time] =
                                        cachedWorldData.dateAdded.split('T');
                                      const timeWithoutMs = time
                                        ?.split('.')[0]
                                        ?.replace('Z', '');
                                      return (
                                        <>
                                          {date}
                                          {timeWithoutMs && (
                                            <span className="text-gray-500">
                                              {' '}
                                              {timeWithoutMs}
                                            </span>
                                          )}
                                        </>
                                      );
                                    })()
                                  : ''}
                              </div>

                              <div className="text-gray-500">
                                {t('world-detail:last-updated')}
                              </div>
                              <div>{cachedWorldData.lastUpdated}</div>
                            </div>
                          </div>
                          <div className="mt-1 flex gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              className="flex items-center gap-1"
                              asChild
                            >
                              <a
                                href={`https://vrchat.com/home/world/${cachedWorldData.worldId}`}
                                target="_blank"
                                rel="noreferrer"
                                title={t('world-detail:show-on-website')}
                              >
                                {t('world-detail:show-on-website')}
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>

                            <Button
                              variant="destructive"
                              className="flex items-center gap-1 ml-auto"
                              onClick={() =>
                                handleDeleteWorld(cachedWorldData.worldId)
                              }
                            >
                              {t('general:delete')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              worldDetails && (
                <div className="flex flex-col gap-4">
                  <div className="flex gap-4 py-4">
                    <div className="w-[60%]">
                      <div className="h-[220px] relative overflow-hidden rounded-lg mb-4 bg-black">
                        <a
                          href={`https://vrchat.com/home/world/${worldDetails.worldId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block h-full"
                        >
                          <div className="absolute top-2 right-2 z-10 bg-black/50 rounded-full p-1">
                            {worldDetails.platform == Platform.CrossPlatform ? (
                              <Image
                                src={QPcQ}
                                alt={t('world-card:cross-platform')}
                                width={35}
                              />
                            ) : worldDetails.platform == Platform.PC ? (
                              <Image
                                src={QPc}
                                alt={t('world-card:pc')}
                                width={35}
                              />
                            ) : (
                              <Image
                                src={QQ}
                                alt={t('world-card:quest')}
                                width={35}
                              />
                            )}
                          </div>
                          <img
                            src={worldDetails.thumbnailUrl}
                            alt={worldDetails.name}
                            className="object-cover w-full h-full"
                            style={{
                              backgroundColor: 'black',
                              maxWidth: '100%', // Add max-width constraint
                            }}
                          />
                        </a>
                      </div>
                      <div className="text-md font-semibold cursor-default">
                        {worldDetails.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {t('world-detail:by')}{' '}
                        <span
                          className="text-sm text-gray-500 cursor-pointer hover:underline"
                          onClick={() => {
                            onSelectAuthor?.(worldDetails.authorName);
                            onOpenChange(false);
                          }}
                        >
                          {worldDetails.authorName}
                        </span>
                      </div>
                    </div>
                    <div className="w-2/5">
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium mb-1 block">
                            {t('general:instance-type')}
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
                              {
                                value: 'public',
                                label: t('world-detail:public'),
                              },
                              {
                                value: 'group',
                                label: (
                                  <div className="flex items-center justify-between w-full gap-2">
                                    <div className="flex-1 text-center">
                                      {t('world-detail:group')}
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-none" />
                                  </div>
                                ),
                              },
                              {
                                value: 'friends+',
                                label: t('world-detail:friends-plus'),
                              },
                              {
                                value: 'friends',
                                label: t('world-detail:friends'),
                              },
                              {
                                value: 'invite+',
                                label: t('world-detail:invite-plus'),
                              },
                              {
                                value: 'invite',
                                label: t('world-detail:invite'),
                              },
                            ].map(({ value, label }) => (
                              <ToggleGroupItem
                                key={value}
                                value={value}
                                aria-label={
                                  typeof label === 'string' ? label : value
                                }
                                className="border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary"
                              >
                                {label}
                              </ToggleGroupItem>
                            ))}
                          </ToggleGroup>
                        </div>

                        <div>
                          <Label className="text-sm font-medium mb-1 block">
                            {t('general:region')}
                          </Label>
                          <ToggleGroup
                            type="single"
                            value={mapRegion.toUI(selectedRegion)}
                            onValueChange={(value) => {
                              if (value)
                                setSelectedRegion(mapRegion.toBackend(value));
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
                              if (selectedInstanceType === 'group') {
                                handleGroupInstanceClick();
                              } else {
                                handleInstanceClick();
                              }
                            }}
                          >
                            {selectedInstanceType === 'group'
                              ? t('general:select-group')
                              : t('general:create-instance')}
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
                          {t('world-detail:description')}
                        </div>
                        <div className="text-sm break-words overflow-wrap-anywhere">
                          {worldDetails.description}
                        </div>
                      </div>
                      <Separator className="my-2" />
                      <div>
                        <div className="text-sm font-semibold mb-2">
                          {t('general:tags')}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {worldDetails.tags
                            .filter((tag) => tag.startsWith('author_tag_'))
                            .map((tag) => {
                              const label = tag.replace('author_tag_', '');
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  className="inline-block px-1.5 py-0.5 text-xs bg-gray-500 text-white rounded-full max-w-[250px] whitespace-nowrap overflow-hidden text-ellipsis hover:bg-gray-600"
                                  title={label}
                                  onClick={() => {
                                    onSelectTag?.(label);
                                    onOpenChange(false);
                                  }}
                                >
                                  {label}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                    <Separator orientation="vertical" />
                    <div className="flex flex-col gap-4 w-1/3">
                      <div>
                        <div className="text-sm font-semibold mb-2">
                          {t('world-detail:details')}
                        </div>
                        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                          <div className="text-gray-500">
                            {t('world-detail:visits')}
                          </div>
                          <div>{worldDetails.visits}</div>

                          <div className="text-gray-500">
                            {t('world-detail:favorites')}
                          </div>
                          <div>{worldDetails.favorites}</div>
                          <div className="text-gray-500">
                            {t('world-detail:capacity')}
                          </div>
                          <div>
                            {worldDetails.recommendedCapacity
                              ? `${worldDetails.recommendedCapacity} (${t('world-detail:max')} ${worldDetails.capacity})`
                              : worldDetails.capacity}
                          </div>

                          {worldDetails.publicationDate && (
                            <>
                              <div className="text-gray-500">
                                {t('world-detail:published')}
                              </div>
                              <div>
                                {
                                  new Date(worldDetails.publicationDate)
                                    .toISOString()
                                    .split('T')[0]
                                }
                              </div>
                            </>
                          )}

                          <div className="text-gray-500">
                            {t('world-detail:last-updated')}
                          </div>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
