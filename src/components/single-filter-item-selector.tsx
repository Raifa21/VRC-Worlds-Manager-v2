/*
 * This file is adapted from the KonoAsset project
 * https://github.com/siloneco/KonoAsset
 * Copyright (c) 2025 siloneco and other contributors
 *
 * Further modifications by @Raifa21
 */

import { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';
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
import { commands } from '@/lib/bindings';
import { FilterItemSelectorStarredType } from '@/lib/bindings';

export type Option = {
  value: string;
  label: string;
};

interface SingleFilterItemSelectorProps {
  placeholder?: string;
  value?: string;
  candidates: Option[];
  onValueChange?: (value: string) => void;
  allowCustomValues: boolean;
  id: FilterItemSelectorStarredType; // Add ID to identify which type of starred items
}

export default function SingleFilterItemSelector({
  placeholder,
  value = '',
  candidates,
  onValueChange,
  allowCustomValues,
  id,
}: SingleFilterItemSelectorProps) {
  const { t } = useLocalization();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [starredItems, setStarredItems] = useState<string[]>([]); // Add state for starred items

  const formattedPlaceholder = placeholder ?? t('find-page:select-tag');

  // Find the selected option from candidates, or create a custom option if not found
  const selectedOption =
    candidates.find((option) => option.value === value) ||
    (value ? { value, label: value } : undefined);

  // Clear the selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange?.('');
  };

  // Handle command selection (both for candidates and custom values)
  const handleCommandSelect = (selectedValue: string) => {
    // If it's a candidate value, use it directly
    if (candidates.some((item) => item.value === selectedValue)) {
      onValueChange?.(selectedValue);
    }
    // Otherwise use the input value as a custom value
    else if (allowCustomValues && inputValue.trim()) {
      onValueChange?.(inputValue.trim());
    }

    setOpen(false);
    setInputValue('');
  };

  // Fetch starred items on component mount
  useEffect(() => {
    const fetchStarredItems = async () => {
      try {
        const result = await commands.getStarredFilterItems(id);
        if (result.status === 'ok') {
          setStarredItems(result.data);
        } else {
          console.error('Failed to fetch starred items:', result.error);
        }
      } catch (error) {
        console.error('Error fetching starred items:', error);
      }
    };
    fetchStarredItems();
  }, [id]);

  // Save starred items when they change
  useEffect(() => {
    if (!id) return;

    const saveTimeout = setTimeout(() => {
      if (starredItems.length > 0) {
        console.log(`Saving ${starredItems.length} starred items for ${id}`);
        commands.setStarredFilterItems(id, starredItems);
      } else {
        console.log(`Clearing starred items for ${id}`);
        commands.setStarredFilterItems(id, []);
      }
    }, 500);

    return () => clearTimeout(saveTimeout);
  }, [starredItems, id]);

  // Create a map for quick lookup of candidates
  const itemsMap = new Map(candidates.map((item) => [item.value, item]));

  // Convert starred items to Options
  const starredOptions = starredItems.map(
    (value) => itemsMap.get(value) || { value, label: value },
  );

  // Regular items that aren't starred
  const regularItems = candidates.filter(
    (item) => !starredItems.includes(item.value),
  );

  // Filter and combine items: starred first, then regular
  const filteredStarred = starredOptions.filter((item) =>
    item.label.toLowerCase().includes(inputValue.toLowerCase()),
  );
  const filteredRegular = regularItems.filter((item) =>
    item.label.toLowerCase().includes(inputValue.toLowerCase()),
  );

  const filteredItems = [...filteredStarred, ...filteredRegular];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between min-w-0"
        >
          <div className="flex flex-grow items-center gap-1 truncate min-w-0">
            {selectedOption ? (
              <Badge
                variant="secondary"
                className="mr-1 flex items-center max-w-[100px] truncate whitespace-nowrap"
              >
                {/* Add star icon for selected value */}
                {starredItems.includes(selectedOption.value) && (
                  <Star
                    className="h-2.5 w-2.5 mr-1 text-yellow-500"
                    fill="currentColor"
                  />
                )}
                <span className="truncate block">{selectedOption.label}</span>
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
              <span className="text-muted-foreground text-sm truncate block">
                {formattedPlaceholder}
              </span>
            )}
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        side="bottom"
        sideOffset={5}
        alignOffset={0}
        avoidCollisions
        collisionPadding={8}
      >
        <Command className="max-h-[300px]">
          <CommandInput
            placeholder={`${formattedPlaceholder}...`}
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && allowCustomValues && inputValue.trim()) {
                e.preventDefault();
                onValueChange?.(inputValue.trim());
                setOpen(false);
                setInputValue('');
              }
            }}
          />

          <CommandEmpty>
            {allowCustomValues ? (
              <div className="px-2 py-1.5 text-sm">
                <span className="truncate block">
                  {`Press Enter to use "${inputValue}"`}
                </span>
              </div>
            ) : (
              <div className="px-2 py-1.5 text-sm truncate">
                {t('find-page:no-matching-tags')}
              </div>
            )}
          </CommandEmpty>

          <CommandGroup className="overflow-y-auto max-h-[200px] scroll-container">
            {filteredItems.map((item) => {
              const isStarred = starredItems.includes(item.value);
              return (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={handleCommandSelect}
                  className={cn(
                    'cursor-pointer',
                    value === item.value ? 'font-medium bg-accent' : '',
                  )}
                >
                  {/* Add clickable star icon */}
                  <div
                    className="mr-2 flex-shrink-0 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();

                      // Store current scroll position
                      const scrollContainer =
                        e.currentTarget.closest('.scroll-container');
                      const scrollPosition = scrollContainer?.scrollTop;

                      // Toggle starred status
                      if (isStarred) {
                        setStarredItems(
                          starredItems.filter((id) => id !== item.value),
                        );
                      } else {
                        setStarredItems([...starredItems, item.value]);
                      }

                      // Restore scroll position after state update
                      if (scrollContainer && scrollPosition !== undefined) {
                        setTimeout(() => {
                          scrollContainer.scrollTop = scrollPosition;
                        }, 0);
                      }
                    }}
                  >
                    <Star
                      className={cn(
                        'h-3 w-3',
                        isStarred
                          ? 'text-yellow-500'
                          : 'text-muted-foreground/50 hover:text-muted-foreground/70',
                      )}
                      fill={isStarred ? 'currentColor' : 'none'}
                    />
                  </div>
                  <span className="truncate block">{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
