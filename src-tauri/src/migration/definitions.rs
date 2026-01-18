use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use specta::Type;

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
pub struct PreviousWorldModel {
    #[serde(rename = "ThumbnailImageUrl")]
    pub thumbnail_image_url: String,
    #[serde(rename = "WorldName")]
    pub world_name: String,
    #[serde(rename = "WorldId")]
    pub world_id: String,
    #[serde(rename = "AuthorName")]
    pub author_name: String,
    #[serde(rename = "AuthorId")]
    pub author_id: String,
    #[serde(rename = "Capacity")]
    pub capacity: i32,
    #[serde(rename = "LastUpdate")]
    pub last_update: String,
    #[serde(rename = "Description")]
    pub description: String,
    #[serde(rename = "Visits")]
    pub visits: Option<i32>,
    #[serde(rename = "Favorites")]
    pub favorites: i32,
    #[serde(
        rename = "DateAdded",
        default = "default_date_added",
        deserialize_with = "deserialize_datetime"
    )]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub date_added: Option<DateTime<Utc>>, // Optional field for DateAdded

    #[serde(rename = "Platform", default = "default_platform")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform: Option<Vec<String>>, // Optional field for Platform

    #[serde(rename = "UserMemo", default = "default_user_memo")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_memo: Option<String>, // Optional field for UserMemo
}
fn default_date_added() -> Option<DateTime<Utc>> {
    None
}

// Default value for platform
fn default_platform() -> Option<Vec<String>> {
    Some(vec!["standalonewindows".to_string()])
}

// Default value for user_memo
fn default_user_memo() -> Option<String> {
    Some("".to_string())
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
pub struct PreviousFolderCollection {
    #[serde(rename = "Name")]
    pub name: String,
    #[serde(rename = "Worlds")]
    pub worlds: Vec<PreviousWorldModel>,
}

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct PreviousMetadata {
    pub number_of_folders: u32,
    pub number_of_worlds: u32,
}
