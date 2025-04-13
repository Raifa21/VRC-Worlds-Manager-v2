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

#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Default, Serialize, Type)]
pub enum GroupMemberVisibility {
    #[serde(rename = "visible")]
    #[default]
    Visible,
    #[serde(rename = "friends")]
    Friends,
    #[serde(rename = "hidden")]
    Hidden,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Type)]
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
            restricted: true,
        })
    }

    pub fn partial(normal: bool, plus: bool, public: bool, restricted: bool) -> Self {
        GroupInstanceCreatePermission::Allowed(GroupInstanceCreateAllowedType {
            normal,
            plus,
            public,
            restricted,
        })
    }

    pub fn none() -> Self {
        GroupInstanceCreatePermission::NotAllowed
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Type)]
pub struct GroupInstanceCreateAllowedType {
    pub normal: bool,
    pub plus: bool,
    pub public: bool,
    pub restricted: bool,
}

#[derive(Debug, Clone, Serialize, Type)]
pub struct GroupInstancePermissionInfo {
    pub permission: GroupInstanceCreatePermission,
    pub roles: Vec<GroupRole>,
}

#[derive(Debug, Clone, Deserialize, Serialize, Type)]
pub struct GroupDetails {
    pub id: String,
    #[serde(rename = "name")]
    pub name: String,
    #[serde(rename = "iconUrl", default)]
    pub icon_url: Option<String>,

    #[serde(rename = "bannerUrl", default)]
    pub banner_url: Option<String>,

    #[serde(rename = "myMember")]
    pub my_member: Option<GroupMyMember>,
    #[serde(rename = "roles")]
    pub roles: Vec<GroupRole>,
}

#[derive(Debug, Clone, Deserialize, Serialize, Type)]
pub struct GroupRole {
    pub id: String,
    #[serde(rename = "groupId")]
    pub group_id: String,
    pub name: String,
    pub permissions: Vec<GroupPermission>,
}

#[derive(Debug, Clone, Deserialize, Serialize, Type)]
pub struct GroupMyMember {
    pub id: String,
    #[serde(rename = "groupId")]
    pub group_id: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(rename = "roleIds")]
    pub role_ids: Vec<String>,
    pub permissions: Vec<GroupPermission>,
}

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize, Type)]
#[serde(rename_all = "kebab-case")]
pub enum GroupPermission {
    #[serde(rename = "*")]
    All,
    GroupAnnouncementManage,
    GroupAuditView,
    GroupBansManage,
    GroupDataManage,
    GroupDefaultRoleManage,
    GroupGalleriesManage,
    GroupInstanceAgeGatedCreate,
    GroupInstanceJoin,
    GroupInstanceManage,
    GroupInstanceModerate,
    GroupInstanceOpenCreate,
    GroupInstancePlusCreate,
    GroupInstancePlusPortal,
    GroupInstancePlusPortalUnlocked,
    GroupInstancePublicCreate,
    GroupInstanceQueuePriority,
    GroupInstanceRestrictedCreate,
    GroupInvitesManage,
    GroupMembersManage,
    GroupMembersRemove,
    GroupMembersViewall,
    GroupRolesAssign,
    GroupRolesManage,
}
