use crate::definitions::WorldApiData;
use crate::definitions::WorldDetails;
use crate::services::FolderManager;
use crate::ApiService;
use crate::AUTH_STATE;
use crate::WORLDS;

#[tauri::command]
pub async fn try_login() -> Result<(), String> {
    let cookie_store = AUTH_STATE.get().read().unwrap().cookie_store.clone();
    ApiService::login_with_token(cookie_store).await
}

#[tauri::command]
pub async fn login_with_credentials(username: String, password: String) -> Result<(), String> {
    let cookie_store = AUTH_STATE.get().read().unwrap().cookie_store.clone();
    ApiService::login_with_credentials(username, password, cookie_store).await
}

#[tauri::command]
pub async fn login_with_2fa(code: String, two_factor_type: String) -> Result<(), String> {
    let cookie_store = AUTH_STATE.get().read().unwrap().cookie_store.clone();
    ApiService::login_with_2fa(code, cookie_store, two_factor_type).await
}

#[tauri::command]
pub async fn logout() -> Result<(), String> {
    let cookie_store = AUTH_STATE.get().read().unwrap().cookie_store.clone();
    ApiService::logout(cookie_store).await
}

#[tauri::command]
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
pub async fn create_instance(
    world_id: String,
    instance_type: String,
    region: String,
) -> Result<(), String> {
    let cookie_store = AUTH_STATE.get().read().unwrap().cookie_store.clone();
    let user_id = AUTH_STATE.get().read().unwrap().user_id.clone();
    ApiService::create_world_instance(world_id, instance_type, region, cookie_store, user_id).await
}
