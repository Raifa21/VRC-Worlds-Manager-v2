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
import SingleFilterItemTextbox from './single-filter-item-textbox';
import { commands } from '@/lib/bindings';
import { info } from '@tauri-apps/plugin-log';

interface AdvancedSearchPanelProps {
  open: boolean;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onClose: () => void;
}

// Helper function to parse search query
const parseSearchQuery = (query: string) => {
  const authorMatch = query.match(/author:(\S+)/i);
  const tagMatch = query.match(/tag:(\S+)/i);
  const cleanQuery = query
    .replace(/author:\S+/gi, '')
    .replace(/tag:\S+/gi, '')
    .trim();

  return {
    text: cleanQuery,
    author: authorMatch?.[1] || '',
    tag: tagMatch?.[1] || '',
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
  const [tagFilter, setTagFilter] = useState('');
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
      setTagFilter(parsed.tag);
    }
  }, [open, searchQuery]);

  const handleClearAll = () => {
    onSearchQueryChange('');
    setAuthorFilter('');
    setTagFilter('');
  };

  const handleApplyFilters = () => {
    let query = searchQuery
      .replace(/author:\S+/gi, '')
      .replace(/tag:\S+/gi, '')
      .trim();

    if (authorFilter.trim()) query += ` author:${authorFilter.trim()}`;
    if (tagFilter.trim()) query += ` tag:${tagFilter.trim()}`;

    onSearchQueryChange(query.trim());
    setAuthorFilter('');
    setTagFilter('');
    onClose();
  };

  const handleAuthorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (authorFilter.trim()) {
        const cleanQuery = searchQuery.replace(/author:\S+/gi, '').trim();
        onSearchQueryChange(
          `${cleanQuery} author:${authorFilter.trim()}`.trim(),
        );
      }
      onClose();
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (tagFilter.trim()) {
        const cleanQuery = searchQuery.replace(/tag:\S+/gi, '').trim();
        onSearchQueryChange(`${cleanQuery} tag:${tagFilter.trim()}`.trim());
      }
      onClose();
    }
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
            <SingleFilterItemTextbox
              placeholder="Search by author name..."
              value={authorFilter}
              candidates={availableAuthors.map((a) => ({ label: a, value: a }))}
              onValueChange={(value: string) => setAuthorFilter(value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tag-filter">Tag</Label>
            <SingleFilterItemTextbox
              placeholder="Search by tag..."
              value={tagFilter}
              candidates={availableTags.map((t) => ({ label: t, value: t }))}
              onValueChange={(value: string) => setTagFilter(value)}
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
