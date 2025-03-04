use chrono::NaiveDateTime as DateTime;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorldModel {
    pub image_url: String,
    pub world_name: String,
    pub world_id: String,
    pub author_name: String,
    pub author_id: String,
    pub capacity: i32,
    pub recommended_capacity: Option<i32>,
    pub tags: Vec<String>,
    pub publication_date: DateTime,
    pub last_update: DateTime,
    pub description: String,
    pub visits: Option<i32>,
    pub favorites: i32,
    pub date_added: DateTime,
    pub platform: Vec<String>,
    pub memo: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredFolder {
    pub folder_name: String,
    pub world_ids: Vec<String>, // Only IDs for storage
}

#[derive(Debug, Clone)]
pub struct RuntimeFolder {
    pub folder_name: String,
    pub worlds: Vec<WorldModel>, // Full world objects for memory
}

impl From<StoredFolder> for RuntimeFolder {
    fn from(stored: StoredFolder) -> Self {
        RuntimeFolder {
            folder_name: stored.folder_name,
            worlds: vec![],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthCookies {
    #[serde(rename = "two-factor-auth")]
    pub two_factor_auth: Option<String>,
    #[serde(rename = "auth")]
    pub auth_token: Option<String>,
}
impl AuthCookies {
    pub fn new() -> Self {
        Self {
            two_factor_auth: None,
            auth_token: None,
        }
    }
}
