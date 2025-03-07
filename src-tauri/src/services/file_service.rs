use crate::definitions::AuthCookies;
use crate::definitions::{FolderModel, WorldModel};
use crate::errors::FileError;
use crate::services::EncryptionService;
use directories::BaseDirs;
use log;
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
            .join("VRC_Worlds_Manager")
    }

    /// Gets the paths for the configuration and data files
    ///
    /// # Returns
    /// Returns the paths for the configuration, folders, and worlds files
    #[must_use]
    fn get_paths() -> (std::path::PathBuf, std::path::PathBuf, std::path::PathBuf) {
        let base = Self::get_app_dir();
        (
            base.join("Config.toml"),
            base.join("folders.json"),
            base.join("worlds.json"),
        )
    }

    /// Reads the configuration file from disk
    ///
    /// # Arguments
    /// * `path` - Path to the configuration file
    ///
    /// # Returns
    /// Returns the authentication cookies from the configuration file
    ///
    /// # Errors
    /// Returns a FileError if the file is not found, cannot be decrypted, or is invalid
    fn read_config(path: &std::path::PathBuf) -> Result<AuthCookies, FileError> {
        log::info!("Reading config from: {:?}", path);

        let encrypted = fs::read_to_string(path).map_err(|_| FileError::FileNotFound)?;

        let decrypted =
            EncryptionService::decrypt(encrypted).map_err(|_| FileError::DecryptionError)?;

        toml::from_str(&decrypted).map_err(|_| FileError::InvalidFile)
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
    /// Returns the authentication cookies, folders, and worlds
    ///
    /// # Errors
    /// Returns a FileError if any file is not found, cannot be decrypted, or is invalid
    pub fn load_data() -> Result<(AuthCookies, Vec<FolderModel>, Vec<WorldModel>), FileError> {
        let (config_path, folders_path, worlds_path) = Self::get_paths();

        let auth_cookies = Self::read_config(&config_path)?;

        let folders = Self::read_file(&folders_path)?;

        let worlds = Self::read_file(&worlds_path)?;

        Ok((auth_cookies, folders, worlds))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;
    use tempfile::TempDir;

    fn setup_test_dir() -> TempDir {
        TempDir::new().expect("Failed to create temp directory")
    }

    #[test]
    fn test_get_app_dir() {
        let app_dir = FileService::get_app_dir();
        assert!(app_dir.ends_with("VRC_Worlds_Manager"));
        assert!(app_dir.starts_with(BaseDirs::new().unwrap().data_local_dir()));
    }

    #[test]
    fn test_get_paths() {
        let (config, folders, worlds) = FileService::get_paths();

        assert!(config.ends_with("Config.toml"));
        assert!(folders.ends_with("folders.json"));
        assert!(worlds.ends_with("worlds.json"));

        assert!(config.starts_with(FileService::get_app_dir()));
        assert!(folders.starts_with(FileService::get_app_dir()));
        assert!(worlds.starts_with(FileService::get_app_dir()));
    }

    #[test]
    fn test_app_dir_structure() {
        let temp = setup_test_dir();
        let config_path = temp.path().join("Config.toml");
        let folders_path = temp.path().join("folders.json");
        let worlds_path = temp.path().join("worlds.json");

        assert!(!config_path.exists());
        assert!(!folders_path.exists());
        assert!(!worlds_path.exists());
    }
}
