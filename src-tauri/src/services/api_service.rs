use crate::definitions::AuthCookies;
use crate::services::file_service::FileService;
use reqwest::cookie::CookieStore;
use reqwest::{cookie::Jar, header, Client, Url};
use std::sync::Arc;
use tokio::sync::RwLock;
use vrchatapi::apis;
use vrchatapi::apis::authentication_api::GetCurrentUserError;
use vrchatapi::apis::configuration::Configuration;
use vrchatapi::models;

pub struct ApiService;

impl ApiService {
    /// Saves the cookie store to disk
    ///
    /// # Arguments
    /// * `cookie_store` - The cookie store to save
    ///
    /// # Returns
    /// Returns a Result containing an empty Ok if the cookies were saved successfully
    ///
    /// # Errors
    /// Returns a string error message if the cookies could not be saved
    async fn save_cookie_store(cookie_store: Arc<Jar>) -> Result<(), String> {
        let cookie_str = cookie_store
            .cookies(&Url::parse("https://api.vrchat.cloud").unwrap())
            .map(|cookies| cookies.to_str().unwrap_or_default().to_string())
            .unwrap_or_default();
        //convert to AuthCookies
        let auth = AuthCookies::from_cookie_str(&cookie_str);
        FileService::write_auth(&auth).map_err(|e| e.to_string())
    }

    /// Creates a cookie header from an AuthCookies struct
    ///
    /// # Arguments
    /// * `cookies` - The AuthCookies struct to create the header from
    ///
    /// # Returns
    /// Returns an Option containing the header value if the cookies contain an auth token
    fn create_cookie_header(cookies: &AuthCookies) -> Option<header::HeaderValue> {
        if let Some(auth) = &cookies.auth_token {
            let cookie_str = if let Some(twofa) = &cookies.two_factor_auth {
                format!("auth={}; twoFactorAuth={}", auth, twofa)
            } else {
                format!("auth={}", auth)
            };
            header::HeaderValue::from_str(&cookie_str).ok()
        } else {
            None
        }
    }

    /// Initializes the API service with the provided cookies
    ///
    /// # Arguments
    /// * `cookies` - The authentication cookies to use for the API
    ///
    /// # Returns
    /// Returns the cookie jar as an Arc
    pub fn initialize_with_cookies(cookies: AuthCookies) -> Arc<Jar> {
        let jar = Jar::default();
        let cookie_store = Arc::new(jar);
        let cookie = ApiService::create_cookie_header(&cookies);
        if let Some(cookie) = cookie {
            cookie_store.add_cookie_str(
                &cookie.to_str().unwrap(),
                &Url::parse("https://api.vrchat.cloud").expect("Url not okay"),
            );
        }
        cookie_store
    }

    /// Creates a new configuration with the provided cookie store
    ///
    /// # Arguments
    /// * `cookie_store` - The cookie store to use for the configuration
    ///
    /// # Returns
    /// Returns a new Configuration instance with the cookie store attached
    fn create_config(cookie_store: Arc<Jar>) -> Configuration {
        let mut config = Configuration::default();
        config.user_agent = Some(String::from(
            "WM (formerly VRC World Manager)/0.0.1 discord:raifa",
        ));
        config.client = Client::builder()
            .cookie_provider(cookie_store)
            .build()
            .unwrap();
        config
    }

    /// Checks if the authentication token is valid
    ///
    /// # Arguments
    /// * `cookie_store` - The cookie store to use for the API
    ///
    /// # Returns
    /// Returns an empty Ok if the user is authenticated
    ///
    /// # Errors
    /// Returns a string error message if authentication fails
    pub async fn check_auth_token(cookie_store: Arc<Jar>) -> Result<(), String> {
        let config = Self::create_config(cookie_store.clone());

        let api_instance = apis::authentication_api::verify_auth_token(&config).await;
        let result = api_instance.map(|_| ()).map_err(|e| e.to_string());
        result
    }

