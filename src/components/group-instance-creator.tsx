import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import {
  GroupInstanceCreatePermission,
  UserGroup,
  GroupInstanceCreateAllowedType,
  GroupRole,
  GroupInstancePermissionInfo,
} from '@/lib/bindings';
import { GroupInstanceType, Region } from '@/types/instances';
import { useState, useEffect } from 'react';
import { Label } from './ui/label';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { ChevronRight } from 'lucide-react';
import { Separator } from './ui/separator';

interface GroupInstanceCreatorProps {
  groups: UserGroup[];
  selectedGroupId: string | null;
  permission: GroupInstanceCreatePermission | null;
  roles: GroupRole[] | null;
  onBack: () => void;
  onGroupSelect: (groupId: string) => Promise<void>;
  onCreateInstance: (
    groupId: string,
    instanceType: GroupInstanceType,
    region: Region,
    queueEnabled: boolean,
    selectedRoles?: string[],
  ) => void;
  isLoading?: boolean;
}

type CreationStep = 'group' | 'type' | 'roles' | 'config';

interface StepInfo {
  groupId: string | null;
  instanceType: GroupInstanceType | null;
  region: Region;
  queueEnabled: boolean;
  selectedRoles: Set<string>;
}

const GROUP_INSTANCE_TYPES = [
  {
    type: 'group' as const,
    label: 'Group Only',
    description: 'Only group members can join',
    requiresPermission: 'normal' as const,
  },
  {
    type: 'group+' as const,
    label: 'Group+',
    description: 'Group members and their friends can join',
    requiresPermission: 'plus' as const,
  },
  {
    type: 'public' as const,
    label: 'Group Public',
    description: 'Anyone can join',
    requiresPermission: 'public' as const,
  },
] as const;

