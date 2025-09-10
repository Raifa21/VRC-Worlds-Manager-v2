import { useState, useEffect, useCallback, Fragment } from 'react';
import { info, error } from '@tauri-apps/plugin-log';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ExternalLink, Pencil } from 'lucide-react';
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
import { WorldCardPreview } from '@/components/world-card';
import { GroupInstanceCreator } from './group-instance-creator';
import { Platform } from '@/types/worlds';
import { GroupInstanceType, InstanceType } from '@/types/instances';
import { InstanceRegion } from '@/lib/bindings';
import { useLocalization } from '@/hooks/use-localization';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import MemoRenderer from '@/components/memo-renderer';
import { useFolders } from '@/app/listview/hook/use-folders';
import { Checkbox } from '@/components/ui/checkbox';

export interface WorldDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worldId: string;
  dontSaveToLocal?: boolean;
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
  dontSaveToLocal,
}: WorldDetailDialogProps) {
  const {
    createInstance,
    createGroupInstance,
    getGroups,
    getGroupPermissions,
    deleteWorld,
    selectAuthor,
    selectTag,
  } = require('./hook');
  const { t } = useLocalization();
  const { folders } = useFolders();
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
  const [memo, setMemo] = useState<string | null>(null);
  const [isEditingMemo, setIsEditingMemo] = useState<boolean>(false);
  const [memoInput, setMemoInput] = useState<string>('');

  const [isWorldNotPublic, setIsWorldNotPublic] = useState<boolean>(false);
  const [isWorldBlacklisted, setIsWorldBlacklisted] = useState<boolean>(false);
  const [cachedWorldData, setCachedWorldData] =
    useState<WorldDisplayData | null>(null);

  // Add these new state variables
  const [countdownSeconds, setCountdownSeconds] = useState<number>(5);
  const [isCountdownActive, setIsCountdownActive] = useState<boolean>(false);
  const [worldFolders, setWorldFolders] = useState<string[]>([]);

  useEffect(() => {
    const fetchWorldDetails = async () => {
      if (!open) return;

      // Reset all state when opening the dialog with a new world
      setIsLoading(true);
      setErrorState(null);
      setIsWorldNotPublic(false);
      setIsWorldBlacklisted(false); // Reset blacklisted status
      setCountdownSeconds(5); // Reset to initial countdown value
      setIsCountdownActive(false); // Reset countdown activation

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

            // Check blacklist status separately
            try {
              const blacklistResult = await commands.fetchBlacklist();
              if (blacklistResult.status === 'ok') {
                const blacklistedWorlds = blacklistResult.data.worlds;
                const isBlacklisted = blacklistedWorlds.includes(worldId);
                setIsWorldBlacklisted(isBlacklisted);

                if (isBlacklisted) {
                  setIsCountdownActive(true); // Start the countdown only if blacklisted
                }
              } else {
                error(`Failed to fetch blacklist: ${blacklistResult.error}`);
              }
            } catch (blacklistError) {
              error(`Failed to fetch blacklist: ${blacklistError}`);
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

    const fetchMemo = async () => {
      const result = await commands.getMemo(worldId);

      if (result.status === 'ok') {
        setMemo(result.data);
        setMemoInput(result.data);
      } else {
        console.error(result.error);
      }
    };
    const fetchWorldFolders = async () => {
      if (!worldId) return;

      try {
        const result = await commands.getFoldersForWorld(worldId);
        if (result.status === 'ok') {
          setWorldFolders(result.data);
        } else {
          error(`Failed to fetch folders for world: ${result.error}`);
        }
      } catch (e) {
        error(`Error fetching folders for world: ${e}`);
      }
    };

    fetchWorldDetails();
    fetchMemo();
    fetchWorldFolders();
  }, [open, worldId]);

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
      createInstance(
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

  const handleSaveMemo = useCallback(async () => {
    if (memoInput === memo) {
      setIsEditingMemo(false);
      return;
    }

    const result = await commands.setMemoAndSave(worldId, memoInput);
    if (result.status === 'ok') {
      setMemo(memoInput);
      setIsEditingMemo(false);
    } else {
      console.error(result.error);
    }
  }, [worldId, memoInput]);

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
      const groups = await getGroups();
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
    const permission = await getGroupPermissions(groupId);

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
    createGroupInstance(
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
    deleteWorld(worldId);
  };

  // Add this effect to handle the countdown and auto-close
  useEffect(() => {
    if (isWorldBlacklisted && isCountdownActive && countdownSeconds > 0) {
      const timer = setTimeout(() => {
        setCountdownSeconds((prev) => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (
      isWorldBlacklisted &&
      isCountdownActive &&
      countdownSeconds === 0
    ) {
      // Delete the world when countdown ends, then close the dialog
      handleDeleteWorld(worldId);
      onOpenChange(false);
    }
  }, [
    isWorldBlacklisted,
    countdownSeconds,
    isCountdownActive,
    onOpenChange,
    worldId,
  ]);

  async function toggleWorldFolder(folder: string): Promise<void> {
    try {
      let updatedFolders: string[];
      if (worldFolders.includes(folder)) {
        // Remove folder
        const result = await commands.removeWorldFromFolder(folder, worldId);
        if (result.status !== 'ok') {
          error(
            `Failed to remove world from folder "${folder}" for world ID "${worldId}": ${result.error}`,
          );
          return;
        }
        updatedFolders = worldFolders.filter((f) => f !== folder);
      } else {
        // Add folder
        const result = await commands.addWorldToFolder(folder, worldId);
        if (result.status !== 'ok') {
          error(
            `Failed to add world to folder "${folder}" for world ID "${worldId}": ${result.error}`,
          );
          return;
        }
        updatedFolders = [...worldFolders, folder];
      }
      setWorldFolders(updatedFolders);
    } catch (e) {
      error(`Error toggling world folder: ${e}`);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        // If closing the dialog and it's a blacklisted world, delete it
        if (!open && isWorldBlacklisted && countdownSeconds > 0) {
          handleDeleteWorld(worldId);
        }

        // Existing code
        if (!open) {
          setInstanceCreationType('normal');
          setGroupInstanceState({
            groups: [],
            selectedGroupId: null,
            permission: null,
            roles: [],
            isLoading: true,
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
              // Combined display for both blacklisted and not public worlds
              <div className="flex flex-col gap-4">
                <Card className="w-full">
                  <CardHeader>
                    <Alert
                      variant={isWorldBlacklisted ? 'destructive' : undefined}
                      className="flex"
                    >
                      <span className="flex items-center h-full mr-2">
                        <AlertCircle className="h-5 w-5" />
                      </span>
                      <AlertDescription>
                        {isWorldBlacklisted
                          ? t('world-detail:world-blacklisted')
                          : t('world-detail:world-not-public')}
                        {isWorldBlacklisted && (
                          <div className="font-bold mt-1">
                            {t('world-detail:closing-in', countdownSeconds)}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-6 justify-between">
                      <div className="flex justify-center items-center pl-8 w-full sm:w-1/3">
                        <WorldCardPreview
                          size="Normal"
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
                            capacity: cachedWorldData.capacity,
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
                            {/* Only show the website link for non-blacklisted worlds */}
                            {!isWorldBlacklisted && (
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
                            )}
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
                    {!isWorldBlacklisted && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="text-sm text-muted-foreground">
                          <p className="font-medium mb-2">
                            {t('world-detail:author-removal-title')}
                          </p>
                          <p className="mb-3">
                            {t('world-detail:author-removal-description')}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                            asChild
                          >
                            <a
                              href="https://docs.google.com/forms/d/e/1FAIpQLSctTr69Arr9VazZ2zj_5cUlmlafBxM3LDrx12jpyPN1lj5baQ/viewform"
                              target="_blank"
                              rel="noreferrer"
                              title={t('world-detail:request-removal')}
                            >
                              {t('world-detail:request-removal')}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    )}
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
                            // set author filter and close via hook
                            // selectAuthor handles closing
                            selectAuthor(worldDetails.authorName);
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
                                    // set tag filter and close via hook
                                    selectTag(label);
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
                  <Separator className="my-2" />
                  <div className="flex gap-4">
                    <div className="w-2/3">
                      <div className="text-sm font-semibold mb-2 flex flex-row items-center gap-2">
                        {t('general:memo')}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="p-0 size-8 [&_svg]:size-4"
                          onClick={() => setIsEditingMemo(true)}
                        >
                          <Pencil />
                        </Button>
                      </div>
                      <div className="flex flex-row">
                        {!isEditingMemo && (
                          <div className="pr-4">
                            <MemoRenderer value={memo ?? ''} />
                          </div>
                        )}
                        {isEditingMemo && (
                          <div className="space-y-2 w-full">
                            <Textarea
                              value={memoInput}
                              onChange={(e) => setMemoInput(e.target.value)}
                              className="h-32"
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="secondary"
                                className="w-full"
                                onClick={() => {
                                  setIsEditingMemo(false);
                                  setMemoInput(memo ?? '');
                                }}
                              >
                                {t('general:cancel')}
                              </Button>
                              <Button
                                variant="default"
                                className="w-full"
                                onClick={handleSaveMemo}
                              >
                                {t('general:save')}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator orientation="vertical" />
                    <div className="w-1/3">
                      <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                        {t('general:folders')}
                      </div>
                      <div className="flex flex-col gap-2 h-48 overflow-y-auto">
                        {folders.length > 0 ? (
                          folders.map((folder) => (
                            <div
                              className="flex items-center space-x-2"
                              key={folder.name}
                            >
                              <Checkbox
                                checked={worldFolders.includes(folder.name)}
                                onCheckedChange={() =>
                                  toggleWorldFolder(folder.name)
                                }
                              />
                              <span className="text-sm text-muted-foreground">
                                {folder.world_count}
                              </span>
                              <span className="truncate max-w-[200px] text-sm">
                                {folder.name}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {t('general:no-folders')}
                          </span>
                        )}
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
