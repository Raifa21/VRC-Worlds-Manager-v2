use serde::{Deserialize, Serialize};

use crate::definitions::AuthCookies;

#[derive(Debug, PartialEq, Eq)]
pub enum VRChatAuthStatus {
    Success(AuthCookies),
    RequiresEmail2FA,
    Requires2FA,
    InvalidCredentials,
    UnknownError(String),
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
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
