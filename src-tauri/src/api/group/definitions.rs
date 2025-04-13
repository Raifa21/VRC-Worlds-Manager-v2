use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Clone, Default, Debug, PartialEq, Deserialize, Serialize, Type)]
pub struct UserGroup {
    #[serde(rename = "id")]
    pub id: String,
    #[serde(rename = "name")]
    pub name: String,
    #[serde(rename = "shortCode")]
    pub short_code: String,
    #[serde(rename = "discriminator")]
    pub discriminator: String,
    #[serde(rename = "description")]
    pub description: String,

    #[serde(rename = "iconUrl", default)]
    pub icon_url: Option<String>,

    #[serde(rename = "bannerUrl", default)]
    pub banner_url: Option<String>,
    #[serde(rename = "privacy")]
    pub privacy: String,

    #[serde(rename = "memberCount")]
    pub member_count: i32,
    #[serde(rename = "groupId")]
    pub group_id: String,
    #[serde(rename = "memberVisibility")]
    pub member_visibility: GroupMemberVisibility,
    #[serde(rename = "isRepresenting")]
    pub is_representing: bool,
    #[serde(rename = "mutualGroup")]
    pub mutual_group: bool,
}

#[derive(Clone, Default, Debug, PartialEq, Deserialize, Serialize, Type)]
pub enum GroupMemberVisibility {
    #[serde(rename = "visible")]
    #[default]
    Visible,
    #[serde(rename = "friends")]
    Friends,
    #[serde(rename = "hidden")]
    Hidden,
}

#[derive(Debug, PartialEq, Eq, Clone, Serialize, Deserialize, Type)]
pub enum GroupInstanceCreatePermission {
    Allowed(GroupInstanceCreateAllowedType),
    NotAllowed,
}

impl GroupInstanceCreatePermission {
    pub fn all() -> Self {
        GroupInstanceCreatePermission::Allowed(GroupInstanceCreateAllowedType {
            normal: true,
            plus: true,
            public: true,
        })
    }

    pub fn partial(normal: bool, plus: bool, public: bool) -> Self {
        GroupInstanceCreatePermission::Allowed(GroupInstanceCreateAllowedType {
            normal,
            plus,
            public,
        })
    }

    pub fn none() -> Self {
        GroupInstanceCreatePermission::NotAllowed
    }
}

#[derive(Debug, PartialEq, Eq, Clone, Serialize, Deserialize, Type)]
pub struct GroupInstanceCreateAllowedType {
    pub normal: bool,
    pub plus: bool,
    pub public: bool,
}
