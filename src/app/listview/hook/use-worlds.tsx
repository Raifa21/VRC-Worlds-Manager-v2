import { commands, WorldDisplayData } from '@/lib/bindings';
import { FolderType, isUserFolder, SpecialFolders } from '@/types/folders';
import { create } from 'zustand';
import { error, info } from '@tauri-apps/plugin-log';
import { useEffect } from 'react';
import { useLocalization } from '@/hooks/use-localization';
import { toast } from 'sonner';

type FolderKey = string;

const folderKey = (folder: FolderType): FolderKey => String(folder);

type FolderEntry = {
  worlds: WorldDisplayData[];
  isLoading: boolean;
  error?: string;
};

interface WorldsStoreState {
  byKey: Record<FolderKey, FolderEntry>;
  inflight: Record<FolderKey, Promise<void> | undefined>;
  // actions
  load: (folder: FolderType, opts?: { force?: boolean }) => Promise<void>;
  setWorlds: (folder: FolderType, worlds: WorldDisplayData[]) => void;
  addWorldToFolder: (folder: FolderType, worldId: string) => Promise<void>;
  getAllWorlds: () => Promise<WorldDisplayData[]>;
  getFavoriteWorlds: () => Promise<unknown>;
}

async function fetchWorldsImpl(
  folder: FolderType,
): Promise<WorldDisplayData[]> {
  if (isUserFolder(folder)) {
    const res = await commands.getWorlds(folder as string);
    if (res.status === 'ok') return res.data;
    throw new Error(res.error);
  }
  switch (folder) {
    case SpecialFolders.All: {
      const res = await commands.getAllWorlds();
      if (res.status === 'ok') return res.data;
      throw new Error(res.error);
    }
    case SpecialFolders.Unclassified: {
      const res = await commands.getUnclassifiedWorlds();
      if (res.status === 'ok') return res.data;
      throw new Error(res.error);
    }
    case SpecialFolders.Hidden: {
      const res = await commands.getHiddenWorlds();
      if (res.status === 'ok') return res.data;
      throw new Error(res.error);
    }
    case SpecialFolders.Find:
      return [];
    default:
      throw new Error(`Unknown folder type: ${folder}`);
  }
}

export const useWorldsStore = create<WorldsStoreState>((set, get) => ({
  byKey: {},
  inflight: {},
  async load(folder, opts) {
    const key = folderKey(folder);
    const force = opts?.force === true;
    const state = get();
    if (!force && state.inflight[key]) {
      return state.inflight[key]!;
    }
    // mark loading
    set((s) => ({
      byKey: {
        ...s.byKey,
        [key]: {
          worlds: s.byKey[key]?.worlds ?? [],
          isLoading: true,
          error: undefined,
        },
      },
    }));
    const p = (async () => {
      try {
        const data = await fetchWorldsImpl(folder);
        set((s) => ({
          byKey: {
            ...s.byKey,
            [key]: { worlds: data, isLoading: false, error: undefined },
          },
        }));
        info(`[useWorldsStore] Loaded ${data.length} worlds for key=${key}`);
      } catch (e) {
        const msg = String(e);
        error(`[useWorldsStore] Failed to load worlds for key=${key}: ${msg}`);
        set((s) => ({
          byKey: {
            ...s.byKey,
            [key]: {
              worlds: s.byKey[key]?.worlds ?? [],
              isLoading: false,
              error: msg,
            },
          },
        }));
      } finally {
        set((s) => ({ inflight: { ...s.inflight, [key]: undefined } }));
      }
    })();
    set((s) => ({ inflight: { ...s.inflight, [key]: p } }));
    return p;
  },
  setWorlds(folder, worlds) {
    const key = folderKey(folder);
    set((s) => ({
      byKey: { ...s.byKey, [key]: { worlds, isLoading: false } },
    }));
  },
  async addWorldToFolder(folder, worldId) {
    const key = folderKey(folder);
    const res = await commands.getWorld(worldId, null);
    if (res.status === 'error') throw new Error(res.error);

    // Only call addWorldToFolder command for user folders
    if (isUserFolder(folder)) {
      await commands.addWorldToFolder(folder as string, worldId);
    }

    // optimistic update: append if not exists
    set((s) => {
      const entry = s.byKey[key] ?? { worlds: [], isLoading: false };
      const exists = entry.worlds.some((w) => w.worldId === worldId);
      const next = exists ? entry.worlds : [res.data, ...entry.worlds];
      return {
        byKey: { ...s.byKey, [key]: { ...entry, worlds: next } },
      } as any;
    });
  },
  async getAllWorlds() {
    const res = await commands.getAllWorlds();
    if (res.status === 'ok') return res.data;
    throw new Error(res.error);
  },
  async getFavoriteWorlds() {
    const res = await commands.getFavoriteWorlds();
    if (res.status === 'ok') return res.data;
    throw new Error(res.error);
  },
}));

// Public hook API compatible with previous callers
export function useWorlds(folder: FolderType) {
  const { t } = useLocalization();
  const key = folderKey(folder);
  const store = useWorldsStore();
  const entry = store.byKey[key] ?? { worlds: [], isLoading: false };

  useEffect(() => {
    store.load(folder).catch((e) => {
      error(`[useWorlds] load failed: ${String(e)}`);
      toast.error(t('general:error-title'), {
        description: t('listview-page:error-fetch-worlds'),
      });
    });
  }, [key]);

  const refresh = () => store.load(folder, { force: true });
  const addWorld = async (worldId: string) => {
    try {
      await store.addWorldToFolder(folder, worldId);
      // For special folders, refresh to get the updated data from backend
      if (!isUserFolder(folder)) {
        await refresh();
      }
      toast(t('listview-page:world-added-title'), {
        description: t('listview-page:world-added-description'),
      });
    } catch (e) {
      error(`Failed to add world: ${e}`);
      toast(t('general:error-title'), {
        description: t('listview-page:error-add-world'),
      });
    }
  };

  return {
    worlds: entry.worlds,
    isLoading: entry.isLoading,
    getAllWorlds: store.getAllWorlds,
    getFavoriteWorlds: store.getFavoriteWorlds,
    addWorld,
    refresh,
  };
}
