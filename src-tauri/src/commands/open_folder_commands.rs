use crate::services::FileService;
use directories::BaseDirs;
use tauri::{AppHandle, Manager, State};

#[tauri::command]
#[specta::specta]
pub async fn open_logs_directory(handle: State<'_, AppHandle>) -> Result<(), String> {
    let logs_dir = handle
        .path()
        .app_log_dir()
        .map_err(|_| "Failed to get logs directory".to_string())?;
    FileService::open_path(logs_dir).map_err(|e| {
        log::error!("Failed to open logs directory: {}", e);
        e.to_string()
    })
}

#[tauri::command]
#[specta::specta]
pub async fn open_folder_directory() -> Result<(), String> {
    let folder_dir = BaseDirs::new()
        .expect("Failed to get base directories")
        .data_local_dir()
        .join("VRC_Worlds_Manager_new");
    FileService::open_path(folder_dir).map_err(|e| {
        log::error!("Failed to open folder directory: {}", e);
        e.to_string()
    })
}
