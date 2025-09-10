import { useLocalization } from '@/hooks/use-localization';
import { commands } from '@/lib/bindings';
import { InstanceRegion } from '@/lib/bindings';
import { GroupInstanceType, InstanceType } from '@/types/instances';
import { toast } from 'sonner';
import { error } from '@tauri-apps/plugin-log';
import { useWorldFiltersStore } from '@/app/listview/hook/use-filters';
import { UserGroup, GroupInstancePermissionInfo } from '@/lib/bindings';

export function useWorldDetailsActions(onOpenChange: (open: boolean) => void) {
  const { t } = useLocalization();
  const { setAuthorFilter, setTagFilters } = useWorldFiltersStore();

  const createInstance = async (
    worldId: string,
    instanceType: Exclude<InstanceType, 'group'>,
    region: InstanceRegion,
  ) => {
    try {
      const result = await commands.createWorldInstance(
        worldId,
        instanceType,
        region,
      );
      if (result.status === 'error') {
        toast(t('general:error-title'), { description: result.error });
        return;
      }
      toast(t('general:success-title'), {
        description: t('listview-page:created-instance', instanceType),
      });
    } catch (e) {
      error(`Failed to create instance: ${e}`);
      toast(t('general:error-title'), {
        description: t('listview-page:error-create-instance'),
      });
    }
  };

  const createGroupInstance = async (
    worldId: string,
    region: InstanceRegion,
    id: string,
    instanceType: GroupInstanceType,
    queueEnabled: boolean,
    selectedRoles?: string[],
  ) => {
    try {
      const result = await commands.createGroupInstance(
        worldId,
        id,
        instanceType,
        selectedRoles ?? null,
        region,
        queueEnabled,
      );
      if (result.status === 'error') {
        toast(t('general:error-title'), { description: result.error });
        return;
      }
      toast(t('general:success-title'), {
        description: t('listview-page:created-instance', instanceType),
      });
    } catch (e) {
      error(`Failed to create group instance: ${e}`);
      toast(t('general:error-title'), {
        description: t('listview-page:error-create-group-instance'),
      });
    }
  };

  const getGroups = async (): Promise<UserGroup[]> => {
    try {
      const result = await commands.getUserGroups();
      if (result.status === 'error') {
        throw new Error(result.error);
      }
      return result.data;
    } catch (e) {
      error(`Failed to get groups: ${e}`);
      toast(t('general:error-title'), {
        description: t('listview-page:error-get-groups'),
      });
      return [];
    }
  };

  const getGroupPermissions = async (
    id: string,
  ): Promise<GroupInstancePermissionInfo> => {
    try {
      const result = await commands.getPermissionForCreateGroupInstance(id);
      if (result.status === 'error') {
        throw new Error(result.error);
      }
      return result.data;
    } catch (e) {
      error(`Failed to get group permissions: ${e}`);
      toast(t('general:error-title'), {
        description: t('listview-page:error-get-group-permissions'),
      });
      throw new Error('Group permissions not found');
    }
  };

  const deleteWorld = async (worldId: string) => {
    try {
      const res = await commands.deleteWorld(worldId);
      if (res.status === 'error') {
        toast(t('general:error-title'), {
          description: t('listview-page:error-delete-world'),
        });
        return;
      }
      toast(t('general:success-title'), {
        description: t('listview-page:world-deleted-success'),
      });
      onOpenChange(false);
    } catch (e) {
      error(`Failed to delete world: ${e}`);
      toast(t('general:error-title'), {
        description: t('listview-page:error-delete-world'),
      });
    }
  };

  const selectAuthor = (author: string) => {
    setAuthorFilter(author);
    onOpenChange(false);
  };

  const selectTag = (tag: string) => {
    setTagFilters([tag]);
    onOpenChange(false);
  };

  return {
    createInstance,
    createGroupInstance,
    getGroups,
    getGroupPermissions,
    deleteWorld,
    selectAuthor,
    selectTag,
  };
}
