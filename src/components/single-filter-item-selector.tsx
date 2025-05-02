/*
 * This file is adapted from the KonoAsset project
 * https://github.com/siloneco/KonoAsset
 * Copyright (c) 2025 siloneco and other contributors
 *
 * Further modifications by @raifa21
 */

import { useState } from 'react';
import { ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLocalization } from '@/hooks/use-localization';

export type Option = {
  value: string;
  label: string;
};

interface SingleFilterItemSelectorProps {
  placeholder?: string;
  value?: string;
  candidates: Option[];
  onValueChange?: (value: string) => void;
}

const SingleFilterItemSelector = ({
  placeholder,
  value = '',
  candidates,
  onValueChange,
}: SingleFilterItemSelectorProps) => {
  const { t } = useLocalization();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const formattedPlaceholder =
    placeholder ?? t('mainsidebar:multi-filter-item-selector:placeholder');

  const selectedOption = candidates.find((option) => option.value === value);

  // Handle selecting an item
  const handleSelect = (currentValue: string) => {
    // Toggle selection (if already selected, deselect it)
    onValueChange?.(currentValue === value ? '' : currentValue);
    setOpen(false);
  };

  // Clear the selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange?.('');
  };

  // Filter candidates based on search input
  const filteredCandidates = candidates.filter(
    (candidate) =>
      candidate.label.toLowerCase().includes(searchValue.toLowerCase()) ||
      candidate.value.toLowerCase().includes(searchValue.toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10"
        >
          <div className="flex flex-grow items-center gap-1 truncate">
            {selectedOption ? (
              <Badge
                variant="secondary"
                className="mr-1 truncate flex items-center"
              >
                <span className="truncate">{selectedOption.label}</span>
                {/* Use span instead of button to avoid nesting issues */}
                <span
                  className="ml-1 cursor-pointer rounded-full hover:bg-muted/50"
                  role="button"
                  aria-label="Clear selection"
                  tabIndex={-1}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={handleClear}
                >
                  <X className="h-3 w-3" />
                </span>
              </Badge>
            ) : (
              <span className="text-muted-foreground text-sm">
                {formattedPlaceholder}
              </span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search..."
            value={searchValue}
            onValueChange={setSearchValue}
            className="h-9"
          />
          {filteredCandidates.length === 0 ? (
            <CommandEmpty>
              {t('mainsidebar:multi-filter-item-selector:no-candidates')}
            </CommandEmpty>
          ) : (
            <CommandGroup className="max-h-64 overflow-y-auto">
              {filteredCandidates.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => handleSelect(option.value)}
                  className={cn(
                    'cursor-pointer',
                    value === option.value ? 'font-medium bg-accent' : '',
                  )}
                >
                  {/* Simple text without checkbox */}
                  <span>{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SingleFilterItemSelector;
