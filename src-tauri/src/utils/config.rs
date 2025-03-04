use serde::Deserialize;
use std::fs;
use base64;

#[derive(Deserialize)]
pub struct Config {
    pub api_key: String,
}

pub fn load_config() -> Result<Config, String> {
    let (config_path, _, _) = crate::config::paths::get_paths();
    
    let encoded = fs::read_to_string(config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;
        
    toml::from_slice(&decoded)
        .map_err(|e| format!("Failed to parse config: {}", e))
}