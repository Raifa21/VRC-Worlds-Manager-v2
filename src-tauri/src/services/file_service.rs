use crate::definitions::AuthCookies;
use crate::definitions::{FolderModel, PreferenceModel, WorldModel};
use crate::errors::FileError;
use directories::BaseDirs;
use log::debug;
use serde_json;
use std::fs;
use std::path::PathBuf;

/// Service for reading and writing files to disk
pub struct FileService;

impl FileService {
    /// Gets the application directory for storing data
    ///
    /// # Returns
    /// Returns the path to the application directory
    #[must_use]
    fn get_app_dir() -> PathBuf {
        BaseDirs::new()
            .expect("Failed to get base directories")
            .data_local_dir()
            .join("VRC_Worlds_Manager_new")
    }

    /// Gets the paths for the configuration and data files
    ///
    /// # Returns
    /// Returns the paths for the configuration, folders, worlds, and authentication files
    #[must_use]
    pub fn get_paths() -> (
        std::path::PathBuf,
        std::path::PathBuf,
        std::path::PathBuf,
        std::path::PathBuf,
    ) {
        let base = Self::get_app_dir();
        if let Err(e) = fs::create_dir_all(&base) {
            log::error!("Failed to create data directory: {}", e);
        }
        (
            base.join("preferences.json"),
            base.join("folders.json"),
            base.join("worlds.json"),
            base.join("auth.json"),
        )
    }

    /// Checks if the application is being run for the first time
    ///
    /// # Returns
    /// Returns a boolean indicating if the application is being run for the first time
    pub fn check_first_time() -> bool {
        let (preferences_path, _, _, _) = Self::get_paths();
        !preferences_path.exists()
    }

    /// Reads the stored data from disk and deserializes it
    ///
    /// # Arguments
    /// * `path` - Path to the data file
    ///
    /// # Returns
    /// Returns the deserialized data
    ///
    /// # Errors
    /// Returns a FileError if access is denied, the file is not found, or the file is invalid
    #[must_use]
    fn read_file<T: serde::de::DeserializeOwned>(path: &PathBuf) -> Result<T, FileError> {
        fs::read_to_string(path)
            .map_err(|e| match e.kind() {
                std::io::ErrorKind::PermissionDenied => FileError::AccessDenied,
                _ => FileError::FileNotFound,
            })
            .and_then(|data| serde_json::from_str(&data).map_err(|_| FileError::InvalidFile))
    }

    /// Loads data from disk
    /// Calls read_config and read_file to load data from disk
    ///
    /// # Returns
    /// Returns the preferences, folders, and worlds
    ///
    /// # Errors
    /// Returns a FileError if any file is not found, cannot be decrypted, or is invalid
    #[must_use]
    pub fn load_data() -> Result<
        (
            PreferenceModel,
            Vec<FolderModel>,
            Vec<WorldModel>,
            AuthCookies,
        ),
        FileError,
    > {
        let (config_path, folders_path, worlds_path, cookies_path) = Self::get_paths();

        log::info!("Reading files");
        let preferences = Self::read_file(&config_path)?;
        let folders: Vec<FolderModel> = Self::read_file(&folders_path)?;
        let mut worlds: Vec<WorldModel> = Self::read_file(&worlds_path)?;
        let cookies = Self::read_file(&cookies_path)?;

        for world in worlds.iter_mut() {
            world.user_data.folders = folders
                .iter()
                .filter(|folder| folder.world_ids.contains(&world.api_data.world_id))
                .map(|folder| folder.folder_name.clone())
                .collect();
        }

        Ok((preferences, folders, worlds, cookies))
    }

    /// Writes preference data to disk
    /// Serializes and writes the data to disk
    ///
    /// # Arguments
    /// * `preferences` - The preference data to write
    ///
    /// # Returns
    /// Ok(()) if the data was written successfully
    ///
    /// # Errors
    /// Returns a FileError if the data could not be written
    pub fn write_preferences(preferences: &PreferenceModel) -> Result<(), FileError> {
        let (config_path, _, _, _) = Self::get_paths();

        let data = serde_json::to_string_pretty(preferences).map_err(|_| FileError::InvalidFile)?;
        fs::write(config_path, data).map_err(|_| FileError::FileWriteError)
    }

