use crate::definitions::{FolderModel, WorldApiData, WorldModel, WorldUserData};
use crate::FOLDERS;
use crate::WORLDS;
use chrono::{Duration, NaiveDateTime};
use directories::BaseDirs;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

pub struct MigrationService;

#[derive(Debug, Deserialize)]
struct PreviousWorldModel {
    #[serde(rename = "ThumbnailImageUrl")]
    thumbnail_image_url: String,
    #[serde(rename = "WorldName")]
    world_name: String,
    #[serde(rename = "WorldId")]
    world_id: String,
    #[serde(rename = "AuthorName")]
    author_name: String,
    #[serde(rename = "AuthorId")]
    author_id: String,
    #[serde(rename = "Capacity")]
    capacity: i32,
    #[serde(rename = "LastUpdate")]
    last_update: String,
    #[serde(rename = "Description")]
    description: String,
    #[serde(rename = "Visits")]
    visits: Option<i32>,
    #[serde(rename = "Favorites")]
    favorites: i32,
    #[serde(rename = "DateAdded")]
    date_added: Option<NaiveDateTime>,
    #[serde(rename = "Platform")]
    platform: Option<Vec<String>>,
    #[serde(rename = "UserMemo")]
    user_memo: Option<String>,
}

#[derive(Debug, Deserialize)]
struct PreviousFolderCollection {
    name: String,
    worlds: Vec<PreviousWorldModel>,
}

impl MigrationService {
    /// Tries to locate the old VRC World Manager Data
    /// Called from setup page
    ///
    /// # Returns
    /// Returns the path to the old VRC World Manager Data
    /// A tuple containing the path to the old VRC World Manager Worlds file, the path to the old VRC World Manager Folders file, and the path to the old VRC World Manager Config file
    ///
    /// # Errors
    /// Returns an error message if the old VRC World Manager Data could not be found
    pub fn detect_old_installation() -> Result<(String, String, String), String> {
        let base_dirs = BaseDirs::new().ok_or("Could not get base directories")?;
        let local_app_data = base_dirs.data_local_dir().join("VRC_World_Manager");

        let worlds_path = local_app_data.join("worlds.json");
        let folders_path = local_app_data.join("folders.json");
        let config_path = local_app_data.join("Config.toml");

        if worlds_path.exists() && folders_path.exists() && config_path.exists() {
            Ok((
                worlds_path.to_string_lossy().to_string(),
                folders_path.to_string_lossy().to_string(),
                config_path.to_string_lossy().to_string(),
            ))
        } else {
            Err("Could not find old VRC World Manager data".to_string())
        }
    }

    /// Migrates the old VRC World Manager Data to the new location
    /// Called from setup page
    ///
    /// # Arguments
    /// * `path_to_worlds` - The path to the old VRC World Manager Worlds file
    /// * `path_to_folders` - The path to the old VRC World Manager Folders file
    /// * `path_to_config` - The path to the old VRC World Manager Config file
    ///
    /// # Errors
    /// Returns an error message if the old VRC World Manager Data could not be migrated
    pub async fn migrate_old_data(
        path_to_worlds: String,
        path_to_folders: String,
        path_to_config: String,
    ) -> Result<(), String> {
        // Read encrypted files
        let worlds_content = fs::read_to_string(path_to_worlds)
            .map_err(|e| format!("Failed to read worlds: {}", e))?;
        let folders_content = fs::read_to_string(path_to_folders)
            .map_err(|e| format!("Failed to read folders: {}", e))?;

        // TODO: Decrypt files via EncryptionService
        let worlds_json = worlds_content;
        let folders_json = folders_content;

        // Parse worlds
        let old_worlds: Vec<PreviousWorldModel> = serde_json::from_str(&worlds_json)
            .map_err(|e| format!("Failed to parse worlds: {}", e))?;

        let earliest_date = old_worlds
            .iter()
            .filter_map(|w| w.date_added)
            .min()
            .unwrap_or_else(|| chrono::Utc::now().naive_utc());

        // Convert worlds to new format with decremented dates
        let mut new_worlds = Vec::new();

        for (idx, old_world) in old_worlds.iter().enumerate() {
            let world_model = WorldModel {
                api_data: WorldApiData {
                    image_url: old_world.thumbnail_image_url.clone(),
                    world_name: old_world.world_name.clone(),
                    world_id: old_world.world_id.clone(),
                    author_name: old_world.author_name.clone(),
                    author_id: old_world.author_id.clone(),
                    capacity: old_world.capacity,
                    recommended_capacity: None, // TODO: API call
                    tags: vec![],               // TODO: API call
                    publication_date: NaiveDateTime::default(), // TODO: API call
                    last_update: NaiveDateTime::parse_from_str(&old_world.last_update, "%m/%d/%Y")
                        .unwrap_or_else(|_| NaiveDateTime::default()),
                    description: old_world.description.clone(),
                    visits: old_world.visits,
                    favorites: old_world.favorites,
                    platform: old_world.platform.clone().unwrap_or_default(),
                },
                user_data: WorldUserData {
                    date_added: old_world
                        .date_added
                        .unwrap_or_else(|| earliest_date - Duration::minutes(idx as i64)),
                    memo: "".to_string(),
                    folders: Vec::new(),
                    hidden: false,
                },
            };
            new_worlds.push(world_model);
        }

        // Parse and process folders
        let old_folders: Vec<PreviousFolderCollection> = serde_json::from_str(&folders_json)
            .map_err(|e| format!("Failed to parse folders: {}", e))?;

        let mut new_folders = Vec::new();

        // Process folders and update world folder references
        for folder in old_folders {
            if folder.name == "Hidden" {
                // Mark worlds as hidden instead of creating folder
                for world in folder.worlds {
                    if let Some(w) = new_worlds
                        .iter_mut()
                        .find(|w| w.api_data.world_id == world.world_id)
                    {
                        w.user_data.hidden = true;
                    }
                }
                continue;
            }

            if folder.name == "Unclassified" {
                continue;
            }

            // Create new folder with world IDs
            let folder_model = FolderModel {
                folder_name: folder.name.clone(),
                world_ids: folder.worlds.iter().map(|w| w.world_id.clone()).collect(),
            };

            // Add folder name to world's folders vec
            for world_id in &folder_model.world_ids {
                if let Some(w) = new_worlds
                    .iter_mut()
                    .find(|w| w.api_data.world_id == *world_id)
                {
                    w.user_data.folders.push(folder.name.clone());
                }
            }

            new_folders.push(folder_model);
        }

        // Store migrated data
        {
            let mut worlds_lock = WORLDS
                .get()
                .write()
                .map_err(|_| "Failed to acquire worlds lock")?;
            *worlds_lock = new_worlds;
        }

        {
            let mut folders_lock = FOLDERS
                .get()
                .write()
                .map_err(|_| "Failed to acquire folders lock")?;
            *folders_lock = new_folders;
        }

        Ok(())
    }
}
