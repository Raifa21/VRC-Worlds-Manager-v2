import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { info } from '@tauri-apps/plugin-log';
import MultiFilterItemSelector from './multi-filter-item-selector';

interface AdvancedSearchPanelProps {
  open: boolean;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onClose: () => void;
}

// Helper function to parse search query
const parseSearchQuery = (query: string) => {
  const authorMatch = query.match(/author:(\S+)/i);
  const tagMatches = query.match(/tag:(\S+)/gi);
  const cleanQuery = query
    .replace(/author:\S+/gi, '')
    .replace(/tag:\S+/gi, '')
    .trim();

  return {
    text: cleanQuery,
    author: authorMatch?.[1] || '',
    tags: tagMatches
      ? tagMatches.map((match) => match.replace(/tag:/i, ''))
      : [],
  };
};

export function AdvancedSearchPanel({
  open,
  searchQuery,
  onSearchQueryChange,
  onClose,
}: AdvancedSearchPanelProps) {
  const [authorFilter, setAuthorFilter] = useState('');
  const [availableAuthors, setAvailableAuthors] = useState<string[]>([]);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      const loadTags = async () => {
        try {
          const result = await commands.getAuthorsByCount();
          if (result.status === 'ok') {
            setAvailableAuthors(result.data);
          }
        } catch (error) {
          console.error('Failed to load authors:', error);
        }
      };
      loadTags();
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

  // Sync with existing search query when dialog opens
  useEffect(() => {
    if (open) {
      const parsed = parseSearchQuery(searchQuery);
      setAuthorFilter(parsed.author);
      setTagFilters(parsed.tags);
    }
  }, [open, searchQuery]);

  const handleClearAll = () => {
    onSearchQueryChange('');
    setAuthorFilter('');
    setTagFilters([]);
  };

  const handleApplyFilters = () => {
    let query = searchQuery
      .replace(/author:\S+/gi, '')
      .replace(/tag:\S+/gi, '')
      .trim();

    if (authorFilter.trim()) query += ` author:${authorFilter.trim()}`;
    if (tagFilters.length > 0) {
      tagFilters.forEach((tag) => {
        query += ` tag:${tag.trim()}`;
      });
    }

    onSearchQueryChange(query.trim());
    setAuthorFilter('');
    setTagFilters([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Advanced Search</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="author-filter">Author</Label>
            <SingleFilterItemSelector
              placeholder="Search by author name..."
              value={authorFilter}
              candidates={availableAuthors.map((a) => ({ label: a, value: a }))}
              onValueChange={(value: string) => setAuthorFilter(value)}
              allowCustomValues={false}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tag-filter">Tags</Label>
            <MultiFilterItemSelector
              placeholder="Search by tags..."
              values={tagFilters}
              candidates={availableTags.map((t) => ({ label: t, value: t }))}
              onValuesChange={(values: string[]) => setTagFilters(values)}
              allowCustomValues={false}
              maxItems={5}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClearAll}>
            Clear All
          </Button>
          <Button onClick={handleApplyFilters}>Apply Filters</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
