import React, { useMemo } from 'react';
import WorldCardSkeleton from '@/components/world-card-skeleton';

interface WorldGridSkeletonProps {
  count?: number; // approximate number of cards to show
}

// Simple skeleton grid that mimics the spacing of the real grid.
export const WorldGridSkeleton: React.FC<WorldGridSkeletonProps> = ({
  count = 12,
}) => {
  const items = useMemo(() => Array.from({ length: count }), [count]);

  return (
    <div className="pt-2 flex-1 overflow-auto relative">
      <div className="mx-auto" style={{ maxWidth: '1200px' }}>
        <div
          className="grid justify-evenly gap-x-4"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(208px, 208px))',
          }}
        >
          {items.map((_, i) => (
            <div key={i} className="my-2">
              <WorldCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorldGridSkeleton;
