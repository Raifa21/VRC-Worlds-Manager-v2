use crate::backup;
use crate::definitions::CardSize;
use crate::migration::MigrationService;
use crate::services::{self, ExportService};
use crate::{FOLDERS, WORLDS};

#[tauri::command]
#[specta::specta]
pub async fn create_empty_auth() -> Result<(), String> {
    services::FileService::create_empty_auth_file().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn create_empty_files() -> Result<(), String> {
    services::FileService::create_empty_folders_file()
        .and_then(|_| services::FileService::create_empty_worlds_file())
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn create_backup(backup_path: String) -> Result<(), String> {
    backup::create_backup(backup_path, WORLDS.get(), FOLDERS.get()).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn restore_from_backup(backup_path: String) -> Result<(), String> {
    backup::restore_from_backup(backup_path, WORLDS.get(), FOLDERS.get()).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn export_to_portal_library_system(
    folders: Vec<String>,
    sort_field: String,
    sort_direction: String,
) -> Result<(), String> {
    ExportService::export_to_portal_library_system(
        folders,
        FOLDERS.get(),
        WORLDS.get(),
        sort_field,
        sort_direction,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn migrate_old_data(worlds_path: String, folders_path: String) -> Result<(), String> {
    MigrationService::migrate_old_data(worlds_path, folders_path, WORLDS.get(), FOLDERS.get())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_data() -> Result<(), String> {
    services::delete_data(WORLDS.get(), FOLDERS.get())
        .await
        .map_err(|e| e.to_string())
}
