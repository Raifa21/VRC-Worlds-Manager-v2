use std::sync::Arc;

use tokio::sync::RwLock;

use crate::api::auth::VRChatAPIClientAuthenticator;
use crate::api::auth::VRChatAuthPhase;
use crate::api::auth::VRChatAuthStatus;
use crate::definitions::WorldDetails;
use crate::services::FileService;
use crate::services::FolderManager;
use crate::ApiService;
use crate::AUTHENTICATOR;
use crate::AUTH_STATE;
use crate::WORLDS;

#[tauri::command]
#[specta::specta]
pub async fn try_login() -> Result<(), String> {
    let cookie_store = AUTH_STATE.get().read().unwrap().cookie_store.clone();
    ApiService::login_with_token(cookie_store).await
}

#[tauri::command]
#[specta::specta]
pub async fn login_with_credentials(
    username: String,
    password: String,
) -> Result<VRChatAuthPhase, String> {
    let lock =
        AUTHENTICATOR.get_or_init(|| RwLock::new(VRChatAPIClientAuthenticator::new(username)));

    let mut authenticator = lock.write().await;
    let result = authenticator.login_with_password(&password).await;

    if result.is_err() {
        let err = format!("Login failed: {}", result.as_ref().err().unwrap());
        println!("Error: {}", err);
        return Err(err);
    }

    let status = result.unwrap();

    match status {
        VRChatAuthStatus::Success(cookies) => {
            let result = FileService::write_auth(&cookies).map_err(|e| e.to_string());

            if result.is_err() {
                return Err(format!(
                    "Failed to write cookies to disk: {}",
                    result.as_ref().err().unwrap()
                ));
            }

            let mut auth = AUTH_STATE.get().write().unwrap();
            auth.cookie_store = Arc::new(cookies.into());
            Ok(VRChatAuthPhase::LoggedIn)
        }
        VRChatAuthStatus::Requires2FA => Ok(VRChatAuthPhase::TwoFactorAuth),
        VRChatAuthStatus::RequiresEmail2FA => Ok(VRChatAuthPhase::Email2FA),
        VRChatAuthStatus::InvalidCredentials => Err("Invalid credentials".to_string()),
        VRChatAuthStatus::UnknownError(e) => Err(format!("Unknown error: {}", e)),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn login_with_2fa(
    code: String,
    two_factor_type: String,
) -> Result<VRChatAuthPhase, String> {
    let lock = match AUTHENTICATOR.try_get() {
        Some(lock) => lock,
        None => return Err("Authenticator not initialized".to_string()),
    };

    let mut authenticator = lock.write().await;
    let result = if two_factor_type == "emailOtp" {
        authenticator.login_with_email_2fa(&code).await
    } else {
        authenticator.login_with_2fa(&code).await
    };

    if result.is_err() {
        return Err(format!("Login failed: {}", result.as_ref().err().unwrap()));
    }

    let status = result.unwrap();

    match status {
        VRChatAuthStatus::Success(cookies) => {
            let result = FileService::write_auth(&cookies).map_err(|e| e.to_string());

            if result.is_err() {
                return Err(format!(
                    "Failed to write cookies to disk: {}",
                    result.as_ref().err().unwrap()
                ));
            }

            let mut auth = AUTH_STATE.get().write().unwrap();
            auth.cookie_store = Arc::new(cookies.into());
            Ok(VRChatAuthPhase::LoggedIn)
        }
        VRChatAuthStatus::Requires2FA => Ok(VRChatAuthPhase::TwoFactorAuth),
        VRChatAuthStatus::RequiresEmail2FA => Ok(VRChatAuthPhase::Email2FA),
        VRChatAuthStatus::InvalidCredentials => Err("Invalid credentials".to_string()),
        VRChatAuthStatus::UnknownError(e) => Err(format!("Unknown error: {}", e)),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn logout() -> Result<(), String> {
    let cookie_store = AUTH_STATE.get().read().unwrap().cookie_store.clone();
    ApiService::logout(cookie_store).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_favorite_worlds() -> Result<(), String> {
    let cookie_store = AUTH_STATE.get().read().unwrap().cookie_store.clone();
    let worlds = match ApiService::get_favorite_worlds(cookie_store).await {
        Ok(worlds) => worlds,
        Err(e) => {
            println!("Failed to fetch favorite worlds: {}", e);
            return Err(format!("Failed to fetch favorite worlds: {}", e));
        }
    };

    println!("Received worlds: {:#?}", worlds); // Debug print the worlds

    match FolderManager::add_worlds(WORLDS.get(), worlds) {
        Ok(_) => Ok(()),
        Err(e) => {
            println!("Failed to add worlds to folder: {}", e);
            Err(format!("Failed to add worlds to folder: {}", e))
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn get_world(world_id: String) -> Result<WorldDetails, String> {
    let cookie_store = AUTH_STATE.get().read().unwrap().cookie_store.clone();
    let world_copy = WORLDS.get().read().unwrap().clone();
    let worlds = match ApiService::get_world_by_id(world_id, cookie_store, world_copy).await {
        Ok(worlds) => worlds,
        Err(e) => {
            println!("Failed to fetch worlds: {}", e);
            return Err(format!("Failed to fetch worlds: {}", e));
        }
    };

    println!("Received worlds: {:#?}", worlds);
    match FolderManager::add_worlds(WORLDS.get(), vec![worlds.clone()]) {
        Ok(_) => Ok(worlds.to_world_details()),
        Err(e) => {
            println!("Failed to add worlds to folder: {}", e);
            Err(format!("Failed to add worlds to folder: {}", e))
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn create_instance(
    world_id: String,
    instance_type: String,
    region: String,
) -> Result<(), String> {
    let cookie_store = AUTH_STATE.get().read().unwrap().cookie_store.clone();
    let user_id = AUTH_STATE.get().read().unwrap().user_id.clone();
    ApiService::create_world_instance(world_id, instance_type, region, cookie_store, user_id).await
}
