use chrono::NaiveDateTime as DateTime;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorldApiData {
    #[serde(rename = "imageUrl")]
    pub image_url: String,
    #[serde(rename = "name")]
    pub world_name: String,
    #[serde(rename = "id")]
    pub world_id: String,
    #[serde(rename = "authorName")]
    pub author_name: String,
    #[serde(rename = "authorId")]
    pub author_id: String,

    pub capacity: i32,
    #[serde(rename = "recommendedCapacity")]
    pub recommended_capacity: Option<i32>,

    pub tags: Vec<String>,
    #[serde(rename = "publicationDate")]
    pub publication_date: DateTime,
    #[serde(rename = "updated_at")]
    pub last_update: DateTime,

    pub description: String,
    pub visits: Option<i32>,
    pub favorites: i32,
    pub platform: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorldUserData {
    pub date_added: DateTime,
    pub memo: String,
    pub folders: Vec<String>,
    pub hidden: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorldModel {
    #[serde(flatten)]
    pub api_data: WorldApiData,
    #[serde(flatten)]
    pub user_data: WorldUserData,
}

impl WorldModel {
    pub fn new(
        image_url: String,
        world_name: String,
        world_id: String,
        author_name: String,
        author_id: String,
        capacity: i32,
        recommended_capacity: Option<i32>,
        tags: Vec<String>,
        publication_date: DateTime,
        last_update: DateTime,
        description: String,
        visits: Option<i32>,
        favorites: i32,
        platform: Vec<String>,
    ) -> Self {
        Self {
            api_data: WorldApiData {
                image_url,
                world_name,
                world_id,
                author_name,
                author_id,
                capacity,
                recommended_capacity,
                tags,
                publication_date,
                last_update,
                description,
                visits,
                favorites,
                platform,
            },
            user_data: WorldUserData {
                date_added: chrono::Utc::now().naive_utc(),
                memo: "".to_string(),
                folders: vec![],
                hidden: false,
            },
        }
    }

    pub fn to_display_data(&self) -> WorldDisplayData {
        WorldDisplayData {
            world_id: self.api_data.world_id.clone(),
            name: self.api_data.world_name.clone(),
            thumbnail_url: self.api_data.image_url.clone(),
            author_name: self.api_data.author_name.clone(),
            favorites: self.api_data.favorites,
            last_updated: self.api_data.last_update.format("%Y-%m-%d").to_string(),
            visits: self.api_data.visits.unwrap_or(0),
            date_added: self
                .user_data
                .date_added
                .format("%Y-%m-%d %h:%m:%s")
                .to_string(),
            platform: if self.api_data.platform.contains(&"pc".to_string())
                && self.api_data.platform.contains(&"android".to_string())
            {
                Platform::CrossPlatform
            } else if self.api_data.platform.contains(&"android".to_string()) {
                Platform::Quest
            } else {
                Platform::PC
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Platform {
    #[serde(rename = "PC")]
    PC,
    #[serde(rename = "Quest")]
    Quest,
    #[serde(rename = "Cross-Platform")]
    CrossPlatform,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorldDisplayData {
    #[serde(rename = "worldId")]
    pub world_id: String,
    pub name: String,
    #[serde(rename = "thumbnailUrl")]
    pub thumbnail_url: String,
    #[serde(rename = "authorName")]
    pub author_name: String,
    pub favorites: i32,
    #[serde(rename = "lastUpdated")]
    pub last_updated: String,
    pub visits: i32,
    #[serde(rename = "dateAdded")]
    pub date_added: String,
    pub platform: Platform,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderModel {
    #[serde(rename = "name")]
    pub folder_name: String,
    #[serde(rename = "worlds")]
    pub world_ids: Vec<String>,
}

impl FolderModel {
    pub fn new(folder_name: String) -> Self {
        Self {
            folder_name,
            world_ids: vec![],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CardSize {
    Compact,  // Small preview
    Normal,   // Standard size
    Expanded, // Large with more details
    Original, // Just like the original VRC World Manager
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreferenceModel {
    #[serde(rename = "firstTime")]
    pub first_time: bool,
    pub theme: String,
    pub language: String,
    #[serde(rename = "cardSize")]
    pub card_size: CardSize,
}

impl PreferenceModel {
    pub fn new() -> Self {
        Self {
            first_time: true,
            theme: "light".to_string(),
            language: "en".to_string(),
            card_size: CardSize::Normal,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthCookies {
    #[serde(rename = "twoFactorAuth")]
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

    pub fn to_cookie_str(&self) -> Option<String> {
        let mut cookies = Vec::new();

        // Add auth cookie if available
        if let Some(token) = &self.auth_token {
            cookies.push(format!("auth={}", token));
        }

        // Add 2FA bypass cookie if available
        if let Some(twofa) = &self.two_factor_auth {
            cookies.push(format!("twoFactorAuth={}", twofa));
        }

        if cookies.is_empty() {
            None
        } else {
            Some(cookies.join("; "))
        }
    }

    pub fn from_cookie_str(cookie_str: &str) -> Self {
        let mut auth_token = None;
        let mut two_factor_auth = None;

        // Split the cookie string into individual cookies
        for cookie in cookie_str.split("; ") {
            let mut parts = cookie.split('=');
            if let (Some(name), Some(value)) = (parts.next(), parts.next()) {
                match name {
                    "auth" => auth_token = Some(value.to_string()),
                    "twoFactorAuth" => two_factor_auth = Some(value.to_string()),
                    _ => continue,
                }
            }
        }

        AuthCookies {
            auth_token,
            two_factor_auth,
        }
    }
}

pub struct InitState {
    pub success: bool,
    pub message: String,
}

impl InitState {
    pub fn success() -> Self {
        Self {
            success: true,
            message: "".to_string(),
        }
    }

    pub fn error(data_loaded: bool, message: String) -> Self {
        Self {
            success: false,
            message: message,
        }
    }
}
