use crate::definitions::WorldDisplayData;
use crate::services::folder_manager::FolderManager;
use crate::services::share_service;
use crate::{FOLDERS, WORLDS};

#[tauri::command]
#[specta::specta]
pub async fn add_world_to_folder(folder_name: String, world_id: String) -> Result<(), String> {
    match FolderManager::add_world_to_folder(folder_name, world_id, FOLDERS.get(), WORLDS.get()) {
        Ok(_) => Ok(()),
        Err(e) => {
            log::error!("Error adding world to folder: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn remove_world_from_folder(folder_name: String, world_id: String) -> Result<(), String> {
    match FolderManager::remove_world_from_folder(
        folder_name,
        world_id,
        FOLDERS.get(),
        WORLDS.get(),
    ) {
        Ok(_) => Ok(()),
        Err(e) => {
            log::error!("Error removing world from folder: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn hide_world(world_id: String) -> Result<(), String> {
    match FolderManager::hide_world(world_id, FOLDERS.get(), WORLDS.get()) {
        Ok(_) => Ok(()),
        Err(e) => {
            log::error!("Error hiding world: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn unhide_world(world_id: String) -> Result<(), String> {
    match FolderManager::unhide_world(world_id, FOLDERS.get(), WORLDS.get()) {
        Ok(_) => Ok(()),
        Err(e) => {
            log::error!("Error unhiding world: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn get_folders() -> Result<Vec<String>, String> {
    FolderManager::get_folders(FOLDERS.get()).map_err(|e| {
        log::error!("Error getting folders: {}", e);
        e.to_string()
    })
}

#[tauri::command]
#[specta::specta]
pub async fn create_folder(name: String) -> Result<String, String> {
    log::info!("Creating folder: {}", name);
    FolderManager::create_folder(name, FOLDERS.get()).map_err(|e| {
        log::error!("Error creating folder: {}", e);
        e.to_string()
    })
}
#[tauri::command]
#[specta::specta]
pub async fn delete_folder(name: String) -> Result<(), String> {
    FolderManager::delete_folder(name, FOLDERS.get(), WORLDS.get()).map_err(|e| {
        log::error!("Error deleting folder: {}", e);
        e.to_string()
    })
}

#[tauri::command]
#[specta::specta]
pub async fn move_folder(folder_name: String, new_index: usize) -> Result<(), String> {
    FolderManager::move_folder(folder_name, new_index, FOLDERS.get()).map_err(|e| {
        log::error!("Error moving folder: {}", e);
        e.to_string()
    })
}

#[tauri::command]
#[specta::specta]
pub async fn rename_folder(old_name: String, new_name: String) -> Result<(), String> {
    FolderManager::rename_folder(old_name, new_name, FOLDERS.get(), WORLDS.get()).map_err(|e| {
        log::error!("Error renaming folder: {}", e);
        e.to_string()
    })
}

#[tauri::command]
#[specta::specta]
pub async fn get_worlds(folder_name: String) -> Result<Vec<WorldDisplayData>, String> {
    FolderManager::get_worlds(folder_name, FOLDERS.get(), WORLDS.get()).map_err(|e| {
        log::error!("Error getting worlds: {}", e);
        e.to_string()
    })
}

#[tauri::command]
#[specta::specta]
pub async fn get_all_worlds() -> Result<Vec<WorldDisplayData>, String> {
    FolderManager::get_all_worlds(WORLDS.get()).map_err(|e| {
        log::error!("Error getting all worlds: {}", e);
        e.to_string()
    })
}

#[tauri::command]
#[specta::specta]
pub async fn get_unclassified_worlds() -> Result<Vec<WorldDisplayData>, String> {
    FolderManager::get_unclassified_worlds(WORLDS.get()).map_err(|e| {
        log::error!("Error getting unclassified worlds: {}", e);
        e.to_string()
    })
}

#[tauri::command]
#[specta::specta]
pub async fn get_hidden_worlds() -> Result<Vec<WorldDisplayData>, String> {
    FolderManager::get_hidden_worlds(WORLDS.get()).map_err(|e| {
        log::error!("Error getting hidden worlds: {}", e);
        e.to_string()
    })
}

#[tauri::command]
#[specta::specta]
pub async fn get_tags_by_count() -> Result<Vec<String>, String> {
    FolderManager::get_tags_by_count(WORLDS.get()).map_err(|e| {
        log::error!("Error getting tags by count: {}", e);
        e.to_string()
    })
}

#[tauri::command]
#[specta::specta]
pub async fn get_authors_by_count() -> Result<Vec<String>, String> {
    FolderManager::get_authors_by_count(WORLDS.get()).map_err(|e| {
        log::error!("Error getting authors by count: {}", e);
        e.to_string()
    })
}

#[tauri::command]
#[specta::specta]
pub async fn delete_world(world_id: String) -> Result<(), String> {
    FolderManager::delete_world(world_id, FOLDERS.get(), WORLDS.get()).map_err(|e| {
        log::error!("Error deleting world: {}", e);
        e.to_string()
    })
}

#[tauri::command]
#[specta::specta]
pub async fn share_folder(folder_name: String) -> Result<String, String> {
    let result: Result<String, String> =
        share_service::share_folder(&folder_name, FOLDERS.get(), WORLDS.get())
            .await
            .map_err(|e| {
                log::error!("Error sharing folder: {}", e);
                e.to_string()
            });
    let share_string = match &result {
        Ok(s) => s,
        Err(e) => return Err(e.clone()),
    };
    FolderManager::set_folder_share(folder_name.clone(), FOLDERS.get(), share_string.clone())
        .map_err(|e| {
            log::error!("Error setting folder share: {}", e);
            e.to_string()
        })?;
    result
}

#[tauri::command]
#[specta::specta]
pub async fn update_folder_share(folder_name: String) -> Result<Option<String>, String> {
    let result: Result<Option<String>, String> =
        FolderManager::update_folder_share(folder_name, FOLDERS.get()).map_err(|e| {
            log::error!("Error updating folder share: {}", e);
            e.to_string()
        });
    result
}
