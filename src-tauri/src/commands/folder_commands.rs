use crate::definitions::RuntimeFolder;
use crate::services::folder_service::FolderService;
use crate::state::app_state::AppState;

#[tauri::command]
pub async fn get_folders(state: tauri::State<'_, AppState>) -> Result<Vec<RuntimeFolder>, String> {
    FolderService::get_folders(&state).map_err(|e| {
        // Log error on Rust side
        eprintln!("Error getting folders: {}", e);
        e.to_string() // Return error message as string
    })
}

#[tauri::command]
pub async fn create_folder(
    name: String,
    state: tauri::State<'_, AppState>,
) -> Result<RuntimeFolder, String> {
    match FolderService::create_folder(&state, name) {
        Ok(folder) => Ok(folder),
        Err(e) => {
            // Log error on Rust side
            eprintln!("Error creating folder: {}", e);
            Err(e.to_string()) // Return error message as string
        }
    }
}
