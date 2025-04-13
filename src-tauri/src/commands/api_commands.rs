use std::sync::Arc;

use tokio::sync::RwLock;
use vrchatapi::models::current_user;

use crate::api::auth::VRChatAPIClientAuthenticator;
use crate::api::auth::VRChatAuthPhase;
use crate::api::auth::VRChatAuthStatus;
use crate::definitions::WorldDetails;
use crate::services::FolderManager;
use crate::ApiService;
use crate::AUTHENTICATOR;
use crate::WORLDS;

#[tauri::command]
#[specta::specta]
pub async fn try_login() -> Result<(), String> {
    ApiService::login_with_token(AUTHENTICATOR.get()).await
}

#[tauri::command]
#[specta::specta]
pub async fn login_with_credentials(username: String, password: String) -> Result<(), String> {
    ApiService::login_with_credentials(username, password, AUTHENTICATOR.get())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn login_with_2fa(code: String, two_factor_type: String) -> Result<(), String> {
    if two_factor_type == "emailOtp" {
        ApiService::login_with_email_2fa(code, AUTHENTICATOR.get())
            .await
            .map_err(|e| e.to_string())
    } else {
        ApiService::login_with_2fa(code, AUTHENTICATOR.get())
            .await
            .map_err(|e| e.to_string())
    }
}

#[tauri::command]
#[specta::specta]
pub async fn logout() -> Result<(), String> {
    ApiService::logout(AUTHENTICATOR.get())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_favorite_worlds() -> Result<(), String> {
    let worlds = match ApiService::get_favorite_worlds(AUTHENTICATOR.get()).await {
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
