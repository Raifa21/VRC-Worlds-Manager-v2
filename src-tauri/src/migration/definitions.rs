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
    #[serde(rename = "DateAdded", deserialize_with = "deserialize_datetime")]
    pub date_added: Option<DateTime<Utc>>,
    #[serde(rename = "Platform")]
    pub platform: Option<Vec<String>>,
    #[serde(rename = "UserMemo")]
    pub user_memo: Option<String>,
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
