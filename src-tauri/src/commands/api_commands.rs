use crate::services::FolderManager;
use crate::ApiService;
use crate::COOKIE_STORE;
use crate::WORLDS;

#[tauri::command]
pub async fn try_login() -> Result<(), String> {
    if let Err(e) = ApiService::check_auth_token(COOKIE_STORE.get().clone()).await {
        return Err(e.to_string());
    }
    ApiService::login_with_token(COOKIE_STORE.get().clone()).await
}

#[tauri::command]
pub async fn login_with_credentials(username: String, password: String) -> Result<(), String> {
    ApiService::login_with_credentials(username, password, COOKIE_STORE.get().clone()).await
}

#[tauri::command]
pub async fn login_with_2fa(code: String, two_factor_type: String) -> Result<(), String> {
    ApiService::login_with_2fa(code, COOKIE_STORE.get().clone(), two_factor_type).await
}

#[tauri::command]
pub async fn logout() -> Result<(), String> {
    ApiService::logout(COOKIE_STORE.get().clone()).await
}

#[tauri::command]
pub async fn add_favorite_worlds() -> Result<(), String> {
    let worlds = match ApiService::get_favorite_worlds(COOKIE_STORE.get().clone()).await {
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
