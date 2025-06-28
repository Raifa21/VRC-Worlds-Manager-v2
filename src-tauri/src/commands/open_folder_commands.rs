use crate::services::FileService;
use tauri::{AppHandle, Manager, State};

#[tauri::command]
#[specta::specta]
pub async fn open_logs_directory(handle: State<'_, AppHandle>) -> Result<(), String> {
    let logs_dir = handle
        .path()
        .app_log_dir()
        .map_err(|_| "Failed to get logs directory".to_string())?;
    FileService::open_file(logs_dir).map_err(|e| {
        log::error!("Failed to open logs directory: {}", e);
        e.to_string()
    })
}
