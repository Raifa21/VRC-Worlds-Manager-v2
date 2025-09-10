'use client';

import { useEffect, useState, useRef } from 'react';
import { useLocalization } from '@/hooks/use-localization';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  CircleHelpIcon,
  Loader2,
  RefreshCcw,
  Search,
  Square,
  CheckSquare,
} from 'lucide-react';
import { commands, WorldDisplayData } from '@/lib/bindings';
import { SpecialFolders } from '@/types/folders';
import { info, error } from '@tauri-apps/plugin-log';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { WorldGrid } from '../../../components/world-grid';
import MultiFilterItemSelector from '@/components/multi-filter-item-selector';
import { useSelectedWorldsStore } from '../../../hook/use-selected-worlds';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function FindWorldsPage() {
  const { t } = useLocalization();
  const [activeTab, setActiveTab] = useState('recently-visited');
  const [recentlyVisitedWorlds, setRecentlyVisitedWorlds] = useState<
    WorldDisplayData[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<WorldDisplayData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState('popularity');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedExcludedTags, setSelectedExcludedTags] = useState<string[]>(
    [],
  );
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const findGridRef = useRef<HTMLDivElement>(null);
  const { isSelectionMode, toggleSelectionMode, clearFolderSelections } =
    useSelectedWorldsStore();

  // Add this state variable to track if a search has been performed
  const [hasSearched, setHasSearched] = useState(false);

  const fetchRecentlyVisitedWorlds = async () => {
    try {
      setIsLoading(true);
      const worlds = await commands.getRecentlyVisitedWorlds();
      if (worlds.status !== 'ok') {
        throw new Error(worlds.error);
      } else {
        info(`Fetched recently visited worlds: ${worlds.data.length}`);
        setRecentlyVisitedWorlds(worlds.data);
      }
      toast(t('find-page:fetch-recently-visited-worlds'), {
        description: t(
          'find-page:fetch-recently-visited-worlds-success',
          worlds.data.length,
        ),
        duration: 1000,
      });
    } catch (err) {
      error(`Error fetching recently visited worlds: ${String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch recently visited worlds on initial load
  useEffect(() => {
    if (recentlyVisitedWorlds.length === 0 && !isLoading) {
      fetchRecentlyVisitedWorlds();
    }
  }, []);

  // Load tags when the search tab is active
  useEffect(() => {
    const loadTags = async () => {
      try {
        const result = await commands.getTagsByCount();
        if (result.status === 'ok') {
          setAvailableTags(result.data);
        }
      } catch (err) {
        error(`Failed to load tags: ${err}`);
      }
    };

    if (activeTab === 'search') {
      loadTags();
    }
  }, [activeTab]);

  const handleSearch = async (loadMore = false) => {
    if (!loadMore) {
      // Only set this flag when performing a new search, not when loading more
      setHasSearched(true);
    }

    if (loadMore) {
      setIsLoadingMore(true);
    } else {
      setIsSearching(true);
      setCurrentPage(1); // Reset page when performing a new search
      setSearchResults([]); // Clear previous results
      setHasMoreResults(true); // Assume there are more results
    }

    try {
      const page = loadMore ? currentPage + 1 : 1;

      const result = await commands.searchWorlds(
        selectedSort,
        selectedTags,
        selectedExcludedTags,
        searchQuery,
        page,
      );

      if (result.status === 'ok') {
        info(`Search results: ${result.data.length} worlds found`);
        if (loadMore) {
          // Append new results to existing ones
          setSearchResults((prev) => [...prev, ...result.data]);
          setCurrentPage(currentPage + 1);
        } else {
          // Replace results for new search
          setSearchResults(result.data);
          setCurrentPage(1);
        }

        // Check if we've reached the end of results
        setHasMoreResults(result.data.length > 0);

        if (result.data.length === 0 && !loadMore) {
          toast(t('find-page:no-more-results'), {
            description: t('find-page:try-different-search'),
          });
        }
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      error(`Search error: ${err}`);
      toast(t('find-page:search-error'), {
        description: String(err),
      });
    } finally {
      setIsLoadingMore(false);
      setIsSearching(false);
    }
  };

  // Add this useEffect to observe when user scrolls to bottom
  useEffect(() => {
    // Only observe if we have results and more results are available
    if (
      !searchResults.length ||
      !hasMoreResults ||
      isLoadingMore ||
      isSearching
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // When the load more indicator comes into view
        if (entries[0].isIntersecting) {
          handleSearch(true);
        }
      },
      { threshold: 0.5 }, // Trigger when element is 50% visible
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [searchResults, hasMoreResults, isLoadingMore, isSearching]);

  // no external select-all; handled by grid internally when needed

  return (
    <div className="p-1 flex flex-col h-full">
      {/* Header with title and reload button */}
      <div className="flex items-center justify-between p-4 bg-background">
        <h1 className="text-xl font-bold">{t('general:find-worlds')}</h1>

        <div className="flex items-center">
          <Button
            variant="outline"
            onClick={fetchRecentlyVisitedWorlds}
            disabled={activeTab !== 'recently-visited' || isLoading}
            className={`ml-2 flex items-center gap-2 ${
              activeTab !== 'recently-visited' ? 'invisible' : ''
            }`}
          >
            <RefreshCcw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
          </Button>
          <Button
            variant={isSelectionMode ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => {
              if (isSelectionMode) {
                clearFolderSelections(SpecialFolders.Find);
                toggleSelectionMode();
              } else {
                toggleSelectionMode();
              }
            }}
            className={`ml-2 h-9 w-9 ${
              activeTab !== 'recently-visited' ? 'invisible' : ''
            }`}
          >
            {isSelectionMode ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Tab bar with full-width tabs */}
      <div className="bg-background px-4 pb-2">
        <Tabs
          defaultValue="recently-visited"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="recently-visited">
              {t('find-page:recently-visited')}
            </TabsTrigger>
            <TabsTrigger value="search">
              {t('find-page:search-worlds')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Search and filter controls */}
      {activeTab === 'search' && (
        <div className="sticky top-0 z-30 bg-background border-b">
          <Card className=" mx-4 border-0 shadow-none">
            <CardContent className="pt-4 space-y-4">
              {/* First row: Search input, Sort dropdown, and Search button */}
              <div className="flex gap-4 items-end">
                {/* Search text input */}
                <div className="flex flex-col gap-2 w-3/5">
                  <Label htmlFor="search-query">
                    {t('find-page:search-query')}
                  </Label>
                  <Input
                    id="search-query"
                    placeholder={t('find-page:search-placeholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Sort options */}
                <div className="flex flex-col gap-2 w-2/5">
                  <Label htmlFor="sort">{t('find-page:sort-by')}</Label>
                  <Select value={selectedSort} onValueChange={setSelectedSort}>
                    <SelectTrigger id="sort">
                      <SelectValue
                        placeholder={t('find-page:sort-popularity')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popularity">
                        {t('find-page:sort-popularity')}
                      </SelectItem>
                      <SelectItem value="heat">
                        {t('find-page:sort-heat')}
                      </SelectItem>
                      <SelectItem value="random">
                        {t('find-page:sort-random')}
                      </SelectItem>
                      <SelectItem value="favorites">
                        {t('find-page:sort-favorites')}
                      </SelectItem>
                      <SelectItem value="publicationDate">
                        {t('find-page:sort-publication-date')}
                      </SelectItem>
                      <SelectItem value="created">
                        {t('find-page:sort-created')}
                      </SelectItem>
                      <SelectItem value="updated">
                        {t('find-page:sort-updated')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Second row: Tag filters */}
              <div className="flex gap-4 items-start">
                {/* Tag combobox */}
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <Label htmlFor="tag">{t('find-page:tag')}</Label>
                  <MultiFilterItemSelector
                    placeholder={t('find-page:tag-placeholder')}
                    candidates={availableTags.map((tag) => ({
                      value: tag,
                      label: tag,
                    }))}
                    values={selectedTags}
                    onValuesChange={setSelectedTags}
                    allowCustomValues={true}
                    maxItems={5}
                    id="Tag"
                  />
                </div>

                {/* Exclude Tag combobox */}
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="exclude-tag">
                      {t('find-page:exclude-tag')}
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <CircleHelpIcon className="w-3 h-3 m-0" />
                        </TooltipTrigger>
                        <TooltipContent>
                          {t('find-page:exclude-tag-tooltip')}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <MultiFilterItemSelector
                    placeholder={t('find-page:exclude-tag-placeholder')}
                    candidates={[...availableTags].reverse().map((tag) => ({
                      value: tag,
                      label: tag,
                    }))}
                    values={selectedExcludedTags}
                    onValuesChange={setSelectedExcludedTags}
                    allowCustomValues={true}
                    maxItems={5}
                    id="ExcludeTag"
                  />
                </div>
                {/* Search button */}
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <Label className="invisible">
                    Invisible Label to align the button!
                    {/* <3 ciel-chan */}
                  </Label>
                  <Button
                    className="flex-shrink-0"
                    onClick={() => handleSearch(false)}
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('find-page:searching')}
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        {t('find-page:search-button')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main content area */}
      <div>
        {activeTab === 'recently-visited' && (
          <div className="flex flex-col gap-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p>{t('general:loading')}</p>
                </div>
              </div>
            ) : recentlyVisitedWorlds.length > 0 ? (
              <WorldGrid
                worlds={recentlyVisitedWorlds}
                currentFolder={SpecialFolders.Find}
                containerRef={findGridRef}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-muted-foreground">
                  {t('find-page:no-recently-visited-worlds')}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="flex flex-col gap-4 p-4">
            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="flex-1">
                <WorldGrid
                  worlds={searchResults}
                  currentFolder={SpecialFolders.Find}
                  containerRef={findGridRef}
                />

                {/* Load more indicator */}
                <div ref={loadMoreRef} className="p-4 flex justify-center">
                  {isLoadingMore ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('find-page:loading-more')}</span>
                    </div>
                  ) : hasMoreResults ? (
                    <p className="text-sm text-muted-foreground">
                      {t('find-page:scroll-for-more')}
                    </p>
                  ) : (
                    searchResults.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {t('find-page:no-more-results')}
                      </p>
                    )
                  )}
                </div>
              </div>
            )}

            {/* No results state - only show when a search has been performed */}
            {!isSearching && searchResults.length === 0 && hasSearched && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Search className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  {t('find-page:no-search-results')}
                </p>
              </div>
            )}

            {/* Initial state - show either when no search has been performed or when search query is empty */}
            {!isSearching && searchResults.length === 0 && !hasSearched && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Search className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  {t('find-page:search-instructions')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