    /// Writes folder data to disk
    /// Serializes and writes the data to disk
    ///
    /// # Arguments
    /// * `folders` - The folder data to write
    ///
    /// # Returns
    /// Ok(()) if the data was written successfully
    ///
    /// # Errors
    /// Returns a FileError if the data could not be written    
    pub fn write_folders(folders: &Vec<FolderModel>) -> Result<(), FileError> {
        let (_, folders_path, _, _) = Self::get_paths();
        let data = serde_json::to_string_pretty(folders).map_err(|_| FileError::InvalidFile)?;
        fs::write(folders_path, data).map_err(|_| FileError::FileWriteError)
    }

    /// Writes world data to disk
    /// Serializes and writes the data to disk
    ///
    /// # Arguments
    /// * `worlds` - The world data to write
    ///
    /// # Returns
    /// Ok(()) if the data was written successfully
    ///
    /// # Errors
    /// Returns a FileError if the data could not be written
    pub fn write_worlds(worlds: &Vec<WorldModel>) -> Result<(), FileError> {
        let (_, _, worlds_path, _) = Self::get_paths();

        let data = serde_json::to_string_pretty(&worlds).map_err(|_| FileError::InvalidFile)?;
        fs::write(worlds_path, data).map_err(|_| FileError::FileWriteError)
    }

    /// Writes authentication data to disk
    /// Serializes and writes the data to disk
    ///
    /// # Arguments
    /// * `cookies` - The authentication data to write
    ///
    /// # Returns
    /// Ok(()) if the data was written successfully
    ///
    /// # Errors
    /// Returns a FileError if the data could not be written
    pub fn write_auth(cookies: &AuthCookies) -> Result<(), FileError> {
        let (_, _, _, auth_path) = Self::get_paths();
        let data = serde_json::to_string_pretty(cookies).map_err(|_| FileError::InvalidFile)?;
        fs::write(auth_path, data).map_err(|_| FileError::FileWriteError)
    }

    /// Creates an empty authentication file if it doesn't exist
    ///
    /// # Returns
    /// Ok(()) if the file was created successfully or already exists
    ///
    /// # Errors
    /// Returns a FileError if the file could not be created
    pub fn create_empty_auth_file() -> Result<(), FileError> {
        let (_, _, _, auth_path) = Self::get_paths();
        if !auth_path.exists() {
            fs::write(auth_path, "{}").map_err(|_| FileError::FileWriteError)?;
        }
        Ok(())
    }

    /// Creates an empty worlds file if it doesn't exist
    ///
    /// # Returns
    /// Ok(()) if the file was created successfully or already exists
    ///
    /// # Errors
    /// Returns a FileError if the file could not be created
    pub fn create_empty_worlds_file() -> Result<(), FileError> {
        let (_, _, worlds_path, _) = Self::get_paths();
        if !worlds_path.exists() {
            fs::write(worlds_path, "[]").map_err(|_| FileError::FileWriteError)?;
        }
        Ok(())
    }

    /// Creates an empty folders file if it doesn't exist
    ///
    /// # Returns
    /// Ok(()) if the file was created successfully or already exists
    ///
    /// # Errors
    /// Returns a FileError if the file could not be created
    pub fn create_empty_folders_file() -> Result<(), FileError> {
        let (_, folders_path, _, _) = Self::get_paths();
        if !folders_path.exists() {
            fs::write(folders_path, "[]").map_err(|_| FileError::FileWriteError)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup_test_dir() -> TempDir {
        TempDir::new().expect("Failed to create temp directory")
    }

    #[test]
    fn test_get_app_dir() {
        let app_dir = FileService::get_app_dir();
        assert!(app_dir.ends_with("VRC_Worlds_Manager_new"));
        assert!(app_dir.starts_with(BaseDirs::new().unwrap().data_local_dir()));
    }

    #[test]
    fn test_get_paths() {
        let (preference, folders, worlds, auth) = FileService::get_paths();

        assert!(preference.ends_with("preferences.json"));
        assert!(folders.ends_with("folders.json"));
        assert!(worlds.ends_with("worlds.json"));
        assert!(auth.ends_with("auth.json"));

        assert!(preference.starts_with(FileService::get_app_dir()));
        assert!(folders.starts_with(FileService::get_app_dir()));
        assert!(worlds.starts_with(FileService::get_app_dir()));
        assert!(auth.starts_with(FileService::get_app_dir()));
    }

    #[test]
    fn test_app_dir_structure() {
        let temp = setup_test_dir();
        let preferences_path = temp.path().join("preferences.json");
        let folders_path = temp.path().join("folders.json");
        let worlds_path = temp.path().join("worlds.json");
        let auth_path = temp.path().join("auth.json");

        assert!(!preferences_path.exists());
        assert!(!folders_path.exists());
        assert!(!worlds_path.exists());
        assert!(!auth_path.exists());
    }
}
