use serde::Serialize;
use std::{sync::RwLock, vec};

use crate::{
    definitions::{FolderModel, WorldModel},
    services::FileService,
};

#[derive(Serialize)]
struct PLSWorld {
    #[serde(rename = "ID")]
    world_id: String,
}

#[derive(Serialize)]
struct PLSCategory {
    #[serde(rename = "Category")]
    category: String,
    #[serde(rename = "Worlds")]
    worlds: Vec<PLSWorld>,
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
        folders: &RwLock<Vec<FolderModel>>,
    ) -> Result<(), String> {
        let folders_lock = folders.read().map_err(|e| {
            log::error!("Failed to acquire read lock for folders: {}", e);
            "Failed to acquire read lock for folders".to_string()
        })?;
        let mut categories: Vec<PLSCategory> = Vec::new();

        for folder in folder_names {
            log::info!("Processing folder: {}", folder);
            let folder_worlds = folders_lock
                .iter()
                .filter(|f| f.folder_name == folder)
                .cloned()
                .collect::<Vec<FolderModel>>();
            if !folder_worlds.is_empty() {
                let worlds: Vec<PLSWorld> = folder_worlds
                    .iter()
                    .flat_map(|f| {
                        f.world_ids.iter().map(|id| PLSWorld {
                            world_id: id.clone(),
                        })
                    })
                    .collect();
                categories.push(PLSCategory {
                    category: folder,
                    worlds,
                });
            }
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
