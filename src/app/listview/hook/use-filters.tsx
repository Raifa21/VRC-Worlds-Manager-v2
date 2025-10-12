import { commands, WorldDisplayData } from '@/lib/bindings';
import { create } from 'zustand';
import { useEffect, useRef } from 'react';
import { toRomaji } from 'wanakana';
import { error, info } from '@tauri-apps/plugin-log';
import { toast } from 'sonner';
import { useLocalization } from '@/hooks/use-localization';

type SortField =
  | 'name'
  | 'authorName'
  | 'visits'
  | 'favorites'
  | 'capacity'
  | 'dateAdded'
  | 'lastUpdated';

interface FilterState {
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  authorFilter: string;
  tagFilters: string[];
  folderFilters: string[];
  memoTextFilter: string;
  searchQuery: string;
  filteredWorlds: WorldDisplayData[];
  availableAuthors: string[];
  availableTags: string[];
  setSortField: (field: SortField) => void;
  setSortDirection: (dir: 'asc' | 'desc') => void;
  setAuthorFilter: (author: string) => void;
  setTagFilters: (tags: string[]) => void;
  setFolderFilters: (folders: string[]) => void;
  setMemoTextFilter: (memo: string) => void;
  setSearchQuery: (query: string) => void;
  setFilteredWorlds: (worlds: WorldDisplayData[]) => void;
  setAvailableAuthors: (authors: string[]) => void;
  setAvailableTags: (tags: string[]) => void;
  clearFilters: () => void;
}

