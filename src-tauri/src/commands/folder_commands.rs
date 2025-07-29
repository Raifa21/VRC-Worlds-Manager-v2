use crate::definitions::{WorldApiData, WorldDisplayData, WorldModel};
use crate::services::folder_manager::FolderManager;
use crate::services::share_service;
use crate::{FOLDERS, PREFERENCES, WORLDS};
use std::collections::HashSet;

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
    FolderManager::rename_folder(
        old_name,
        new_name,
        FOLDERS.get(),
        WORLDS.get(),
        PREFERENCES.get(),
    )
    .map_err(|e| {
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
pub async fn get_folders_for_world(world_id: String) -> Result<Vec<String>, String> {
    FolderManager::get_folders_for_world(world_id, WORLDS.get()).map_err(|e| {
        log::error!("Error getting folders for world: {}", e);
        e.to_string()
    })
}

#[tauri::command]
#[specta::specta]
pub async fn share_folder(folder_name: String) -> Result<String, String> {
    let result: Result<(String, String), String> =
        share_service::share_folder(&folder_name, FOLDERS.get(), WORLDS.get())
            .await
            .map_err(|e| {
                log::error!("Error sharing folder: {}", e);
                e.to_string()
            });
    let (share_id, ts) = match &result {
        Ok(s) => s,
        Err(e) => return Err(e.clone()),
    };
    FolderManager::set_folder_share(
        folder_name.clone(),
        FOLDERS.get(),
        share_id.clone(),
        ts.clone(),
    )
    .map_err(|e| {
        log::error!("Error setting folder share: {}", e);
        e.to_string()
    })?;
    Ok(share_id.to_string())
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

#[tauri::command]
#[specta::specta]
/// Downloads a shared folder and adds its worlds to the local database.
///
/// This function attempts to download a folder using the provided `share_id`, creates the folder locally,
/// adds the worlds from the shared folder to the local world list, and then adds all non-hidden worlds to the new folder.
/// Worlds that are already hidden are not added to the folder and are returned for further handling.
///
/// # Arguments
///
/// * `share_id` - The identifier of the shared folder to download.
///
/// # Returns
///
/// `Ok((String, Vec<String>))`: A tuple containing the new folder name and a vector of world IDs that were hidden and not added to the folder.
///
/// # Errors
/// Returns an error string if any operation fails, such as downloading the folder, creating the folder, adding worlds, or retrieving hidden worlds.
pub async fn download_folder(share_id: String) -> Result<(String, Vec<WorldDisplayData>), String> {
    // Download the folder and its worlds
    let result: Result<(String, Vec<WorldApiData>), String> =
        share_service::download_folder(&share_id)
            .await
            .map_err(|e| {
                log::error!("Error downloading folder: {}", e);
                e.to_string()
            });
    let (folder_name, mut worlds) = match result {
        Ok(data) => data,
        Err(e) => return Err(e),
    };

    // Get hidden world IDs before adding new worlds
    let already_hidden = FolderManager::get_hidden_worlds(WORLDS.get()).map_err(|e| {
        log::error!("Error getting hidden worlds: {}", e);
        e.to_string()
    })?;
    let hidden_ids: HashSet<_> = already_hidden.iter().map(|w| &w.world_id).collect();

    // Partition incoming worlds into hidden and non-hidden
    let (non_hidden_worlds, hidden_worlds): (Vec<WorldApiData>, Vec<WorldApiData>) = worlds
        .drain(..)
        .partition(|world| !hidden_ids.contains(&world.world_id));

    // Add all worlds to the database in one go
    FolderManager::add_worlds(WORLDS.get(), non_hidden_worlds.clone()).map_err(|e| {
        log::error!("Error adding worlds: {}", e);
        e.to_string()
    })?;

    // Create the folder
    let new_folder_name =
        FolderManager::create_folder(folder_name, FOLDERS.get()).map_err(|e| {
            log::error!("Error creating folder: {}", e);
            e.to_string()
        })?;

    // Add only non-hidden worlds to the folder
    for world in non_hidden_worlds.iter() {
        FolderManager::add_world_to_folder(
            new_folder_name.clone(),
            world.world_id.clone(),
            FOLDERS.get(),
            WORLDS.get(),
        )
        .map_err(|e| {
            log::error!("Error adding world to folder: {}", e);
            e.to_string()
        })?;
    }

    // Convert hidden worlds to display data
    let hidden_worlds: Vec<WorldDisplayData> = hidden_worlds
        .into_iter()
        .map(WorldModel::new)
        .map(|w| w.to_display_data())
        .collect();
    Ok((new_folder_name, hidden_worlds))
}
