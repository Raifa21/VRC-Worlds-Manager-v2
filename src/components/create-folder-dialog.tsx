import { useState, useRef, useEffect } from 'react';
import { info, error } from '@tauri-apps/plugin-log';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocalization } from '@/hooks/use-localization';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string) => Promise<void>;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  onConfirm,
}: CreateFolderDialogProps) {
  const { t } = useLocalization();
  const [folderName, setFolderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  // Add refs to track composition directly
  const composingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!folderName) return;

    setIsLoading(true);
    try {
      info(`Creating folder: ${folderName}`);
      await onConfirm(folderName);
      setFolderName('');
      onOpenChange(false);
    } catch (e) {
      error(`Failed to create folder: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Add this effect to handle the F8 key issue
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F8 key handler - prevent focus loss and text selection
      if (e.key === 'F8' && document.activeElement === inputRef.current) {
        // Save current text length to restore cursor position later
        const textLength = inputRef.current?.value.length || 0;

        // Schedule focus restoration after the F8 key event completes
        setTimeout(() => {
          if (inputRef.current) {
            // Restore focus
            inputRef.current.focus();

            // Place cursor at the end of text without selection
            inputRef.current.setSelectionRange(textLength, textLength);
          }
        }, 10);
      }
    };

    // Add global key listener
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Add this effect to maintain focus when dialog is open
  useEffect(() => {
    if (open) {
      // Focus the input when dialog opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('create-folder-dialog:title')}</DialogTitle>
        </DialogHeader>
        <Input
          ref={inputRef}
          value={folderName}
          onChange={(e) => {
            // Always update the state with the current input value
            setFolderName(e.target.value);
          }}
          placeholder={t('create-folder-dialog:placeholder')}
          onKeyDown={(e) => {
            // Use the ref instead of state for immediate value
            if (e.key === 'Enter' && !composingRef.current) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          onCompositionStart={() => {
            composingRef.current = true;
            setIsComposing(true);
          }}
          onCompositionEnd={() => {
            // Set both the ref and state
            composingRef.current = false;

            // Use a timeout to ensure IME operations complete
            setTimeout(() => {
              if (inputRef.current) {
                // Make sure cursor is at the end of the text
                const textLength = inputRef.current.value.length;
                inputRef.current.setSelectionRange(textLength, textLength);
              }
              setIsComposing(false);
            }, 100);
          }}
          // Add onBlur handler to regain focus if needed during IME
          onBlur={(e) => {
            if (isComposing) {
              // If we lose focus during composition, restore it
              const textLength = inputRef.current?.value.length || 0;

              setTimeout(() => {
                if (inputRef.current) {
                  inputRef.current.focus();
                  // Place cursor at the end without selection
                  inputRef.current.setSelectionRange(textLength, textLength);
                }
              }, 10);
            }
          }}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('general:cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!folderName || isLoading}>
            {isLoading
              ? t('create-folder-dialog:creating')
              : t('create-folder-dialog:create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
