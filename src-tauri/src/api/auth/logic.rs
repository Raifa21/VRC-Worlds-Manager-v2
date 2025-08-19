use std::{str::FromStr, sync::Arc};

use base64::{prelude::BASE64_STANDARD, Engine};
use reqwest::{
    cookie::{self, CookieStore, Jar},
    Response, StatusCode,
};

use crate::definitions::AuthCookies;

use crate::api::common::{
    check_rate_limit, get_reqwest_client, handle_api_response, record_rate_limit, reset_backoff,
    API_BASE_URL,
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

    pub fn update_user_info(&mut self, username: String) {
        self.username = username;
    }

    pub fn get_cookies(&self) -> Arc<Jar> {
        self.cookie.clone()
    }

    pub async fn verify_token(&mut self) -> Result<VRChatAuthStatus, String> {
        const OPERATION: &str = "verify_token";

        check_rate_limit(OPERATION)?;

        log::info!("[{}] Starting token verification", OPERATION);
        log::debug!(
            "[{}] Making request to: {}/auth/user",
            OPERATION,
            API_BASE_URL
        );

        let response = self
            .client
            .get(format!("{}/auth/user", API_BASE_URL))
            .send()
            .await
            .map_err(|e| {
                log::error!(
                    "[{}] Failed to send token verification request: {}",
                    OPERATION,
                    e
                );
                log::error!("[{}] Error details: {:?}", OPERATION, e);
                format!("Failed to send auth request: {}", e)
            })?;

        log_response_details(&response, OPERATION);

        let result = match handle_api_response(response, OPERATION).await {
            Ok(response) => response,
            Err(e) => {
                log::error!("[{}] Failed to handle API response: {}", OPERATION, e);
                record_rate_limit(OPERATION);
                return Err(e);
            }
        };

        reset_backoff(OPERATION);

        let status = result.status();
        log::info!("[{}] Token verification status: {}", OPERATION, status);

        if status == StatusCode::UNAUTHORIZED {
            log::info!("[{}] Token is invalid or expired - Status: 401", OPERATION);
            if let Ok(error_body) = result.text().await {
                log::debug!(
                    "[{}] 401 response body: {}",
                    OPERATION,
                    mask_sensitive_data(&error_body)
                );
                analyze_response_body(&error_body, OPERATION);
            }
            return Ok(VRChatAuthStatus::InvalidCredentials);
        }

        if status == StatusCode::OK {
            let text = result.text().await.map_err(|e| {
                log::error!(
                    "[{}] Failed to read token verification response: {}",
                    OPERATION,
                    e
                );
                format!("Failed to read response: {}", e)
            })?;

            log::debug!("[{}] Token verification response received", OPERATION);
            analyze_response_body(&text, OPERATION);
            log::trace!(
                "[{}] Token verification response: {}",
                OPERATION,
                mask_sensitive_data(&text)
            );

            if let Ok(requires_2fa) = serde_json::from_str::<RequiresTwoFactorAuth>(&text) {
                log::info!(
                    "[{}] Token valid but 2FA required: {:?}",
                    OPERATION,
                    requires_2fa.requires_two_factor_auth
                );

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

            let current_user = serde_json::from_str::<CurrentUser>(&text).map_err(|e| {
                log::error!(
                    "[{}] Failed to parse user data from token verification: {}",
                    OPERATION,
                    e
                );
                log::debug!("[{}] Parse error: {:?}", OPERATION, e);
                format!("Failed to parse user data: {}", e)
            })?;

            let url = reqwest::Url::from_str(API_BASE_URL).unwrap();
            let cookie_str = self
                .cookie
                .cookies(&url)
                .map(|c| c.to_str().unwrap_or_default().to_string())
                .unwrap_or_default();

            log::debug!("[{}] Extracted cookies for verification", OPERATION);
            let auth_cookies = AuthCookies::from_cookie_str(&cookie_str);
            self.phase = VRChatAuthPhase::LoggedIn;

            log::info!(
                "[{}] Token verification successful for user: {}",
                OPERATION,
                current_user.username
            );
            return Ok(VRChatAuthStatus::Success(auth_cookies, current_user));
        }

        log::warn!(
            "[{}] Unexpected token verification response: {} {}",
            OPERATION,
            status.as_u16(),
            status.canonical_reason().unwrap_or("Unknown")
        );

        if let Ok(error_body) = result.text().await {
            log::error!(
                "[{}] Unexpected response body: {}",
                OPERATION,
                mask_sensitive_data(&error_body)
            );
            analyze_response_body(&error_body, OPERATION);
        }

        Ok(VRChatAuthStatus::UnknownError(
            "Unexpected response from server".to_string(),
        ))
    }

    pub async fn login_with_password<T: AsRef<str>>(
        &mut self,
        password: T,
    ) -> Result<VRChatAuthStatus, String> {
        const OPERATION: &str = "login_with_password";

        check_rate_limit(OPERATION)?;

        log::info!(
            "[{}] Starting login process for user: {}",
            OPERATION,
            self.username
        );
        let password = password.as_ref().to_string();

        let auth_header_value = self.generate_auth_header(&password);
        let masked_auth_header = mask_auth_header(&auth_header_value);

        log::debug!("[{}] Using auth header: {}", OPERATION, masked_auth_header);
        log::debug!(
            "[{}] Making request to: {}/auth/user",
            OPERATION,
            API_BASE_URL
        );

        // Log request details
        log::debug!("[{}] Request method: GET", OPERATION);
        log::debug!("[{}] Request headers:", OPERATION);
        log::debug!("[{}]   Authorization: {}", OPERATION, masked_auth_header);
        log::debug!(
            "[{}]   User-Agent: [using default reqwest user-agent]",
            OPERATION
        );

        let response = self
            .client
            .get(format!("{}/auth/user", API_BASE_URL))
            .header("Authorization", &auth_header_value)
            .send()
            .await
            .map_err(|e| {
                log::error!("[{}] Failed to send auth request: {}", OPERATION, e);
                log::error!("[{}] Error type: {:?}", OPERATION, e);

                // Log more details about the error
                if e.is_connect() {
                    log::error!("[{}] Connection error - check network/firewall", OPERATION);
                } else if e.is_timeout() {
                    log::error!("[{}] Request timeout", OPERATION);
                } else if e.is_request() {
                    log::error!("[{}] Request building error", OPERATION);
                }

                format!("Failed to send auth request: {}", e)
            })?;

        // Log detailed response information
        log_response_details(&response, OPERATION);

        let result = match handle_api_response(response, OPERATION).await {
            Ok(response) => response,
            Err(e) => {
                log::error!("[{}] Failed to handle API response: {}", OPERATION, e);
                record_rate_limit(OPERATION);
                return Err(e);
            }
        };

        reset_backoff(OPERATION);

        let status = result.status();
        log::info!("[{}] Final response status: {}", OPERATION, status);

        if status == StatusCode::UNAUTHORIZED {
            log::warn!(
                "[{}] Authentication failed - Status: 401 Unauthorized",
                OPERATION
            );
            log::debug!(
                "[{}] This typically means invalid username/password combination",
                OPERATION
            );

            // Still try to read the response body for more details
            if let Ok(error_body) = result.text().await {
                log::debug!(
                    "[{}] 401 Error response body: {}",
                    OPERATION,
                    mask_sensitive_data(&error_body)
                );
                analyze_response_body(&error_body, OPERATION);
            }

            return Ok(VRChatAuthStatus::InvalidCredentials);
        }

        if status == StatusCode::OK {
            log::info!(
                "[{}] Authentication request successful - Status: 200 OK",
                OPERATION
            );

            let text = match result.text().await {
                Ok(text) => {
                    log::debug!("[{}] Successfully read response body", OPERATION);
                    analyze_response_body(&text, OPERATION);
                    log::trace!(
                        "[{}] Full response body: {}",
                        OPERATION,
                        mask_sensitive_data(&text)
                    );
                    text
                }
                Err(e) => {
                    log::error!("[{}] Failed to read response text: {}", OPERATION, e);
                    return Err(format!("Failed to read response: {}", e));
                }
            };

            // Check if 2FA is required
            log::debug!("[{}] Attempting to parse as 2FA requirement", OPERATION);
            if let Ok(requires_2fa) = serde_json::from_str::<RequiresTwoFactorAuth>(&text) {
                log::info!(
                    "[{}] 2FA required. Methods: {:?}",
                    OPERATION,
                    requires_2fa.requires_two_factor_auth
                );

                let email_otp = requires_2fa
                    .requires_two_factor_auth
                    .contains(&"emailOtp".to_string());

                if email_otp {
                    log::info!("[{}] Email OTP 2FA required", OPERATION);
                    self.phase = VRChatAuthPhase::Email2FA;
                    return Ok(VRChatAuthStatus::RequiresEmail2FA);
                } else {
                    log::info!("[{}] TOTP 2FA required", OPERATION);
                    self.phase = VRChatAuthPhase::TwoFactorAuth;
                    return Ok(VRChatAuthStatus::Requires2FA);
                }
            }

            // Try to parse as successful login
            log::debug!("[{}] Attempting to parse as successful login", OPERATION);
            match serde_json::from_str::<CurrentUser>(&text) {
                Ok(current_user) => {
                    log::info!("[{}] Successfully parsed user data", OPERATION);
                    log::info!("[{}] User ID: {}", OPERATION, current_user.id);
                    log::info!("[{}] Username: {}", OPERATION, current_user.username);

                    let url = reqwest::Url::from_str(API_BASE_URL).unwrap();
                    let header_value = self.cookie.cookies(&url);

                    log::debug!(
                        "[{}] Extracting cookies for URL: {}",
                        OPERATION,
                        API_BASE_URL
                    );

                    let cookie_str = match header_value.as_ref() {
                        Some(value) => match value.to_str() {
                            Ok(cookie) => {
                                log::debug!("[{}] Cookies extracted successfully", OPERATION);
                                log::debug!(
                                    "[{}] Cookie count: {}",
                                    OPERATION,
                                    cookie.split(';').count()
                                );
                                log::debug!(
                                    "[{}] Cookie length: {} characters",
                                    OPERATION,
                                    cookie.len()
                                );
                                log::trace!(
                                    "[{}] Cookie contents: {}",
                                    OPERATION,
                                    mask_sensitive_data(cookie)
                                );
                                cookie
                            }
                            Err(e) => {
                                log::error!(
                                    "[{}] Failed to convert cookie to string: {}",
                                    OPERATION,
                                    e
                                );
                                return Err(format!("Failed to convert cookie to string: {}", e));
                            }
                        },
                        None => {
                            log::error!(
                                "[{}] No cookies found for URL: {}",
                                OPERATION,
                                API_BASE_URL
                            );
                            log::debug!(
                                "[{}] This usually indicates a server-side issue or API change",
                                OPERATION
                            );
                            return Err("No cookies found for the given URL".to_string());
                        }
                    };

                    let auth_cookies = AuthCookies::from_cookie_str(cookie_str);
                    self.phase = VRChatAuthPhase::LoggedIn;

                    log::info!("[{}] Login completed successfully", OPERATION);
                    log::info!("[{}] Final user: {}", OPERATION, current_user.username);
                    return Ok(VRChatAuthStatus::Success(auth_cookies, current_user));
                }
                Err(parse_err) => {
                    log::error!(
                        "[{}] Failed to parse user data from response: {}",
                        OPERATION,
                        parse_err
                    );
                    log::debug!("[{}] Parse error details: {:?}", OPERATION, parse_err);
                    log::debug!(
                        "[{}] Response was not 2FA requirement nor valid user data",
                        OPERATION
                    );
                    log::trace!(
                        "[{}] Problematic response body: {}",
                        OPERATION,
                        mask_sensitive_data(&text)
                    );

                    // Try to give more specific error information
                    if text.contains("error") {
                        log::warn!("[{}] Response contains error field", OPERATION);
                    }
                    if text.trim().is_empty() {
                        log::warn!("[{}] Response body is empty", OPERATION);
                    }

                    return Err(format!(
                        "Unexpected response format - parse error: {}",
                        parse_err
                    ));
                }
            }
        }

        // Handle other status codes with detailed logging
        log::warn!(
            "[{}] Unexpected response status: {} {}",
            OPERATION,
            status.as_u16(),
            status.canonical_reason().unwrap_or("Unknown")
        );

        match result.text().await {
            Ok(text) => {
                log::error!(
                    "[{}] Error response body: {}",
                    OPERATION,
                    mask_sensitive_data(&text)
                );
                analyze_response_body(&text, OPERATION);

                // Provide more specific error messages based on status code
                let error_msg = match status.as_u16() {
                    403 => "Access forbidden - possible IP ban or rate limiting",
                    404 => "Endpoint not found - possible API change",
                    429 => "Rate limited - too many requests",
                    500..=599 => "Server error - VRChat API issue",
                    _ => "Unexpected status code",
                };

                Ok(VRChatAuthStatus::UnknownError(format!(
                    "{} ({}): {}",
                    error_msg, status, text
                )))
            }
            Err(e) => {
                log::error!("[{}] Failed to read error response text: {}", OPERATION, e);
                Err(format!(
                    "Failed to read response text after status {}: {}",
                    status, e
                ))
            }
        }
    }

    pub async fn login_with_email_2fa<T: AsRef<str>>(
        &mut self,
        code: T,
    ) -> Result<VRChatAuthStatus, String> {
        const OPERATION: &str = "login_with_2fa";

        log::info!("Logging in with email 2FA...");
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
            .map_err(|e| format!("Failed to send login request: {}", e))?;

        let response = match handle_api_response(response, OPERATION).await {
            Ok(response) => response,
            Err(e) => {
                log::error!("Failed to handle API response: {}", e);
                record_rate_limit(OPERATION);
                return Err(e);
            }
        };

        reset_backoff(OPERATION);

        self.process_2fa_response(response).await
    }

    pub async fn login_with_2fa<T: AsRef<str>>(
        &mut self,
        code: T,
    ) -> Result<VRChatAuthStatus, String> {
        const OPERATION: &str = "login_with_2fa";

        check_rate_limit(OPERATION)?;

        log::info!("Logging in with 2FA...");
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
            .map_err(|e| format!("Failed to send login request: {}", e))?;

        let response = match handle_api_response(response, OPERATION).await {
            Ok(response) => response,
            Err(e) => {
                log::error!("Failed to handle API response: {}", e);
                record_rate_limit(OPERATION);
                return Err(e);
            }
        };

        reset_backoff(OPERATION);

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

            let url = reqwest::Url::from_str(API_BASE_URL).unwrap();
            let header_value = self.cookie.cookies(&url);
            let cookie_str = match header_value.as_ref() {
                Some(value) => value
                    .to_str()
                    .map_err(|e| format!("Failed to convert cookie to string: {}", e))?,
                None => return Err("No cookies found in the response".to_string()),
            };
            let auth_cookies = AuthCookies::from_cookie_str(cookie_str);

            self.phase = VRChatAuthPhase::LoggedIn;

            let current_user = CurrentUser {
                id: String::new(),
                username: String::new(),
            };

            log::info!("Logged in successfully.");
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

// Add this helper function to mask sensitive data
fn mask_sensitive_data(data: &str) -> String {
    // Mask passwords, tokens, and other sensitive fields
    let mut masked = data.to_string();

    // Mask common sensitive fields in JSON responses
    if let Ok(mut json) = serde_json::from_str::<serde_json::Value>(data) {
        if let Some(obj) = json.as_object_mut() {
            // Common sensitive fields to mask
            let sensitive_fields = [
                "password",
                "token",
                "authToken",
                "sessionId",
                "apiKey",
                "secret",
            ];

            for field in sensitive_fields {
                if obj.contains_key(field) {
                    obj[field] = serde_json::Value::String("***MASKED***".to_string());
                }
            }

            // Mask cookie values in auth field if present
            if let Some(auth) = obj.get_mut("auth") {
                if let Some(auth_obj) = auth.as_object_mut() {
                    for (key, value) in auth_obj.iter_mut() {
                        if key.contains("cookie") || key.contains("session") {
                            *value = serde_json::Value::String("***MASKED***".to_string());
                        }
                    }
                }
            }
        }

        serde_json::to_string_pretty(&json).unwrap_or_else(|_| "***FAILED_TO_MASK***".to_string())
    } else {
        // For non-JSON responses, mask common patterns
        masked = regex::Regex::new(r#""password"\s*:\s*"[^"]*""#)
            .unwrap()
            .replace_all(&masked, r#""password":"***MASKED***""#)
            .to_string();

        masked = regex::Regex::new(r#""token"\s*:\s*"[^"]*""#)
            .unwrap()
            .replace_all(&masked, r#""token":"***MASKED***""#)
            .to_string();

        masked
    }
}

fn mask_auth_header(header: &str) -> String {
    if header.starts_with("Basic ") {
        "Basic ***MASKED***".to_string()
    } else if header.starts_with("Bearer ") {
        "Bearer ***MASKED***".to_string()
    } else {
        "***MASKED***".to_string()
    }
}

pub async fn logout(jar: &Arc<Jar>) -> Result<(), String> {
    const OPERATION: &str = "logout";

    check_rate_limit(OPERATION)?;

    log::info!("Logging out...");
    let client = get_reqwest_client(&jar);

    let result = client
        .put(format!("{}/logout", API_BASE_URL))
        .send()
        .await
        .map_err(|e| format!("Failed to send logout request: {}", e))?;

    let result = match handle_api_response(result, OPERATION).await {
        Ok(response) => response,
        Err(e) => {
            log::error!("Failed to handle API response: {}", e);
            record_rate_limit(OPERATION);
            return Err(e);
        }
    };

    reset_backoff(OPERATION);

    if result.status() == StatusCode::OK {
        log::info!("Logout successful");
        return Ok(());
    }

    match result.text().await {
        Ok(text) => Err(format!("Failed to logout: {}", text)),
        Err(e) => Err(format!("Failed to read response text: {}", e.to_string())),
    }
}

// Add this helper function for detailed response logging
fn log_response_details(response: &Response, operation: &str) {
    let status = response.status();
    let headers = response.headers();

    log::info!(
        "[{}] Response Status: {} {}",
        operation,
        status.as_u16(),
        status.canonical_reason().unwrap_or("Unknown")
    );

    // Log important headers
    log::debug!("[{}] Response Headers:", operation);
    for (name, value) in headers.iter() {
        let header_name = name.as_str();
        let header_value = if header_name.to_lowercase().contains("cookie")
            || header_name.to_lowercase().contains("authorization")
            || header_name.to_lowercase().contains("set-cookie")
        {
            "***MASKED***"
        } else {
            value.to_str().unwrap_or("***INVALID_UTF8***")
        };
        log::debug!("[{}]   {}: {}", operation, header_name, header_value);
    }

    // Log content type and length
    if let Some(content_type) = headers.get("content-type") {
        log::debug!(
            "[{}] Content-Type: {}",
            operation,
            content_type.to_str().unwrap_or("***INVALID_UTF8***")
        );
    }

    if let Some(content_length) = headers.get("content-length") {
        log::debug!(
            "[{}] Content-Length: {}",
            operation,
            content_length.to_str().unwrap_or("***INVALID_UTF8***")
        );
    }

    // Log server information
    if let Some(server) = headers.get("server") {
        log::debug!(
            "[{}] Server: {}",
            operation,
            server.to_str().unwrap_or("***INVALID_UTF8***")
        );
    }

    // Log any error-related headers
    if let Some(error_header) = headers.get("x-error") {
        log::warn!(
            "[{}] X-Error Header: {}",
            operation,
            error_header.to_str().unwrap_or("***INVALID_UTF8***")
        );
    }

    if let Some(rate_limit) = headers.get("x-ratelimit-remaining") {
        log::debug!(
            "[{}] Rate Limit Remaining: {}",
            operation,
            rate_limit.to_str().unwrap_or("***INVALID_UTF8***")
        );
    }
}

// Enhanced function to analyze response body structure
fn analyze_response_body(body: &str, operation: &str) {
    log::debug!("[{}] Response body analysis:", operation);
    log::debug!("[{}]   Length: {} characters", operation, body.len());
    log::debug!(
        "[{}]   First 100 chars: {}",
        operation,
        &body.chars().take(100).collect::<String>()
    );

    // Check if it's JSON
    if body.trim().starts_with('{') || body.trim().starts_with('[') {
        log::debug!("[{}]   Format: JSON", operation);

        // Try to parse and analyze JSON structure
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(body) {
            match &json {
                serde_json::Value::Object(obj) => {
                    log::debug!("[{}]   JSON Object with {} keys:", operation, obj.len());
                    for key in obj.keys() {
                        log::debug!("[{}]     - {}", operation, key);
                    }

                    // Check for common error fields
                    if obj.contains_key("error") {
                        if let Some(error_val) = obj.get("error") {
                            log::warn!(
                                "[{}]   Contains error field: {}",
                                operation,
                                mask_sensitive_data(&error_val.to_string())
                            );
                        }
                    }

                    // Check for 2FA indicators
                    if obj.contains_key("requiresTwoFactorAuth") {
                        log::info!("[{}]   Contains 2FA requirement", operation);
                    }

                    // Check for user data indicators
                    if obj.contains_key("id") && obj.contains_key("username") {
                        log::info!("[{}]   Contains user data structure", operation);
                    }
                }
                serde_json::Value::Array(arr) => {
                    log::debug!("[{}]   JSON Array with {} elements", operation, arr.len());
                }
                _ => {
                    log::debug!("[{}]   JSON primitive value", operation);
                }
            }
        } else {
            log::warn!("[{}]   Invalid JSON format", operation);
        }
    } else if body.trim().starts_with('<') {
        log::debug!("[{}]   Format: HTML/XML", operation);

        // Check for common HTML error patterns
        if body.to_lowercase().contains("<title>") {
            let title_start = body.to_lowercase().find("<title>").unwrap_or(0) + 7;
            let title_end = body.to_lowercase().find("</title>").unwrap_or(body.len());
            if title_end > title_start {
                let title = &body[title_start..title_end];
                log::warn!("[{}]   HTML Title: {}", operation, title);
            }
        }

        // Check for common error indicators
        if body.to_lowercase().contains("error")
            || body.to_lowercase().contains("403")
            || body.to_lowercase().contains("404")
        {
            log::warn!("[{}]   HTML appears to contain error content", operation);
        }
    } else {
        log::debug!("[{}]   Format: Plain text or unknown", operation);
    }
}
