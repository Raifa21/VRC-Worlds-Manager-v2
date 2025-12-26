import React, { useEffect, useState } from 'react';
import { useLocalization } from '@/hooks/use-localization';
import { X, FileJson, ChevronDown, SortAsc, SortDesc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../../../components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem } from '@/components/ui/command';
import { commands, FolderData } from '@/lib/bindings';
import { Checkbox } from '../../../../../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getDefaultDirection } from '@/app/listview/hook/use-filters';

export enum ExportType {
  PLS = 'pls',
}

type SortField =
  | 'name'
  | 'authorName'
  | 'visits'
  | 'favorites'
  | 'capacity'
  | 'dateAdded'
  | 'lastUpdated';

interface ExportPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (
    folders: string[],
    export_type: ExportType,
    sortField: SortField,
    sortDirection: 'asc' | 'desc',
  ) => void;
}

export function ExportPopup({
  open,
  onOpenChange,
  onConfirm,
}: ExportPopupProps) {
  const { t } = useLocalization();
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [exportType, setExportType] = useState<ExportType>(ExportType.PLS);
  const [sortField, setSortField] = useState<SortField>('dateAdded');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    // get folders from backend
    async function fetchFolders() {
      try {
        const result = await commands.getFolders();
        if (result.status === 'ok') {
          setFolders(result.data);
        } else {
          console.error('Failed to fetch folders:', result.error);
        }
      } catch (error) {
        console.error('Error fetching folders:', error);
      }
    }
    fetchFolders();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    commands
      .getSortPreferences()
      .then((result) => {
        if (result.status === 'ok') {
          const [field, direction] = result.data;
          const coercedField = (field as SortField) ?? 'dateAdded';
          const coercedDir =
            (direction as 'asc' | 'desc') ?? getDefaultDirection(coercedField);
          setSortField(coercedField);
          setSortDirection(coercedDir);
        }
      })
      .catch((e) => {
        console.error('Failed to load sort preferences for export:', e);
      });
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('export-popup:title')}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {/* Sort options */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t('export-popup:sort-order')}
            </Label>
            <div className="flex items-center gap-2">
              <Select
                value={sortField}
                onValueChange={(value) => {
                  const field = value as SortField;
                  setSortField(field);
                  setSortDirection(getDefaultDirection(field));
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">
                    {t('world-grid:sort-name')}
                  </SelectItem>
                  <SelectItem value="authorName">
                    {t('general:author')}
                  </SelectItem>
                  <SelectItem value="visits">
                    {t('world-grid:sort-visits')}
                  </SelectItem>
                  <SelectItem value="favorites">
                    {t('world-grid:sort-favorites')}
                  </SelectItem>
                  <SelectItem value="capacity">
                    {t('world-grid:sort-capacity')}
                  </SelectItem>
                  <SelectItem value="dateAdded">
                    {t('general:date-added')}
                  </SelectItem>
                  <SelectItem value="lastUpdated">
                    {t('world-grid:sort-last-updated')}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                onClick={() =>
                  setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                }
                className="h-9 w-9"
              >
                {sortDirection === 'asc' ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          {/* Folder selection */}
          <div className="space-y-2 max-h-[250px] overflow-y-auto no-webview-scroll-bar">
            {folders.map((folder) => (
              <label
                key={folder.name}
                className="flex items-center gap-3 cursor-pointer px-2 py-1 rounded hover:bg-accent/10 h-8"
              >
                <Checkbox
                  checked={selectedFolders.includes(folder.name)}
                  onCheckedChange={(checked) => {
                    setSelectedFolders((prev) =>
                      checked
                        ? [...prev, folder.name]
                        : prev.filter((name) => name !== folder.name),
                    );
                  }}
                  className="shrink-0 self-center"
                  disabled={folder.world_count === 0}
                />
                <span className="flex items-center w-full">
                  <span
                    className={`font-mono text-xs w-10 text-right flex-shrink-0 ${
                      folder.world_count === 0
                        ? 'text-red-500'
                        : 'text-muted-foreground'
                    }`}
                  >
                    ({folder.world_count})
                  </span>
                  <span
                    className={`truncate flex-1 pl-2 -mt-[2px] ${
                      folder.world_count === 0 ? 'text-muted-foreground' : ''
                    }`}
                  >
                    {folder.name}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {/* Export button with dropdown */}
          <div className="flex items-center gap-2 pt-2">
            {/* Main export button */}
            <Button
              className="flex-1 gap-2"
              disabled={selectedFolders.length === 0}
              onClick={() =>
                onConfirm(selectedFolders, exportType, sortField, sortDirection)
              }
            >
              <FileJson className="h-4 w-4" />
              {t('export-popup:export')}
              <span className="font-semibold">
                {exportType === ExportType.PLS
                  ? 'PortalLibrarySystem'
                  : exportType}
              </span>
            </Button>
            {/* Dropdown for export type */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  aria-label={t('export-popup:select-type')}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-0">
                <Command>
                  <CommandGroup>
                    <CommandItem
                      value={ExportType.PLS}
                      onSelect={() => setExportType(ExportType.PLS)}
                      className={
                        exportType === ExportType.PLS ? 'bg-accent/20' : ''
                      }
                    >
                      PortalLibrarySystem
                    </CommandItem>
                    {/* Add more export types here if needed */}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
