use crate::definitions::{FolderModel, WorldApiData, WorldModel, WorldUserData};
use crate::services::EncryptionService;
use crate::services::FileService;
use crate::FOLDERS;
use crate::WORLDS;
use chrono::{DateTime, Duration, Utc};
use directories::BaseDirs;
use serde::Deserialize;
use std::collections::{HashMap, HashSet};
use std::fs;

pub struct MigrationService;

fn deserialize_datetime<'de, D>(deserializer: D) -> Result<Option<DateTime<Utc>>, D::Error>
where
    D: serde::de::Deserializer<'de>,
{
    let s: Option<String> = Option::deserialize(deserializer)?;
    if let Some(s) = s {
        DateTime::parse_from_str(&s, "%Y-%m-%dT%H:%M:%S%.f%:z")
            .map(|dt| Some(dt.with_timezone(&Utc)))
            .map_err(serde::de::Error::custom)
    } else {
        Ok(None)
    }
}

#[derive(Debug, Deserialize, Clone)]
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
    #[serde(rename = "DateAdded", deserialize_with = "deserialize_datetime")]
    date_added: Option<DateTime<Utc>>,
    #[serde(rename = "Platform")]
    platform: Option<Vec<String>>,
    #[serde(rename = "UserMemo")]
    user_memo: Option<String>,
}

impl Default for PreviousWorldModel {
    fn default() -> Self {
        PreviousWorldModel {
            thumbnail_image_url: String::default(),
            world_name: String::default(),
            world_id: String::default(),
            author_name: String::default(),
            author_id: String::default(),
            capacity: 0,
            last_update: String::default(),
            description: String::default(),
            visits: None,
            favorites: 0,
            date_added: None,
            platform: None,
            user_memo: None,
        }
    }
}

#[derive(Debug, Deserialize)]
struct PreviousFolderCollection {
    #[serde(rename = "Name")]
    name: String,
    #[serde(rename = "Worlds")]
    worlds: Vec<PreviousWorldModel>,
}

impl MigrationService {
    /// Tries to locate the old VRC Worlds Manager Data
    /// Called from setup page
    ///
    /// # Returns
    /// Returns the path to the old VRC Worlds Manager Data
    /// A tuple containing the path to the old VRC Worlds Manager Worlds file, and the path to the old VRC Worlds Manager Folders file
    ///
    /// # Errors
    /// Returns an error message if the old VRC Worlds Manager Data could not be found
    pub fn detect_old_installation() -> Result<(String, String), String> {
        let base_dirs = BaseDirs::new().ok_or("Could not get base directories")?;
        let local_app_data = base_dirs.data_local_dir().join("VRC_Worlds_Manager");

        let worlds_path = local_app_data.join("worlds.json");
        let folders_path = local_app_data.join("folders.json");

        if worlds_path.exists() && folders_path.exists() {
            Ok((
                worlds_path.to_string_lossy().to_string(),
                folders_path.to_string_lossy().to_string(),
            ))
        } else {
            let mut missing_files = Vec::new();
            if !worlds_path.exists() {
                missing_files.push("worlds.json");
            }
            if !folders_path.exists() {
                missing_files.push("folders.json");
            }
            Err(format!(
                "Could not find the following files: {}, from {}",
                missing_files.join(", "),
                base_dirs.data_local_dir().to_string_lossy()
            ))
        }
    }

    /// checks if worlds and folders data already exists, to avoid overwriting
    ///
    /// # Returns
    /// Returns a boolean indicating if the worlds and folders data already exists
    ///
    /// # Errors
    /// Returns an error message if the worlds and folders data could not be checked
    pub fn check_existing_data() -> Result<(bool, bool), String> {
        let (_, folders_path, worlds_path, _) = FileService::get_paths();

        Ok((folders_path.exists(), worlds_path.exists()))
    }

    async fn read_data_files(
        path_to_worlds: &str,
        path_to_folders: &str,
    ) -> Result<(String, String), String> {
        let worlds_content = fs::read_to_string(path_to_worlds)
            .map_err(|e| format!("Failed to read worlds: {}", e))?;
        let folders_content = fs::read_to_string(path_to_folders)
            .map_err(|e| format!("Failed to read folders: {}", e))?;
        Ok((worlds_content, folders_content))
    }

