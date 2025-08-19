export enum SpecialFolders {
  All = 'All Worlds',
  Unclassified = 'Unclassified Worlds',
  Find = 'Find Worlds',
  Hidden = 'Hidden Worlds',
  NotFolder = 'not-a-folder(if you see this, something is wrong! Please report it)',
}

export type FolderType = SpecialFolders | UserFolder;

export type UserFolder = string;

export function isUserFolder(folder: FolderType): folder is UserFolder {
  return !Object.values(SpecialFolders).includes(folder as SpecialFolders);
}
