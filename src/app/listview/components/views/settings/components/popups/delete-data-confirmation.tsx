import React, { useState, useEffect, useRef } from 'react';
import { useLocalization } from '@/hooks/use-localization';
import { AlertCircle, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { info } from '@tauri-apps/plugin-log';

interface DeleteDataConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function DeleteDataConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
}: DeleteDataConfirmationDialogProps) {
  const { t } = useLocalization();
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdDuration = 3000; // 3 seconds in milliseconds
  const stepInterval = 50; // Update every 50ms

  useEffect(() => {
    if (isHolding) {
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + (stepInterval / holdDuration) * 100;
          if (newProgress >= 100) {
            // Clear interval when reaching 100%
            info('Deleting data...');
            if (intervalRef.current) clearInterval(intervalRef.current);
            setIsHolding(false);
            handleConfirm();
            return 100;
          }
          return newProgress;
        });
      }, stepInterval);
    } else {
      // Reset progress when not holding
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Only reset progress if we haven't completed
      if (progress < 100) setProgress(0);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isHolding]);

  useEffect(() => {
    if (!open) {
      setProgress(0);
      setIsHolding(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [open]);

  const handleMouseDown = () => {
    setIsHolding(true);
  };

  const handleMouseUp = () => {
    setIsHolding(false);
  };

  const handleMouseLeave = () => {
    setIsHolding(false);
  };

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (error) {
      console.error('Error during data deletion:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-destructive">
            <AlertCircle className="h-5 w-5 mr-2" />
            {t('delete-data:warning-title')}
          </DialogTitle>
          <DialogDescription className="text-destructive/90 font-medium">
            {t('delete-data:warning-description')}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 my-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              <h4 className="font-semibold text-destructive">
                {t('delete-data:deletion-warning')}
              </h4>
            </div>
            <p className="text-sm text-destructive/90">
              {t('delete-data:deletion-warning-description')}
            </p>
            <p className="text-sm font-semibold text-destructive">
              {t('delete-data:deletion-irreversible')}
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="sm:w-auto w-full"
          >
            {t('general:cancel')}
          </Button>

          <div className="relative sm:w-auto w-full">
            <Button
              variant="destructive"
              disabled={progress === 100}
              className={`relative overflow-hidden flex items-center justify-center ${
                progress > 0 && progress < 100 ? 'w-[140px]' : 'w-full'
              }`}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleMouseDown}
              onTouchEnd={handleMouseUp}
              onTouchCancel={handleMouseLeave}
            >
              <span className="flex items-center gap-2">
                {progress > 0 && progress < 100 && (
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 100 100"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Background circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeOpacity="0.2"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 45 * (progress / 100)} ${
                        2 * Math.PI * 45
                      }`}
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                )}
                <span>
                  {progress < 100
                    ? t('delete-data:hold-to-delete')
                    : t('delete-data:deleting')}
                </span>
              </span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
