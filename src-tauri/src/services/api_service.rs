use crate::definitions::AuthCookies;
use crate::services::file_service::FileService;
use crate::{API_CONFIG, COOKIE_STORE};
use reqwest::cookie::CookieStore;
use reqwest::{cookie::Jar, header, Client, Url};
use std::sync::Arc;
use vrchatapi::apis;
use vrchatapi::apis::authentication_api::GetCurrentUserError;
use vrchatapi::apis::configuration::Configuration;
use vrchatapi::models;

pub struct ApiService;

impl ApiService {
    /// Saves the cookie store to disk
    ///
    /// # Returns
    /// Returns a Result containing an empty Ok if the cookies were saved successfully
    ///
    /// # Errors
    /// Returns a string error message if the cookies could not be saved
    fn save_cookie_store() -> Result<(), String> {
        let store_lock = COOKIE_STORE.get().read();
        let store = store_lock.as_ref().unwrap();
        let cookie_str = store
            .cookies(&Url::parse("https://api.vrchat.cloud").unwrap())
            .map(|cookies| cookies.to_str().unwrap_or_default().to_string())
            .unwrap_or_default();
        drop(store_lock);
        //convert to AuthCookies
        let auth = AuthCookies::from_cookie_str(&cookie_str);
        FileService::write_auth(&auth).map_err(|e| e.to_string())
    }

    /// Helper function to create a cookie header from an AuthCookies struct
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
    /// Returns a tuple containing the cookie store and the API configuration
    pub fn initialize_with_cookies(cookies: AuthCookies) -> (Arc<Jar>, Configuration) {
        let mut config = Configuration::default();
        config.user_agent =
            Some("VWM (previously VRC Worlds Manager)/0.0.1 discord:raifa".to_string());

        let jar = Jar::default();
        let cookie_store = Arc::new(jar);
        let cookie = ApiService::create_cookie_header(&cookies);
        if let Some(cookie) = cookie {
            cookie_store.add_cookie_str(
                &cookie.to_str().unwrap(),
                &Url::parse("https://api.vrchat.cloud").expect("Url not okay"),
            );
        }

        // Build client with cookie provider
        config.client = Client::builder()
            .cookie_provider(Arc::clone(&cookie_store))
            .build()
            .unwrap();

        (cookie_store, config)
    }

    /// Checks if the user is authenticated with the VRChat API
    ///
    /// # Returns
    /// Returns an empty Ok if the user is authenticated
    ///
    /// # Errors
    /// Returns a string error message if authentication fails
    pub async fn check_auth_token() -> Result<(), String> {
        let mut config_lock = API_CONFIG.get().write();
        let config = config_lock.as_mut().unwrap();

        let api_instance = apis::authentication_api::verify_auth_token(&config).await;

        let result = api_instance.map(|_| ()).map_err(|e| e.to_string());
        result
    }

    /// Logs the user in with the provided credentials
    ///
    /// # Arguments
    /// * `username` - The username to log in with
    /// * `password` - The password to log in with
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
    pub async fn login_with_credentials(username: String, password: String) -> Result<(), String> {
        let mut config_lock = API_CONFIG.get().write();
        let config = config_lock.as_mut().unwrap();

        config.basic_auth = Some((username, Some(password)));

        match apis::authentication_api::get_current_user(&config).await {
            Ok(models::EitherUserOrTwoFactor::CurrentUser(me)) => {
                println!("Username: {}", me.username.unwrap());

                match Self::save_cookie_store().map_err(|e| e.to_string()) {
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
}
#[cfg(test)]
mod tests {
    use super::*;
    use reqwest::header::{HeaderMap, HeaderValue};

    fn assert_cookie_header(headers: &HeaderMap, expected: Option<&str>) {
        match (headers.get("Cookie"), expected) {
            (Some(header), Some(expected_value)) => {
                assert_eq!(header.to_str().unwrap(), expected_value);
            }
            (None, None) => {
                // Success - no cookie header when none expected
            }
            (Some(_), None) => {
                panic!("Found cookie header when none expected");
            }
            (None, Some(_)) => {
                panic!("No cookie header found when one was expected");
            }
        }
    }

    #[test]
    fn test_create_cookie_header() {
        let cookies_with_2fa = AuthCookies {
            auth_token: Some("test_auth".to_string()),
            two_factor_auth: Some("test_2fa".to_string()),
        };

        let header = ApiService::create_cookie_header(&cookies_with_2fa).unwrap();
        assert_eq!(
            header.to_str().unwrap(),
            "auth=test_auth; twoFactorAuth=test_2fa"
        );

        let cookies_without_2fa = AuthCookies {
            auth_token: Some("test_auth".to_string()),
            two_factor_auth: None,
        };

        let header = ApiService::create_cookie_header(&cookies_without_2fa).unwrap();
        assert_eq!(header.to_str().unwrap(), "auth=test_auth");
    }
}
