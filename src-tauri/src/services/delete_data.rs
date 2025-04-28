use crate::{services, FolderModel, WorldModel};
use std::sync::RwLock;

pub async fn delete_data(
    worlds: &RwLock<Vec<WorldModel>>,
    folders: &RwLock<Vec<FolderModel>>,
) -> Result<(), String> {
    log::info!("Deleting data");
    let mut worlds_lock = worlds.write().map_err(|e| {
        log::error!("Failed to acquire write lock for worlds: {}", e);
        "Failed to acquire write lock for worlds".to_string()
    })?;
    worlds_lock.clear();
    log::info!("Cleared existing worlds data");

    let mut folders_lock = folders.write().map_err(|e| {
        log::error!("Failed to acquire write lock for folders: {}", e);
        "Failed to acquire write lock for folders".to_string()
    })?;
    folders_lock.clear();
    log::info!("Cleared existing folders data");

    services::FileService::delete_worlds_and_folders().map_err(|e| e.to_string())?;
    Ok(())
}
