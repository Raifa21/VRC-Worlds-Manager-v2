import { useEffect, useState } from 'react';
import { error, info } from '@tauri-apps/plugin-log';
import { commands } from '@/lib/bindings';
import { convertFileSrc } from '@tauri-apps/api/core';

/**
 * Custom hook to get cached image path for a world thumbnail.
 * Downloads and caches the image if not already cached.
 */
export function useCachedImage(imageUrl: string | undefined): string | null {
  const [cachedPath, setCachedPath] = useState<string | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setCachedPath(null);
      return;
    }

    let isMounted = true;

    const loadImage = async () => {
      try {
        const result = await commands.getImageCachePath(imageUrl);

        if (result.status === 'error') {
          await error(`Failed to get cached image: ${result.error}`);
          return;
        }

        if (isMounted) {
          // Convert the file path to a format that can be used in the browser
          const assetUrl = convertFileSrc(result.data);
          setCachedPath(assetUrl);
        }
      } catch (err) {
        await error(
          `Exception while getting cached image: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  return cachedPath;
}
