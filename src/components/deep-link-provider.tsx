import { useEffect } from 'react';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { info } from '@tauri-apps/plugin-log';
import { useFolders } from '@/app/listview/hook/use-folders';

export const DeepLinkProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { importFolder } = useFolders();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    (async () => {
      unsubscribe = await onOpenUrl((urls) => {
        info(`[DeepLink] Received: ${urls}`);
        const importRegex =
          /vrc-worlds-manager:\/\/vrcwm\.raifaworks\.com\/folder\/import\/([a-zA-Z0-9-]+)/;
        const match = urls[0].match(importRegex);
        if (match && match[1]) {
          importFolder(match[1]);
        }
      });
    })();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [importFolder]);

  return <>{children}</>;
};
