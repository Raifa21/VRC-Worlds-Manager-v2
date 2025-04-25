import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
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
import QPc from '@/../public/icons/VennColorQPc.svg';
import QPcQ from '@/../public/icons/VennColorQPcQ.svg';
import QQ from '@/../public/icons/VennColorQQ.svg';
import { ChevronRight } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import {
  GroupInstanceCreatePermission,
  UserGroup,
  GroupInstancePermissionInfo,
  GroupRole,
} from '@/lib/bindings';
import { GroupInstanceCreator } from './group-instance-creator';
import { Platform } from '@/types/worlds';
import {
  WorldDetails,
  GroupInstanceType,
  InstanceType,
  Region,
  GROUP_INSTANCE_TYPES,
} from '@/types/instances';
import { useLocalization } from '@/hooks/use-localization';

interface WorldDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worldId: string;
  onCreateInstance: (
    worldId: string,
    instanceType: Exclude<InstanceType, 'group'>,
    region: Region,
  ) => void;
  onCreateGroupInstance: (
    worldId: string,
    region: Region,
    groupId: string,
    instanceType: GroupInstanceType,
    queueEnabled: boolean,
    selectedRoles?: string[],
  ) => void;
  onGetGroups: () => Promise<UserGroup[]>;
  onGetGroupPermissions: (
    groupId: string,
  ) => Promise<GroupInstancePermissionInfo>;
}

interface GroupInstance {
  groups: UserGroup[];
  selectedGroupId: string | null;
  permission: GroupInstanceCreatePermission | null;
  roles: GroupRole[];
  isLoading: boolean;
}

export function WorldDetailPopup({
  open,
  onOpenChange,
  worldId,
  onCreateInstance,
  onCreateGroupInstance,
  onGetGroups,
  onGetGroupPermissions,
}: WorldDetailDialogProps) {
  const { t } = useLocalization();
  const [isLoading, setIsLoading] = useState(false);
  const [worldDetails, setWorldDetails] = useState<WorldDetails | null>(null);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [selectedInstanceType, setSelectedInstanceType] =
    useState<InstanceType>('public');
  const [selectedRegion, setSelectedRegion] = useState<Region>('JP');
  const [groupInstanceState, setGroupInstanceState] = useState<GroupInstance>({
    groups: [],
    selectedGroupId: null,
    permission: null,
    roles: [],
    isLoading: true, // Add this
  });
  const [instanceCreationType, setInstanceCreationType] = useState<
    'normal' | 'group'
  >('normal');

  useEffect(() => {
    const fetchWorldDetails = async () => {
      if (!open) return;

      setIsLoading(true);
      setErrorState(null);

      try {
        const details = await invoke<WorldDetails>('get_world', { worldId });
        setWorldDetails(details);
      } catch (e) {
        error(`Failed to fetch world details: ${e}`);
        setErrorState(e as string);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorldDetails();
  }, [open, worldId]);

  const handleGroupInstanceClick = async () => {
    try {
      setInstanceCreationType('group');
      setGroupInstanceState((prev) => ({
        ...prev,
        groups: [], // Clear groups
        selectedGroupId: null,
        permission: null,
        roles: [],
        isLoading: true, // Add isLoading to GroupInstance interface
      }));
      const groups = await onGetGroups();
      info(`Loaded ${groups.length} groups`);
      setGroupInstanceState((prev) => ({
        ...prev,
        groups,
        isLoading: false,
      }));
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
    region: Region,
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
    onOpenChange(false); // Close dialog after creating instance
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
                              if (selectedInstanceType === 'group') {
                                handleGroupInstanceClick();
                              } else {
                                onCreateInstance(
                                  worldId,
                                  selectedInstanceType as Exclude<
                                    InstanceType,
                                    'group'
                                  >,
                                  selectedRegion,
                                );
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
                        <div className="text-sm">
                          {worldDetails.description}
                        </div>
                      </div>
                      <Separator className="my-2" />
                      <div>
                        <div className="text-sm font-semibold mb-2">
                          {t('world-detail:tags')}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {worldDetails.tags
                            .filter((tag) => tag.startsWith('author_tag_'))
                            .map((tag) => (
                              <span
                                key={tag}
                                className="inline-block px-1.5 py-0.5 text-xs bg-gray-500 text-white rounded-full max-w-[250px] whitespace-nowrap overflow-hidden text-ellipsis cursor-default"
                                title={tag.replace('author_tag_', '')}
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
