use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct SelfInviteResponse {
    pub created_at: String,
    pub details: serde_json::Value,
    pub id: String,
    pub message: String,
    #[serde(rename = "receiverUserId")]
    pub receiver_user_id: String,
    #[serde(rename = "senderUserId")]
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
