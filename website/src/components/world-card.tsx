import React from 'react';
import { Heart } from 'lucide-react';
import Image from 'next/image';
import QPc from '@/../public/icons/VennColorQPc.svg';
import QPcQ from '@/../public/icons/VennColorQPcQ.svg';
import QQ from '@/../public/icons/VennColorQQ.svg';
import { WorldApiData } from '@/types/worlds';

interface WorldCardPreviewProps {
  world: WorldApiData;
}

export function WorldCardPreview(props: WorldCardPreviewProps) {
  const { world } = props;

  return (
    <div
      className={'border rounded-lg shadow hover:shadow-md transition-all duration-300 w-52 h-48'}
    >
      <div className="relative w-full">
        <div className="absolute top-2 right-2 z-1 bg-black/50 rounded-full p-1">
          {world.platform?.includes('android') && world.platform?.includes('standalonewindows') ? (
            <Image
              src={QPcQ}
              alt="Cross-platform"
              width={24}
              height={24}
            />
          ) : world.platform?.includes('standalonewindows') ? (
            <Image src={QPc} alt="PC only" width={24} height={24} />
          ) : world.platform?.includes('android') ? (
            <Image src={QQ} alt="Quest only" width={24} height={24} />
          ) : null}
        </div>
      </div>
      <img
        src={world.imageUrl}
        alt={world.name}
        className={`w-full h-2/3 object-cover rounded-t-lg`}
        draggable="false"
      />

    <div className="p-2 space-y-1">
        <div className="flex items-center justify-between">
        <h3 className="font-medium truncate">{world.name}</h3>
        </div>
        <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground truncate">
            {world.authorName}
        </span>
        <div className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5" />
            <span className="text-sm truncate">{world.favorites}</span>
        </div>
        </div>
    </div>
    </div>
    );
}
