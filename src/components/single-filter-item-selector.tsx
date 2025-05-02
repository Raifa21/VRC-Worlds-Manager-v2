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
  allowCustomValues?: boolean;
}

const SingleFilterItemSelector = ({
  placeholder,
  value = '',
  candidates,
  onValueChange,
  allowCustomValues = true,
}: SingleFilterItemSelectorProps) => {
  const { t } = useLocalization();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

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

  // Simple filter for candidates
  const filteredItems = candidates.filter((item) =>
    item.label.toLowerCase().includes(inputValue.toLowerCase()),
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

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        side="bottom"
        sideOffset={5}
        alignOffset={0}
        avoidCollisions={true}
        collisionPadding={8}
      >
        <Command className="max-h-[300px]">
          <CommandInput
            placeholder={t('find-page:search-tag')}
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={(e) => {
              // On Enter, use the current input value
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
                Press Enter to use "{inputValue}"
              </div>
            ) : (
              <div className="px-2 py-1.5 text-sm">
                {t('find-page:no-matching-tags')}
              </div>
            )}
          </CommandEmpty>

          <CommandGroup className="overflow-y-auto max-h-[200px]">
            {filteredItems.map((item) => (
              <CommandItem
                key={item.value}
                value={item.value}
                onSelect={handleCommandSelect}
                className={cn(
                  'cursor-pointer',
                  value === item.value ? 'font-medium bg-accent' : '',
                )}
              >
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SingleFilterItemSelector;
