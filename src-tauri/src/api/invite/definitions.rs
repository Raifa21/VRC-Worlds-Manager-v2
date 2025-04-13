use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SelfInviteResponse {
    pub created_at: String,
    pub details: serde_json::Value, // Using Value since details is empty object
    pub id: String,
    pub message: String,
    pub receiver_user_id: String,
    pub sender_user_id: String,
    #[serde(rename = "type")]
    pub notification_type: NotificationType,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum NotificationType {
    #[serde(rename = "friendRequest")]
    FriendRequest,
    #[serde(rename = "invite")]
    Invite,
    #[serde(rename = "inviteResponse")]
    InviteResponse,
    #[serde(rename = "message")]
    Message,
    #[serde(rename = "requestInvite")]
    RequestInvite,
    #[serde(rename = "requestInviteResponse")]
    RequestInviteResponse,
    #[serde(rename = "votetokick")]
    VoteToKick,
}
