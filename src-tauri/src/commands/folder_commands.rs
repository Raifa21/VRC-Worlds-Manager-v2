use crate::definitions::{FolderModel, WorldModel};
use crate::services::folder_manager::FolderManager;
use crate::state::app_state::AppState;

#[tauri::command]
pub async fn get_folders(state: tauri::State<'_, AppState>) -> Result<Vec<String>, String> {
    match FolderManager::get_folders(&state) {
        Ok(folders) => Ok(folders),
        Err(e) => {
            eprintln!("Error getting folders: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn create_folder(
    name: String,
    state: tauri::State<'_, AppState>,
) -> Result<FolderModel, String> {
    match FolderManager::create_folder(&state, name) {
        Ok(folder) => Ok(folder),
        Err(e) => {
            eprintln!("Error creating folder: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn delete_folder(name: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    match FolderManager::delete_folder(&state, name) {
        Ok(_) => Ok(()),
        Err(e) => {
            eprintln!("Error deleting folder: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn add_world_to_folder(
    folder_name: String,
    world_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    match FolderManager::add_world_to_folder(&state, folder_name, world_id) {
        Ok(_) => Ok(()),
        Err(e) => {
            eprintln!("Error adding world to folder: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn remove_world_from_folder(
    folder_name: String,
    world_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    match FolderManager::remove_world_from_folder(&state, folder_name, world_id) {
        Ok(_) => Ok(()),
        Err(e) => {
            eprintln!("Error removing world from folder: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn get_worlds(
    folder_name: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<WorldModel>, String> {
    match FolderManager::get_worlds(&state, folder_name) {
        Ok(worlds) => Ok(worlds),
        Err(e) => {
            eprintln!("Error getting worlds: {}", e);
            Err(e.to_string())
        }
    }
}
