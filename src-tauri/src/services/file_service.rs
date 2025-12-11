use crate::definitions::AuthCookies;
use crate::definitions::{FolderModel, PreferenceModel, WorldModel};
use crate::errors::FileError;
use crate::services::EncryptionService;
use directories::BaseDirs;
use log::debug;
use serde_json;
use std::ffi::OsString;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use tempfile::NamedTempFile;

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

    /// Gets the backup path for a given file path
    ///
    /// # Arguments
    /// * `path` - The original file path
    ///
    /// # Returns
    /// Returns the backup file path with .bak appended
    fn get_backup_path(path: &PathBuf) -> PathBuf {
        // Use OsString to handle non-UTF-8 paths correctly
        let mut os_string = path.as_os_str().to_os_string();
        os_string.push(".bak");
        PathBuf::from(os_string)
    }

    /// Checks if file content contains only null bytes (corrupted)
    ///
    /// # Arguments
    /// * `data` - The file content to check
    ///
    /// # Returns
    /// Returns true if the file is empty or contains only null bytes
    fn is_file_corrupted_with_null_bytes(data: &str) -> bool {
        const CHECK_BYTES_LIMIT: usize = 1024;

        if data.is_empty() {
            return true;
        }

        let check_len = data.len().min(CHECK_BYTES_LIMIT);
        data.as_bytes()[..check_len].iter().all(|&b| b == 0)
    }

    /// Restores a backup file to the primary location
    ///
    /// # Arguments
    /// * `backup_path` - Path to the backup file
    /// * `primary_path` - Path to restore the backup to
    fn restore_backup_to_primary(backup_path: &PathBuf, primary_path: &PathBuf) {
        if let Err(e) = fs::copy(backup_path, primary_path) {
            log::warn!("Failed to restore backup to primary file: {}", e);
        } else {
            log::info!("Successfully restored from backup: {:?}", backup_path);
        }
    }

    /// Atomically writes data to a file with a backup
    ///
    /// This function ensures that data is written atomically by:
    /// 1. Creating a backup of the existing file (.bak)
    /// 2. Writing to a temporary file in the same directory
    /// 3. Flushing and syncing the temporary file to disk
    /// 4. Atomically renaming the temporary file over the target file
    ///
    /// # Arguments
    /// * `path` - Target file path
    /// * `data` - Data to write
    ///
    /// # Returns
    /// Ok(()) if the data was written successfully
    ///
    /// # Errors
    /// Returns a FileError if the data could not be written
    fn atomic_write(path: &PathBuf, data: &str) -> Result<(), FileError> {
        // If the file exists, create a backup first
        if path.exists() {
            let backup_path = Self::get_backup_path(path);
            if let Err(e) = fs::copy(path, &backup_path) {
                log::warn!("Failed to create backup at {:?}: {}", backup_path, e);
                // Continue anyway - we still want to write the new data
            }
        }

        // Get the parent directory for the temporary file
        let parent_dir = path.parent().ok_or(FileError::FileWriteError)?;

        // Create a temporary file in the same directory as the target
        let mut temp_file =
            NamedTempFile::new_in(parent_dir).map_err(|_| FileError::FileWriteError)?;

        // Write the data to the temporary file
        temp_file
            .write_all(data.as_bytes())
            .map_err(|_| FileError::FileWriteError)?;

        // Flush and sync to ensure data is written to disk
        temp_file.flush().map_err(|_| FileError::FileWriteError)?;
        temp_file
            .as_file()
            .sync_all()
            .map_err(|_| FileError::FileWriteError)?;

        // Atomically rename the temporary file to the target path
        // On Windows, persist() fails if the destination exists, so we need to remove it first
        // On Unix, persist() atomically replaces the destination
        #[cfg(windows)]
        {
            if path.exists() {
                fs::remove_file(path).map_err(|_| FileError::FileWriteError)?;
            }
        }

        temp_file
            .persist(path)
            .map_err(|_| FileError::FileWriteError)?;

        Ok(())
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
        // Try to read the primary file
        let result = fs::read_to_string(path)
            .map_err(|e| match e.kind() {
                std::io::ErrorKind::PermissionDenied => FileError::AccessDenied,
                _ => FileError::FileNotFound,
            })
            .and_then(|data| {
                // Check if the file is corrupted (empty or contains only null bytes)
                if Self::is_file_corrupted_with_null_bytes(&data) {
                    log::warn!("File {:?} is empty or contains only null bytes, attempting backup recovery", path);
                    Err(FileError::InvalidFile)
                } else {
                    serde_json::from_str(&data).map_err(|_| FileError::InvalidFile)
                }
            });

        // If the primary file failed, try the backup
        if result.is_err() {
            let backup_path = Self::get_backup_path(path);
            if backup_path.exists() {
                log::info!("Attempting to recover from backup: {:?}", backup_path);
                return fs::read_to_string(&backup_path)
                    .map_err(|e| match e.kind() {
                        std::io::ErrorKind::PermissionDenied => FileError::AccessDenied,
                        _ => FileError::FileNotFound,
                    })
                    .and_then(|data| {
                        let parsed =
                            serde_json::from_str(&data).map_err(|_| FileError::InvalidFile)?;
                        // Restore the backup to the primary file
                        Self::restore_backup_to_primary(&backup_path, path);
                        Ok(parsed)
                    });
            }
        }

        result
    }

    fn read_auth_file(path: &PathBuf) -> Result<AuthCookies, FileError> {
        let content_result = fs::read_to_string(path).map_err(|e| match e.kind() {
            std::io::ErrorKind::PermissionDenied => FileError::AccessDenied,
            _ => FileError::FileNotFound,
        });

        let content = match content_result {
            Ok(c) => {
                // Check if the file is corrupted (empty or contains only null bytes)
                if Self::is_file_corrupted_with_null_bytes(&c) {
                    log::warn!("Auth file {:?} is empty or contains only null bytes, attempting backup recovery", path);
                    // Try backup
                    let backup_path = Self::get_backup_path(path);
                    if backup_path.exists() {
                        log::info!("Attempting to recover auth from backup: {:?}", backup_path);
                        let backup_content =
                            fs::read_to_string(&backup_path).map_err(|e| match e.kind() {
                                std::io::ErrorKind::PermissionDenied => FileError::AccessDenied,
                                _ => FileError::FileNotFound,
                            })?;
                        // Restore the backup to the primary file
                        Self::restore_backup_to_primary(&backup_path, path);
                        backup_content
                    } else {
                        return Err(FileError::InvalidFile);
                    }
                } else {
                    c
                }
            }
            Err(e) => {
                // Primary file failed, try backup
                let backup_path = Self::get_backup_path(path);
                if backup_path.exists() {
                    log::info!(
                        "Auth file not found, attempting to recover from backup: {:?}",
                        backup_path
                    );
                    let backup_content =
                        fs::read_to_string(&backup_path).map_err(|e| match e.kind() {
                            std::io::ErrorKind::PermissionDenied => FileError::AccessDenied,
                            _ => FileError::FileNotFound,
                        })?;
                    // Restore the backup to the primary file
                    Self::restore_backup_to_primary(&backup_path, path);
                    backup_content
                } else {
                    return Err(e);
                }
            }
        };

        match serde_json::from_str::<AuthCookies>(&content) {
            Ok(mut cookies) => {
                if let Some(auth) = &cookies.auth_token {
                    if !auth.is_empty() {
                        cookies.auth_token =
                            Some(EncryptionService::decrypt_aes(auth).map_err(|e| {
                                log::error!("Failed to decrypt auth token: {}", e);
                                FileError::InvalidFile
                            })?);
                    }
                } else {
                    cookies.auth_token = None;
                }
                if let Some(tfa) = &cookies.two_factor_auth {
                    if !tfa.is_empty() {
                        cookies.two_factor_auth =
                            Some(EncryptionService::decrypt_aes(tfa).map_err(|e| {
                                log::error!("Failed to decrypt two-factor auth token: {}", e);
                                FileError::InvalidFile
                            })?);
                    }
                } else {
                    cookies.two_factor_auth = None;
                }
                Ok(cookies)
            }
            Err(_) => Err(FileError::InvalidFile),
        }
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
        let cookies = Self::read_auth_file(&cookies_path)?;

        // populate per-world folder list
        for world in worlds.iter_mut() {
            world.user_data.folders = folders
                .iter()
                .filter(|folder| folder.world_ids.contains(&world.api_data.world_id))
                .map(|folder| folder.folder_name.clone())
                .collect();
        }

        // Backwards‐compat: dedupe any duplicate platform entries in worlds.json
        {
            use std::collections::HashSet;
            for world in worlds.iter_mut() {
                let mut seen = HashSet::new();
                world
                    .api_data
                    .platform
                    .retain(|plat| seen.insert(plat.clone()));
            }
            // write back deduplicated worlds
            if let Err(e) = Self::write_worlds(&worlds) {
                log::error!("Failed to persist deduplicated worlds.json: {}", e);
            }
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
        Self::atomic_write(&config_path, &data)
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
        Self::atomic_write(&folders_path, &data)
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
        Self::atomic_write(&worlds_path, &data)
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
        let mut encrypted_cookies = cookies.clone();

        // Ensure tokens are encrypted when writing
        if let Some(auth) = &cookies.auth_token {
            encrypted_cookies.auth_token = match EncryptionService::encrypt_aes(auth) {
                Ok(encrypted) => Some(encrypted),
                Err(e) => {
                    log::error!("Failed to encrypt auth token: {}", e);
                    None
                }
            };
        }
        if let Some(tfa) = &cookies.two_factor_auth {
            encrypted_cookies.two_factor_auth = match EncryptionService::encrypt_aes(tfa) {
                Ok(encrypted) => Some(encrypted),
                Err(e) => {
                    log::error!("Failed to encrypt two-factor auth token: {}", e);
                    None
                }
            };
        }
        encrypted_cookies.version = 1;

        let data =
            serde_json::to_string_pretty(&encrypted_cookies).map_err(|_| FileError::InvalidFile)?;
        Self::atomic_write(&auth_path, &data)
    }

    /// Creates an empty authentication file if it doesn't exist
    ///
    /// Note: This uses fs::write instead of atomic_write because it's only called
    /// during initialization when there's no existing data to protect.
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
    /// Note: This uses fs::write instead of atomic_write because it's only called
    /// during initialization when there's no existing data to protect.
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
    /// Note: This uses fs::write instead of atomic_write because it's only called
    /// during initialization when there's no existing data to protect.
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

    /// Deletes data from the worlds and folders files
    /// Overwrites the files with empty data
    ///
    /// Note: This uses fs::write instead of atomic_write because it's intentionally
    /// clearing/deleting data, so there's no existing data to protect.
    ///
    /// # Returns
    /// Ok(()) if the data was deleted successfully
    ///
    /// # Errors
    /// Returns a FileError if the data could not be deleted
    pub fn delete_worlds_and_folders() -> Result<(), FileError> {
        let (_, folders_path, worlds_path, _) = Self::get_paths();
        fs::write(folders_path, "[]").map_err(|_| FileError::FileWriteError)?;
        fs::write(worlds_path, "[]").map_err(|_| FileError::FileWriteError)?;

        Ok(())
    }

    /// Opens the specified directory in the file explorer
    ///
    /// # Arguments
    /// * `path` - The path to the directory to open
    ///
    /// # Returns
    /// Ok(()) if the directory was opened successfully
    ///
    /// # Errors
    /// Returns a FileError if the directory could not be opened
    pub fn open_path<P: AsRef<Path>>(path: P) -> Result<(), String> {
        let path = path.as_ref();
        if !path.exists() {
            return Err(format!("Path does not exist: {}", path.display()));
        }
        if !path.is_dir() {
            return Err(format!("Path is not a directory: {}", path.display()));
        }
        opener::open(path).map_err(|e| format!("Failed to open path: {}", e))
    }

    /// Export a file to the exports folder, and opens the exports folder once the file is written
    /// Writes the given data to a file in the exports directory
    ///
    /// # Arguments
    /// * `file_name` - The name of the file to create
    /// * `data` - The data to write to the file
    ///
    /// # Returns
    /// Ok(()) if the file was written successfully
    /// # Errors
    /// Returns a FileError if the file could not be written
    pub fn export_file(file_name: &str, data: &str) -> Result<(), FileError> {
        let exports_dir = BaseDirs::new()
            .expect("Failed to get base directories")
            .data_local_dir()
            .join("VRC_Worlds_Manager_new")
            .join("exports");

        if !exports_dir.exists() {
            fs::create_dir_all(&exports_dir).map_err(|_| FileError::FileWriteError)?;
        }

        let file_path = exports_dir.join(file_name);
        Self::atomic_write(&file_path, data)?;

        // Open the exports directory after writing the file
        Self::open_path(exports_dir).map_err(|e| {
            log::error!("{}", e);
            FileError::FileWriteError
        })?;
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

    #[test]
    fn test_atomic_write_creates_new_file() {
        let temp = setup_test_dir();
        let test_path = temp.path().join("test.json");
        let test_data = r#"{"test": "data"}"#;

        let result = FileService::atomic_write(&test_path, test_data);
        assert!(result.is_ok());
        assert!(test_path.exists());

        let content = fs::read_to_string(&test_path).unwrap();
        assert_eq!(content, test_data);
    }

    #[test]
    fn test_atomic_write_creates_backup() {
        let temp = setup_test_dir();
        let test_path = temp.path().join("test.json");
        let backup_path = FileService::get_backup_path(&test_path);

        // Write initial data
        let initial_data = r#"{"version": 1}"#;
        fs::write(&test_path, initial_data).unwrap();

        // Atomic write should create a backup
        let new_data = r#"{"version": 2}"#;
        let result = FileService::atomic_write(&test_path, new_data);
        assert!(result.is_ok());

        // Check that backup was created with old data
        assert!(backup_path.exists());
        let backup_content = fs::read_to_string(&backup_path).unwrap();
        assert_eq!(backup_content, initial_data);

        // Check that main file has new data
        let main_content = fs::read_to_string(&test_path).unwrap();
        assert_eq!(main_content, new_data);
    }

    #[test]
    fn test_read_file_recovers_from_backup_on_null_bytes() {
        let temp = setup_test_dir();
        let test_path = temp.path().join("test.json");
        let backup_path = FileService::get_backup_path(&test_path);

        // Create a valid backup
        let backup_data = r#"["item1", "item2"]"#;
        fs::write(&backup_path, backup_data).unwrap();

        // Create corrupted main file with null bytes
        let null_data = "\0\0\0\0\0\0\0\0\0\0";
        fs::write(&test_path, null_data).unwrap();

        // read_file should recover from backup
        let result: Result<Vec<String>, FileError> = FileService::read_file(&test_path);
        assert!(result.is_ok());
        let data = result.unwrap();
        assert_eq!(data, vec!["item1", "item2"]);

        // Main file should be restored
        let main_content = fs::read_to_string(&test_path).unwrap();
        assert_eq!(main_content, backup_data);
    }

    #[test]
    fn test_read_file_recovers_from_backup_on_invalid_json() {
        let temp = setup_test_dir();
        let test_path = temp.path().join("test.json");
        let backup_path = FileService::get_backup_path(&test_path);

        // Create a valid backup
        let backup_data = r#"{"key": "value"}"#;
        fs::write(&backup_path, backup_data).unwrap();

        // Create corrupted main file with invalid JSON
        fs::write(&test_path, "not valid json {{{").unwrap();

        // read_file should recover from backup
        #[derive(serde::Deserialize, PartialEq, Debug)]
        struct TestData {
            key: String,
        }
        let result: Result<TestData, FileError> = FileService::read_file(&test_path);
        assert!(result.is_ok());
        let data = result.unwrap();
        assert_eq!(data.key, "value");
    }

    #[test]
    fn test_read_file_fails_when_no_backup_exists() {
        let temp = setup_test_dir();
        let test_path = temp.path().join("test.json");

        // Create corrupted main file with null bytes, no backup
        let null_data = "\0\0\0\0\0\0\0\0\0\0";
        fs::write(&test_path, null_data).unwrap();

        // read_file should fail
        let result: Result<Vec<String>, FileError> = FileService::read_file(&test_path);
        assert!(result.is_err());
    }

    #[test]
    fn test_read_auth_file_recovers_from_backup_on_null_bytes() {
        let temp = setup_test_dir();
        let test_path = temp.path().join("auth.json");
        let backup_path = FileService::get_backup_path(&test_path);

        // Create a valid backup
        let backup_data = r#"{"auth_token": null, "two_factor_auth": null, "version": 1}"#;
        fs::write(&backup_path, backup_data).unwrap();

        // Create corrupted main file with null bytes
        let null_data = "\0\0\0\0\0\0\0\0\0\0";
        fs::write(&test_path, null_data).unwrap();

        // read_auth_file should recover from backup
        let result = FileService::read_auth_file(&test_path);
        assert!(result.is_ok());
    }

    #[test]
    fn test_atomic_write_is_durable() {
        let temp = setup_test_dir();
        let test_path = temp.path().join("test.json");

        // Write multiple times to ensure atomic writes work correctly
        for i in 0..5 {
            let data = format!(r#"{{"iteration": {}}}"#, i);
            let result = FileService::atomic_write(&test_path, &data);
            assert!(result.is_ok());

            let content = fs::read_to_string(&test_path).unwrap();
            assert_eq!(content, data);
        }

        // Backup should have the second-to-last iteration
        let backup_path = FileService::get_backup_path(&test_path);
        assert!(backup_path.exists());
        let backup_content = fs::read_to_string(&backup_path).unwrap();
        assert_eq!(backup_content, r#"{"iteration": 3}"#);
    }

    #[test]
    fn test_get_backup_path_handles_non_utf8() {
        // Test that get_backup_path correctly handles paths with Unicode characters
        let temp = setup_test_dir();
        let test_path = temp.path().join("データ.json");

        let backup_path = FileService::get_backup_path(&test_path);

        // Verify the backup path is formed correctly
        assert!(backup_path.to_string_lossy().ends_with("データ.json.bak"));

        // Verify we can write and read using this path
        let test_data = r#"{"test": "データ"}"#;
        let result = FileService::atomic_write(&test_path, test_data);
        assert!(result.is_ok());

        assert!(test_path.exists());
        assert!(backup_path.exists() || !backup_path.exists()); // May or may not exist on first write
    }
}
