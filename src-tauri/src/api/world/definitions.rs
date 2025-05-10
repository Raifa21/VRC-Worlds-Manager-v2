use chrono::DateTime;
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::definitions::WorldApiData;

#[derive(Debug, Eq, PartialEq, Hash, Deserialize, Serialize, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub enum ReleaseStatus {
    Public,
    Private,
    Hidden,
    All,
}

impl Default for ReleaseStatus {
    fn default() -> Self {
        Self::Public
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize, Serialize, Type)]
pub struct UnityPackage {
    #[serde(rename = "platform")]
    pub platform: String,
}

#[derive(Default, Debug, PartialEq, Eq, Deserialize)]
pub struct FavoriteWorld {
    #[serde(rename = "authorId")]
    pub author_id: String,
    #[serde(rename = "authorName")]
    pub author_name: String,
    #[serde(rename = "capacity")]
    pub capacity: i32,
    #[serde(rename = "description", default)]
    pub description: String,
    #[serde(rename = "recommendedCapacity", default)]
    pub recommended_capacity: Option<i32>,
    #[serde(rename = "created_at")]
    pub created_at: String,
    #[serde(rename = "favorites")]
    pub favorites: i32,
    #[serde(rename = "favoriteGroup")]
    pub favorite_group: String,
    #[serde(rename = "visits", skip_serializing_if = "Option::is_none")]
    pub visits: Option<i32>,
    #[serde(rename = "id")]
    pub id: String,
    #[serde(rename = "imageUrl")]
    pub image_url: String,
    #[serde(rename = "name")]
    pub name: String,
    #[serde(rename = "publicationDate")]
    pub publication_date: String,
    #[serde(rename = "releaseStatus")]
    pub release_status: ReleaseStatus,
    #[serde(rename = "tags")]
    pub tags: Vec<String>,
    #[serde(rename = "thumbnailImageUrl")]
    pub thumbnail_image_url: String,
    #[serde(rename = "unityPackages")]
    pub unity_packages: Vec<UnityPackage>,
    #[serde(rename = "updated_at")]
    pub updated_at: String,
    #[serde(rename = "version")]
    pub version: i32,
}

impl TryInto<WorldApiData> for FavoriteWorld {
    type Error = chrono::ParseError;

    fn try_into(self) -> Result<WorldApiData, Self::Error> {
        let publication_date = if self.publication_date == "none" {
            None
        } else {
            Some(
                DateTime::parse_from_rfc3339(&self.publication_date)
                    .map_err(|e| {
                        log::info!("Failed to parse publication_date: {}", e);
                        e
                    })?
                    .with_timezone(&chrono::Utc),
            )
        };

        let last_update =
            DateTime::parse_from_rfc3339(&self.updated_at)?.with_timezone(&chrono::Utc);

        let platform: Vec<String> = self
            .unity_packages
            .iter()
            .map(|package| package.platform.clone())
            .collect();

        let recommended_capacity = match self.recommended_capacity {
            Some(capacity) if capacity > 0 => Some(capacity),
            _ => None,
        };

        Ok(WorldApiData {
            image_url: self.image_url,
            world_name: self.name,
            world_id: self.id,
            author_name: self.author_name,
            author_id: self.author_id,
            capacity: self.capacity,
            recommended_capacity,
            tags: self.tags,
            publication_date,
            last_update,
            description: self.description,
            visits: self.visits,
            favorites: self.favorites,
            platform,
        })
    }
}

#[derive(Default, Debug, PartialEq, Deserialize)]
pub struct HiddenWorld {
    #[serde(rename = "authorName")]
    pub author_name: String,
    #[serde(rename = "capacity")]
    pub capacity: i32,
    #[serde(rename = "favoriteGroup")]
    pub favorite_group: String,
    #[serde(rename = "id")]
    pub id: String,
    #[serde(rename = "imageUrl")]
    pub image_url: String,
    #[serde(rename = "name")]
    pub name: String,
    #[serde(rename = "releaseStatus")]
    pub release_status: ReleaseStatus,
    #[serde(rename = "thumbnailImageUrl")]
    pub thumbnail_image_url: String,
}

