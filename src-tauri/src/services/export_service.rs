use serde::Serialize;
use std::{sync::RwLock, vec};

use crate::{
    definitions::{FolderModel, WorldModel},
    services::FileService,
};

#[derive(Serialize)]
struct PLSPlatform {
    pc: bool,
    android: bool,
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
    fn get_folders_with_worlds(
        folder_names: Vec<String>,
        worlds: &RwLock<Vec<WorldModel>>,
    ) -> Result<Vec<FolderExport>, String> {
        log::info!("Exporting to PortalLibrarySystem");

        let mut folders_to_export: Vec<FolderExport> = Vec::new();

        let worlds_lock = worlds.read().map_err(|e| {
            log::error!("Failed to acquire read lock for worlds: {}", e);
            "Failed to acquire read lock for worlds".to_string()
        })?;

        for folder in folder_names {
            log::info!("Processing folder: {}", folder);
            let folder_worlds: Vec<WorldModel> = worlds_lock
                .iter()
                .filter(|world| world.user_data.folders.contains(&folder))
                .cloned()
                .collect();
            folders_to_export.push(FolderExport {
                folder_name: folder.clone(),
                worlds: folder_worlds,
            });
        }

        Ok(folders_to_export)
    }

    pub fn export_to_portal_library_system(
        folder_names: Vec<String>,
        worlds: &RwLock<Vec<WorldModel>>,
    ) -> Result<(), String> {
        let folders = Self::get_folders_with_worlds(folder_names, worlds)?;

        let mut categories: Vec<PLSCategory> = Vec::new();

        for folder in folders {
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
