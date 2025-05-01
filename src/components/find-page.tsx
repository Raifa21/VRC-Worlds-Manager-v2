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
        setRecentlyVisitedWorlds(worlds.data);
      }
    } catch (error) {
      console.error('Error fetching recently visited worlds:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch recently visited worlds on initial load
  useEffect(() => {
    fetchRecentlyVisitedWorlds();
  }, []);

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full h-full"
      >
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="recently-visited">
              {t('find-page:recently-visited', 'Recently Visited')}
            </TabsTrigger>
            <TabsTrigger value="search">
              {t('find-page:search-worlds', 'Search Worlds')}
            </TabsTrigger>
          </TabsList>

          {activeTab === 'recently-visited' && (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRecentlyVisitedWorlds}
              disabled={isLoading}
            >
              <RefreshCcw
                className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
              />
              {t('general:reload', 'Reload')}
            </Button>
          )}
        </div>

        <TabsContent value="recently-visited" className="flex-1 h-full">
          {isLoading && recentlyVisitedWorlds.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>{t('general:loading', 'Loading...')}</p>
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
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-muted-foreground">
                {t(
                  'find-page:no-recently-visited-worlds',
                  'No recently visited worlds found',
                )}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="search" className="flex-1 h-full">
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-muted-foreground">
              {t(
                'find-page:search-coming-soon',
                'Search functionality coming soon',
              )}
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
