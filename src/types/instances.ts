export type GroupInstanceType = 'public' | 'group+' | 'group';

export type InstanceType =
  | 'public'
  | 'group'
  | 'friends+'
  | 'friends'
  | 'invite+'
  | 'invite';

export interface GroupInstanceTypeOption {
  type: GroupInstanceType;
  label: string;
  description: string;
  requiresPermission: 'normal' | 'plus' | 'public';
}

export const GROUP_INSTANCE_TYPES: GroupInstanceTypeOption[] = [
  {
    type: 'group',
    label: 'Group Only',
    description: 'Only group members can join',
    requiresPermission: 'normal',
  },
  {
    type: 'group+',
    label: 'Group+',
    description: 'Group members and their friends can join',
    requiresPermission: 'plus',
  },
  {
    type: 'public',
    label: 'Group Public',
    description: 'Anyone can join',
    requiresPermission: 'public',
  },
];
