/*
 * This file is adapted from the KonoAsset project
 * https://github.com/siloneco/KonoAsset
 * Copyright (c) 2025 siloneco and other contributors
 *
 * Further modifications by @raifa21
 */

import { useState, useRef, useEffect } from 'react';
import { X, Star } from 'lucide-react';
import { FilterItemSelectorStarredType } from '@/lib/bindings';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
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

export type Option = {
  value: string;
  label: string;
};

interface MultiFilterItemSelectorProps {
  placeholder?: string;
  values: string[];
  candidates: Option[];
  onValuesChange?: (values: string[]) => void;
  allowCustomValues?: boolean;
  maxItems?: number; // Optional limit on selections
  id: FilterItemSelectorStarredType; // ID to fetch starred items
}

export default function MultiFilterItemSelector({
  placeholder,
  values,
  candidates,
  onValuesChange,
  allowCustomValues = false,
  maxItems,
  id,
}: MultiFilterItemSelectorProps) {
  const { t } = useLocalization();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isMultiRow, setIsMultiRow] = useState(false);
  const [starredItems, setStarredItems] = useState<string[]>([]);
  const badgesContainerRef = useRef<HTMLDivElement>(null);

  const formattedPlaceholder = placeholder;

  // Get selected options from candidates or create custom options
  const selectedOptions = values.map(
    (value) =>
      candidates.find((option) => option.value === value) || {
        value,
        label: value,
      },
  );

  // Clear a specific selection
  const handleClear = (valueToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newValues = values.filter((v) => v !== valueToRemove);
    onValuesChange?.(newValues);
  };

  // Clear all selections
  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValuesChange?.([]);
  };

  // Handle command selection
  const handleCommandSelect = (selectedValue: string) => {
    // Don't add if already selected
    if (values.includes(selectedValue)) {
      setInputValue('');
      return;
    }

    // Don't add if max limit reached
    if (maxItems && values.length >= maxItems) {
      setInputValue('');
      return;
    }

    let newValue: string;

    // If it's a candidate value, use it directly
    if (candidates.some((item) => item.value === selectedValue)) {
      newValue = selectedValue;
    }
    // Otherwise use the input value as a custom value
    else if (allowCustomValues && inputValue.trim()) {
      newValue = inputValue.trim();
    } else {
      return;
    }

    const newValues = [...values, newValue];
    onValuesChange?.(newValues);
    setInputValue('');
    // Keep popover open for multiple selections
  };

  // Filter candidates that aren't already selected
  const filteredItems = candidates.filter(
    (item) =>
      !values.includes(item.value) &&
      item.label.toLowerCase().includes(inputValue.toLowerCase()),
  );

  // Set starred items based on the provided ID
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

  // Save starred items with debounce to reduce file writes
  useEffect(() => {
    // Skip if no id provided or on initial render with empty array
    if (!id) return;

    // Wait 500ms after changes stop before saving
    const saveTimeout = setTimeout(() => {
      if (starredItems.length > 0) {
        console.log(`Saving ${starredItems.length} starred items for ${id}`);
        commands.setStarredFilterItems(id, starredItems);
      }
    }, 500);

    // Clean up timeout if component unmounts or starredItems changes again
    return () => clearTimeout(saveTimeout);
  }, [starredItems, id]);

  // Check if the badges are taking up multiple rows
  useEffect(() => {
    const checkHeight = () => {
      if (badgesContainerRef.current) {
        const containerHeight = badgesContainerRef.current.offsetHeight;
        // If the container is taller than a typical single row (~24px), it's multi-row
        setIsMultiRow(containerHeight > 28);
      }
    };

    // Check after rendering and after any window resize
    checkHeight();
    window.addEventListener('resize', checkHeight);
    return () => window.removeEventListener('resize', checkHeight);
  }, [selectedOptions]);

  // Create a map of all candidate items for quick lookup
  const itemsMap = new Map(candidates.map((item) => [item.value, item]));

  // Convert starred items to Options, handling items that might not be in candidates
  const starredOptions = starredItems.map(
    (value) => itemsMap.get(value) || { value, label: value },
  );

  // Filter non-selected items that match the input
  const regularItems = candidates.filter(
    (item) =>
      !values.includes(item.value) &&
      item.label.toLowerCase().includes(inputValue.toLowerCase()) &&
      // Don't include items that are already in starredItems to avoid duplication
      !starredItems.includes(item.value),
  );

  // Combine the lists: starred items first, then regular items
  const combinedItems = [
    // Starred items that match the filter and aren't already selected
    ...starredOptions.filter(
      (item) =>
        !values.includes(item.value) &&
        item.label.toLowerCase().includes(inputValue.toLowerCase()),
    ),
    ...regularItems,
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <div
          className={cn(
            'flex items-center justify-between w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer',
            isMultiRow ? 'min-h-9' : 'h-9', // Use measured height instead of count
          )}
          onClick={() => setOpen(!open)}
        >
          <div
            ref={badgesContainerRef}
            className={cn(
              'flex flex-wrap gap-1 flex-grow min-w-0',
              isMultiRow ? 'py-1.5 max-h-[4.5rem] overflow-y-auto' : 'py-1.5',
            )}
          >
            {selectedOptions.length > 0 ? (
              selectedOptions.map((option) => {
                const isStarred = starredItems.includes(option.value);
                return (
                  <Badge
                    key={option.value}
                    variant="secondary"
                    className="flex items-center gap-1 bg-muted-foreground/30 hover:bg-muted-foreground/50 text-xs pointer-events-auto h-5"
                    // Stop propagation on the entire badge to prevent dropdown toggle
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Make star icon clickable */}
                    <div
                      className="flex-shrink-0 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Toggle starred status
                        if (isStarred) {
                          setStarredItems(
                            starredItems.filter((id) => id !== option.value),
                          );
                        } else {
                          setStarredItems([...starredItems, option.value]);
                        }
                      }}
                    >
                      {/* Always show the star, but style it differently based on state */}
                      <Star
                        className={cn(
                          'h-2.5 w-2.5',
                          isStarred
                            ? 'text-yellow-500'
                            : 'text-muted-foreground/30 hover:text-muted-foreground/70',
                        )}
                        fill={isStarred ? 'currentColor' : 'none'}
                      />
                    </div>
                    <span
                      className={cn(
                        'block truncate',
                        isStarred ? 'max-w-[65px]' : 'max-w-[80px]',
                      )}
                    >
                      {option.label}
                    </span>
                    <X
                      className="h-3 w-3 cursor-pointer hover:bg-muted-foreground/20 rounded-full flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClear(option.value, e);
                      }}
                    />
                  </Badge>
                );
              })
            ) : (
              <span className="text-muted-foreground text-sm">
                {formattedPlaceholder}
              </span>
            )}
          </div>
          {selectedOptions.length > 0 && (
            <X
              className="h-4 w-4 opacity-50 shrink-0 cursor-pointer hover:opacity-100 pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll(e);
              }}
            />
          )}
        </div>

        {/* Hidden trigger for positioning */}
        <PopoverTrigger asChild>
          <div className="absolute inset-0 pointer-events-none" />
        </PopoverTrigger>
      </div>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        side="bottom"
        sideOffset={5}
        alignOffset={0}
        avoidCollisions
        collisionPadding={8}
      >
        <Command>
          <CommandInput
            placeholder={`${placeholder}...`}
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && allowCustomValues && inputValue.trim()) {
                e.preventDefault();
                if (
                  !values.includes(inputValue.trim()) &&
                  (!maxItems || values.length < maxItems)
                ) {
                  const newValues = [...values, inputValue.trim()];
                  onValuesChange?.(newValues);
                  setInputValue('');
                }
              }
            }}
          />
          <CommandList>
            <CommandEmpty>
              {allowCustomValues && inputValue.trim() ? (
                <div className="p-2 text-sm">
                  {t('filter-item-selector:custom-value', inputValue.trim())}
                </div>
              ) : (
                t('general:no-results-found')
              )}
            </CommandEmpty>
            <CommandGroup className="max-h-[200px] overflow-y-auto">
              {combinedItems.map((item) => {
                const isStarred = starredItems.includes(item.value);
                return (
                  <CommandItem
                    key={item.value}
                    value={item.value}
                    onSelect={handleCommandSelect}
                    className="cursor-pointer"
                  >
                    {/* Add clickable star icon for all items */}
                    <div
                      className="mr-2 flex-shrink-0 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent item selection when clicking the star
                        // Toggle starred status
                        if (isStarred) {
                          setStarredItems(
                            starredItems.filter((id) => id !== item.value),
                          );
                        } else {
                          setStarredItems([...starredItems, item.value]);
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
                    <span className="truncate">{item.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>

          {/* Show selection count/limit if applicable */}
          {maxItems && (
            <div className="px-2 py-1 text-xs text-muted-foreground border-t">
              {t(
                'filter-item-selector:selection-limit',
                values.length,
                maxItems,
              )}
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