export function GroupInstanceCreator({
  groups,
  selectedGroupId: initialGroupId,
  permission,
  roles,
  onBack,
  onGroupSelect,
  onCreateInstance,
  isLoading: externalLoading,
}: GroupInstanceCreatorProps) {
  const [currentStep, setCurrentStep] = useState<CreationStep>(
    initialGroupId ? 'type' : 'group',
  );
  const [isLoading, setIsLoading] = useState(true); // Add internal loading state
  const [stepInfo, setStepInfo] = useState<StepInfo>({
    groupId: initialGroupId || null,
    instanceType: null,
    region: 'JP',
    queueEnabled: false,
    selectedRoles: new Set(),
  });

  const [selectingEveryoneRole, setSelectingEveryoneRole] = useState(true);

  // Add useEffect to update loading state based on groups
  useEffect(() => {
    if (externalLoading) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [groups]);

  const getRoleType = (role: GroupRole) => {
    if (role.isManagementRole) {
      return 'management';
    }
    return 'normal';
  };

  const canGateRoles = () => {
    return permission === 'NotAllowed' ? false : permission?.Allowed.restricted;
  };

  const isEveryoneRole = (role: GroupRole) => {
    return role.name === 'Everyone';
  };

  const getNonEveryoneRoles = () => {
    return roles?.filter((role) => !isEveryoneRole(role)) || [];
  };

  const getEveryoneRole = () => {
    return roles?.find((role) => isEveryoneRole(role));
  };

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    if (!roles) return;

    const role = roles.find((r) => r.id === roleId);
    if (!role) return;

    const newSelectedRoles = new Set(stepInfo.selectedRoles);
    const everyoneRole = getEveryoneRole();
    const ownerRole = roles.find((r) => r.permissions.includes('*'));

    if (isEveryoneRole(role)) {
      if (checked) {
        newSelectedRoles.clear();
        if (everyoneRole) {
          newSelectedRoles.add(everyoneRole.id);
        }
        setSelectingEveryoneRole(true);
      }
    } else {
      if (checked) {
        if (everyoneRole) {
          newSelectedRoles.delete(everyoneRole.id);
        }
        setSelectingEveryoneRole(false);

        // Always add owner role when selecting any other role
        if (ownerRole) {
          newSelectedRoles.add(ownerRole.id);
        }

        // Handle management role logic
        const roleType = getRoleType(role);
        if (roleType === 'normal') {
          roles.forEach((r) => {
            if (r.isManagementRole) {
              newSelectedRoles.add(r.id);
            }
          });
        }
        newSelectedRoles.add(roleId);
      } else {
        newSelectedRoles.delete(roleId);

        // If no roles selected, default back to Everyone
        if (newSelectedRoles.size === 0 && everyoneRole) {
          newSelectedRoles.add(everyoneRole.id);
          setSelectingEveryoneRole(true);
        }
      }
    }

    setStepInfo((prev) => ({
      ...prev,
      selectedRoles: newSelectedRoles,
    }));
  };

  const isRoleDisabled = (role: GroupRole) => {
    if (selectingEveryoneRole) return false;

    if (role.permissions.includes('*')) {
      // Owner role should be selectable when no other roles are selected
      const hasOtherRolesSelected = Array.from(stepInfo.selectedRoles).some(
        (id) => {
          const selectedRole = roles?.find((r) => r.id === id);
          return (
            selectedRole &&
            !isEveryoneRole(selectedRole) &&
            !selectedRole.permissions.includes('*')
          );
        },
      );
      return hasOtherRolesSelected;
    }

    if (role.isManagementRole) {
      // Management roles are disabled if any non-management role is selected
      return Array.from(stepInfo.selectedRoles).some((id) => {
        const selectedRole = roles?.find((r) => r.id === id);
        return (
          selectedRole &&
          !selectedRole.isManagementRole &&
          !isEveryoneRole(selectedRole)
        );
      });
    }

    return false;
  };

  const isRoleRequired = (role: GroupRole) => {
    if (selectingEveryoneRole) return false;

    if (role.permissions.includes('*')) {
      // Owner is only required when OTHER non-Everyone roles are selected
      return Array.from(stepInfo.selectedRoles).some((id) => {
        const selectedRole = roles?.find((r) => r.id === id);
        return (
          selectedRole &&
          !isEveryoneRole(selectedRole) &&
          !selectedRole.permissions.includes('*')
        ); // Don't count owner role itself
      });
    }

    // Rest of the function remains the same
    const hasNormalRole = Array.from(stepInfo.selectedRoles).some((id) => {
      const selectedRole = roles?.find((r) => r.id === id);
      return (
        selectedRole &&
        !selectedRole.isManagementRole &&
        !isEveryoneRole(selectedRole)
      );
    });

    return hasNormalRole && role.isManagementRole;
  };

  const handleCreateInstance = () => {
    if (!stepInfo.instanceType || !stepInfo.groupId) return;

    const rolesToPass =
      stepInfo.instanceType === 'group' && canGateRoles()
        ? !selectingEveryoneRole
          ? Array.from(stepInfo.selectedRoles)
          : undefined
        : undefined;

    onCreateInstance(
      stepInfo.groupId,
      stepInfo.instanceType,
      stepInfo.region,
      stepInfo.queueEnabled,
      rolesToPass,
    );
  };

  const handleInstanceTypeSelect = (type: GroupInstanceType) => {
    setStepInfo((prev) => ({
      ...prev,
      instanceType: type,
    }));

    // Skip roles page if not needed
    if (type === 'group' && canGateRoles()) {
      setCurrentStep('roles');
    } else {
      setCurrentStep('config');
    }
  };

  const handleGroupSelect = async (groupId: string) => {
    try {
      setIsLoading(true);
      setStepInfo((prev) => ({
        ...prev,
        groupId,
        instanceType: null,
        selectedRoles: new Set(),
      }));
      setSelectingEveryoneRole(true);
      await onGroupSelect(groupId);
      setCurrentStep('type');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 'config') {
      setCurrentStep('type');
    } else if (currentStep === 'type') {
      setCurrentStep('group');
    } else {
      // Reset everything when going back from group selection
      setCurrentStep('group');
      setStepInfo({
        groupId: null,
        instanceType: null,
        region: 'JP',
        queueEnabled: false,
        selectedRoles: new Set(),
      });
      setSelectingEveryoneRole(true);
      onBack();
    }
  };

  const NavigationItem = ({
    label,
    value,
    onClick,
    disabled = false,
  }: {
    label: string;
    value: string;
    onClick: () => void;
    disabled?: boolean;
  }) => (
    <Button
      variant="ghost"
      className="w-full justify-between"
      onClick={onClick}
      disabled={disabled}
    >
      <div className="flex justify-between w-full items-center">
        <div className="flex flex-col items-start">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="font-medium">{value}</div>
        </div>
        <ChevronRight className="h-4 w-4" />
      </div>
    </Button>
  );

  const GroupSelectionPage = () => {
    if (isLoading || !groups) {
      return (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading groups...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 p-4">
        <h3 className="font-medium">Select a Group</h3>
        <div className="space-y-2 overflow-y-auto max-h-[35vh]">
          {groups.map((group) => (
            <Button
              key={group.groupId}
              variant="outline"
              className="w-full h-12 justify-start relative overflow-hidden group"
              onClick={() => handleGroupSelect(group.groupId)}
            >
              {group.bannerUrl && (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-50 group-hover:opacity-75 transition-opacity"
                  style={{ backgroundImage: `url(${group.bannerUrl})` }}
                />
              )}
              <div className="relative z-10 font-medium text-lg text-foreground">
                {group.name}
              </div>
            </Button>
          ))}
        </div>
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
      </div>
    );
  };

  const InstanceTypeSelectionPage = () => {
    if (isLoading || !permission) {
      return (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm text-muted-foreground">
              Loading permissions...
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-4 p-4">
        <h3 className="font-medium">Select Instance Type</h3>
        <div className="space-y-2">
          {GROUP_INSTANCE_TYPES.map((option) => {
            const hasPermission =
              permission === 'NotAllowed'
                ? false
                : permission?.Allowed[option.requiresPermission];

            const description =
              option.type === 'group'
                ? canGateRoles()
                  ? 'Selected roles can join'
                  : 'All roles can join (You cannot create a restricted instance)'
                : option.description;

            return (
              <Button
                key={option.type}
                variant="outline"
                className="w-full h-12 py-3"
                disabled={!hasPermission}
                onClick={() => handleInstanceTypeSelect(option.type)}
              >
                <div className="flex flex-col items-start w-full">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{option.label}</span>
                    {option.type === 'group' && !canGateRoles() && (
                      <span className="text-sm text-muted-foreground">
                        (All roles)
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {description}
                  </span>
                  {!hasPermission && (
                    <span className="text-xs text-destructive">
                      Missing required permission
                    </span>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
        <Button variant="secondary" onClick={handleBack}>
          Back
        </Button>
      </div>
    );
  };

  const RoleSelectionPage = () => {
    if (isLoading || !roles) {
      return (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading roles...
        </div>
      );
    }

    return (
      <div className="space-y-4 p-4">
        <h3 className="font-medium">Select Roles</h3>

        {/* Everyone role at the top */}
        {getEveryoneRole() && (
          <div className="pb-2 border-b">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={getEveryoneRole()!.id}
                checked={selectingEveryoneRole}
                onCheckedChange={(checked) =>
                  handleRoleToggle(getEveryoneRole()!.id, checked as boolean)
                }
              />
              <label
                htmlFor={getEveryoneRole()!.id}
                className="text-sm font-medium"
              >
                Everyone
              </label>
            </div>
          </div>
        )}

        {/* Other roles below */}
        <div className="space-y-2">
          {getNonEveryoneRoles().map((role) => (
            <div key={role.id} className="flex items-center space-x-2">
              <Checkbox
                id={role.id}
                checked={stepInfo.selectedRoles.has(role.id)}
                onCheckedChange={(checked) =>
                  handleRoleToggle(role.id, checked as boolean)
                }
                disabled={isRoleDisabled(role)}
              />
              <label htmlFor={role.id} className="text-sm">
                {role.name}
                {isRoleRequired(role) &&
                  stepInfo.selectedRoles.has(role.id) &&
                  !selectingEveryoneRole &&
                  ' (Required)'}
              </label>
            </div>
          ))}
        </div>

        <div className="flex space-x-2">
          <Button variant="secondary" onClick={handleBack}>
            Back
          </Button>
          <Button onClick={() => setCurrentStep('config')}>Next</Button>
        </div>
      </div>
    );
  };

  const ConfigurationPage = () => (
    <div className="space-y-1">
      <NavigationItem
        label="Group"
        value={
          groups.find((g) => g.groupId === stepInfo.groupId)?.name ||
          'Select Group'
        }
        onClick={() => setCurrentStep('group')}
      />
      <Separator />

      <NavigationItem
        label="Instance Type"
        value={
          GROUP_INSTANCE_TYPES.find((t) => t.type === stepInfo.instanceType)
            ?.label || 'Select Type'
        }
        onClick={() => setCurrentStep('type')}
      />
      <Separator />

      {/* Role Selection if applicable */}
      {stepInfo.instanceType === 'group' && canGateRoles() && (
        <>
          <NavigationItem
            label="Roles"
            value={
              Array.from(stepInfo.selectedRoles)
                .map(
                  (roleId) => roles?.find((role) => role.id === roleId)?.name,
                )
                .join(', ') || 'Select Roles'
            }
            onClick={() => setCurrentStep('roles')}
          />
          <Separator />
        </>
      )}

      {/* Region Selection */}
      <div className="pl-4 pr-4 pb-1">
        <Label className="text-sm text-muted-foreground">Region</Label>
        <ToggleGroup
          type="single"
          value={stepInfo.region}
          onValueChange={(value) => {
            if (value)
              setStepInfo((prev) => ({ ...prev, region: value as Region }));
          }}
          className="flex gap-2 mt-1"
        >
          {['USW', 'USE', 'EU', 'JP'].map((region) => (
            <ToggleGroupItem
              key={region}
              value={region}
              className="flex-1 border py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary"
            >
              {region}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <Separator />

      {/* Queue Toggle */}
      <div className="flex items-center space-x-2 pl-4 pt-1">
        <Checkbox
          id="queue"
          checked={stepInfo.queueEnabled}
          onCheckedChange={(checked) =>
            setStepInfo((prev) => ({
              ...prev,
              queueEnabled: checked as boolean,
            }))
          }
        />
        <label htmlFor="queue" className="text-sm">
          Enable Queue
        </label>
      </div>

      <div className="flex space-x-2 items-center justify-between p-4">
        <Button variant="secondary" onClick={handleBack}>
          Back
        </Button>
        <Button variant="default" onClick={handleCreateInstance}>
          Create Instance
        </Button>
      </div>
    </div>
  );

  // Render loading state first
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm text-muted-foreground">
            {currentStep === 'group' && 'Loading groups...'}
            {currentStep === 'type' && 'Loading permissions...'}
            {currentStep === 'roles' && 'Loading roles...'}
            {currentStep === 'config' && 'Loading configuration...'}
          </p>
        </div>
      </div>
    );
  }

  // Permission loading check for type step
  if (currentStep === 'type' && !permission) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm text-muted-foreground">
            Loading permissions...
          </p>
        </div>
      </div>
    );
  }

  // Empty state only after loading is complete
  if (!isLoading && groups.length === 0) {
    return (
      <div className="text-center p-4">
        <p>No groups found</p>
        <Button variant="secondary" onClick={handleBack}>
          Back
        </Button>
      </div>
    );
  }

  // Render pages
  switch (currentStep) {
    case 'group':
      return <GroupSelectionPage />;
    case 'type':
      return <InstanceTypeSelectionPage />;
    case 'roles':
      return stepInfo.instanceType === 'group' && canGateRoles() ? (
        <RoleSelectionPage />
      ) : null;
    case 'config':
      return <ConfigurationPage />;
    default:
      return <GroupSelectionPage />;
  }
}
