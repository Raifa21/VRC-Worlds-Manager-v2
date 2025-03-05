use crate::definitions::AuthCookies;
use log;
use crate::definitions::{StoredFolder, WorldModel};
use crate::services::EncryptionService;
use directories::BaseDirs;
use serde_json;
use std::fs;
use std::path::PathBuf;

pub struct FileService;

impl FileService {
    fn get_app_dir() -> PathBuf {
        BaseDirs::new()
            .expect("Failed to get base directories")
            .data_local_dir()
            .join("VRC_Worlds_Manager")
    }

    fn get_paths() -> (std::path::PathBuf, std::path::PathBuf, std::path::PathBuf) {
        let base = Self::get_app_dir();
        (
            base.join("Config.toml"),
            base.join("folders.json"),
            base.join("worlds.json"),
        )
    }

    fn read_config(path: &std::path::PathBuf) -> Result<AuthCookies, String> {
        log::info!("Reading config from: {:?}", path);
        let encrypted =
            fs::read_to_string(path).map_err(|e| format!("Failed to read config: {}", e))?;

        let decrypted = EncryptionService::decrypt(encrypted)
            .map_err(|e| format!("Failed to decrypt config: {}", e))?;

        toml::from_str(&decrypted).map_err(|e| format!("Failed to parse config: {}", e))
    }

    pub fn load_data() -> Result<(AuthCookies, Vec<StoredFolder>, Vec<WorldModel>), String> {
        let (config_path, folders_path, worlds_path) = Self::get_paths();

        let auth_cookies = Self::read_config(&config_path)?;

        let folders: Vec<StoredFolder> = fs::read_to_string(folders_path)
            .map_err(|e| format!("Failed to read folders: {}", e))
            .and_then(|data| {
                serde_json::from_str(&data).map_err(|e| format!("Failed to parse folders: {}", e))
            })?;

        let worlds: Vec<WorldModel> = fs::read_to_string(worlds_path)
            .map_err(|e| format!("Failed to read worlds: {}", e))
            .and_then(|data| {
                serde_json::from_str(&data).map_err(|e| format!("Failed to parse worlds: {}", e))
            })?;

        Ok((auth_cookies, folders, worlds))
    }
}
