import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocalization } from '@/hooks/use-localization';
import {
  CheckSquare,
  SortAsc,
  SortDesc,
  Square,
  TextSearch,
  X,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSelectedWorldsStore } from '../hook/use-selected-worlds';
import { useRef } from 'react';
import { usePopupStore } from '../hook/usePopups/store';
import { useFolders } from '../hook/use-folders';
import { Badge } from '@/components/ui/badge';
import { FolderType } from '@/types/folders';
import { useWorldFiltersStore } from '../hook/use-filters';

type SortField =
  | 'name'
  | 'authorName'
  | 'visits'
  | 'favorites'
  | 'capacity'
  | 'dateAdded'
  | 'lastUpdated';

interface SearchBarProps {
  currentFolder: FolderType;
}

export function SearchBar({ currentFolder }: SearchBarProps) {
  const { t } = useLocalization();
  const {
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    searchQuery,
    setSearchQuery,
    authorFilter,
    setAuthorFilter,
    tagFilters,
    setTagFilters,
    folderFilters,
    setFolderFilters,
    memoTextFilter,
    setMemoTextFilter,
    clearFilters,
  } = useWorldFiltersStore();
  const filterRowRef = useRef<HTMLDivElement>(null);
  const authorRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const foldersRef = useRef<HTMLDivElement>(null);
  const foldersLabelRef = useRef<HTMLSpanElement>(null);
  const memoTextRef = useRef<HTMLDivElement>(null);
  const clearRef = useRef<HTMLButtonElement>(null);
  const wrapFolders = false; // behavior retained but state managed internally no-op

  const setPopup = usePopupStore((state) => state.setPopup);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
    }
  };

  const { isSelectionMode, toggleSelectionMode, clearFolderSelections } =
    useSelectedWorldsStore();

  return (
    <div className="sticky top-0 z-20 bg-background">
      <div className="p-4 flex items-center gap-4">
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <div className="relative">
              <Input
                type="text"
                placeholder={t('world-grid:search-placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 pr-10"
              />

              {/* Advanced Search button */}
              <Button
                variant="ghost"
                className="absolute right-0 top-1/2 -translate-y-1/2 h-9 w-9 p-0 m-0"
                onClick={() => setPopup('showAdvancedSearchPanel', true)}
              >
                <TextSearch className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex">
          <Select
            value={sortField}
            onValueChange={(value) => handleSort(value as SortField)}
          >
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder={t('world-grid:sort-placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">{t('world-grid:sort-name')}</SelectItem>
              <SelectItem value="authorName">{t('general:author')}</SelectItem>
              <SelectItem value="visits">
                {t('world-grid:sort-visits')}
              </SelectItem>
              <SelectItem value="favorites">
                {t('world-grid:sort-favorites')}
              </SelectItem>
              <SelectItem value="capacity">
                {t('world-grid:sort-capacity')}
              </SelectItem>
              <SelectItem value="dateAdded">
                {t('general:date-added')}
              </SelectItem>
              <SelectItem value="lastUpdated">
                {t('world-grid:sort-last-updated')}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            onClick={() =>
              setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
            }
            className="h-9 w-9"
          >
            {sortDirection === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant={isSelectionMode ? 'secondary' : 'ghost'}
            onClick={() => {
              if (isSelectionMode) {
                clearFolderSelections(currentFolder);
                toggleSelectionMode();
              } else {
                toggleSelectionMode();
              }
            }}
            className="h-9 w-9"
          >
            {isSelectionMode ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Filter Section */}
      {authorFilter ||
      tagFilters.length > 0 ||
      folderFilters.length > 0 ||
      memoTextFilter ? (
        <div className="px-4 pb-2 border-b bg-muted/50">
          {/* Header: Filters title + Clear All */}
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              {t('listview-page:active-filters')}
            </span>
            <Button
              ref={clearRef}
              variant="ghost"
              size="sm"
              onClick={() => {
                clearFilters();
              }}
              className="h-7 px-2 text-xs"
            >
              {t('general:clear-all')}
            </Button>
          </div>
          <div
            ref={filterRowRef}
            className="flex flex-wrap items-center gap-2 max-w-full"
          >
            {/* AUTHOR */}
            {authorFilter && (
              <div ref={authorRef} className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {t('general:author')}:
                </span>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <span className="max-w-[120px] truncate" title={authorFilter}>
                    {authorFilter}
                  </span>
                  <X
                    className="h-3 w-3 cursor-pointer hover:bg-muted-foreground/20 rounded-full"
                    onClick={() => setAuthorFilter('')}
                  />
                </Badge>
              </div>
            )}
            {/* MEMO TEXT - Add this block */}
            {memoTextFilter && (
              <div
                ref={memoTextRef}
                className="flex items-center gap-2 shrink-0"
              >
                <span className="text-xs text-muted-foreground">
                  {t('general:memo')}:
                </span>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <span
                    className="max-w-[120px] truncate"
                    title={memoTextFilter}
                  >
                    {memoTextFilter}
                  </span>
                  <X
                    className="h-3 w-3 cursor-pointer hover:bg-muted-foreground/20 rounded-full"
                    onClick={() => setMemoTextFilter('')}
                  />
                </Badge>
              </div>
            )}

            {/* TAGS (always row 1) */}
            {tagFilters.length > 0 && (
              <div ref={tagsRef} className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-muted-foreground shrink-0">
                  {t('general:tags')}:
                </span>
                <div className="flex items-center gap-1 overflow-hidden whitespace-nowrap">
                  {(() => {
                    const reserved = 80; // for “and X more”
                    const perBadge = 100;
                    const availW =
                      (tagsRef.current?.parentElement?.clientWidth || 0) -
                      reserved -
                      (clearRef.current?.offsetWidth || 0) -
                      (authorRef.current?.offsetWidth || 0);
                    const maxTags = Math.max(
                      1,
                      Math.min(
                        tagFilters.length,
                        Math.floor(availW / perBadge),
                      ),
                    );
                    const visible = tagFilters.slice(0, maxTags);
                    const hidden = tagFilters.length - maxTags;

                    return (
                      <>
                        {visible.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="flex items-center gap-1 overflow-hidden"
                          >
                            <span
                              className="max-w-[80px] truncate whitespace-nowrap"
                              title={tag}
                            >
                              {tag}
                            </span>
                            <X
                              className="h-3 w-3 cursor-pointer hover:bg-muted-foreground/20 rounded-full"
                              onClick={() => {
                                setTagFilters(
                                  tagFilters.filter((t) => t !== tag),
                                );
                              }}
                            />
                          </Badge>
                        ))}
                        {hidden > 0 && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {t('listview-page:items-hidden', hidden)}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
            {/* FOLDERS */}
            {folderFilters.length > 0 && (
              <div className="flex flex-col self-center gap-2 -mt-2">
                {/* Row 1: only if ≥ 2 badges fit */}
                {(() => {
                  const reserved = 80; // “and X more”
                  const perBadge = 100; // badge+gap
                  const parentW =
                    foldersRef.current?.parentElement?.clientWidth || 0;
                  const usedW =
                    (clearRef.current?.offsetWidth || 0) +
                    (authorRef.current?.offsetWidth || 0) +
                    (tagsRef.current?.offsetWidth || 0);
                  const availW = parentW - reserved - usedW;
                  const fitCount = Math.floor(availW / perBadge);
                  const showFirst = fitCount >= 2;
                  if (!showFirst) return null;

                  const visible = folderFilters.slice(0, fitCount);
                  const hidden = folderFilters.length - fitCount;

                  return (
                    <div
                      ref={foldersRef}
                      className="flex items-center gap-2 min-w-0"
                    >
                      <span
                        ref={foldersLabelRef} // ← label ref
                        className="text-xs text-muted-foreground shrink-0"
                      >
                        {t('general:folders')}:
                      </span>
                      <div className="flex items-center gap-1 overflow-hidden whitespace-nowrap">
                        {visible.map((folder) => (
                          <Badge
                            key={folder}
                            variant="secondary"
                            className="flex items-center gap-1 overflow-hidden"
                          >
                            <span
                              className="max-w-[100px] truncate whitespace-nowrap"
                              title={folder}
                            >
                              {folder}
                            </span>
                            <X
                              className="h-3 w-3 cursor-pointer hover:bg-muted-foreground/20 rounded-full flex-shrink-0"
                              onClick={() => {
                                setFolderFilters(
                                  folderFilters.filter((f) => f !== folder),
                                );
                              }}
                            />
                          </Badge>
                        ))}
                        {hidden > 0 && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {t('listview-page:items-hidden', hidden)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Row 2: show when fewer than 2 fit OR when wrapFolders is true */}
                {(() => {
                  const reserved = 80; // px for “and X more”
                  const perBadge = 100; // badge+gap
                  const parentW =
                    foldersRef.current?.parentElement?.clientWidth || 0;
                  const usedW =
                    (clearRef.current?.offsetWidth || 0) +
                    (authorRef.current?.offsetWidth || 0) +
                    (tagsRef.current?.offsetWidth || 0) +
                    (foldersLabelRef.current?.offsetWidth || 0);
                  const availW = parentW - reserved - usedW;
                  const fitCount = Math.floor(availW / perBadge);
                  const showFirst = fitCount >= 2;
                  const overflow = folderFilters.slice(fitCount);

                  if (!showFirst || wrapFolders) {
                    return (
                      <div className="mt-2 flex flex-wrap items-center gap-2 max-w-full">
                        <span className="text-xs text-muted-foreground">
                          {t('general:folders')}:
                        </span>
                        {overflow.map((folder) => (
                          <Badge
                            key={folder}
                            variant="secondary"
                            className="flex items-center gap-1 overflow-hidden"
                          >
                            <span
                              className="max-w-[100px] truncate whitespace-nowrap"
                              title={folder}
                            >
                              {folder}
                            </span>
                            <X
                              className="h-3 w-3 cursor-pointer hover:bg-muted-foreground/20 rounded-full flex-shrink-0"
                              onClick={() => {
                                setFolderFilters(
                                  folderFilters.filter((f) => f !== folder),
                                );
                              }}
                            />
                          </Badge>
                        ))}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
