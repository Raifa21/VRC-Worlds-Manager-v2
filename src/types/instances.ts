import { Platform } from './worlds';

export type GroupInstanceType = 'public' | 'group+' | 'group';

export type InstanceType =
  | 'public'
  | 'group'
  | 'friends+'
  | 'friends'
  | 'invite+'
  | 'invite';

export type Region = 'USW' | 'USE' | 'EU' | 'JP';

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
