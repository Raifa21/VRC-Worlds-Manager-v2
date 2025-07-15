import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocalization } from '@/hooks/use-localization';
import { TextSearch } from 'lucide-react';
import { FC } from 'react';

type Props = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  setShowAdvancedSearch: (value: boolean) => void;
};

export const SearchBarWithAdvancedSearch: FC<Props> = ({
  searchQuery,
  setSearchQuery,
  setShowAdvancedSearch,
}) => {
  const { t } = useLocalization();
  return (
    <div className="flex-1 flex items-center gap-2">
      <div className="relative flex-1">
        <div className="relative">
          <Input
            type="text"
            placeholder={t('world-grid:search-placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 pr-10"
          />

          <Button
            variant="ghost"
            className="absolute right-0 top-1/2 -translate-y-1/2 h-9 w-9 p-0 m-0"
            onClick={() => setShowAdvancedSearch(true)}
          >
            <TextSearch className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
