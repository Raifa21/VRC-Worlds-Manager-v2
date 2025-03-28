use serde::Deserialize;

use crate::definitions::AuthCookies;

pub const API_BASE_URL: &str = "https://api.vrchat.cloud/api/1";

const USER_AGENT: &str = "WM (formerly VRC World Manager)/0.0.1 discord:raifa";

#[derive(Debug, PartialEq, Eq)]
pub enum VRChatAuthStatus {
    Success(AuthCookies),
    RequiresEmail2FA,
    Requires2FA,
    InvalidCredentials,
    UnknownError(String),
}

#[derive(Debug, PartialEq, Eq)]
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
