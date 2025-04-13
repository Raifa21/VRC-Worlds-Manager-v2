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

#[derive(Debug, PartialEq, Eq, Serialize, Type)]
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

#[derive(Debug, PartialEq, Eq, Serialize, Type)]
pub struct GroupInstanceCreateAllowedType {
    pub normal: bool,
    pub plus: bool,
    pub public: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize, Type)]
pub struct GroupDetails {
    #[serde(rename = "ageVerificationSlotsAvailable")]
    pub age_verification_slots_available: bool,
    #[serde(rename = "ageVerificationBetaCode")]
    pub age_verification_beta_code: String,
    #[serde(rename = "ageVerificationBetaSlots")]
    pub age_verification_beta_slots: i32,
    pub badges: Vec<String>,
    pub id: String,
    pub name: String,
    #[serde(rename = "shortCode")]
    pub short_code: String,
    pub discriminator: String,
    pub description: String,
    #[serde(rename = "iconUrl")]
    pub icon_url: Option<String>,
    #[serde(rename = "bannerUrl")]
    pub banner_url: Option<String>,
    pub privacy: GroupPrivacy,
    #[serde(rename = "ownerId")]
    pub owner_id: String,
    pub rules: Option<String>,
    pub links: Vec<String>,
    pub languages: Vec<String>,
    #[serde(rename = "iconId")]
    pub icon_id: Option<String>,
    #[serde(rename = "bannerId")]
    pub banner_id: Option<String>,
    #[serde(rename = "memberCount")]
    pub member_count: i32,
    #[serde(rename = "memberCountSyncedAt")]
    pub member_count_synced_at: String,
    #[serde(rename = "isVerified")]
    pub is_verified: bool,
    #[serde(rename = "joinState")]
    pub join_state: GroupJoinState,
    pub tags: Vec<String>,
    #[serde(rename = "transferTargetId")]
    pub transfer_target_id: Option<String>,
    pub galleries: Vec<GroupGallery>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    #[serde(rename = "lastPostCreatedAt")]
    pub last_post_created_at: Option<String>,
    #[serde(rename = "onlineMemberCount")]
    pub online_member_count: i32,
    #[serde(rename = "membershipStatus")]
    pub membership_status: GroupMembershipStatus,
    #[serde(rename = "myMember")]
    pub my_member: GroupMyMember,
}

#[derive(Debug, Clone, Deserialize, Serialize, Type)]
pub struct GroupGallery {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(rename = "membersOnly")]
    pub members_only: bool,
    #[serde(rename = "roleIdsToView")]
    pub role_ids_to_view: Vec<String>,
    #[serde(rename = "roleIdsToSubmit")]
    pub role_ids_to_submit: Vec<String>,
    #[serde(rename = "roleIdsToAutoApprove")]
    pub role_ids_to_auto_approve: Vec<String>,
    #[serde(rename = "roleIdsToManage")]
    pub role_ids_to_manage: Vec<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize, Serialize, Type)]
pub struct GroupRole {
    pub id: String,
    #[serde(rename = "groupId")]
    pub group_id: String,
    pub name: String,
    pub description: String,
    #[serde(rename = "isSelfAssignable")]
    pub is_self_assignable: bool,
    pub permissions: Vec<GroupPermission>,
    #[serde(rename = "isManagementRole")]
    pub is_management_role: bool,
    #[serde(rename = "requiresTwoFactor")]
    pub requires_two_factor: bool,
    #[serde(rename = "requiresPurchase")]
    pub requires_purchase: bool,
    pub order: i32,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize, Serialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum GroupPrivacy {
    Default,
    Private,
}

#[derive(Debug, Clone, Deserialize, Serialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum GroupJoinState {
    Closed,
    Invite,
    Request,
    Open,
}

#[derive(Debug, Clone, Deserialize, Serialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum GroupMembershipStatus {
    Inactive,
    Member,
    Requested,
    Invited,
    Banned,
    #[serde(rename = "userblocked")]
    UserBlocked,
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
    #[serde(rename = "acceptedByDisplayName")]
    pub accepted_by_display_name: Option<String>,
    #[serde(rename = "acceptedById")]
    pub accepted_by_id: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "managerNotes")]
    pub manager_notes: String,
    pub membership_status: String,
    #[serde(rename = "isSubscribedToAnnouncements")]
    pub is_subscribed_to_announcements: bool,
    pub visibility: String,
    #[serde(rename = "isRepresenting")]
    pub is_representing: bool,
    #[serde(rename = "joinedAt")]
    pub joined_at: String,
    #[serde(rename = "bannedAt")]
    pub banned_at: Option<String>,
    #[serde(rename = "has2FA")]
    pub has_2fa: bool,
    #[serde(rename = "hasJoinedFromPurchase")]
    pub has_joined_from_purchase: bool,
    #[serde(rename = "lastPostReadAt")]
    pub last_post_read_at: Option<String>,
    #[serde(rename = "mRoleIds")]
    pub m_role_ids: Vec<String>,
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
