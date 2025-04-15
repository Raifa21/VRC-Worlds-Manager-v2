import React from 'react';
import { useLocalization } from '@/hooks/use-localization';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface SetupLayoutProps {
  title: string;
  currentPage: number;
  children: React.ReactNode;
  onBack: () => void;
  onNext: () => void;
  isFirstPage?: boolean;
  isLastPage?: boolean;
  isMigrationPage?: boolean;
  alreadyMigrated?: boolean;
  isLoading?: boolean;
}

export function SetupLayout({
  title,
  currentPage,
  children,
  onBack,
  onNext,
  isFirstPage = false,
  isLastPage = false,
  isMigrationPage = false,
  alreadyMigrated = false,
  isLoading = false,
}: SetupLayoutProps) {
  const { t } = useLocalization();
  return (
    <div className="container max-w-2xl mx-auto p-4">
      <Progress value={currentPage * 25 - 25} className="mb-8" />
      <Card className="h-[480px]">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[355px]">{children}</CardContent>
        <CardFooter className="flex justify-between">
          <Button
            onClick={onBack}
            disabled={isFirstPage}
            variant={isFirstPage ? 'default' : 'outline'}
          >
            {t('setup-layout:back')}
          </Button>
          <Button
            onClick={onNext}
            disabled={isMigrationPage && isLoading}
            variant={
              isLastPage ? 'default' : isFirstPage ? 'default' : 'outline'
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('setup-layout:migrating')}
              </>
            ) : isFirstPage ? (
              t('setup-layout:start')
            ) : isLastPage ? (
              t('setup-layout:finish')
            ) : isMigrationPage && !alreadyMigrated ? (
              t('setup-layout:skip')
            ) : (
              t('setup-layout:next')
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
