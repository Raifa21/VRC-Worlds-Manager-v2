'use-client';

import { useLocalization } from '@/hooks/use-localization';
import { Button } from '../../ui/button';
import {
  CheckSquare,
  SortAsc,
  SortDesc,
  Square,
  TextSearch,
} from 'lucide-react';
import { SearchBarWithAdvancedSearch } from './components/search-bar-with-advanced-search';
import { SortSelector } from './components/sort-selector';
import { SortField, SortDirection } from './components/sort-selector/logic';
import { WorldDisplayData } from '@/lib/bindings';
import { useCallback, useContext, useMemo, useState } from 'react';
import { on } from 'events';

export interface NavigationBarProps {
  // recieve the worlds and return the sorted + filtered version
  setSearchQuery: (value: string) => void;
  setSortField: (value: SortField) => void;
  setSortDirection: (value: SortDirection) => void;
  // turn multi-select on/off
  isSelectionMode: boolean;
  setIsSelectionMode: (value: boolean) => void;
  // show advanced search popup
  setShowAdvancedSearch: (open: boolean) => void;
}

export function NavigationBar({
  setSearchQuery,
  setSortField,
  setSortDirection,
  isSelectionMode,
  setIsSelectionMode,
  setShowAdvancedSearch,
}: NavigationBarProps) {
  const [text, setText] = useState<string>('');
  const [sortField, setField] = useState<SortField>('name');
  const [sortDirection, setDirection] = useState<SortDirection>('desc');

  const onUpdateSearchQuery = useCallback(
    (value: string) => {
      setText(value);
      setSearchQuery(value);
    },
    [text],
  );

  const onUpdateSortField = useCallback(
    (value: SortField) => {
      setField(value);
      setSortField(value);
    },
    [sortField],
  );

  const onUpdateSortDirection = useCallback(
    (value: SortDirection) => {
      setDirection(value);
      setSortDirection(value);
    },
    [sortDirection],
  );

  return (
    <div className="p-4 flex items-center gap-4">
      <SearchBarWithAdvancedSearch
        searchQuery={text}
        setSearchQuery={onUpdateSearchQuery}
        setShowAdvancedSearch={setShowAdvancedSearch}
      />
      <div className="flex">
        <SortSelector
          sortField={sortField}
          setSortField={onUpdateSortField}
          sortDirection={sortDirection}
          setSortDirection={onUpdateSortDirection}
        />
        <Button
          variant={isSelectionMode ? 'secondary' : 'ghost'}
          onClick={() => {
            if (isSelectionMode) {
              setIsSelectionMode(false);
            } else {
              setIsSelectionMode(true);
            }
          }}
          className="h-9 w-9"
        >
          {isSelectionMode ? (
            <CheckSquare className="h-4 w-4" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
