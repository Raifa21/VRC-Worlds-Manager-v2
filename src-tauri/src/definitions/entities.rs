use chrono::{DateTime, SecondsFormat, Utc};
use reqwest::cookie::Jar;
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::api::instance::InstanceRegion;
use crate::updater::update_handler::UpdateChannel;

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
    pub publication_date: Option<DateTime<Utc>>,
    #[serde(rename = "updatedAt")]
    pub last_update: DateTime<Utc>,

    pub description: String,
    pub visits: Option<i32>,
    pub favorites: i32,
    pub platform: Vec<String>,
}

impl WorldApiData {
    pub fn to_world_details(&self) -> WorldDetails {
        WorldDetails {
            world_id: self.world_id.clone(),
            name: self.world_name.clone(),
            thumbnail_url: self.image_url.clone(),
            author_name: self.author_name.clone(),
            author_id: self.author_id.clone(),
            favorites: self.favorites,
            last_updated: self.last_update.format("%Y-%m-%d").to_string(),
            visits: self.visits.unwrap_or(0),
            platform: if self.platform.contains(&"standalonewindows".to_string())
                && self.platform.contains(&"android".to_string())
            {
                Platform::CrossPlatform
            } else if self.platform.contains(&"android".to_string()) {
                Platform::Quest
            } else {
                Platform::PC
            },
            description: self.description.clone(),
            tags: self.tags.clone(),
            capacity: self.capacity,
            recommended_capacity: self.recommended_capacity,
            publication_date: self.publication_date,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorldUserData {
    #[serde(rename = "dateAdded")]
    pub date_added: DateTime<Utc>,
    #[serde(rename = "lastChecked")]
    pub last_checked: DateTime<Utc>,
    pub memo: String,
    #[serde(skip)]
    pub folders: Vec<String>,
    pub hidden: bool,
}

impl WorldUserData {
    pub fn needs_update(&self) -> bool {
        let now = Utc::now();
        let duration = now.signed_duration_since(self.last_checked);
        duration.num_hours() >= 4
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorldModel {
    #[serde(flatten)]
    pub api_data: WorldApiData,
    #[serde(flatten)]
    pub user_data: WorldUserData,
}

impl WorldModel {
    pub fn new(api_data: WorldApiData) -> Self {
        Self {
            api_data,
            user_data: WorldUserData {
                date_added: Utc::now(),
                last_checked: Utc::now(),
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
                .to_rfc3339_opts(SecondsFormat::Millis, true),
            platform: if self
                .api_data
                .platform
                .contains(&"standalonewindows".to_string())
                && self.api_data.platform.contains(&"android".to_string())
            {
                Platform::CrossPlatform
            } else if self.api_data.platform.contains(&"android".to_string()) {
                Platform::Quest
            } else {
                Platform::PC
            },
            folders: self.user_data.folders.clone(),
            tags: self.api_data.tags.clone(),
            capacity: self.api_data.capacity,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub enum Platform {
    #[serde(rename = "PC")]
    PC,
    #[serde(rename = "Quest")]
    Quest,
    #[serde(rename = "Cross-Platform")]
    CrossPlatform,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
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
    pub folders: Vec<String>,
    pub tags: Vec<String>,
    pub capacity: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct WorldDetails {
    #[serde(rename = "worldId")]
    pub world_id: String,
    pub name: String,
    #[serde(rename = "thumbnailUrl")]
    pub thumbnail_url: String,
    #[serde(rename = "authorName")]
    pub author_name: String,
    #[serde(rename = "authorId")]
    pub author_id: String,
    pub favorites: i32,
    #[serde(rename = "lastUpdated")]
    pub last_updated: String,
    pub visits: i32,
    pub platform: Platform,
    pub description: String,
    pub tags: Vec<String>,
    pub capacity: i32,
    #[serde(rename = "recommendedCapacity")]
    pub recommended_capacity: Option<i32>,
    #[serde(rename = "publicationDate")]
    pub publication_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderModel {
    #[serde(rename = "name")]
    pub folder_name: String,
    #[serde(rename = "worlds")]
    pub world_ids: Vec<String>,
    /// Optional share metadata
    #[serde(rename = "share", skip_serializing_if = "Option::is_none")]
    pub share: Option<ShareInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShareInfo {
    #[serde(rename = "id")]
    pub id: String,
    #[serde(rename = "expiryTime")]
    pub expiry_time: DateTime<Utc>,
}

impl FolderModel {
    pub fn new(folder_name: String) -> Self {
        Self {
            folder_name,
            world_ids: vec![],
            share: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub enum CardSize {
    Compact,  // Small preview
    Normal,   // Standard size
    Expanded, // Large with more details
    Original, // Just like the original VRC Worlds Manager
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct FilterItemSelectorStarred {
    pub author: Vec<String>,
    pub tag: Vec<String>,
    pub exclude_tag: Vec<String>,
    pub folder: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub enum FilterItemSelectorStarredType {
    Author,
    Tag,
    ExcludeTag,
    Folder,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, Copy)]
pub enum FolderRemovalPreference {
    #[serde(rename = "ask")]
    Ask, // Ask the user for confirmation
    #[serde(rename = "alwaysRemove")]
    AlwaysRemove, // Always remove from current folder without confirmation
    #[serde(rename = "neverRemove")]
    NeverRemove, // Never remove, always keep in the current folder
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreferenceModel {
    #[serde(rename = "firstTime")]
    pub first_time: bool,
    pub theme: String,
    pub language: String,
    #[serde(rename = "cardSize")]
    pub card_size: CardSize,
    #[serde(default = "default_region")]
    pub region: InstanceRegion,
    #[serde(
        rename = "filterItemSelectorStarred",
        skip_serializing_if = "Option::is_none"
    )]
    pub filter_item_selector_starred: Option<FilterItemSelectorStarred>,
    #[serde(
        rename = "dontShowRemoveFromFolder",
        default = "default_folder_removal"
    )]
    pub dont_show_remove_from_folder: FolderRemovalPreference,
    #[serde(rename = "updateChannel", default = "default_update_channel")]
    pub update_channel: UpdateChannel,
}

fn default_region() -> InstanceRegion {
    InstanceRegion::JP
}

fn default_folder_removal() -> FolderRemovalPreference {
    FolderRemovalPreference::Ask
}

fn default_update_channel() -> UpdateChannel {
    UpdateChannel::Stable
}

impl PreferenceModel {
    pub fn new() -> Self {
        Self {
            first_time: true,
            theme: "light".to_string(),
            language: "en".to_string(),
            card_size: CardSize::Normal,
            region: InstanceRegion::JP,
            filter_item_selector_starred: None,
            dont_show_remove_from_folder: FolderRemovalPreference::Ask,
            update_channel: UpdateChannel::Stable,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AuthCookies {
    #[serde(rename = "twoFactorAuth")]
    pub two_factor_auth: Option<String>,
    #[serde(rename = "auth")]
    pub auth_token: Option<String>,
    #[serde(default)]
    pub version: u8, // 0 = plaintext, 1 = AES
}

impl AuthCookies {
    pub fn new() -> Self {
        Self {
            two_factor_auth: None,
            auth_token: None,
            version: 1,
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
            version: 1,
        }
    }
}

impl Into<Jar> for AuthCookies {
    fn into(self) -> Jar {
        let jar = Jar::default();
        if let Some(auth_token) = self.auth_token {
            jar.add_cookie_str(
                &format!("auth={}", auth_token),
                &reqwest::Url::parse("https://api.vrchat.cloud").unwrap(),
            );
        }
        if let Some(two_factor_auth) = self.two_factor_auth {
            jar.add_cookie_str(
                &format!("twoFactorAuth={}", two_factor_auth),
                &reqwest::Url::parse("http://api.vrchat.cloud").unwrap(),
            );
        }
        jar
    }
}

pub struct InitState {
    pub success: bool,
    pub message: String,
    pub user_id: String,
}

impl InitState {
    pub fn success() -> Self {
        Self {
            success: true,
            message: "".to_string(),
            user_id: "".to_string(),
        }
    }

    pub fn error(message: String) -> Self {
        Self {
            success: false,
            message: message,
            user_id: "".to_string(),
        }
    }
}

#[derive(Debug, Type, Serialize, Deserialize)]
pub struct WorldBlacklist {
    pub worlds: Vec<String>,
}

#[derive(Debug, Type, Serialize, Deserialize)]
pub struct PatreonData {
    #[serde(rename = "platinumSupporter")]
    pub platinum_supporter: Vec<String>,
    #[serde(rename = "goldSupporter")]
    pub gold_supporter: Vec<String>,
    #[serde(rename = "silverSupporter")]
    pub silver_supporter: Vec<String>,
    #[serde(rename = "bronzeSupporter")]
    pub bronze_supporter: Vec<String>,
    #[serde(rename = "basicSupporter")]
    pub basic_supporter: Vec<String>,
}

#[derive(Debug, Type, Serialize, Deserialize)]
pub struct PatreonVRChatNames {
    #[serde(rename = "platinumSupporter")]
    pub platinum_supporter: Vec<String>,
    #[serde(rename = "goldSupporter")]
    pub gold_supporter: Vec<String>,
    #[serde(rename = "silverSupporter")]
    pub silver_supporter: Vec<String>,
    #[serde(rename = "bronzeSupporter")]
    pub bronze_supporter: Vec<String>,
    #[serde(rename = "basicSupporter")]
    pub basic_supporter: Vec<String>,
}
