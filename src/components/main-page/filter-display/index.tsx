import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLocalization } from '@/hooks/use-localization';
import { X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

export interface FilterDisplayProps {
  // recieve current filter state from advanced filter
  authorFilter: string;
  tagFilters: string[];
  folderFilters: string[];
  memoTextFilter: string;

  // remove filters
  clearAuthorFilter: () => void;
  removeTagFilter: (value: string) => void;
  removeFolderFilter: (value: string) => void;
  clearMemoTextFilter: () => void;
  clearFilters: () => void;
}

export function FilterDisplay({
  authorFilter,
  tagFilters,
  folderFilters,
  memoTextFilter,
  clearAuthorFilter,
  removeTagFilter,
  removeFolderFilter,
  clearMemoTextFilter,
  clearFilters,
}: FilterDisplayProps) {
  const { t } = useLocalization();

  const filterRowRef = useRef<HTMLDivElement>(null);
  const authorRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const foldersRef = useRef<HTMLDivElement>(null);
  const foldersLabelRef = useRef<HTMLSpanElement>(null);
  const memoTextRef = useRef<HTMLDivElement>(null);
  const clearRef = useRef<HTMLButtonElement>(null);
  const [wrapFolders, setWrapFolders] = useState(false);

  return (
    <>
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
                    onClick={() => clearAuthorFilter()}
                  />
                </Badge>
              </div>
            )}
            {/* MEMO TEXT */}
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
                    onClick={() => clearMemoTextFilter()}
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
                              onClick={() => removeTagFilter(tag)}
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
                              onClick={() => removeFolderFilter(folder)}
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
                              onClick={() => removeFolderFilter(folder)}
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
    </>
  );
}
