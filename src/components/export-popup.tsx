import React, { useEffect, useState } from 'react';
import { useLocalization } from '@/hooks/use-localization';
import { X, FileJson, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem } from '@/components/ui/command';
import { commands, FolderData } from '@/lib/bindings';
import { Checkbox } from './ui/checkbox';

export enum ExportType {
  PLS = 'pls',
}

interface ExportPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (folders: string[], export_type: ExportType) => void;
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('export-popup:title', 'Export Worlds')}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {/* Folder selection */}
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
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
                  <span className="font-mono text-xs text-muted-foreground w-10 text-right flex-shrink-0">
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
              onClick={() => onConfirm(selectedFolders, exportType)}
            >
              <FileJson className="h-4 w-4" />
              {t('export-popup:export', 'Export to')}
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
                  aria-label={t(
                    'export-popup:select-type',
                    'Select export type',
                  )}
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
