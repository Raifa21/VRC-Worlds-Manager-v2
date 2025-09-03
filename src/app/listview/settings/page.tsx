'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WorldCardPreview } from '@/components/world-card';
import { Platform } from '@/types/worlds';
import { FolderRemovalPreference, UpdateChannel } from '@/lib/bindings';
import {
  LogOut,
  Trash2,
  Upload,
  FolderOpen,
  Save,
  FolderUp,
} from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RestoreBackupDialog } from '@/app/listview/settings/components/popups/restore-backup-dialog';
import { MigrationPopup } from '@/app/listview/settings/components/popups/migration-popup';
import { DeleteDataConfirmationDialog } from '@/app/listview/settings/components/popups/delete-data-confirmation';
import { ExportPopup } from './components/popups/export';
import { useSettingsPage } from './hook';

export function SettingsPage() {
  const {
    cardSize,
    language,
    folderRemovalPreference,
    updateChannel,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showMigrateDialog,
    setShowMigrateDialog,
    showRestoreDialog,
    setShowRestoreDialog,
    showExportDialog,
    setShowExportDialog,
    handleExportConfirm,
    handleBackup,
    handleRestoreConfirm,
    handleMigrationConfirm,
    handleDeleteConfirm,
    handleLogout,
    handleOpenLogs,
    handleThemeChange,
    handleLanguageChange,
    handleCardSizeChange,
    handleFolderRemovalPreferenceChange,
    handleUpdateChannelChange,
    openHiddenFolder,
    t,
  } = useSettingsPage();

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">{t('general:settings')}</h1>
      <Tabs defaultValue="preferences" className="w-full">
        <div className="sticky top-0 z-10 bg-background pt-2 pb-2">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="preferences">
              {t('settings-page:section-preferences')}
            </TabsTrigger>
            <TabsTrigger value="data-management">
              {t('settings-page:section-data-management')}
            </TabsTrigger>
            <TabsTrigger value="others">
              {t('settings-page:section-others')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="preferences" className="space-y-4">
          <Card className="flex flex-row items-center justify-between p-4 rounded-lg border">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-base font-medium">
                {t('general:theme-label')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('general:theme-description')}
              </div>
            </div>
            <Select
              value={useTheme().theme || 'system'}
              onValueChange={(value) => handleThemeChange(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t('general:light')}</SelectItem>
                <SelectItem value="dark">{t('general:dark')}</SelectItem>
                <SelectItem value="system">{t('general:system')}</SelectItem>
              </SelectContent>
            </Select>
          </Card>

          <Card className="flex flex-row items-center justify-between p-4 rounded-lg border">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-base font-medium">
                {t('general:language-label')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('general:language-description')}
              </div>
            </div>
            <Select
              value={language || 'en-US'}
              onValueChange={(value) => handleLanguageChange(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ja-JP">日本語</SelectItem>
                <SelectItem value="en-US">English</SelectItem>
              </SelectContent>
            </Select>
          </Card>

          <Card className="flex flex-col items-start justify-between space-y-3 p-4 rounded-lg border">
            <div className="flex flex-row justify-between w-full">
              <div className="flex flex-col space-y-1.5">
                <Label className="text-base font-medium">
                  {t('settings-page:world-card-size')}
                </Label>
                <div className="text-sm text-muted-foreground">
                  {t('settings-page:world-card-description')}
                </div>
              </div>
              <Select
                value={cardSize || 'Normal'}
                onValueChange={handleCardSizeChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Card Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Compact">
                    {t('general:compact')}
                  </SelectItem>
                  <SelectItem value="Normal">{t('general:normal')}</SelectItem>
                  <SelectItem value="Expanded">
                    {t('general:expanded')}
                  </SelectItem>
                  <SelectItem value="Original">
                    {t('general:original')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <WorldCardPreview
              size={cardSize || 'Normal'}
              world={{
                worldId: '1',
                name: t('settings-page:preview-world'),
                thumbnailUrl: 'icons/1.png',
                authorName: t('general:author'),
                lastUpdated: '2025-02-28',
                visits: 1911,
                dateAdded: '2025-01-01',
                favorites: 616,
                platform: Platform.CrossPlatform,
                folders: [],
                tags: [],
                capacity: 16,
              }}
            />
          </Card>
        </TabsContent>

        <TabsContent value="data-management" className="space-y-4">
          <Card className="flex flex-row items-center justify-between p-4 rounded-lg border">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-base font-medium">
                {t('settings-page:hidden-folder')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('settings-page:hidden-folder-description')}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={openHiddenFolder}
              className="gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              <span className="text-sm">{t('general:open-folder')}</span>
            </Button>
          </Card>

          <Card className="flex flex-row items-center justify-between p-4 rounded-lg border">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-base font-medium">
                {t('settings-page:backup-title')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('settings-page:backup-description')}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={handleBackup}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                <span className="text-sm">
                  {t('settings-page:create-backup')}
                </span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRestoreDialog(true)}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                <span className="text-sm">
                  {t('settings-page:restore-backup')}
                </span>
              </Button>
            </div>
          </Card>
          <Card className="flex flex-row items-center justify-between p-4 rounded-lg border">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-base font-medium">
                {t('settings-page:export-title')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('settings-page:export-description')}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowExportDialog(true)}
              className="gap-2"
            >
              <FolderUp className="h-4 w-4" />
              <span className="text-sm">{t('settings-page:export-data')}</span>
            </Button>
          </Card>

          <Card className="flex flex-row items-center justify-between p-4 rounded-lg border">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-base font-medium">
                {t('settings-page:data-migration-title')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('settings-page:data-migration-description')}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowMigrateDialog(true)}
              className="gap-2"
            >
              <span className="text-sm">{t('settings-page:migrate-data')}</span>
            </Button>
          </Card>

          <Card className="flex flex-row items-center justify-between p-4 rounded-lg border border-destructive bg-destructive/5">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-base font-medium">
                {t('settings-page:data-deletion-title')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('settings-page:data-deletion-description')}
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              <span className="text-sm">
                {t('settings-page:delete-all-data')}
              </span>
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="others" className="space-y-4">
          <Card className="flex flex-row items-center justify-between p-4 rounded-lg border">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-base font-medium">
                {t('settings-page:folder-removal-title')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('settings-page:folder-removal-description')}
              </div>
            </div>
            <Select
              value={folderRemovalPreference ?? 'ask'}
              onValueChange={(value) =>
                handleFolderRemovalPreferenceChange(
                  value as FolderRemovalPreference,
                )
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Folder Removal Preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ask">
                  {t('settings-page:folder-removal-ask')}
                </SelectItem>
                <SelectItem value="neverRemove">
                  {t('settings-page:folder-removal-keep')}
                </SelectItem>
                <SelectItem value="alwaysRemove">
                  {t('settings-page:folder-removal-remove')}
                </SelectItem>
              </SelectContent>
            </Select>
          </Card>

          <Card className="flex flex-row items-center justify-between p-4 rounded-lg border">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-base font-medium">
                {t('settings-page:logs-title')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('settings-page:logs-description')}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleOpenLogs}
              className="gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              <span className="text-sm">{t('general:open-folder')}</span>
            </Button>
          </Card>

          <Card className="flex flex-row items-center justify-between p-4 rounded-lg border">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-base font-medium">
                {t('settings-page:update-channel-title')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('settings-page:update-channel-description')}
              </div>
            </div>
            <Select
              value={updateChannel || 'stable'}
              onValueChange={(value) =>
                handleUpdateChannelChange(value as UpdateChannel)
              }
            >
              <SelectTrigger className="w-fit px-2">
                <SelectValue placeholder="Update Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stable">
                  {t('settings-page:update-channel-stable')}
                </SelectItem>
                <SelectItem value="pre-release">
                  {t('settings-page:update-channel-prerelease')}
                </SelectItem>
              </SelectContent>
            </Select>
          </Card>

          <Card className="flex flex-row items-center justify-between p-4 rounded-lg border">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-base font-medium">
                {t('settings-page:logout-title')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('settings-page:logout-description')}
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="text-sm">{t('settings-page:logout')}</span>
            </Button>
          </Card>
        </TabsContent>
      </Tabs>

      <RestoreBackupDialog
        open={showRestoreDialog}
        onOpenChange={setShowRestoreDialog}
        onConfirm={handleRestoreConfirm}
      />
      <ExportPopup
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onConfirm={handleExportConfirm}
      />
      <MigrationPopup
        open={showMigrateDialog}
        onOpenChange={setShowMigrateDialog}
        onConfirm={handleMigrationConfirm}
      />
      <DeleteDataConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
