use std::{str::FromStr, sync::Arc};

use base64::{prelude::BASE64_STANDARD, Engine};
use reqwest::{
    cookie::{self, CookieStore, Jar},
    Response, StatusCode,
};
use vrchatapi::models::current_user;

use crate::{
    api::common::{get_reqwest_client, API_BASE_URL},
    definitions::AuthCookies,
};

use super::definitions::{
    CurrentUser, RequiresTwoFactorAuth, TwoFactorAuthVerified, VRChatAuthPhase, VRChatAuthStatus,
};

pub struct VRChatAPIClientAuthenticator {
    client: reqwest::Client,
    cookie: Arc<cookie::Jar>,
    username: String,

    phase: VRChatAuthPhase,
}

impl VRChatAPIClientAuthenticator {
    pub fn new<T: AsRef<str>>(username: T) -> Self {
        let cookie = Arc::new(cookie::Jar::default());
        let client = get_reqwest_client(&cookie);

        VRChatAPIClientAuthenticator {
            client,
            cookie,
            username: username.as_ref().to_string(),
            phase: VRChatAuthPhase::None,
        }
    }

    pub fn from_cookie_store(cookie_store: Arc<Jar>) -> Self {
        let client = get_reqwest_client(&cookie_store);

        VRChatAPIClientAuthenticator {
            client,
            cookie: cookie_store,
            username: String::new(),
            phase: VRChatAuthPhase::None,
        }
    }

    pub async fn verify_token(&mut self) -> Result<VRChatAuthStatus, String> {
        let result = self
            .client
            .get(format!("{}/auth/user", API_BASE_URL))
            .send()
            .await
            .map_err(|e| format!("Failed to send auth request: {}", e))?;

        if result.status() == StatusCode::UNAUTHORIZED {
            self.cookie = Arc::new(Jar::default());
            return Ok(VRChatAuthStatus::InvalidCredentials);
        }

        if result.status() == StatusCode::OK {
            let text = result
                .text()
                .await
                .map_err(|e| format!("Failed to read response: {}", e))?;

            if let Ok(requires_2fa) = serde_json::from_str::<RequiresTwoFactorAuth>(&text) {
                let email_otp = requires_2fa
                    .requires_two_factor_auth
                    .contains(&"emailOtp".to_string());

                self.phase = if email_otp {
                    VRChatAuthPhase::Email2FA
                } else {
                    VRChatAuthPhase::TwoFactorAuth
                };

                return Ok(if email_otp {
                    VRChatAuthStatus::RequiresEmail2FA
                } else {
                    VRChatAuthStatus::Requires2FA
                });
            }

            let current_user = serde_json::from_str::<CurrentUser>(&text)
                .map_err(|e| format!("Failed to parse user data: {}", e))?;

            let url = reqwest::Url::from_str(API_BASE_URL).unwrap();
            let cookie_str = self
                .cookie
                .cookies(&url)
                .map(|c| c.to_str().unwrap_or_default().to_string())
                .unwrap_or_default();

            let auth_cookies = AuthCookies::from_cookie_str(&cookie_str);
            self.phase = VRChatAuthPhase::LoggedIn;

            return Ok(VRChatAuthStatus::Success(auth_cookies, current_user));
        }

        Ok(VRChatAuthStatus::UnknownError(
            "Unexpected response from server".to_string(),
        ))
    }

    pub async fn login_with_password<T: AsRef<str>>(
        &mut self,
        password: T,
    ) -> Result<VRChatAuthStatus, String> {
        let password = password.as_ref().to_string();

        let auth_header_value = self.generate_auth_header(&password);

        let result = self
            .client
            .get(format!("{}/auth/user", API_BASE_URL))
            .header("Authorization", &auth_header_value)
            .send()
            .await
            .expect("Failed to send login request");

        if result.status() == StatusCode::UNAUTHORIZED {
            return Ok(VRChatAuthStatus::InvalidCredentials);
        }

        if result.status() == StatusCode::OK {
            let text = match result.text().await {
                Ok(text) => text,
                Err(e) => return Err(format!("Failed to read response text: {}", e.to_string())),
            };

            if let Ok(requires_2fa) = serde_json::from_str::<RequiresTwoFactorAuth>(&text) {
                let email_otp = requires_2fa
                    .requires_two_factor_auth
                    .contains(&"emailOtp".to_string());

                if email_otp {
                    self.phase = VRChatAuthPhase::Email2FA;
                    return Ok(VRChatAuthStatus::RequiresEmail2FA);
                } else {
                    self.phase = VRChatAuthPhase::TwoFactorAuth;
                    return Ok(VRChatAuthStatus::Requires2FA);
                }
            }

            let current_user = serde_json::from_str::<CurrentUser>(&text)
                .map_err(|e| format!("Failed to parse user data: {}", e))?;

            let url = reqwest::Url::from_str(API_BASE_URL).unwrap();
            let header_value = self.cookie.cookies(&url);
            let cookie_str = header_value.as_ref().unwrap().to_str().unwrap();

            let auth_cookies = AuthCookies::from_cookie_str(cookie_str);

            self.phase = VRChatAuthPhase::LoggedIn;
            return Ok(VRChatAuthStatus::Success(auth_cookies, current_user));
        }

        match result.text().await {
            Ok(text) => Ok(VRChatAuthStatus::UnknownError(format!(
                "Unknown error occurred: {}",
                text
            ))),
            Err(e) => Err(format!("Failed to read response text: {}", e.to_string())),
        }
    }

