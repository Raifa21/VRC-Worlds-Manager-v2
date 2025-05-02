'use client';

import { useEffect, useState } from 'react';
import { useLocalization } from '@/hooks/use-localization';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { WorldGrid } from '@/components/world-grid';
import { Link, Loader2, RefreshCcw } from 'lucide-react';
import { commands, VRChatWorld } from '@/lib/bindings';
import { WorldDisplayData, Platform } from '@/types/worlds';
import { CardSize } from '@/types/preferences';
import { SpecialFolders } from '@/types/folders';
import { info } from '@tauri-apps/plugin-log';
import { useToast } from '@/hooks/use-toast';

interface FindPageProps {
  worldIds: string[];
  onSelectWorld: (worldId: string) => void;
  onDataChange: () => void;
  onShowFolderDialog?: (worlds: WorldDisplayData[]) => void;
}

export function FindPage({
  worldIds,
  onSelectWorld,
  onDataChange,
  onShowFolderDialog,
}: FindPageProps) {
  const { t } = useLocalization();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('recently-visited');
  const [recentlyVisitedWorlds, setRecentlyVisitedWorlds] = useState<
    VRChatWorld[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

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
      // Call the Tauri command to get recently visited worlds
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
                onShowFolderDialog={onShowFolderDialog}
                size={CardSize.Normal}
                onOpenWorldDetails={(worldId) => {
                  onSelectWorld(worldId);
                }}
                onWorldChange={onDataChange}
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
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground">
              {t('find-page:search-coming-soon')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