#[derive(Debug, PartialEq, Deserialize)]
#[serde(untagged)]
pub enum FavoriteWorldParser {
    World(FavoriteWorld),
    HiddenWorld(HiddenWorld),
}

#[derive(Default, Debug, PartialEq, Eq, Deserialize)]
pub struct WorldDetails {
    #[serde(rename = "authorId")]
    pub author_id: String,
    #[serde(rename = "authorName")]
    pub author_name: String,
    #[serde(rename = "capacity")]
    pub capacity: i32,
    #[serde(rename = "description", default)]
    pub description: String,
    #[serde(rename = "recommendedCapacity", default)]
    pub recommended_capacity: i32,
    #[serde(rename = "created_at")]
    pub created_at: String,
    #[serde(rename = "favorites")]
    pub favorites: i32,
    #[serde(rename = "visits", skip_serializing_if = "Option::is_none")]
    pub visits: Option<i32>,
    #[serde(rename = "id")]
    pub id: String,
    #[serde(rename = "imageUrl")]
    pub image_url: String,
    #[serde(rename = "name")]
    pub name: String,
    #[serde(rename = "publicationDate")]
    pub publication_date: String,
    #[serde(rename = "releaseStatus")]
    pub release_status: ReleaseStatus,
    #[serde(rename = "tags")]
    pub tags: Vec<String>,
    #[serde(rename = "thumbnailImageUrl")]
    pub thumbnail_image_url: String,
    #[serde(rename = "unityPackages")]
    pub unity_packages: Vec<UnityPackage>,
    #[serde(rename = "updated_at")]
    pub updated_at: String,
    #[serde(rename = "version")]
    pub version: i32,
}

impl TryInto<WorldApiData> for WorldDetails {
    type Error = chrono::ParseError;

    fn try_into(self) -> Result<WorldApiData, Self::Error> {
        let publication_date = if self.publication_date == "none" {
            None
        } else {
            Some(
                DateTime::parse_from_rfc3339(&self.publication_date)
                    .map_err(|e| {
                        log::info!("Failed to parse publication_date: {}", e);
                        e
                    })?
                    .with_timezone(&chrono::Utc),
            )
        };

        let last_update =
            DateTime::parse_from_rfc3339(&self.updated_at)?.with_timezone(&chrono::Utc);

        let platform: Vec<String> = self
            .unity_packages
            .iter()
            .map(|package| package.platform.clone())
            .collect();

        Ok(WorldApiData {
            image_url: self.image_url,
            world_name: self.name,
            world_id: self.id,
            author_name: self.author_name,
            author_id: self.author_id,
            capacity: self.capacity,
            recommended_capacity: Some(self.recommended_capacity),
            tags: self.tags,
            publication_date,
            last_update,
            description: self.description,
            visits: self.visits,
            favorites: self.favorites,
            platform,
        })
    }
}

#[derive(Clone, Default, Debug, PartialEq, Deserialize, Serialize, Type)]
pub struct VRChatWorld {
    #[serde(rename = "authorId")]
    pub author_id: String,
    #[serde(rename = "authorName")]
    pub author_name: String,
    #[serde(rename = "capacity")]
    pub capacity: i32,
    #[serde(rename = "recommendedCapacity")]
    pub recommended_capacity: Option<i32>,
    #[serde(rename = "created_at")]
    pub created_at: String,
    #[serde(rename = "favorites")]
    pub favorites: i32,
    #[serde(rename = "visits")]
    pub visits: Option<i32>,
    #[serde(rename = "heat")]
    pub heat: i32,
    #[serde(rename = "id")]
    pub id: String,
    #[serde(rename = "imageUrl")]
    pub image_url: String,
    #[serde(rename = "name")]
    pub name: String,
    #[serde(rename = "popularity")]
    pub popularity: i32,
    #[serde(rename = "publicationDate")]
    pub publication_date: String,
    #[serde(rename = "releaseStatus")]
    pub release_status: ReleaseStatus,
    #[serde(rename = "tags")]
    pub tags: Vec<String>,
    #[serde(rename = "thumbnailImageUrl")]
    pub thumbnail_image_url: String,
    #[serde(rename = "unityPackages")]
    pub unity_packages: Vec<UnityPackage>,
    #[serde(rename = "updated_at")]
    pub updated_at: String,
}