    fn parse_world_data(worlds_json: &str) -> Result<Vec<PreviousWorldModel>, String> {
        EncryptionService::decrypt_aes(worlds_json)
            .map_err(|e| format!("Failed to decrypt worlds: {}", e))
            .and_then(|decrypted| {
                serde_json::from_str(&decrypted)
                    .map_err(|e| format!("Failed to parse worlds: {}", e))
            })
    }

    fn parse_folder_data(folders_json: &str) -> Result<Vec<PreviousFolderCollection>, String> {
        log::info!("Folders JSON content: {}", folders_json);

        let decrypted = EncryptionService::decrypt_aes(folders_json)
            .map_err(|e| format!("Failed to decrypt folders: {}", e))?;

        log::info!("Decrypted folders: {}", decrypted);

        serde_json::from_str(&decrypted).map_err(|e| format!("Failed to parse folders: {}", e))
    }

    fn calculate_dates(worlds: &[PreviousWorldModel]) -> (DateTime<Utc>, Vec<DateTime<Utc>>) {
        let earliest_date = worlds
            .iter()
            .filter_map(|w| w.date_added)
            .min()
            .unwrap_or_else(|| Utc::now());

        let null_count = worlds.iter().filter(|w| w.date_added.is_none()).count();

        let base_date = earliest_date - Duration::minutes(null_count as i64);
        let mut dates = Vec::with_capacity(worlds.len());
        let mut current_null_date = base_date;

        for world in worlds {
            if let Some(date) = world.date_added {
                dates.push(date);
            } else {
                dates.push(current_null_date);
                current_null_date += Duration::minutes(1);
            }
        }

        (earliest_date, dates)
    }

    fn convert_to_new_model(
        old_world: &PreviousWorldModel,
        date: DateTime<Utc>,
        hidden: bool,
    ) -> WorldModel {
        WorldModel {
            api_data: WorldApiData {
                image_url: old_world.thumbnail_image_url.clone(),
                world_name: old_world.world_name.clone(),
                world_id: old_world.world_id.clone(),
                author_name: old_world.author_name.clone(),
                author_id: old_world.author_id.clone(),
                capacity: old_world.capacity,
                recommended_capacity: None,
                tags: vec![],
                publication_date: None,
                last_update: {
                    let parts: Vec<&str> = old_world.last_update.split('/').collect();
                    if parts.len() == 3 {
                        // Parse mm/dd/yyyy format
                        let month: u32 = parts[0].parse().unwrap_or(1);
                        let day: u32 = parts[1].parse().unwrap_or(1);
                        let year: i32 = parts[2].parse().unwrap_or(2024);

                        // Create DateTime<Utc> directly
                        DateTime::from_naive_utc_and_offset(
                            chrono::NaiveDateTime::new(
                                chrono::NaiveDate::from_ymd_opt(year, month, day)
                                    .unwrap_or_default(),
                                chrono::NaiveTime::from_hms_opt(0, 0, 0).unwrap_or_default(),
                            ),
                            Utc,
                        )
                    } else {
                        Utc::now()
                    }
                },
                description: old_world.description.clone(),
                visits: old_world.visits,
                favorites: old_world.favorites,
                platform: old_world.platform.clone().unwrap_or_default(),
            },
            user_data: WorldUserData {
                date_added: date,
                last_checked: DateTime::from_naive_utc_and_offset(
                    chrono::NaiveDateTime::new(
                        chrono::NaiveDate::from_ymd_opt(2024, 1, 1).unwrap_or_default(),
                        chrono::NaiveTime::from_hms_opt(0, 0, 0).unwrap_or_default(),
                    ),
                    Utc,
                ),
                memo: old_world.user_memo.clone().unwrap_or_default(),
                folders: Vec::new(),
                hidden,
            },
        }
    }

