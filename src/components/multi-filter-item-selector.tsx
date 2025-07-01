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

export type Option = {
  value: string;
  label: string;
};

interface MultiFilterItemSelectorProps {
  placeholder?: string;
  values?: string[]; // Changed from value to values array
  candidates: Option[];
  onValuesChange?: (values: string[]) => void; // Changed from onValueChange
  allowCustomValues?: boolean;
  maxItems?: number; // Optional limit on selections
}

export default function MultiFilterItemSelector({
  placeholder,
  values = [], // Default to empty array
  candidates,
  onValuesChange,
  allowCustomValues = false,
  maxItems,
}: MultiFilterItemSelectorProps) {
  const { t } = useLocalization();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <div
          className={cn(
            'flex items-center justify-between w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer',
            selectedOptions.length <= 3 ? 'h-9' : 'min-h-9', // Fixed height for few items
          )}
          onClick={() => setOpen(!open)}
        >
          <div
            className={cn(
              'flex flex-wrap gap-1 flex-grow min-w-0',
              selectedOptions.length <= 3
                ? 'py-1.5'
                : 'py-1.5 max-h-[4.5rem] overflow-y-auto',
            )}
          >
            {selectedOptions.length > 0 ? (
              selectedOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant="secondary"
                  className="flex items-center gap-1 bg-muted-foreground/30 hover:bg-muted-foreground/50 text-xs pointer-events-auto h-5"
                >
                  <span className="block max-w-[80px] truncate">
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
              ))
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
              {filteredItems.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={handleCommandSelect}
                  className="cursor-pointer"
                >
                  <span className="truncate">{item.label}</span>
                </CommandItem>
              ))}
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
