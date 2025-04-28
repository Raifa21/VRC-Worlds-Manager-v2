use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs, path::PathBuf};

#[derive(Debug, Serialize, Deserialize)]
pub struct RateLimitData {
    pub last_rate_limited: Option<DateTime<Utc>>,
    pub consecutive_failures: u32,
    pub current_backoff_ms: u64,
}

impl Default for RateLimitData {
    fn default() -> Self {
        Self {
            last_rate_limited: None,
            consecutive_failures: 0,
            current_backoff_ms: 600000, // 10 minutes
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RateLimitStore {
    pub endpoints: HashMap<String, RateLimitData>,
    #[serde(skip)]
    pub data_path: Option<PathBuf>,
}

impl RateLimitStore {
    pub fn load(path: PathBuf) -> Self {
        let mut store = if path.exists() {
            match fs::read_to_string(&path.clone()) {
                Ok(data) => match serde_json::from_str::<Self>(&data) {
                    Ok(mut loaded) => {
                        loaded.data_path = Some(path.clone());
                        loaded
                    }
                    Err(e) => {
                        log::error!("Failed to parse rate limit data: {}", e);
                        Self::default()
                    }
                },
                Err(e) => {
                    log::error!("Failed to read rate limit data: {}", e);
                    Self::default()
                }
            }
        } else {
            Self::default()
        };

        store.data_path = Some(path.clone());
        store
    }

    pub fn save(&self) {
        if let Some(path) = &self.data_path {
            if let Ok(data) = serde_json::to_string(self) {
                if let Some(parent) = path.parent() {
                    // Create directory if it doesn't exist
                    if let Err(e) = fs::create_dir_all(parent) {
                        log::error!("Failed to create directory for rate limit data: {}", e);
                        return;
                    }
                }

                if let Err(e) = fs::write(path, data) {
                    log::error!("Failed to save rate limit data: {}", e);
                }
            }
        }
    }
}

impl Default for RateLimitStore {
    fn default() -> Self {
        Self {
            endpoints: HashMap::new(),
            data_path: None,
        }
    }
}
