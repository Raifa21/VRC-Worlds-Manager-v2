use serde::{Deserialize, Serialize};

#[derive(PartialEq, Eq)]
pub enum InstanceType {
    Public,
    FriendsPlus(String),
    FriendsOnly(String),
    InvitePlus(String),
    InviteOnly(String),
    GroupPublic(String),
    GroupPlus(String),
    GroupOnly(GroupOnlyInstanceConfig),
}

impl InstanceType {
    pub fn public() -> Self {
        InstanceType::Public
    }
    pub fn friends_plus<S: AsRef<str>>(owner_user_id: S) -> Self {
        InstanceType::FriendsPlus(owner_user_id.as_ref().to_string())
    }
    pub fn friends_only<S: AsRef<str>>(owner_user_id: S) -> Self {
        InstanceType::FriendsOnly(owner_user_id.as_ref().to_string())
    }
    pub fn invite_plus<S: AsRef<str>>(owner_user_id: S) -> Self {
        InstanceType::InvitePlus(owner_user_id.as_ref().to_string())
    }
    pub fn invite_only<S: AsRef<str>>(owner_user_id: S) -> Self {
        InstanceType::InviteOnly(owner_user_id.as_ref().to_string())
    }
    pub fn group_public<S: AsRef<str>>(group_id: S) -> Self {
        InstanceType::GroupPublic(group_id.as_ref().to_string())
    }
    pub fn group_plus<S: AsRef<str>>(group_id: S) -> Self {
        InstanceType::GroupPlus(group_id.as_ref().to_string())
    }
    pub fn group_only<S: AsRef<str>>(group_id: S, allowed_roles: Option<Vec<String>>) -> Self {
        InstanceType::GroupOnly(GroupOnlyInstanceConfig {
            group_id: group_id.as_ref().to_string(),
            allowed_roles,
        })
    }
}

#[derive(PartialEq, Eq)]
pub struct GroupOnlyInstanceConfig {
    pub group_id: String,
    pub allowed_roles: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum InstanceRegion {
    #[serde(rename = "us")]
    UsWest,
    #[serde(rename = "use")]
    UsEast,
    #[serde(rename = "eu")]
    EU,
    #[serde(rename = "jp")]
    JP,
}

pub struct CreateInstanceRequestBuilder {
    pub instance_type: InstanceType,
    pub world_id: String,
    pub region: InstanceRegion,
    pub queue_enabled: bool,
}

impl CreateInstanceRequestBuilder {
    pub fn new(
        instance_type: InstanceType,
        world_id: String,
        region: InstanceRegion,
        queue_enabled: bool,
    ) -> Self {
        CreateInstanceRequestBuilder {
            instance_type,
            world_id,
            region,
            queue_enabled,
        }
    }

    pub fn build(self) -> CreateInstanceRequest {
        let is_public = self.instance_type == InstanceType::Public;

        let (instance_type, owner_id, role_ids, group_access_type, can_request_invite) =
            match self.instance_type {
                InstanceType::Public => ("public".into(), None, vec![], "members".into(), false),
                InstanceType::FriendsPlus(owner_id) => (
                    "hidden".into(),
                    Some(owner_id),
                    vec![],
                    "members".into(),
                    false,
                ),
                InstanceType::FriendsOnly(owner_id) => (
                    "friends".into(),
                    Some(owner_id),
                    vec![],
                    "members".into(),
                    false,
                ),
                InstanceType::InvitePlus(owner_id) => (
                    "private".into(),
                    Some(owner_id),
                    vec![],
                    "members".into(),
                    true,
                ),
                InstanceType::InviteOnly(owner_id) => (
                    "private".into(),
                    Some(owner_id),
                    vec![],
                    "members".into(),
                    false,
                ),
                InstanceType::GroupPublic(group_id) => (
                    "group".into(),
                    Some(group_id),
                    vec![],
                    "public".into(),
                    false,
                ),
                InstanceType::GroupPlus(group_id) => {
                    ("group".into(), Some(group_id), vec![], "plus".into(), false)
                }
                InstanceType::GroupOnly(config) => (
                    "group".into(),
                    Some(config.group_id),
                    config.allowed_roles.unwrap_or(vec![]),
                    "members".into(),
                    false,
                ),
            };

        CreateInstanceRequest {
            world_id: self.world_id,
            instance_type,
            region: self.region,
            owner_id,
            role_ids,
            group_access_type,
            queue_enabled: self.queue_enabled,
            can_request_invite,
        }
    }
}

#[derive(Serialize)]
pub struct CreateInstanceRequest {
    #[serde(rename = "worldId")]
    pub world_id: String,
    #[serde(rename = "type")]
    pub instance_type: String,
    #[serde(rename = "region")]
    pub region: InstanceRegion,
    #[serde(rename = "ownerId", skip_serializing_if = "Option::is_none")]
    pub owner_id: Option<String>,
    #[serde(rename = "roleIds")]
    pub role_ids: Vec<String>,
    #[serde(rename = "groupAccessType")]
    pub group_access_type: String,
    #[serde(rename = "queueEnabled")]
    pub queue_enabled: bool,
    #[serde(rename = "canRequestInvite")]
    pub can_request_invite: bool,
}

#[derive(Debug, Deserialize)]
pub struct Instance {
    #[serde(rename = "id")]
    pub id: String,
    #[serde(rename = "instanceId")]
    pub instance_id: String,

    #[serde(rename = "ownerId")]
    pub owner_id: Option<String>,
    #[serde(rename = "photonRegion")]
    pub photon_region: InstanceRegion,
    #[serde(rename = "region")]
    pub region: InstanceRegion,
    #[serde(rename = "shortName")]
    pub short_name: Option<String>,
    #[serde(rename = "worldId")]
    pub world_id: String,
}