#[derive(Default, Debug, PartialEq, Serialize)]
pub struct WorldSearchParameters {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort: Option<SearchWorldSort>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tag: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub search: Option<String>,
}

pub struct WorldSearchParametersBuilder {
    pub sort: Option<SearchWorldSort>,
    pub tag: Option<String>,
    pub platform: Option<String>,
    pub search: Option<String>,
}

impl WorldSearchParametersBuilder {
    pub fn new() -> Self {
        Self {
            sort: None,
            tag: None,
            platform: None,
            search: None,
        }
    }

    pub fn sort(mut self, sort: SearchWorldSort) -> Self {
        self.sort = Some(sort);
        self
    }

    pub fn tag<S: AsRef<str>>(mut self, tag: S) -> Self {
        self.tag = Some(tag.as_ref().to_string());
        self
    }

    pub fn platform<S: AsRef<str>>(mut self, platform: S) -> Self {
        self.platform = Some(platform.as_ref().to_string());
        self
    }

    pub fn search<S: AsRef<str>>(mut self, search: S) -> Self {
        self.search = Some(search.as_ref().to_string());
        self
    }

    pub fn build(self) -> WorldSearchParameters {
        WorldSearchParameters {
            sort: self.sort,
            tag: self.tag,
            platform: self.platform,
            search: self.search,
        }
    }
}

#[derive(Debug, PartialEq, Serialize)]
pub enum SearchWorldSort {
    #[serde(rename = "popularity")]
    Popularity,
    #[serde(rename = "heat")]
    Heat,
    #[serde(rename = "trust")]
    Trust,
    #[serde(rename = "shuffle")]
    Shuffle,
    #[serde(rename = "random")]
    Random,
    #[serde(rename = "favorites")]
    Favorites,
    #[serde(rename = "reportScore")]
    ReportScore,
    #[serde(rename = "reportCount")]
    ReportCount,
    #[serde(rename = "publicationDate")]
    PublicationDate,
    #[serde(rename = "labsPublicationDate")]
    LabsPublicationDate,
    #[serde(rename = "created")]
    Created,
    #[serde(rename = "_created_at")]
    CreatedAt,
    #[serde(rename = "updated")]
    Updated,
    #[serde(rename = "_updated_at")]
    UpdatedAt,
    #[serde(rename = "order")]
    Order,
    #[serde(rename = "relevance")]
    Relevance,
    #[serde(rename = "magic")]
    Magic,
    #[serde(rename = "name")]
    Name,
}

impl SearchWorldSort {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "popularity" => Some(Self::Popularity),
            "heat" => Some(Self::Heat),
            "random" => Some(Self::Random),
            "favorites" => Some(Self::Favorites),
            "publicationDate" => Some(Self::PublicationDate),
            "created" => Some(Self::Created),
            "updated" => Some(Self::Updated),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hidden_world_deserialization() {
        let hidden_example = r#"
  {
    "authorName": "???",
    "capacity": 0,
    "favoriteGroup": "worlds1",
    "favoriteId": "fvrt_00000000-0000-0000-0000-0000000000000",
    "id": "???",
    "imageUrl": "",
    "isSecure": false,
    "name": "???",
    "occupants": 0,
    "releaseStatus": "hidden",
    "thumbnailImageUrl": "https://assets.vrchat.com/default/unavailable-world.png"
  }
  "#;

        let hidden_world: HiddenWorld = serde_json::from_str(hidden_example).unwrap();

        assert_eq!(hidden_world.author_name, "???");
        assert_eq!(hidden_world.capacity, 0);
        assert_eq!(hidden_world.favorite_group, "worlds1");
        assert_eq!(hidden_world.release_status, ReleaseStatus::Hidden);
        assert_eq!(
            hidden_world.thumbnail_image_url,
            "https://assets.vrchat.com/default/unavailable-world.png"
        );
    }
}
