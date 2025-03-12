import { WorldCardPreview, WorldDisplayData, Platform } from './world-card';
import { CardSize } from '@/app/setup/page';
import { useState, useEffect } from 'react';

interface WorldGridProps {
  size: CardSize;
  worlds: WorldDisplayData[];
}

export function WorldGrid({ size, worlds }: WorldGridProps) {
  const cardWidths = {
    [CardSize.Compact]: 192, // w-48 = 12rem = 192px
    [CardSize.Normal]: 208, // w-52 = 13rem = 208px
    [CardSize.Expanded]: 256, // w-64 = 16rem = 256px
    [CardSize.Original]: 256, // w-64 = 16rem = 256px
  };

  const [cols, setCols] = useState(1);

  const calculateCols = () => {
    const cardWidth = cardWidths[size];
    const gap = 16;
    const padding = 32;
    const container = document.querySelector('.flex-1');
    const containerWidth = container?.clientWidth ?? window.innerWidth - 250;
    const availableWidth = containerWidth - padding;
    const totalCardWidth = cardWidth + gap;
    const numCols = Math.max(1, Math.floor(availableWidth / totalCardWidth));

    console.log({
      cardWidth,
      containerWidth,
      availableWidth,
      totalCardWidth,
      numCols,
      size,
    });

    return numCols;
  };

  useEffect(() => {
    // Initial calculation after DOM is ready
    requestAnimationFrame(() => {
      setCols(calculateCols());
    });

    const handleResize = () => setCols(calculateCols());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [size]);

  return (
    <div
      className={`grid gap-4 p-4`}
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      }}
    >
      {worlds.map((world) => (
        <WorldCardPreview key={world.worldId} size={size} world={world} />
      ))}
    </div>
  );
}