    fn deduplicate_with_pattern(old_worlds: Vec<PreviousWorldModel>) -> Vec<PreviousWorldModel> {
        let mut unique_worlds: HashMap<String, (PreviousWorldModel, usize)> = HashMap::new();
        let mut first_duplicate_idx = None;

        // First pass - find duplicates and their positions
        for (idx, world) in old_worlds.iter().enumerate() {
            if let Some((_, first_idx)) = unique_worlds.get(&world.world_id) {
                if first_duplicate_idx.is_none() {
                    first_duplicate_idx = Some(idx);
                    break;
                }
            } else {
                unique_worlds.insert(world.world_id.clone(), (world.clone(), idx));
            }
        }

        if let Some(split_idx) = first_duplicate_idx {
            let duplicated = &old_worlds[..split_idx];
            let unique = &old_worlds[split_idx..];

            if let Some(end_idx) = unique
                .iter()
                .position(|w| !duplicated.iter().any(|d| d.world_id == w.world_id))
            {
                let mut result: Vec<PreviousWorldModel> =
                    duplicated.iter().rev().cloned().collect();
                result.extend(unique[end_idx..].iter().cloned());
                return result;
            }
        }

        old_worlds
    }

    /// Migrates the old VRC Worlds Manager Data to the new location
    /// Called from setup page
    ///
    /// # Arguments
    /// * `path_to_worlds` - The path to the old VRC Worlds Manager Worlds file
    /// * `path_to_folders` - The path to the old VRC Worlds Manager Folders file
    ///
    /// # Errors
    /// Returns an error message if the old VRC Worlds Manager Data could not be migrated
    pub async fn migrate_old_data(
        path_to_worlds: String,
        path_to_folders: String,
        dont_overwrite: [bool; 2], // [worlds, folders]
    ) -> Result<(), String> {
        let (worlds_content, folders_content) =
            Self::read_data_files(&path_to_worlds, &path_to_folders).await?;

        let old_worlds = Self::parse_world_data(&worlds_content)?;
        let old_folders = Self::parse_folder_data(&folders_content)?;

        let (_, dates) = Self::calculate_dates(&old_worlds);

        let mut new_worlds = Vec::new();
        let mut new_folders = Vec::new();
        let mut hidden_world_ids = HashSet::new();

        // Process hidden folder first
        if let Some(hidden_folder) = old_folders.iter().find(|f| f.name == "Hidden") {
            for world in &hidden_folder.worlds {
                hidden_world_ids.insert(world.world_id.clone());
            }
        }

        // Deduplicate and convert worlds only if we're not keeping existing worlds
        if !dont_overwrite[0] {
            let old_worlds = Self::deduplicate_with_pattern(old_worlds);
            for (idx, old_world) in old_worlds.iter().enumerate() {
                let is_hidden = hidden_world_ids.contains(&old_world.world_id);
                let utc_date =
                    DateTime::from_naive_utc_and_offset(dates[idx].naive_utc(), chrono::Utc);
                new_worlds.push(Self::convert_to_new_model(old_world, utc_date, is_hidden));
            }
        }

        // Process folders only if we're not keeping existing folders
        if !dont_overwrite[1] {
            for folder in old_folders {
                if folder.name != "Hidden" && folder.name != "Unclassified" {
                    let world_ids: Vec<String> =
                        folder.worlds.iter().map(|w| w.world_id.clone()).collect();

                    // Add folder name to corresponding worlds if we're also migrating worlds
                    if !dont_overwrite[0] {
                        for world in new_worlds.iter_mut() {
                            if world_ids.contains(&world.api_data.world_id) {
                                world.user_data.folders.push(folder.name.clone());
                            }
                        }
                    }

                    new_folders.push(FolderModel {
                        folder_name: folder.name,
                        world_ids,
                    });
                }
            }
        }

        // Store migrated data, respecting dont_overwrite flags
        if !dont_overwrite[0] {
            let mut worlds_lock = WORLDS
                .get()
                .write()
                .map_err(|e| format!("Failed to acquire worlds lock: {}", e))?;
            *worlds_lock = new_worlds;
            FileService::write_worlds(&worlds_lock)
                .map_err(|e| format!("Failed to write worlds: {}", e))?;
        }

        if !dont_overwrite[1] {
            let mut folders_lock = FOLDERS
                .get()
                .write()
                .map_err(|e| format!("Failed to acquire folders lock: {}", e))?;
            *folders_lock = new_folders;
            FileService::write_folders(&folders_lock)
                .map_err(|e| format!("Failed to write folders: {}", e))?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_dates() {
        let worlds = vec![
            PreviousWorldModel {
                date_added: None,
                ..PreviousWorldModel::default()
            },
            PreviousWorldModel {
                date_added: None,
                ..PreviousWorldModel::default()
            },
            PreviousWorldModel {
                date_added: Some(DateTime::from_naive_utc_and_offset(
                    chrono::NaiveDateTime::new(
                        chrono::NaiveDate::from_ymd_opt(2024, 3, 11).unwrap(),
                        chrono::NaiveTime::from_hms_opt(10, 0, 0).unwrap(),
                    ),
                    Utc,
                )),
                ..PreviousWorldModel::default()
            },
        ];

        let (earliest, dates) = MigrationService::calculate_dates(&worlds);

        log::info!("Earliest date: {}", earliest);
        log::info!("All dates: {:?}", dates);

        assert_eq!(dates.len(), 3);
        assert!(
            dates[1] < dates[2],
            "null worlds should be set before earliest date"
        );
        assert!(dates[0] < dates[1])
    }

    #[test]
    fn test_calculate_dates_all_null() {
        let worlds = vec![
            PreviousWorldModel {
                date_added: None,
                ..PreviousWorldModel::default()
            },
            PreviousWorldModel {
                date_added: None,
                ..PreviousWorldModel::default()
            },
            PreviousWorldModel {
                date_added: None,
                ..PreviousWorldModel::default()
            },
        ];

        let (earliest, dates) = MigrationService::calculate_dates(&worlds);

        assert_eq!(dates.len(), 3);
        assert!(dates[0] < dates[1], "Sequential ordering");
        assert!(dates[1] < dates[2], "Sequential ordering");
        assert_eq!(dates[1] - dates[0], Duration::minutes(1));
    }

    #[test]
    fn test_calculate_dates_empty() {
        let worlds: Vec<PreviousWorldModel> = vec![];
        let (earliest, dates) = MigrationService::calculate_dates(&worlds);
        assert_eq!(dates.len(), 0);
    }

    #[test]
    fn test_deduplicate_with_pattern() {
        // Create test data with known pattern
        let test_worlds = vec![
            PreviousWorldModel {
                world_id: "5".to_string(),
                ..PreviousWorldModel::default()
            },
            PreviousWorldModel {
                world_id: "4".to_string(),
                ..PreviousWorldModel::default()
            },
            PreviousWorldModel {
                world_id: "3".to_string(),
                ..PreviousWorldModel::default()
            },
            PreviousWorldModel {
                world_id: "5".to_string(),
                ..PreviousWorldModel::default()
            },
            PreviousWorldModel {
                world_id: "4".to_string(),
                ..PreviousWorldModel::default()
            },
            PreviousWorldModel {
                world_id: "3".to_string(),
                ..PreviousWorldModel::default()
            },
            PreviousWorldModel {
                world_id: "6".to_string(),
                ..PreviousWorldModel::default()
            },
            PreviousWorldModel {
                world_id: "7".to_string(),
                ..PreviousWorldModel::default()
            },
        ];

        let result = MigrationService::deduplicate_with_pattern(test_worlds);

        // Verify results
        assert_eq!(result.len(), 5); // Should have 5 unique worlds
        assert_eq!(result[0].world_id, "3");
        assert_eq!(result[1].world_id, "4");
        assert_eq!(result[2].world_id, "5");
        assert_eq!(result[3].world_id, "6");
        assert_eq!(result[4].world_id, "7");
    }

    #[test]
    fn test_convert_last_update_date() {
        let old_world = PreviousWorldModel {
            last_update: "03/14/2024".to_string(),
            ..PreviousWorldModel::default()
        };

        let converted =
            MigrationService::convert_to_new_model(&old_world, DateTime::default(), false);

        let expected: DateTime<Utc> = DateTime::from_naive_utc_and_offset(
            chrono::NaiveDate::from_ymd_opt(2024, 3, 14)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            chrono::Utc,
        );

        assert_eq!(converted.api_data.last_update, expected);
    }
}
