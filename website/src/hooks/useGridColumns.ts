// src/hooks/useGridColumns.ts
import { useState, useEffect, useRef } from 'react';

export function useGridColumns(cardWidth: number = 208, gap: number = 24) {
  const [columns, setColumns] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateColumns = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;
      const availableWidth = containerWidth - gap;
      const cardWithGap = cardWidth + gap;
      const calculatedColumns = Math.floor(availableWidth / cardWithGap);
      
      setColumns(Math.max(1, calculatedColumns));
    };

    // Initial calculation
    updateColumns();

    // Update on resize
    const resizeObserver = new ResizeObserver(updateColumns);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [cardWidth, gap]);

  return { containerRef, columns };
}