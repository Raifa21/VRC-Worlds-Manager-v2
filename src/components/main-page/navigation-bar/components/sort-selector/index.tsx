import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLocalization } from '@/hooks/use-localization';
import { SortAsc, SortDesc } from 'lucide-react';
import { FC, useCallback, useMemo } from 'react';
import {
  handleReverseSortDirection,
  handleSortFieldChange,
  SortDirection,
  SortField,
} from './logic';

type Props = {
  sortField: SortField;
  setSortField: (value: SortField) => void;
  sortDirection: SortDirection;
  setSortDirection: (value: SortDirection) => void;
};

export const SortSelector: FC<Props> = ({
  sortField,
  setSortField,
  sortDirection,
  setSortDirection,
}) => {
  const { t } = useLocalization();

  const reverseSortDirection = useCallback(() => {
    handleReverseSortDirection({ sortDirection, setSortDirection });
  }, [sortDirection]);

  const sortFieldChange = useCallback(() => {
    handleSortFieldChange({ sortField, setSortField, setSortDirection });
  }, [sortField]);

  return (
    <>
      <Select value={sortField} onValueChange={sortFieldChange}>
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder={t('world-grid:sort-placeholder')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">{t('world-grid:sort-name')}</SelectItem>
          <SelectItem value="authorName">{t('general:author')}</SelectItem>
          <SelectItem value="favorites">
            {t('world-grid:sort-favorites')}
          </SelectItem>
          <SelectItem value="dateAdded">{t('general:date-added')}</SelectItem>
          <SelectItem value="lastUpdated">
            {t('world-grid:sort-last-updated')}
          </SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        onClick={reverseSortDirection}
        className="h-9 w-9"
      >
        {sortDirection === 'asc' ? (
          <SortAsc className="h-4 w-4" />
        ) : (
          <SortDesc className="h-4 w-4" />
        )}
      </Button>
    </>
  );
};
