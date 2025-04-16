use crate::api::auth::VRChatAPIClientAuthenticator;
use crate::api::{auth, group, instance, invite, world};
use crate::definitions::{AuthCookies, WorldApiData, WorldModel};
use crate::services::file_service::FileService;
use crate::services::FolderManager;
use crate::InitState;
use crate::INITSTATE;
use reqwest::cookie::CookieStore;
use reqwest::{cookie::Jar, Client, Url};
use std::sync::{Arc, RwLock};
use tauri::http::HeaderValue;
use world::ReleaseStatus;

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
        log::info!("Cookies: {}", cookie_str);
        //convert to AuthCookies
        let auth = AuthCookies::from_cookie_str(&cookie_str);
        log::info!("Auth: {:?} {:?}", auth.auth_token, auth.two_factor_auth);
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

        Arc::new(jar)
    }

    /// Logs the user in with the authentication cookies
    /// This is used to restore the user's session
    ///
    /// # Arguments
    /// * `auth` - The VRChatAPIClientAuthenticator to use for the login
    ///
    /// # Returns
    /// Returns a Result containing the VRChatAPIClientAuthenticator if the login was successful
    ///
    /// # Errors
    /// Returns a string error message if the login fails
    pub async fn login_with_token(
        auth: &tokio::sync::RwLock<VRChatAPIClientAuthenticator>,
        init: &tokio::sync::RwLock<InitState>,
    ) -> Result<(), String> {
        let mut auth_lock = auth.write().await;
        let mut init_lock = init.write().await;
        match auth_lock.verify_token().await {
            Ok(auth::VRChatAuthStatus::Success(cookies, user)) => {
                // Store cookies and update AUTHENTICATOR state
                FileService::write_auth(&cookies).map_err(|e| e.to_string())?;
                log::info!("Username: {}, ID: {}", user.username, user.id);
                auth_lock.update_user_info(user.username);
                init_lock.user_id = user.id.clone();
                Ok(())
            }
            Ok(auth::VRChatAuthStatus::Requires2FA) => Err("2fa-required".to_string()),
            Ok(auth::VRChatAuthStatus::RequiresEmail2FA) => Err("email-2fa-required".to_string()),
            Ok(auth::VRChatAuthStatus::InvalidCredentials) => {
                Err("Invalid credentials".to_string())
            }
            Ok(auth::VRChatAuthStatus::UnknownError(e)) => Err(format!("Login failed: {}", e)),
            Err(e) => Err(format!("Login failed: {}", e)),
        }
    }

    /// Logs the user in with the provided credentials
    ///     
    /// # Arguments
    /// * `username` - The username of the user
    /// * `password` - The password of the user
    /// * `auth` - The VRChatAPIClientAuthenticator to use for the login
    ///
    /// # Returns
    /// Returns a Result containing the VRChatAPIClientAuthenticator if the login was successful
    ///
    /// # Errors
    /// Returns a string error message if the login fails
    pub async fn login_with_credentials(
        username: String,
        password: String,
        auth: &tokio::sync::RwLock<VRChatAPIClientAuthenticator>,
    ) -> Result<(), String> {
        let mut auth_lock = auth.write().await;
        *auth_lock = VRChatAPIClientAuthenticator::new(username.clone());
        let result = auth_lock.login_with_password(&password).await;

        if result.is_err() {
            return Err(format!("Login failed: {}", result.as_ref().err().unwrap()));
        }

        let status = result.unwrap();

        match status {
            auth::VRChatAuthStatus::Success(cookies, user) => {
                // Store cookies and update AUTHENTICATOR state
                FileService::write_auth(&cookies).map_err(|e| e.to_string())?;

                // Save the cookie store to disk
                let cookie_store = Self::initialize_with_cookies(cookies);
                Self::save_cookie_store(cookie_store)
                    .await
                    .map_err(|e| e.to_string())?;
                Ok(())
            }
            auth::VRChatAuthStatus::Requires2FA => Err("2fa-required".to_string()),
            auth::VRChatAuthStatus::RequiresEmail2FA => Err("email-2fa-required".to_string()),
            auth::VRChatAuthStatus::InvalidCredentials => Err("Invalid credentials".to_string()),
            auth::VRChatAuthStatus::UnknownError(e) => Err(format!("Login failed: {}", e)),
        }
    }

    /// Logs the user in with the provided 2FA code
    /// This is used to complete the login process
    ///
    /// # Arguments
    /// * `code` - The 2FA code to use for the login
    /// * `auth` - The VRChatAPIClientAuthenticator to use for the login
    ///
    /// # Returns
    /// Returns a Result containing the VRChatAPIClientAuthenticator if the login was successful
    ///
    /// # Errors
    /// Returns a string error message if the login fails
    pub async fn login_with_2fa(
        code: String,
        auth: &tokio::sync::RwLock<VRChatAPIClientAuthenticator>,
    ) -> Result<(), String> {
        let mut auth_lock = auth.write().await;
        match auth_lock.login_with_2fa(&code).await {
            Ok(auth::VRChatAuthStatus::Success(cookies, user)) => {
                // Store cookies and update AUTHENTICATOR state
                FileService::write_auth(&cookies).map_err(|e| e.to_string())?;

                // Save the cookie store to disk
                let cookie_store = Self::initialize_with_cookies(cookies);
                Self::save_cookie_store(cookie_store)
                    .await
                    .map_err(|e| e.to_string())?;
                Ok(())
            }
            Ok(auth::VRChatAuthStatus::Requires2FA) => Err("2fa-required".to_string()),
            Ok(auth::VRChatAuthStatus::RequiresEmail2FA) => Err("email-2fa-required".to_string()),
            Ok(auth::VRChatAuthStatus::InvalidCredentials) => {
                Err("Invalid credentials".to_string())
            }
            Ok(auth::VRChatAuthStatus::UnknownError(e)) => Err(format!("Login failed: {}", e)),
            Err(e) => {
                let err = format!("Login failed: {}", e);
                log::info!("{}", err);
                Err(err)
            }
        }
    }

    /// Logs the user in with the provided email 2FA code
    /// This is used to complete the login process
    ///
    /// # Arguments
    /// * `code` - The email 2FA code to use for the login
    /// * `auth` - The VRChatAPIClientAuthenticator to use for the login
    ///
    /// # Returns
    /// Returns a Result containing the VRChatAPIClientAuthenticator if the login was successful
    ///
    /// # Errors
    /// Returns a string error message if the login fails
    pub async fn login_with_email_2fa(
        code: String,
        auth: &tokio::sync::RwLock<VRChatAPIClientAuthenticator>,
    ) -> Result<(), String> {
        let mut auth_lock = auth.write().await;
        match auth_lock.login_with_email_2fa(&code).await {
            Ok(auth::VRChatAuthStatus::Success(cookies, user)) => {
                // Store cookies and update AUTHENTICATOR state
                FileService::write_auth(&cookies).map_err(|e| e.to_string())?;
                log::info!("Username: {}, ID: {}", user.username, user.id);
                auth_lock.update_user_info(user.username);
                INITSTATE.get().write().await.user_id = user.id.clone();

                // Save the cookie store to disk
                let cookie_store = Self::initialize_with_cookies(cookies);
                Self::save_cookie_store(cookie_store)
                    .await
                    .map_err(|e| e.to_string())?;
                Ok(())
            }
            Ok(auth::VRChatAuthStatus::Requires2FA) => Err("2fa-required".to_string()),
            Ok(auth::VRChatAuthStatus::RequiresEmail2FA) => Err("email-2fa-required".to_string()),
            Ok(auth::VRChatAuthStatus::InvalidCredentials) => {
                Err("Invalid credentials".to_string())
            }
            Ok(auth::VRChatAuthStatus::UnknownError(e)) => Err(format!("Login failed: {}", e)),
            Err(e) => {
                let err = format!("Login failed: {}", e);
                log::info!("{}", err);
                Err(err)
            }
        }
    }

    /// Logs the user out
    /// This clears the authentication cookies
    /// Also clears local storage
    ///
    /// # Arguments
    /// * `auth` - The VRChatAPIClientAuthenticator to use for the logout
    ///
    /// # Returns
    /// Returns a Result containing an empty Ok if the logout was successful
    ///
    /// # Errors
    /// Returns a string error message if the logout fails
    pub async fn logout(
        auth: &tokio::sync::RwLock<VRChatAPIClientAuthenticator>,
    ) -> Result<(), String> {
        let authenticator = auth.read().await;
        let cookie_store = authenticator.get_cookies();

        // Call the API logout endpoint
        auth::logout(&cookie_store).await.map_err(|e| {
            let err = format!("Failed to logout from VRChat: {}", e);
            log::info!("{}", err);
            err
        })?;

        // Clear cookies from disk
        FileService::write_auth(&AuthCookies::new()).map_err(|e| e.to_string())?;

        // Reset INITSTATE
        INITSTATE.get().write().await.user_id = String::new();

        // Reset authenticator
        drop(authenticator);
        let mut auth_lock = auth.write().await;
        *auth_lock = VRChatAPIClientAuthenticator::new(String::new());

        Ok(())
    }

    #[must_use]
    pub async fn get_favorite_worlds(cookie_store: Arc<Jar>) -> Result<Vec<WorldApiData>, String> {
        let mut worlds = vec![];

        let result = world::get_favorite_worlds(cookie_store).await;

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
            // Only include public worlds
            if world.release_status != ReleaseStatus::Public {
                log::info!("Skipping non-public world: {}", world.id);

                continue;
            }

            match world.try_into() {
                Ok(world_data) => worlds.push(world_data),
                Err(e) => return Err(format!("Failed to parse world: {}", e)),
            }
        }

        Ok(worlds)
    }

    #[must_use]
    pub async fn get_world_by_id(
        world_id: String,
        cookie_store: Arc<Jar>,
        worlds: Vec<WorldModel>,
    ) -> Result<WorldApiData, String> {
        // First check if we have a cached version
        if let Some(existing_world) = worlds.iter().find(|w| w.api_data.world_id == world_id) {
            if !existing_world.user_data.needs_update() {
                log::info!("World already exists in cache");
                return Ok(existing_world.api_data.clone());
            }
        }

        // Fetch from API
        match world::get_world_by_id(cookie_store, &world_id).await {
            Ok(world) => {
                // Check release status
                if world.release_status != ReleaseStatus::Public {
                    log::info!("World {} is not public", world_id);
                    // TODO: remove world from local data
                    return Err("World is not public".to_string());
                }

                match world::WorldDetails::try_into(world) {
                    Ok(world_data) => Ok(world_data),
                    Err(e) => Err(e.to_string()),
                }
            }
            Err(e) => Err(format!("Failed to fetch world: {}", e)),
        }
    }

    async fn invite_self_to_instance(
        cookie_store: Arc<Jar>,
        world_id: String,
        instance_id: String,
    ) -> Result<(), String> {
        match invite::invite_self_to_instance(cookie_store, &world_id, &instance_id).await {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("Failed to invite self to instance: {}", e)),
        }
    }

    /// Creates a new instance of a world
    ///
    /// # Arguments
    /// * `world_id` - The ID of the world to create an instance of
    /// * `instance_type_str` - The type of instance to create
    /// * `region_str` - The region to create the instance in
    /// * `cookie_store` - The cookie store to use for the API
    /// * `user_id` - The ID of the user to create the instance for
    ///
    /// # Returns
    /// Returns an empty Ok if the request was successful
    ///
    /// # Errors
    /// Returns a string error message if the request fails
    #[must_use]
    pub async fn create_world_instance(
        world_id: String,
        instance_type_str: String,
        region_str: String,
        cookie_store: Arc<Jar>,
        user_id: String,
    ) -> Result<(), String> {
        log::info!(
            "Creating instance: {} {} {}",
            world_id,
            instance_type_str,
            region_str
        );
        // Convert region string to InstanceRegion enum
        let region = match region_str.as_str() {
            "USW" => instance::InstanceRegion::UsWest,
            "USE" => instance::InstanceRegion::UsEast,
            "EU" => instance::InstanceRegion::EU,
            "JP" => instance::InstanceRegion::JP,
            _ => return Err("Invalid region".to_string()),
        };
        log::info!("ID: {:?}", user_id.clone());
        // Create instance type based on string and user_id
        let instance_type = match instance_type_str.as_str() {
            "public" => instance::InstanceType::Public,
            "friends+" => instance::InstanceType::friends_plus(user_id),
            "friends" => instance::InstanceType::friends_only(user_id),
            "invite+" => instance::InstanceType::invite_plus(user_id),
            "invite" => instance::InstanceType::invite_only(user_id),
            _ => return Err("Invalid instance type".to_string()),
        };

        // Create request using builder
        let request =
            instance::CreateInstanceRequestBuilder::new(instance_type, world_id, region, false)
                .build();

        // Call API endpoint
        match instance::create_instance(cookie_store.clone(), request).await {
            Ok(_instance) => {
                // Invite self to the instance
                let instance_id = _instance.instance_id.clone();
                let world_id = _instance.world_id.clone();
                Self::invite_self_to_instance(cookie_store, world_id, instance_id).await?;
                Ok(())
            }
            Err(e) => Err(format!("Failed to create world instance: {}", e)),
        }
    }

    /// Gets the user's groups
    ///
    /// # Arguments
    /// * `cookie_store` - The cookie store to use for the API
    /// * `user_id` - The ID of the user to get the groups for
    ///
    /// # Returns
    /// Returns a Result containing a vector of UserGroup if the request was successful
    ///
    /// # Errors
    /// Returns a string error message if the request fails
    #[must_use]
    pub async fn get_user_groups(
        cookie_store: Arc<Jar>,
        user_id: String,
    ) -> Result<Vec<group::UserGroup>, String> {
        match group::get_user_groups(cookie_store, &user_id).await {
            Ok(groups) => Ok(groups),
            Err(e) => Err(format!("Failed to fetch user groups: {}", e)),
        }
    }

    /// Gets the permission for creating a group instance
    ///
    /// # Arguments
    /// * `cookie_store` - The cookie store to use for the API
    /// * `group_id` - The ID of the group to get the permission for
    ///
    /// # Returns
    /// Returns a Result containing the group instance create permission if the request was successful
    ///
    /// # Errors
    /// Returns a string error message if the request fails
    #[must_use]
    pub async fn get_permission_for_create_group_instance(
        cookie_store: Arc<Jar>,
        group_id: String,
    ) -> Result<group::GroupInstancePermissionInfo, String> {
        match group::get_permission_for_create_group_instance(cookie_store, &group_id).await {
            Ok(permission) => Ok(permission),
            Err(e) => Err(format!("Failed to fetch group instance permission: {}", e)),
        }
    }

    /// Creates a new group instance
    ///
    /// # Arguments
    /// * `world_id` - The ID of the world to create an instance of
    /// * `group_id` - The ID of the group to create the instance for
    /// * `instance_type_str` - The type of instance to create
    /// * `allowed_roles` - The allowed roles for the instance
    /// * `region_str` - The region to create the instance in
    /// * `queue_enabled` - Whether the instance should have a queue
    /// * `cookie_store` - The cookie store to use for the API
    ///
    /// # Returns
    /// Returns an empty Ok if the request was successful
    ///
    /// # Errors
    /// Returns a string error message if the request fails
    #[must_use]
    pub async fn create_group_instance(
        world_id: String,
        group_id: String,
        instance_type_str: String,
        allowed_roles: Option<Vec<String>>,
        region_str: String,
        queue_enabled: bool,
        cookie_store: Arc<Jar>,
    ) -> Result<(), String> {
        log::info!(
            "Creating group instance: {} {} {} {} {:?}",
            world_id,
            group_id,
            instance_type_str,
            region_str,
            allowed_roles
        );
        // Convert region string to InstanceRegion enum
        let region = match region_str.as_str() {
            "USW" => instance::InstanceRegion::UsWest,
            "USE" => instance::InstanceRegion::UsEast,
            "EU" => instance::InstanceRegion::EU,
            "JP" => instance::InstanceRegion::JP,
            _ => return Err("Invalid region".to_string()),
        };

        // Create instance type based on string
        let instance_type = match instance_type_str.as_str() {
            "public" => instance::InstanceType::GroupPublic(group_id.clone()),
            "group+" => instance::InstanceType::GroupPlus(group_id.clone()),
            "group" => {
                if let Some(roles) = allowed_roles {
                    let config = instance::GroupOnlyInstanceConfig {
                        group_id: group_id.clone(),
                        allowed_roles: Some(roles),
                    };
                    instance::InstanceType::GroupOnly(config)
                } else {
                    let config = instance::GroupOnlyInstanceConfig {
                        group_id: group_id.clone(),
                        allowed_roles: None,
                    };
                    instance::InstanceType::GroupOnly(config)
                }
            }
            _ => return Err("Invalid instance type".to_string()),
        };

        // Create request using builder
        let request = instance::CreateInstanceRequestBuilder::new(
            instance_type,
            world_id,
            region,
            queue_enabled,
        )
        .build();

        // Call API endpoint
        match instance::create_instance(cookie_store.clone(), request).await {
            Ok(_instance) => {
                // Invite self to the instance
                let instance_id = _instance.instance_id.clone();
                let world_id = _instance.world_id.clone();
                Self::invite_self_to_instance(cookie_store, world_id, instance_id).await?;
                Ok(())
            }
            Err(e) => Err(format!("Failed to create group instance: {}", e)),
        }
    }
}
