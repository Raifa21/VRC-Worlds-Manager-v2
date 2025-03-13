use crate::definitions::{FolderModel, WorldDisplayData, WorldModel};
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
pub async fn create_folder(name: String) -> Result<String, String> {
    println!("Creating folder: {}", name);
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
pub async fn get_worlds(folder_name: String) -> Result<Vec<WorldDisplayData>, String> {
    FolderManager::get_worlds(folder_name, FOLDERS.get(), WORLDS.get()).map_err(|e| {
        eprintln!("Error getting worlds: {}", e);
        e.to_string()
    })
}

#[tauri::command]
pub async fn get_all_worlds() -> Result<Vec<WorldDisplayData>, String> {
    FolderManager::get_all_worlds(WORLDS.get()).map_err(|e| {
        eprintln!("Error getting all worlds: {}", e);
        e.to_string()
    })
}

#[tauri::command]
pub async fn get_unclassified_worlds() -> Result<Vec<WorldDisplayData>, String> {
    FolderManager::get_unclassified_worlds(WORLDS.get()).map_err(|e| {
        eprintln!("Error getting unclassified worlds: {}", e);
        e.to_string()
    })
}
