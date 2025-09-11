import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// A visual stand-in for a world card while data loads. Matches the "Normal" size.
export const WorldCardSkeleton: React.FC = () => {
  return (
    <div className="w-52 h-48 border rounded-lg shadow overflow-hidden">
      {/* Thumbnail area */}
      <Skeleton className="w-full h-2/3" />
      {/* Text area */}
      <div className="p-2 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    </div>
  );
};

export default WorldCardSkeleton;