    /// Logs the user in with the authentication cookies
    /// This is used to restore the user's session
    ///
    /// # Arguments
    /// * `cookie_store` - The cookie store to use for the API
    ///
    /// # Returns
    /// Returns an empty Ok if the login was successful
    ///
    /// # Errors
    /// Returns a string error message if the login fails
    pub async fn login_with_token(cookie_store: Arc<Jar>) -> Result<(), String> {
        let config = Self::create_config(cookie_store.clone());

        match apis::authentication_api::get_current_user(&config).await {
            Ok(models::EitherUserOrTwoFactor::CurrentUser(me)) => {
                println!("Username: {}", me.username.unwrap());

                match Self::save_cookie_store(cookie_store.clone())
                    .await
                    .map_err(|e| e.to_string())
                {
                    Ok(_) => Ok(()),
                    Err(e) => Err(e),
                }
            }
            Ok(models::EitherUserOrTwoFactor::RequiresTwoFactorAuth(requires_auth)) => {
                println!("2FA required: {:?}", requires_auth);
                Err("2fa-required".to_string())
            }
            Err(vrchatapi::apis::Error::ResponseError(response_content)) => {
                match response_content.entity {
                    Some(GetCurrentUserError::Status401(error)) => {
                        Err(error.error.unwrap().message.unwrap())
                    }
                    Some(GetCurrentUserError::UnknownValue(_)) => {
                        Err("An unknown error occurred".to_string())
                    }
                    None => Err("No response content".to_string()),
                }
            }
            Err(e) => Err(format!("Request failed: {}", e)),
        }
    }

    /// Logs the user in with the provided credentials
    ///
    /// # Arguments
    /// * `username` - The username to log in with
    /// * `password` - The password to log in with
    /// * `cookie_store` - The cookie store to use for the API
    ///
    /// # Returns
    /// Returns an empty Ok if the login was successful
    ///
    /// # Errors
    /// Returns the following error messages:
    /// * "2fa-required" if 2FA is required
    /// * "Invalid username or password" if the credentials are incorrect
    /// * "An unknown error occurred" if an unknown error occurred
    /// * "No response content" if no response content was received
    /// * "Request failed: {error}" if the request failed for any other reason
    pub async fn login_with_credentials(
        username: String,
        password: String,
        cookie_store: Arc<Jar>,
    ) -> Result<(), String> {
        let mut config = Self::create_config(cookie_store.clone());
        config.basic_auth = Some((username, Some(password)));

        match apis::authentication_api::get_current_user(&config).await {
            Ok(models::EitherUserOrTwoFactor::CurrentUser(me)) => {
                println!("Username: {}", me.username.unwrap());

                match Self::save_cookie_store(cookie_store.clone())
                    .await
                    .map_err(|e| e.to_string())
                {
                    Ok(_) => Ok(()),
                    Err(e) => Err(e),
                }
            }
            Ok(models::EitherUserOrTwoFactor::RequiresTwoFactorAuth(requires_auth)) => {
                println!("2FA required: {:?}", requires_auth);
                if requires_auth
                    .requires_two_factor_auth
                    .contains(&String::from("emailOtp"))
                {
                    Err("email-2fa-required".to_string())
                } else {
                    Err("2fa-required".to_string())
                }
            }
            Err(vrchatapi::apis::Error::ResponseError(response_content)) => {
                match response_content.entity {
                    Some(GetCurrentUserError::Status401(error)) => {
                        Err(error.error.unwrap().message.unwrap())
                    }
                    Some(GetCurrentUserError::UnknownValue(_)) => {
                        Err("An unknown error occurred".to_string())
                    }
                    None => Err("No response content".to_string()),
                }
            }
            Err(e) => Err(format!("Request failed: {}", e)),
        }
    }

    /// Logs the user in with the provided 2FA code, when 2FA is required
    /// This is called after login_with_credentials returns "2fa-required"
    ///
    /// # Arguments
    /// * `code` - The 2FA code to log in with
    /// *  `cookie_store` - The cookie store to use for the API
    ///     
    /// # Returns
    /// Returns an empty Ok if the login was successful
    ///
    /// # Errors
    /// Returns a string error message if the login fails
    pub async fn login_with_2fa(
        code: String,
        cookie_store: Arc<Jar>,
        two_factor_auth_type: String,
    ) -> Result<(), String> {
        let config = Self::create_config(cookie_store.clone());
        if two_factor_auth_type == "emailOtp" {
            match apis::authentication_api::verify2_fa_email_code(
                &config,
                models::TwoFactorEmailCode::new(code),
            )
            .await
            {
                Ok(_) => {
                    match Self::save_cookie_store(cookie_store.clone())
                        .await
                        .map_err(|e| e.to_string())
                    {
                        Ok(_) => Ok(()),
                        Err(e) => Err(e),
                    }
                }
                Err(e) => Err(format!("Request failed: {}", e)),
            }
        } else {
            match apis::authentication_api::verify2_fa(
                &config,
                models::TwoFactorAuthCode::new(code),
            )
            .await
            {
                Ok(_) => {
                    match Self::save_cookie_store(cookie_store.clone())
                        .await
                        .map_err(|e| e.to_string())
                    {
                        Ok(_) => Ok(()),
                        Err(e) => Err(e),
                    }
                }
                Err(e) => Err(format!("Request failed: {}", e)),
            }
        }
    }
}
