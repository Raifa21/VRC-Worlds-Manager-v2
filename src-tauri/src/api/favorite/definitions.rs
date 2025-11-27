use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct FavoriteWorldGroup {
    pub display_name: String,
    pub id: String,
    pub name: String,
    pub owner_display_name: String,
    pub owner_id: String,
    pub tags: Vec<String>,
    #[serde(rename = "type")]
    pub type_: String,
    pub visibility: String,
}
