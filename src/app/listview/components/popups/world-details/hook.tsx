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
      const error = result.error;
      toast({
        title: t('general:error-title'),
        description: error as string,
      });
      return;
    }

    await refreshCurrentView();
    toast({
      title: t('general:success-title'),
      description: t('listview-page:created-instance', instanceType),
    });
  } catch (e) {
    error(`Failed to create instance: ${e}`);
    toast({
      title: t('general:error-title'),
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
      throw new Error(result.error);
    }

    await refreshCurrentView();
    toast({
      title: t('general:success-title'),
      description: t('listview-page:created-instance', instanceType),
    });
  } catch (e) {
    error(`Failed to create group instance: ${e}`);
    toast({
      title: t('general:error-title'),
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
    toast({
      title: t('general:error-title'),
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
    toast({
      title: t('general:error-title'),
      description: t('listview-page:error-get-group-permissions'),
    });
    throw new Error('Group permissions not found');
  }
};
