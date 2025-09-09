import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Info, Loader2, Minus, AlertCircle } from 'lucide-react';
import { commands, WorldDisplayData } from '@/lib/bindings';
import { useLocalization } from '@/hooks/use-localization';
import { Alert, AlertDescription } from '../../../../../components/ui/alert';
import { Input } from '../../../../../components/ui/input';
import { error, info } from '@tauri-apps/plugin-log';
import { Checkbox } from '../../../../../components/ui/checkbox';
import { FolderRemovalPreference } from '@/lib/bindings';
import { useFolders } from '@/app/listview/hook/use-folders';

import { usePathname } from 'next/navigation';
import { useSelectedWorldsStore } from '../../../hook/use-selected-worlds';
import { useWorlds } from '../../../hook/use-worlds';
import { useAddToFolderPopup } from './hook';
import { FolderType } from '@/types/folders';

interface AddToFolderDialogProps {
  selectedWorlds: WorldDisplayData[];
  currentFolder: FolderType;
  onClose: () => void;
}

export function AddToFolderDialog({
  selectedWorlds,
  currentFolder,
  onClose,
}: AddToFolderDialogProps) {
  const { t } = useLocalization();

  const {
    folders,
    isCreatingNew,
    setIsCreatingNew,
    newFolderName,
    setNewFolderName,
    setIsComposing,
    composingRef,
    handleNewNameKey,
    listRef,
    getFolderState,
    handleClick,
    isLoading,
    dialogPage,
    rememberChoice,
    setRememberChoice,
    handleConfirmButtonClick,
    handleRemoveFromCurrentFolder,
    handleKeepInCurrentFolder,
    handleCancel,
    isFindPage,
    createdFolder,
  } = useAddToFolderPopup({ selectedWorlds, currentFolder, onClose });

  return (
    <Dialog onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('add-to-folder-dialog:title')}</DialogTitle>
          <DialogDescription>
            {selectedWorlds?.length === 1
              ? t(
                  'add-to-folder-dialog:description-single',
                  selectedWorlds.length,
                )
              : t(
                  'add-to-folder-dialog:description-multiple',
                  selectedWorlds?.length,
                )}
          </DialogDescription>
        </DialogHeader>

        {/* Show different content based on the current page */}
        {dialogPage === 'folders' ? (
          <>
            {folders.length === 0 && (
              <div className="border border-muted rounded-md px-2 py-2 text-xs text-center">
                {t('add-to-folder-dialog:no-folders')}
              </div>
            )}
            <ScrollArea className={isFindPage ? 'h-[240px]' : 'h-[300px]'}>
              <div ref={listRef} className="space-y-2 px-2 pb-2">
                {folders.map((folder) => {
                  const isNew = folder.name === createdFolder;
                  return (
                    <Button
                      key={folder.name}
                      data-folder={folder.name}
                      variant="outline"
                      className="w-full justify-between group"
                      onClick={() => handleClick(folder.name)}
                    >
                      <span className="flex flex-row items-center w-full justify-start">
                        <span className="font-mono text-xs text-muted-foreground w-10 text-left flex-shrink-0">
                          {folder.world_count}
                        </span>
                        <span className="truncate flex-1 pr-2 text-left max-w-[290px]">
                          {folder.name}
                        </span>
                      </span>
                      <span>
                        {getFolderState(folder.name) === 'all' && <Check />}
                        {getFolderState(folder.name) === 'some' && <Minus />}
                      </span>
                    </Button>
                  );
                })}

                {isCreatingNew && (
                  <Input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      // only submit on Enter if not composing (IME)
                      if (e.key === 'Enter' && !composingRef.current) {
                        handleNewNameKey(e);
                      }
                    }}
                    onCompositionStart={() => {
                      composingRef.current = true;
                      setIsComposing(true);
                    }}
                    onCompositionEnd={() => {
                      // small timeout to ensure composition has ended
                      setTimeout(() => {
                        composingRef.current = false;
                        setIsComposing(false);
                      }, 0);
                    }}
                    onBlur={() => setIsCreatingNew(false)} // hide input on focus loss
                    disabled={isLoading}
                    autoFocus
                    placeholder={t('add-to-folder-dialog:new-placeholder')}
                    className="w-full px-2 py-1 border border-input rounded"
                  />
                )}
              </div>
            </ScrollArea>

            {/* add‐folder toggle button */}
            <div className="mt-2 px-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreatingNew(true)}
                disabled={isLoading || isCreatingNew}
                className="w-full"
              >
                + {t('add-to-folder-dialog:add-folder')}
              </Button>
            </div>

            {/* Info card for Find Page */}
            {isFindPage && (
              <Alert className="mt-2">
                <AlertDescription className="flex">
                  <Info className="h-4 w-4 mt-0.5 mr-2" />
                  {t('add-to-folder-dialog:find-page-info')}
                </AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button variant="secondary" onClick={() => handleCancel(false)}>
                {t('general:cancel')}
              </Button>
              <Button onClick={handleConfirmButtonClick} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('general:confirm')
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          // Remove confirmation page
          <div className="py-4 px-2 flex flex-col items-center gap-4">
            <Alert variant="destructive">
              <AlertDescription className="flex">
                <AlertCircle className="h-4 w-4 mt-0.5 mr-2" />
                {t('add-to-folder-dialog:remove-confirm', {
                  folder: currentFolder,
                })}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col text-center gap-1 text-sm text-muted-foreground">
              <p>{t('add-to-folder-dialog:remove-description')}</p>
            </div>

            {/* Remember choice checkbox */}
            <div className="flex items-center space-x-2 self-start mt-2">
              <Checkbox
                id="remember-choice"
                checked={rememberChoice}
                onCheckedChange={(checked) => setRememberChoice(!!checked)}
              />
              <label
                htmlFor="remember-choice"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                {t('add-to-folder-dialog:remember-choice')}
              </label>
            </div>

            <div className="flex gap-2 mt-4 justify-center w-full">
              <Button
                variant="outline"
                onClick={handleKeepInCurrentFolder}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : rememberChoice ? (
                  t('add-to-folder-dialog:always-keep')
                ) : (
                  t('add-to-folder-dialog:keep')
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemoveFromCurrentFolder}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : rememberChoice ? (
                  t('add-to-folder-dialog:always-remove')
                ) : (
                  t('add-to-folder-dialog:remove')
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
