'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { WorldCardPreview } from '@/components/world-card';
import { WorldApiData } from '@/types/worlds';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, Copy } from 'lucide-react';

type VRCFolder = {
  name: string;
  worlds: WorldApiData[];
}

export default function FolderPage() {
  const params = useParams();
  const uuid = params.uuid as string;
  
  const [folder, setFolder] = useState<VRCFolder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uuid) return;

    const fetchFolderData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`https://folder-sharing-worker.raifaworks.workers.dev/api/share/folder/${encodeURIComponent(uuid)}`);
        
        if (!response.ok) {
          throw new Error(`フォルダの取得に失敗しました: ${response.status}`);
        }

        const folderData: VRCFolder = await response.json();
        setFolder(folderData);
      } catch (err) {
        console.error('フォルダの取得エラー:', err);
        setError(err instanceof Error ? err.message : 'フォルダの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchFolderData();
  }, [uuid]);

  const handleInstallApp = () => {
    window.open('https://github.com/raifaworks/vrc-world-manager/releases', '_blank');
  };

  const handleImportInApp = () => {
    const deepLink = `vrc-world-manager://import-folder/${uuid}`;
    window.location.href = deepLink;
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(uuid);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* ロゴヘッダー */}
        <div className="absolute top-4 left-4 z-20">
          <h1 className="text-xl font-bold text-foreground">
        VRC Worlds Manager <span className="text-green">v2</span>
          </h1>
        </div>

        <div className="container mx-auto px-4 py-8 pt-16">
          <div className="animate-pulse">
        <div className="flex justify-between items-center mb-8">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-32 bg-muted rounded"></div>
            <div className="h-10 w-28 bg-muted rounded"></div>
            <div className="h-10 w-10 bg-muted rounded"></div>
          </div>
        </div>
        <div className="h-4 bg-muted rounded w-2/3 mb-8"></div>
        <div
          className="grid gap-6 justify-items-center"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            justifyContent: 'space-between',
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
          key={i}
          className="bg-card rounded-lg p-4 border w-full"
          style={{ maxWidth: 320, minWidth: 220 }}
            >
          <div className="h-48 bg-muted rounded mb-4"></div>
          <div className="h-4 bg-muted rounded mb-2"></div>
          <div className="h-3 bg-muted rounded w-2/3"></div>
            </div>
          ))}
        </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {/* ロゴヘッダー */}
        <div className="absolute top-4 left-4 z-20">
          <h1 className="text-xl font-bold text-foreground">
            VRC Worlds Manager <span className="text-green">v2</span>
          </h1>
        </div>

        <div className="text-center">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <Button onClick={handleInstallApp} size="sm" variant="default">
              <Download className="h-4 w-4 mr-2" />
              VRC Worlds Manager v2をインストール
            </Button>
            <Button onClick={handleImportInApp} size="sm" variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              アプリにインポート
            </Button>
            <ModeToggle />
          </div>
          <div className="text-muted-foreground text-6xl mb-4">📁</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            フォルダが見つかりません
          </h1>
          <p className="text-muted-foreground mb-6">
            要求されたフォルダが見つかりませんでした。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ロゴヘッダー */}
      <div className="absolute top-4 left-4 z-20">
        <h1 className="text-xl font-bold text-foreground">
          VRC Worlds Manager <span className="text-primary">v2</span>
        </h1>
      </div>

      <div className="container mx-auto px-4 py-8 pt-16">
        {/* ヘッダー */}
        <div className="mb-8 sticky top-0 bg-background/80 backdrop-blur-sm z-10 p-6 -mx-2 border-b">
          <div className="flex items-center justify-between mb-4">
            <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>共有フォルダ</span>
            </nav>
            <div className="flex items-center gap-2">
              <Button onClick={handleInstallApp} size="sm" variant="default">
                <Download className="h-4 w-4 mr-2" />
                VRC Worlds Manager v2をインストール
              </Button>
              <Button onClick={handleImportInApp} size="sm" variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                アプリにインポート
              </Button>
              <ModeToggle />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">
                {folder?.name}
              </h2>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-sm text-muted-foreground">
                  {folder?.worlds.length} ワールド
                </span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  ID: {uuid}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-1 ml-2"
                    onClick={handleCopyId}
                  >
                  <Copy className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ワールドグリッド */}
        {folder && folder.worlds.length > 0 ? (
            <div className="grid gap-6 justify-items-center" style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            justifyContent: 'space-between',
            }}>
            {folder.worlds.map((world) => (
              <a
              key={world.id}
              href={`https://vrchat.com/home/world/${world.id}/info`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
              style={{ textDecoration: 'none' }}
              >
              <WorldCardPreview world={world} />
              </a>
            ))}
            </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-muted-foreground text-6xl mb-4">🌍</div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              ワールドが見つかりません
            </h2>
            <p className="text-muted-foreground">
              このフォルダにはまだワールドが含まれていません。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
