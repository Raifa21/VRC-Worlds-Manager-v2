use serde::{Deserialize, Serialize};

use crate::definitions::AuthCookies;

#[derive(Deserialize, Debug, PartialEq, Eq)]
pub struct CurrentUser {
    pub id: String,
    #[serde(rename = "displayName")]
    pub username: String,
}

#[derive(Debug, PartialEq, Eq)]
pub enum VRChatAuthStatus {
    Success(AuthCookies, CurrentUser),
    RequiresEmail2FA,
    Requires2FA,
    InvalidCredentials,
    UnknownError(String),
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum VRChatAuthPhase {
    None,
    TwoFactorAuth,
    Email2FA,
    LoggedIn,
}

#[derive(Deserialize)]
pub struct RequiresTwoFactorAuth {
    #[serde(rename = "requiresTwoFactorAuth")]
    pub requires_two_factor_auth: Vec<String>,
}

#[derive(Deserialize)]
pub struct TwoFactorAuthVerified {
    #[serde(rename = "verified")]
    pub is_verified: bool,
}
