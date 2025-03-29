use crate::api;
use crate::definitions::{AuthCookies, WorldApiData, WorldModel};
use crate::services::file_service::FileService;
use reqwest::cookie::CookieStore;
use reqwest::{cookie::Jar, Client, Url};
use std::sync::Arc;
use tauri::http::HeaderValue;
use vrchatapi::apis;
use vrchatapi::apis::authentication_api::GetCurrentUserError;
use vrchatapi::apis::configuration::Configuration;
use vrchatapi::models::{self, create_instance_request};

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
        println!("Cookies: {}", cookie_str);
        //convert to AuthCookies
        let auth = AuthCookies::from_cookie_str(&cookie_str);
        println!("Auth: {:?} {:?}", auth.auth_token, auth.two_factor_auth);
        FileService::write_auth(&auth).map_err(|e| e.to_string())
    }

    /// Initializes the API service with the provided cookies
    ///
    /// # Arguments
    /// * `cookies` - The authentication cookies to use for the API
    ///
    /// # Returns
    /// Returns the cookie jar as an Arc
    #[must_use]
    pub fn initialize_with_cookies(cookies: AuthCookies) -> Arc<Jar> {
        let jar = Jar::default();
        let vrchat_url = Url::parse("https://api.vrchat.cloud").expect("Url not okay");

        // Set auth cookie if present
        if let Some(auth) = cookies.auth_token {
            jar.set_cookies(
                &mut [
                    HeaderValue::from_str(&format!("auth={}", auth)).expect("Auth cookie not okay")
                ]
                .iter(),
                &vrchat_url,
            );
        }

        // Set 2FA cookie if present
        if let Some(twofa) = cookies.two_factor_auth {
            jar.set_cookies(
                &mut [HeaderValue::from_str(&format!("twoFactorAuth={}", twofa))
                    .expect("2FA cookie not okay")]
                .iter(),
                &vrchat_url,
            );
        }

        let cookie_store = Arc::new(jar);
        println!("Cookies set: {:?}", cookie_store);
        cookie_store
    }

    /// Creates a new configuration with the provided cookie store
    ///
    /// # Arguments
    /// * `cookie_store` - The cookie store to use for the configuration
    ///
    /// # Returns
    /// Returns a new Configuration instance with the cookie store attached
    #[must_use]
    fn create_config(cookie_store: Arc<Jar>) -> Configuration {
        let mut config = Configuration::new();
        config.user_agent = Some(String::from(
            "WM (formerly VRC World Manager)/0.0.1 discord:raifa",
        ));
        config.client = Client::builder()
            .cookie_provider(cookie_store.clone())
            .build()
            .unwrap();
        config
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
                Ok(())
            }
            Ok(models::EitherUserOrTwoFactor::RequiresTwoFactorAuth(requires_auth)) => {
                println!("2FA required: {:?}", requires_auth);
                Err("2fa-required".to_string())
            }
            Err(vrchatapi::apis::Error::ResponseError(response_content)) => {
                match response_content.entity {
                    Some(GetCurrentUserError::Status401(error)) => {
                        println!("Error: {:?}", error);
                        Err(error.error.unwrap().message.unwrap())
                    }
                    Some(GetCurrentUserError::UnknownValue(_)) => {
                        println!("Unknown error");
                        Err("An unknown error occurred".to_string())
                    }
                    None => Err("No response content".to_string()),
                }
            }
            Err(e) => Err(format!("Request failed: {}", e)),
        }
    }

    /// Logs the user out
    /// This clears the authentication cookies
    ///
    /// # Arguments
    /// * `cookie_store` - The cookie store to use for the API
    ///
    /// # Returns
    /// Returns an empty Ok if the logout was successful
    ///
    /// # Errors
    /// Returns a string error message if the logout fails
    pub async fn logout(cookie_store: Arc<Jar>) -> Result<(), String> {
        api::auth::logout(&cookie_store).await.map_err(|e| {
            let err = format!("Failed to logout from VRChat: {}", e);
            println!("{}", err);
            err
        })
    }

    /// Get user's favorite worlds
    ///
    /// # Arguments
    /// * `cookie_store` - The cookie store to use for the API
    ///
    /// # Returns
    /// Returns a Result containing a vector of WorldApiData if the request was successful
    ///
    /// # Errors
    /// Returns a string error message if the request fails
    #[must_use]
    pub async fn get_favorite_worlds(cookie_store: Arc<Jar>) -> Result<Vec<WorldApiData>, String> {
        let mut worlds = vec![];

        let result = api::world::get_favorite_worlds(cookie_store).await;

        let favorite_worlds = match result {
            Ok(worlds) => worlds,
            Err(e) => {
                return Err(format!(
                    "Failed to parse favorite worlds: {}",
                    e.to_string()
                ))
            }
        };

        for world in favorite_worlds {
            match world.try_into() {
                Ok(world_data) => worlds.push(world_data),
                Err(e) => return Err(format!("Failed to parse world: {}", e)),
            }
        }

        Ok(worlds)
    }

    /// Get a world by its ID
    ///
    /// # Arguments
    /// * `world_id` - The ID of the world to fetch
    /// * `cookie_store` - The cookie store to use for the API
    ///
    /// # Returns
    /// Returns a Result containing the WorldModel if the request was successful
    ///
    /// # Errors
    /// Returns a string error message if the request fails
    #[must_use]
    pub async fn get_world_by_id(
        world_id: String,
        cookie_store: Arc<Jar>,
        worlds: Vec<WorldModel>,
    ) -> Result<WorldApiData, String> {
        if let Some(existing_world) = worlds.iter().find(|w| w.api_data.world_id == world_id) {
            if !existing_world.user_data.needs_update() {
                println!("World already exists in cache");
                return Ok(existing_world.api_data.clone());
            }
        }

        let config = Self::create_config(cookie_store.clone());
        match apis::worlds_api::get_world(&config, &world_id).await {
            Ok(world) => match WorldApiData::from_api_data(world) {
                Ok(world) => Ok(world),
                Err(e) => Err(e.to_string()),
            },
            Err(e) => Err(format!("Failed to fetch world: {}", e)),
        }
    }

    /// Create a new instance of a world
    ///
    /// # Arguments
    /// * `world_id` - The ID of the world to create an instance of
    /// * `instance_type` - The type of instance to create
    /// * `region` - The region to create the instance in
    /// * `cookie_store` - The cookie store to use for the API
    /// * `user_id` - The ID of the user to create the instance for
    ///
    /// # Returns
    /// Returns an empty Ok if the request was successful
    ///
    /// # Errors
    /// Returns a string error message if the request fails
    pub async fn create_world_instance(
        world_id: String,
        instance_type_str: String,
        region_str: String,
        cookie_store: Arc<Jar>,
        user_id: Option<String>,
    ) -> Result<(), String> {
        let config = Self::create_config(cookie_store.clone());
        let mut instance_type = models::InstanceType::Public;
        let mut region = models::InstanceRegion::Us;
        let mut can_request_invite = false;
        match instance_type_str.as_str() {
            "public" => {
                instance_type = models::InstanceType::Public;
            }
            "friends_plus" => {
                instance_type = models::InstanceType::Hidden;
            }
            "friends" => {
                instance_type = models::InstanceType::Friends;
            }
            "invite_plus" => {
                instance_type = models::InstanceType::Private;
                can_request_invite = true;
            }
            "invite" => {
                instance_type = models::InstanceType::Private;
            }
            _ => {}
        }
        match region_str.as_str() {
            "us" => {
                region = models::InstanceRegion::Us;
            }
            "use" => {
                region = models::InstanceRegion::Use;
            }
            "eu" => {
                region = models::InstanceRegion::Eu;
            }
            "jp" => {
                region = models::InstanceRegion::Jp;
            }
            _ => {}
        }
        let mut create_instance_request =
            create_instance_request::CreateInstanceRequest::new(world_id, instance_type, region);
        create_instance_request.can_request_invite = Some(can_request_invite);
        create_instance_request.owner_id = Some(user_id);

        match apis::instances_api::create_instance(&config, create_instance_request).await {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("Failed to create world instance: {}", e)),
        }
    }
}
