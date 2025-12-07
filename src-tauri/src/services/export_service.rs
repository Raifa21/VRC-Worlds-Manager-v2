use serde::Serialize;
use std::{sync::RwLock, vec};

use crate::{
    definitions::{FolderModel, WorldModel},
    services::FileService,
};

#[derive(Serialize)]
struct PLSPlatform {
    #[serde(rename = "PC")]
    pc: bool,
    #[serde(rename = "Android")]
    android: bool,
    #[serde(rename = "iOS")]
    ios: bool,
}

#[derive(Serialize)]
struct PLSWorlds {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "Name")]
    name: String,
    #[serde(rename = "RecommendedCapacity")]
    recommended_capacity: i32,
    #[serde(rename = "Capacity")]
    capacity: i32,
    #[serde(rename = "Description")]
    description: String,
    #[serde(rename = "Platform")]
    platform: PLSPlatform,
}

#[derive(Serialize)]
struct PLSCategory {
    #[serde(rename = "Category")]
    category: String,
    #[serde(rename = "Worlds")]
    worlds: Vec<PLSWorlds>,
}

#[derive(Serialize)]
struct PortalLibrarySystemJson {
    #[serde(rename = "Categorys")]
    categorys: Vec<PLSCategory>,
}

struct FolderExport {
    folder_name: String,
    worlds: Vec<WorldModel>,
}

pub struct ExportService;

impl ExportService {
    fn sort_worlds(
        mut worlds: Vec<WorldModel>,
        sort_field: &str,
        sort_direction: &str,
    ) -> Vec<WorldModel> {
        let ascending = sort_direction == "asc";

        worlds.sort_by(|a, b| {
            let ordering = match sort_field {
                "name" => a.api_data.world_name.cmp(&b.api_data.world_name),
                "authorName" => a.api_data.author_name.cmp(&b.api_data.author_name),
                "visits" => a
                    .api_data
                    .visits
                    .unwrap_or(0)
                    .cmp(&b.api_data.visits.unwrap_or(0)),
                "favorites" => a.api_data.favorites.cmp(&b.api_data.favorites),
                "capacity" => a.api_data.capacity.cmp(&b.api_data.capacity),
                "dateAdded" => a.user_data.date_added.cmp(&b.user_data.date_added),
                "lastUpdated" => a.api_data.last_update.cmp(&b.api_data.last_update),
                _ => std::cmp::Ordering::Equal,
            };

            if ascending {
                ordering
            } else {
                ordering.reverse()
            }
        });

        worlds
    }

    fn get_folders_with_worlds(
        folder_names: Vec<String>,
        folders: &RwLock<Vec<FolderModel>>,
        worlds: &RwLock<Vec<WorldModel>>,
        sort_field: String,
        sort_direction: String,
    ) -> Result<Vec<FolderExport>, String> {
        log::info!("Exporting to PortalLibrarySystem");

        let mut folders_to_export: Vec<FolderExport> = Vec::new();

        let worlds_lock = worlds.read().map_err(|e| {
            log::error!("Failed to acquire read lock for worlds: {}", e);
            "Failed to acquire read lock for worlds".to_string()
        })?;

        let folders_lock = folders.read().map_err(|e| {
            log::error!("Failed to acquire read lock for folders: {}", e);
            "Failed to acquire read lock for folders".to_string()
        })?;

        // Get sort preferences
        let preferences_lock = PREFERENCES.get().read().map_err(|e| {
            log::error!("Failed to acquire read lock for preferences: {}", e);
            "Failed to acquire read lock for preferences".to_string()
        })?;
        let preferences = &*preferences_lock;
        let sort_field = preferences.sort_field.clone();
        let sort_direction = preferences.sort_direction.clone();
        drop(preferences_lock);

        log::info!(
            "Applying sort: field={}, direction={}",
            sort_field,
            sort_direction
        );

        for folder_name in folder_names {
            log::info!("Processing folder: {}", folder_name);

            // Get all worlds in this folder
            let mut folder_worlds: Vec<WorldModel> = worlds_lock
                .iter()
                .filter(|world| world.user_data.folders.contains(&folder_name))
                .cloned()
                .collect();

            // Apply sorting based on provided parameters
            folder_worlds = Self::sort_worlds(folder_worlds, &sort_field, &sort_direction);

            folders_to_export.push(FolderExport {
                folder_name: folder_name.clone(),
                worlds: folder_worlds,
            });
        }

        Ok(folders_to_export)
    }

    pub fn export_to_portal_library_system(
        folder_names: Vec<String>,
        folders: &RwLock<Vec<FolderModel>>,
        worlds: &RwLock<Vec<WorldModel>>,
        sort_field: String,
        sort_direction: String,
    ) -> Result<(), String> {
        let folders_with_worlds = Self::get_folders_with_worlds(
            folder_names,
            folders,
            worlds,
            sort_field,
            sort_direction,
        )?;

        let mut categories: Vec<PLSCategory> = Vec::new();

        log::info!("Exporting worlds in the order they appear in folder.world_ids");

        for folder in folders_with_worlds {
            let mut worlds_list: Vec<PLSWorlds> = Vec::new();
            for world in folder.worlds {
                let platform = PLSPlatform {
                    pc: world
                        .api_data
                        .platform
                        .contains(&"standalonewindows".to_string()),
                    android: world.api_data.platform.contains(&"android".to_string()),
                    ios: false, // todo: add ios support
                };

                worlds_list.push(PLSWorlds {
                    id: world.api_data.world_id.clone(),
                    name: world.api_data.world_name.clone(),
                    recommended_capacity: world
                        .api_data
                        .recommended_capacity
                        .unwrap_or(world.api_data.capacity),
                    capacity: world.api_data.capacity,
                    description: world.api_data.description.clone(),
                    platform,
                });
            }
            categories.push(PLSCategory {
                category: folder.folder_name,
                worlds: worlds_list,
            });
        }

        let portal_library_system_json = PortalLibrarySystemJson {
            categorys: categories,
        };

        let json_string = serde_json::to_string(&portal_library_system_json).map_err(|e| {
            log::error!("Error serializing to JSON: {}", e);
            e.to_string()
        })?;

        let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();
        let filename = format!("portal_library_system_{}.json", timestamp);
        FileService::export_file(&filename, &json_string).map_err(|e| {
            log::error!("Error exporting file: {}", e);
            e.to_string()
        })
    }
}