    pub async fn login_with_email_2fa<T: AsRef<str>>(
        &mut self,
        code: T,
    ) -> Result<VRChatAuthStatus, String> {
        if self.phase != VRChatAuthPhase::Email2FA {
            return Err("Not in email 2FA phase".to_string());
        }

        let code = code.as_ref().to_string();

        let response = self
            .client
            .post(format!(
                "{}/auth/twofactorauth/emailotp/verify",
                API_BASE_URL
            ))
            .header("Content-Type", "application/json")
            .body(format!(r#"{{"code":"{}"}}"#, code))
            .send()
            .await
            .expect("Failed to send login request");

        self.process_2fa_response(response).await
    }

    pub async fn login_with_2fa<T: AsRef<str>>(
        &mut self,
        code: T,
    ) -> Result<VRChatAuthStatus, String> {
        if self.phase != VRChatAuthPhase::TwoFactorAuth {
            return Err("Not in 2FA phase".to_string());
        }

        let code = code.as_ref().to_string();

        let response = self
            .client
            .post(format!("{}/auth/twofactorauth/totp/verify", API_BASE_URL))
            .header("Content-Type", "application/json")
            .body(format!(r#"{{"code":"{}"}}"#, code))
            .send()
            .await
            .expect("Failed to send login request");

        self.process_2fa_response(response).await
    }

    fn generate_auth_header<S: AsRef<str>>(&self, password: S) -> String {
        let auth_value = format!("{}:{}", self.username, password.as_ref());
        let encoded_value = BASE64_STANDARD.encode(auth_value);
        format!("Basic {}", encoded_value)
    }

    async fn process_2fa_response(
        &mut self,
        response: Response,
    ) -> Result<VRChatAuthStatus, String> {
        if response.status() == StatusCode::OK {
            let text = response
                .text()
                .await
                .map_err(|e| format!("Failed to read response text: {}", e))?;

            let verified = serde_json::from_str::<TwoFactorAuthVerified>(&text)
                .map_err(|e| format!("Failed to parse response: {}", e.to_string()))?;

            if !verified.is_verified {
                return Ok(VRChatAuthStatus::InvalidCredentials);
            }

            let current_user = serde_json::from_str::<CurrentUser>(&text)
                .map_err(|e| format!("Failed to parse user data: {}", e))?;

            let url = reqwest::Url::from_str(API_BASE_URL).unwrap();
            let header_value = self.cookie.cookies(&url);
            let cookie_str = header_value.as_ref().unwrap().to_str().unwrap();

            let auth_cookies = AuthCookies::from_cookie_str(cookie_str);

            self.phase = VRChatAuthPhase::LoggedIn;
            return Ok(VRChatAuthStatus::Success(auth_cookies, current_user));
        }

        match response.text().await {
            Ok(text) => Ok(VRChatAuthStatus::UnknownError(format!(
                "Unknown error occurred: {}",
                text
            ))),
            Err(e) => Err(format!("Failed to read response text: {}", e.to_string())),
        }
    }
}

pub async fn logout(jar: &Arc<Jar>) -> Result<(), String> {
    let client = get_reqwest_client(&jar);

    let result = client
        .put(format!("{}/logout", API_BASE_URL))
        .send()
        .await
        .expect("Failed to send login request");

    if result.status() == StatusCode::OK {
        return Ok(());
    }

    match result.text().await {
        Ok(text) => Err(format!("Failed to logout: {}", text)),
        Err(e) => Err(format!("Failed to read response text: {}", e.to_string())),
    }
}
