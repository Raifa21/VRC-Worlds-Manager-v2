use crate::definitions::{FolderModel, WorldModel};
use crate::services::folder_manager::FolderManager;
use crate::{FOLDERS, WORLDS};

#[tauri::command]
pub async fn get_folders() -> Result<Vec<String>, String> {
    FolderManager::get_folders(FOLDERS.get()).map_err(|e| {
        eprintln!("Error getting folders: {}", e);
        e.to_string()
    })
}

#[tauri::command]
pub async fn create_folder(name: String) -> Result<FolderModel, String> {
    FolderManager::create_folder(name, FOLDERS.get()).map_err(|e| {
        eprintln!("Error creating folder: {}", e);
        e.to_string()
    })
}
#[tauri::command]
pub async fn delete_folder(name: String) -> Result<(), String> {
    FolderManager::delete_folder(name, FOLDERS.get(), WORLDS.get()).map_err(|e| {
        eprintln!("Error deleting folder: {}", e);
        e.to_string()
    })
}

#[tauri::command]
pub async fn add_world_to_folder(folder_name: String, world_id: String) -> Result<(), String> {
    match FolderManager::add_world_to_folder(folder_name, world_id, FOLDERS.get(), WORLDS.get()) {
        Ok(_) => Ok(()),
        Err(e) => {
            eprintln!("Error adding world to folder: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn remove_world_from_folder(folder_name: String, world_id: String) -> Result<(), String> {
    match FolderManager::remove_world_from_folder(
        folder_name,
        world_id,
        FOLDERS.get(),
        WORLDS.get(),
    ) {
        Ok(_) => Ok(()),
        Err(e) => {
            eprintln!("Error removing world from folder: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn get_worlds(folder_name: String) -> Result<Vec<WorldModel>, String> {
    FolderManager::get_worlds(folder_name, FOLDERS.get(), WORLDS.get()).map_err(|e| {
        eprintln!("Error getting worlds: {}", e);
        e.to_string()
    })
}
