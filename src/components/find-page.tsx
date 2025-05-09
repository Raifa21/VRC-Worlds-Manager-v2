'use client';

import { useEffect, useState, useRef } from 'react';
import { useLocalization } from '@/hooks/use-localization';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { WorldGrid } from '@/components/world-grid';
import {
  Link,
  Loader2,
  RefreshCcw,
  Search,
  CheckSquare,
  Square,
} from 'lucide-react';
import { commands, VRChatWorld } from '@/lib/bindings';
import { WorldDisplayData, Platform } from '@/types/worlds';
import { CardSize } from '@/types/preferences';
import { SpecialFolders } from '@/types/folders';
import { info } from '@tauri-apps/plugin-log';
import { useToast } from '@/hooks/use-toast';
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
import SingleFilterItemSelector from './single-filter-item-selector';

interface FindPageProps {
  onWorldsChange: (worlds: WorldDisplayData[]) => void;
  onSelectWorld: (worldId: string) => void;
  onShowFolderDialog: (worlds: string[]) => void;
  onSelectedWorldsChange: (worlds: string[]) => void;
  clearSelection?: boolean; // Add this prop
  onClearSelectionComplete?: () => void; // Add this prop
}

export function FindPage({
  onWorldsChange,
  onSelectWorld,
  onShowFolderDialog,
  onSelectedWorldsChange,
  clearSelection,
  onClearSelectionComplete,
}: FindPageProps) {
  const { t } = useLocalization();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('recently-visited');
  const [recentlyVisitedWorlds, setRecentlyVisitedWorlds] = useState<
    VRChatWorld[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<VRChatWorld[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState('popularity');
  const [selectedTag, setSelectedTag] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const convertToWorldDisplayData = (world: VRChatWorld): WorldDisplayData => {
    return {
      worldId: world.id,
      name: world.name,
      thumbnailUrl: world.thumbnailImageUrl,
      authorName: world.authorName,
      favorites: world.favorites,
      lastUpdated: world.updated_at,
      visits: world.visits ?? 0,
      dateAdded: '',
      platform: (() => {
        const platforms = world.unityPackages.map((pkg) => pkg.platform);
        if (platforms.includes('PC') && platforms.includes('Quest')) {
          return Platform.CrossPlatform;
        } else if (platforms.includes('PC')) {
          return Platform.PC;
        } else if (platforms.includes('Quest')) {
          return Platform.Quest;
        } else {
          return Platform.PC; // Default to PC if no platform is found
        }
      })(),
      folders: [],
    };
  };

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
      toast({
        title: t('find-page:fetch-recently-visited-worlds'),
        description: t(
          'find-page:fetch-recently-visited-worlds-success',
          worlds.data.length,
        ),
        duration: 1000,
      });
    } catch (error) {
      console.error('Error fetching recently visited worlds:', error);
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

  useEffect(() => {
    const worlds = recentlyVisitedWorlds.map((world) =>
      convertToWorldDisplayData(world),
    );
    onWorldsChange(worlds);
  }, [recentlyVisitedWorlds]);

  useEffect(() => {
    const worlds = searchResults.map((world) =>
      convertToWorldDisplayData(world),
    );
    onWorldsChange(worlds);
  }, [searchResults]);

  // Load tags when the search tab is active
  useEffect(() => {
    const loadTags = async () => {
      try {
        const result = await commands.getTagsByCount();
        if (result.status === 'ok') {
          setAvailableTags(result.data);
        }
      } catch (error) {
        console.error('Failed to load tags:', error);
      }
    };

    if (activeTab === 'search') {
      loadTags();
    }
  }, [activeTab]);

  const handleSearch = async (loadMore = false) => {
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
        selectedTag,
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
          toast({
            title: t('find-page:no-more-results'),
            description: t('find-page:try-different-search'),
          });
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        variant: 'destructive',
        title: t('find-page:search-error'),
        description: String(error),
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

  // Listen for clearSelection prop changes
  useEffect(() => {
    if (clearSelection) {
      // Need to both clear selection AND exit selection mode
      setIsSelectionMode(false); // This is missing in your current code
      onSelectedWorldsChange([]);

      // Notify parent that clearing is done (only once)
      onClearSelectionComplete?.();
    }
  }, [clearSelection, onSelectedWorldsChange, onClearSelectionComplete]);

  return (
    <div className="p-1 flex flex-col h-full">
      {/* Header with title and reload button */}
      <div className="flex items-center justify-between p-4 bg-background">
        <h1 className="text-xl font-bold">{t('general:find-worlds')}</h1>

        {activeTab === 'recently-visited' && (
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRecentlyVisitedWorlds}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCcw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
          </Button>
        )}
        <Button
          variant={isSelectionMode ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => {
            setIsSelectionMode((prev) => !prev); // Toggle the local state
          }}
          className="h-10 w-10"
        >
          {isSelectionMode ? (
            <CheckSquare className="h-4 w-4" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Tab bar with full-width tabs */}
      <div className="sticky top-0 z-20 bg-background px-4 pb-2">
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

      {/* Main content area */}
      <div className="flex-1 overflow-auto">
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
                worlds={recentlyVisitedWorlds.map(convertToWorldDisplayData)}
                folderName={SpecialFolders.Find}
                initialSelectedWorlds={[]}
                onShowFolderDialog={onShowFolderDialog}
                size={CardSize.Normal}
                onOpenWorldDetails={onSelectWorld}
                onSelectedWorldsChange={onSelectedWorldsChange}
                selectionModeControl={isSelectionMode}
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
            <Card>
              <CardContent className="pt-6 space-y-4">
                {/* Search text input */}
                <div className="grid gap-2">
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
                <div className="grid gap-2">
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

                {/* Tag combobox with improved autocomplete */}
                <div className="grid gap-2">
                  <Label htmlFor="tag">{t('find-page:tag')}</Label>
                  <SingleFilterItemSelector
                    placeholder={t('find-page:tag-placeholder')}
                    candidates={availableTags.map((tag) => ({
                      value: tag,
                      label: tag,
                    }))}
                    value={selectedTag}
                    onValueChange={(value) => {
                      setSelectedTag(value);
                    }}
                  />
                </div>

                {/* Search button */}
                <Button
                  className="w-full"
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
              </CardContent>
            </Card>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="flex-1">
                <WorldGrid
                  worlds={searchResults.map(convertToWorldDisplayData)}
                  folderName={SpecialFolders.Find}
                  initialSelectedWorlds={[]}
                  onShowFolderDialog={onShowFolderDialog}
                  size={CardSize.Normal}
                  onOpenWorldDetails={onSelectWorld}
                  onSelectedWorldsChange={onSelectedWorldsChange}
                  selectionModeControl={isSelectionMode}
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

            {/* No results state */}
            {!isSearching && searchResults.length === 0 && searchQuery && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Search className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  {t('find-page:no-search-results')}
                </p>
              </div>
            )}

            {/* Initial state */}
            {!isSearching && searchResults.length === 0 && !searchQuery && (
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
