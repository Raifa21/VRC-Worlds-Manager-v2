use crate::backup::BackupMetaData;
use crate::services::FileService;
use crate::FolderModel;
use crate::WorldModel;
use chrono::Utc;
use log;
use std::fs::{self, File};
use std::io::{BufReader, BufWriter};
use std::path::Path;
use std::sync::RwLock;

pub fn restore_from_backup(
    backup_path: String,
    worlds: &RwLock<Vec<WorldModel>>,
    folders: &RwLock<Vec<FolderModel>>,
) -> Result<(), String> {
    log::info!("Restoring from backup: {}", backup_path);
    let backup_dir = Path::new(&backup_path);

    let worlds_path = backup_dir.join("worlds.json");
    let folders_path = backup_dir.join("folders.json");
    if worlds_path.exists() && folders_path.exists() {
        let file = File::open(&worlds_path).map_err(|e| e.to_string())?;
        let reader = BufReader::new(file);
        let worlds_data: Vec<WorldModel> = serde_json::from_reader(reader)
            .map_err(|e| format!("Failed to parse worlds.json: {}", e))?;

        let file = File::open(&folders_path).map_err(|e| e.to_string())?;
        let reader = BufReader::new(file);
        let folders_data: Vec<FolderModel> = serde_json::from_reader(reader)
            .map_err(|e| format!("Failed to parse folders.json: {}", e))?;

        {
            let mut worlds_lock = worlds.write().map_err(|e| {
                log::error!("Failed to acquire write lock for worlds: {}", e);
                "Failed to acquire write lock for worlds".to_string()
            })?;
            worlds_lock.clear();
            log::info!("Cleared existing worlds data");
        }
        let mut worlds_lock = worlds.write().map_err(|e| {
            log::error!("Failed to acquire write lock for worlds: {}", e);
            "Failed to acquire write lock for worlds".to_string()
        })?;
        worlds_lock.extend(worlds_data);
        FileService::write_worlds(&*worlds_lock).map_err(|e| e.to_string())?;
        log::info!("Restored {} worlds", worlds_lock.len());

        {
            let mut folders_lock = folders.write().map_err(|e| {
                log::error!("Failed to acquire write lock for folders: {}", e);
                "Failed to acquire write lock for folders".to_string()
            })?;
            folders_lock.clear();
            log::info!("Cleared existing folders data");
        }
        let mut folders_lock = folders.write().map_err(|e| {
            log::error!("Failed to acquire write lock for folders: {}", e);
            "Failed to acquire write lock for folders".to_string()
        })?;
        folders_lock.extend(folders_data);
        FileService::write_folders(&*folders_lock).map_err(|e| e.to_string())?;
        log::info!("Restored {} folders", folders_lock.len());
    } else {
        log::error!("Backup files not found in the specified path");
        return Err("Backup files not found in the specified path".to_string());
    }

    Ok(())
}

pub fn create_backup(
    backup_path: String,
    worlds: &RwLock<Vec<WorldModel>>,
    folders: &RwLock<Vec<FolderModel>>,
) -> Result<(), String> {
    log::info!("Creating backup");

    let backup_dir = Path::new(&backup_path);
    // Create timestamped backup folder
    let timestamp = Utc::now().format("%Y-%m-%d_%H-%M-%S").to_string();
    let backup_folder_name = format!("vrc_worlds_backup_{}", timestamp);
    let backup_folder = backup_dir.join(backup_folder_name);

    fs::create_dir_all(&backup_folder)
        .map_err(|e| format!("Failed to create backup folder: {}", e))?;

    // Save worlds.json
    {
        let worlds_lock = worlds
            .read()
            .map_err(|e| format!("Failed to acquire read lock for worlds: {}", e))?;
        let worlds_path = backup_folder.join("worlds.json");
        let file = File::create(&worlds_path).map_err(|e| e.to_string())?;
        let writer = BufWriter::new(file);

        serde_json::to_writer_pretty(writer, &*worlds_lock)
            .map_err(|e| format!("Failed to write worlds data: {}", e))?;

        log::info!(
            "Backed up {} worlds to {}",
            worlds_lock.len(),
            worlds_path.display()
        );
    }

    // Save folders.json
    {
        let folders_lock = folders
            .read()
            .map_err(|e| format!("Failed to acquire read lock for folders: {}", e))?;
        let folders_path = backup_folder.join("folders.json");
        let file = File::create(&folders_path).map_err(|e| e.to_string())?;
        let writer = BufWriter::new(file);

        serde_json::to_writer_pretty(writer, &*folders_lock)
            .map_err(|e| format!("Failed to write folders data: {}", e))?;

        log::info!(
            "Backed up {} folders to {}",
            folders_lock.len(),
            folders_path.display()
        );
    }

    // Add a backup info file with metadata
    {
        let info_path = backup_folder.join("backup_info.json");
        let file = File::create(&info_path).map_err(|e| e.to_string())?;
        let writer = BufWriter::new(file);

        let info = BackupMetaData {
            date: timestamp,
            number_of_folders: folders
                .read()
                .map_err(|e| format!("Failed to acquire read lock for folders: {}", e))?
                .len() as u32,
            number_of_worlds: worlds
                .read()
                .map_err(|e| format!("Failed to acquire read lock for worlds: {}", e))?
                .len() as u32,
            app_version: env!("CARGO_PKG_VERSION").to_string(),
        };
        serde_json::to_writer_pretty(writer, &info)
            .map_err(|e| format!("Failed to write backup info: {}", e))?;
    }

    log::info!("Backup created successfully at {}", backup_folder.display());
    Ok(())
}

pub fn get_backup_metadata(backup_path: String) -> Result<BackupMetaData, String> {
    log::info!("Getting backup metadata from: {}", backup_path);
    let backup_dir = Path::new(&backup_path);

    if !backup_dir.exists() {
        return Err("Backup directory does not exist".to_string());
    }

    let info_path = backup_dir.join("backup_info.json");
    if !info_path.exists() {
        return Err("Backup info file does not exist".to_string());
    }
    let file = File::open(&info_path).map_err(|e| e.to_string())?;
    let reader = BufReader::new(file);
    let metadata: BackupMetaData = serde_json::from_reader(reader)
        .map_err(|e| format!("Failed to parse backup info: {}", e))?;
    log::info!("Backup metadata retrieved successfully");
    Ok(metadata)
}
