import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import SingleFilterItemSelector from '@/components/single-filter-item-selector';
import { commands } from '@/lib/bindings';
import MultiFilterItemSelector from './multi-filter-item-selector';
import { useLocalization } from '@/hooks/use-localization';

interface AdvancedSearchPanelProps {
  open: boolean;
  authorFilter: string;
  onAuthorFilterChange: (author: string) => void;
  tagFilters: string[];
  onTagFiltersChange: (tags: string[]) => void;
  folderFilters: string[];
  onFolderFiltersChange: (folders: string[]) => void;
  onClose: () => void;
}

export function AdvancedSearchPanel({
  open,
  authorFilter,
  onAuthorFilterChange,
  tagFilters,
  onTagFiltersChange,
  folderFilters,
  onFolderFiltersChange,
  onClose,
}: AdvancedSearchPanelProps) {
  const { t } = useLocalization();
  const [availableAuthors, setAvailableAuthors] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [folders, setFolders] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      const loadAuthors = async () => {
        try {
          const result = await commands.getAuthorsByCount();
          if (result.status === 'ok') {
            setAvailableAuthors(result.data);
          }
        } catch (error) {
          console.error('Failed to load authors:', error);
        }
      };
      loadAuthors();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      const loadTags = async () => {
        try {
          const result = await commands.getTagsByCount();
          if (result.status === 'ok') {
            setAvailableTags(result.data);
          }
        } catch (error) {
          console.error('Failed to load tags:', error);
        }
      };
      loadTags();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      const loadFolders = async () => {
        try {
          const result = await commands.getFolders();
          if (result.status === 'ok') {
            setFolders(result.data);
          }
        } catch (error) {
          console.error('Failed to load folders:', error);
        }
      };
      loadFolders();
    }
  }, [open]);

  const handleClearAll = () => {
    onAuthorFilterChange('');
    onTagFiltersChange([]);
    onFolderFiltersChange([]);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('advanced-search:title')}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="author-filter">{t('general:author')}</Label>
            <SingleFilterItemSelector
              placeholder={t('advanced-search:search-author')}
              value={authorFilter}
              candidates={availableAuthors.map((a) => ({ label: a, value: a }))}
              onValueChange={onAuthorFilterChange}
              allowCustomValues={false}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tag-filter">{t('general:tags')}</Label>
            <MultiFilterItemSelector
              placeholder={t('advanced-search:search-tags')}
              values={tagFilters}
              candidates={availableTags.map((t) => ({ label: t, value: t }))}
              onValuesChange={onTagFiltersChange}
              allowCustomValues={false}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="folder-filter">{t('general:folders')}</Label>
            <MultiFilterItemSelector
              placeholder={t('advanced-search:search-folders')}
              values={folderFilters}
              candidates={folders.map((f) => ({ label: f, value: f }))}
              onValuesChange={onFolderFiltersChange}
              allowCustomValues={false}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClearAll}>
            {t('general:clear-all')}
          </Button>
          <Button onClick={onClose}>
            {t('advanced-search:apply-filters')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