export const useWorldFiltersStore = create<FilterState>((set) => ({
  sortField: 'dateAdded',
  sortDirection: 'desc',
  authorFilter: '',
  tagFilters: [],
  folderFilters: [],
  memoTextFilter: '',
  searchQuery: '',
  filteredWorlds: [],
  availableAuthors: [],
  availableTags: [],
  setSortField: (field) =>
    set((state) => {
      const newDirection = getDefaultDirection(field);
      // Save to backend
      commands.setSortPreferences(field, newDirection).catch((e) => {
        error(`Failed to save sort preferences: ${e}`);
      });
      return {
        sortField: field,
        sortDirection: newDirection,
      };
    }),
  setSortDirection: (dir) => {
    set((state) => {
      // Save to backend
      commands.setSortPreferences(state.sortField, dir).catch((e) => {
        error(`Failed to save sort preferences: ${e}`);
      });
      return { sortDirection: dir };
    });
  },
  setAuthorFilter: (author) => set({ authorFilter: author }),
  setTagFilters: (tags) => set({ tagFilters: tags }),
  setFolderFilters: (folders) => set({ folderFilters: folders }),
  setMemoTextFilter: (memo) => set({ memoTextFilter: memo }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilteredWorlds: (worlds) => set({ filteredWorlds: worlds }),
  setAvailableAuthors: (authors) => set({ availableAuthors: authors }),
  setAvailableTags: (tags) => set({ availableTags: tags }),
  clearFilters: () =>
    set({
      authorFilter: '',
      tagFilters: [],
      folderFilters: [],
      memoTextFilter: '',
      searchQuery: '',
    }),
}));

function getDefaultDirection(field: SortField): 'asc' | 'desc' {
  switch (field) {
    case 'visits':
    case 'favorites':
    case 'capacity':
    case 'dateAdded':
    case 'lastUpdated':
      return 'desc';
    default:
      return 'asc';
  }
}

// Hook to sync worlds and filters
export function useWorldFilters(worlds: WorldDisplayData[]) {
  const {
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    authorFilter,
    setAuthorFilter,
    tagFilters,
    setTagFilters,
    folderFilters,
    setFolderFilters,
    memoTextFilter,
    setMemoTextFilter,
    clearFilters,
    filteredWorlds,
    setFilteredWorlds,
    searchQuery,
    setSearchQuery,
    availableAuthors,
    availableTags,
    setAvailableAuthors,
    setAvailableTags,
  } = useWorldFiltersStore();

  const { t } = useLocalization();
  const requestSeq = useRef(0);
  // Ensure we only attempt the backend tag fallback once per hook lifetime
  const tagsFallbackTriedRef = useRef(false);
  const sortPreferencesLoadedRef = useRef(false);

  // Load sort preferences from backend on mount
  useEffect(() => {
    if (!sortPreferencesLoadedRef.current) {
      sortPreferencesLoadedRef.current = true;
      commands
        .getSortPreferences()
        .then((result) => {
          if (result.status === 'ok') {
            const [field, direction] = result.data;
            useWorldFiltersStore.setState({
              sortField: field as SortField,
              sortDirection: direction as 'asc' | 'desc',
            });
            info(
              `[useWorldFilters] Loaded sort preferences: field=${field} direction=${direction}`,
            );
          }
        })
        .catch((e) => {
          error(`Failed to load sort preferences: ${e}`);
        });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const seq = ++requestSeq.current;

    const normalize = (s: string) => s.toLowerCase();
    const searchLower = searchQuery.trim().toLowerCase();
    const activeAuthor = authorFilter.trim().toLowerCase();
    const activeTagsLower = tagFilters.map((t) => t.toLowerCase());
    const activeFoldersLower = folderFilters.map((f) => f.toLowerCase());
    const hasMemoFilter = memoTextFilter.trim().length > 0;

    const rejectCounters = { text: 0, author: 0, tag: 0, folder: 0 };

    function passesSyncFilters(world: WorldDisplayData): boolean {
      // Text search (name / authorName + romaji variants)
      const textOk =
        !searchLower ||
        normalize(world.name).includes(searchLower) ||
        normalize(world.authorName).includes(searchLower) ||
        normalize(toRomaji(world.name)).includes(searchLower) ||
        normalize(toRomaji(world.authorName)).includes(searchLower);

      if (!textOk) {
        rejectCounters.text++;
        return false;
      }

      if (activeAuthor && normalize(world.authorName) !== activeAuthor) {
        rejectCounters.author++;
        return false;
      }

      if (activeTagsLower.length > 0) {
        if (!world.tags || world.tags.length === 0) {
          rejectCounters.tag++;
          return false;
        }
        const worldTagsLower = world.tags.map((wt) => wt.toLowerCase());
        const allTagsFound = activeTagsLower.every((tag) => {
          const prefixed = `author_tag_${tag}`;
          return worldTagsLower.some((wTag) => wTag === prefixed.toLowerCase());
        });
        if (!allTagsFound) {
          rejectCounters.tag++;
          return false;
        }
      }

      if (activeFoldersLower.length > 0) {
        const worldFoldersLower = world.folders.map((f) => f.toLowerCase());
        const allFoldersFound = activeFoldersLower.every((folder) =>
          worldFoldersLower.some((wf) => wf === folder),
        );
        if (!allFoldersFound) {
          rejectCounters.folder++;
          return false;
        }
      }

      return true;
    }

    async function run() {
      // 1. Apply synchronous filters
      const intermediate = worlds.filter(passesSyncFilters);
      if (
        authorFilter === '' &&
        tagFilters.length === 0 &&
        folderFilters.length === 0 &&
        memoTextFilter === '' &&
        searchQuery === ''
      ) {
        info(
          `[useWorldFilters] No filters active worlds=${worlds.length} intermediate=${intermediate.length}`,
        );
      }

      // 2. Memo text filtering (async)
      let memoIdSet: Set<string> | null = null;
      if (hasMemoFilter) {
        try {
          const result = await commands.searchMemoText(memoTextFilter);
          if (result.status === 'ok') {
            memoIdSet = new Set(result.data);
          } else {
            toast(t('general:error-title'), { description: result.error });
          }
        } catch (e) {
          error(`Error searching memo text: ${e}`);
          toast(t('general:error-title'), {
            description: t('listview-page:error-search-memo-text'),
          });
        }
      }

      let finalList = intermediate.filter(
        (w) => !memoIdSet || memoIdSet.has(w.worldId),
      );
      if (hasMemoFilter) {
        info(
          `[useWorldFilters] Memo filter applied memoIds=${memoIdSet ? memoIdSet.size : 0} afterMemo=${finalList.length}`,
        );
      }

      // 3. Sorting
      const dirFactor = sortDirection === 'asc' ? 1 : -1;
      finalList = finalList.slice().sort((a, b) => {
        const av = getSortValue(a, sortField);
        const bv = getSortValue(b, sortField);
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') {
          return (av - bv) * dirFactor;
        }
        return (
          String(av).localeCompare(String(bv), undefined, {
            sensitivity: 'base',
          }) * dirFactor
        );
      });

      // 4. Facets (authors & tags) based on finalList
      const authorsSet = new Set<string>();
      const tagsSet = new Set<string>();
      for (const w of finalList) {
        authorsSet.add(w.authorName);
        if (w.tags) {
          for (const rawTag of w.tags) {
            const lower = rawTag.toLowerCase();
            if (lower.startsWith('author_tag_')) {
              tagsSet.add(rawTag.substring('author_tag_'.length));
            }
          }
        }
      }
      const authorsArr = Array.from(authorsSet).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' }),
      );
      let tagsArr = Array.from(tagsSet).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' }),
      );
      if (tagsArr.length === 0 && finalList.length > 0) {
        if (!tagsFallbackTriedRef.current) {
          tagsFallbackTriedRef.current = true;
          try {
            const fallbackRes = await commands.getTagsByCount();
            if (fallbackRes.status === 'ok') {
              const fallbackTags = fallbackRes.data.map((raw) =>
                raw.toLowerCase().startsWith('author_tag_')
                  ? raw.substring('author_tag_'.length)
                  : raw,
              );
              if (fallbackTags.length > 0) {
                const merged = new Set<string>([...fallbackTags]);
                tagsArr = Array.from(merged).sort((a, b) =>
                  a.localeCompare(b, undefined, { sensitivity: 'base' }),
                );
              } else {
                info('[useWorldFilters] Fallback returned empty tag list');
              }
            } else {
              error(
                `[useWorldFilters] Fallback getTagsByCount error=${fallbackRes.error}`,
              );
            }
          } catch (e) {
            error(
              `[useWorldFilters] Exception in fallback getTagsByCount: ${e}`,
            );
          }
        }
      }
      info(
        `[useWorldFilters] Facet final authors=${authorsArr.length} tags=${tagsArr.length}`,
      );

      // 5. Commit if still latest & not cancelled (avoid redundant updates)
      if (!cancelled && seq === requestSeq.current) {
        const state = useWorldFiltersStore.getState();
        const arraysEqual = (a: any[], b: any[]) =>
          a.length === b.length && a.every((v, i) => v === b[i]);
        if (
          !arraysEqual(
            finalList.map((w) => w.worldId),
            state.filteredWorlds.map((w) => w.worldId),
          )
        ) {
          info(
            `[useWorldFilters] Updating filteredWorlds newLength=${finalList.length}`,
          );
          setFilteredWorlds(finalList);
        }
        if (!arraysEqual(authorsArr, state.availableAuthors)) {
          setAvailableAuthors(authorsArr);
        }
        if (!arraysEqual(tagsArr, state.availableTags)) {
          setAvailableTags(tagsArr);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [
    worlds,
    searchQuery,
    authorFilter,
    tagFilters,
    folderFilters,
    memoTextFilter,
    sortField,
    sortDirection,
    setFilteredWorlds,
    setAvailableAuthors,
    setAvailableTags,
    t,
  ]);

  return {
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    authorFilter,
    setAuthorFilter,
    tagFilters,
    setTagFilters,
    folderFilters,
    setFolderFilters,
    memoTextFilter,
    setMemoTextFilter,
    clearFilters,
    filteredWorlds,
    searchQuery,
    setSearchQuery,
    availableAuthors,
    availableTags,
  };
}

// Helper to extract value for sorting
function getSortValue(world: WorldDisplayData, field: SortField): any {
  switch (field) {
    case 'name':
      return world.name;
    case 'authorName':
      return world.authorName;
    case 'visits':
      return world.visits;
    case 'favorites':
      return world.favorites;
    case 'capacity':
      return world.capacity;
    case 'dateAdded':
      return world.dateAdded;
    case 'lastUpdated':
      return world.lastUpdated;
    default:
      return undefined;
  }
}
