use chrono::DateTime;
use serde::Deserialize;

use crate::definitions::WorldApiData;

#[derive(Debug, Eq, PartialEq, Hash, Deserialize)]
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

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
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
        println!("world: {:?}", self);

        println!("world.publication_date: {:?}", self.publication_date);

        let publication_date = if self.publication_date == "none" {
            None
        } else {
            Some(
                DateTime::parse_from_rfc3339(&self.publication_date)
                    .map_err(|e| {
                        println!("Failed to parse publication_date: {}", e);
                        e
                    })?
                    .with_timezone(&chrono::Utc),
            )
        };

        println!("publication_date: {:?}", publication_date);

        println!("world.updated_at: {:?}", self.updated_at);

        let last_update =
            DateTime::parse_from_rfc3339(&self.updated_at)?.with_timezone(&chrono::Utc);

        println!("last_update: {:?}", last_update);

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
            recommended_capacity: None,
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
