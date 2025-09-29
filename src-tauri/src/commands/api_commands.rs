use tauri::AppHandle;
use tauri::State;

use crate::api::group::GroupInstancePermissionInfo;
use crate::api::group::UserGroup;
use crate::definitions::WorldDetails;
use crate::definitions::WorldDisplayData;
use crate::services::api_service::InstanceInfo;
use crate::services::FolderManager;
use crate::ApiService;
use crate::AUTHENTICATOR;
use crate::INITSTATE;
use crate::WORLDS;

#[tauri::command]
#[specta::specta]
pub async fn try_login() -> Result<(), String> {
    log::info!("Trying to login...");
    ApiService::login_with_token(AUTHENTICATOR.get(), INITSTATE.get())
        .await
        .map_err(|e| e.to_string())
        .map(|_| {
            log::info!("Login successful");
        })
        .or_else(|e| {
            log::error!("Login failed: {}", e);
            Err(format!("Login failed: {}", e))
        })
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
            .map_err(|e| e.to_string())?;
    } else {
        ApiService::login_with_2fa(code, AUTHENTICATOR.get())
            .await
            .map_err(|e| e.to_string())?;
    }
    // call login_with_token to set user id information
    ApiService::login_with_token(AUTHENTICATOR.get(), INITSTATE.get())
        .await
        .map_err(|e| e.to_string())
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
    let cookie_store = AUTHENTICATOR.get().read().await.get_cookies();

    let user_id = INITSTATE.get().read().await.user_id.clone();

    let worlds = match ApiService::get_favorite_worlds(cookie_store, user_id).await {
        Ok(worlds) => worlds,
        Err(e) => {
            log::info!("Failed to fetch favorite worlds: {}", e);
            return Err(format!("Failed to fetch favorite worlds: {}", e));
        }
    };

    log::info!("Received worlds: {:#?}", worlds); // Debug print the worlds

    // Reverse the order to preserve the original date added order
    let worlds = worlds.into_iter().rev().collect::<Vec<_>>();

    match FolderManager::add_worlds(WORLDS.get(), worlds) {
        Ok(_) => Ok(()),
        Err(e) => {
            log::info!("Failed to add worlds to folder: {}", e);
            Err(format!("Failed to add worlds to folder: {}", e))
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn get_world(
    world_id: String,
    dont_save_to_local: Option<bool>,
) -> Result<WorldDetails, String> {
    let cookie_store = AUTHENTICATOR.get().read().await.get_cookies();
    let world_copy = WORLDS.get().read().unwrap().clone();

    let user_id = INITSTATE.get().read().await.user_id.clone();

    let world = match ApiService::get_world_by_id(world_id, cookie_store, world_copy, user_id).await
    {
        Ok(world) => world,
        Err(e) => {
            log::info!("Failed to fetch world: {}", e);
            return Err(format!("Failed to fetch world: {}", e));
        }
    };

    log::info!("Received world: {:#?}", world); // Debug print the world
    if let Some(dont_save) = dont_save_to_local {
        // If the flag is set to true, skip saving the world to local storage.
        if dont_save {
            log::info!("Not saving world to local storage");
            return Ok(world.to_world_details());
        }
    }
    match FolderManager::add_worlds(WORLDS.get(), vec![world.clone()]) {
        Ok(_) => Ok(world.to_world_details()),
        Err(e) => {
            log::info!("Failed to add world to folder: {}", e);
            Err(format!("Failed to add world to folder: {}", e))
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn check_world_info(world_id: String) -> Result<WorldDetails, String> {
    let cookie_store = AUTHENTICATOR.get().read().await.get_cookies();
    let world_copy = WORLDS.get().read().unwrap().clone();

    let user_id = INITSTATE.get().read().await.user_id.clone();

    let world = match ApiService::get_world_by_id(world_id, cookie_store, world_copy, user_id).await
    {
        Ok(world) => world,
        Err(e) => {
            log::info!("Failed to fetch world: {}", e);
            return Err(format!("Failed to fetch world: {}", e));
        }
    };

    log::info!("Received world: {:#?}", world); // Debug print the world
    Ok(world.to_world_details())
}

#[tauri::command]
#[specta::specta]
pub async fn get_recently_visited_worlds() -> Result<Vec<WorldDisplayData>, String> {
    let cookie_store = AUTHENTICATOR.get().read().await.get_cookies();

    let worlds = match ApiService::get_recently_visited_worlds(cookie_store).await {
        Ok(worlds) => worlds,
        Err(e) => {
            log::info!("Failed to fetch recently visited worlds: {}", e);
            return Err(format!("Failed to fetch recently visited worlds: {}", e));
        }
    };

    Ok(worlds)
}

#[tauri::command]
#[specta::specta]
pub async fn search_worlds(
    sort: String,
    tags: Vec<String>,
    exclude_tags: Vec<String>,
    search: String,
    page: usize,
) -> Result<Vec<WorldDisplayData>, String> {
    let cookie_store = AUTHENTICATOR.get().read().await.get_cookies();

    let sort = if sort.is_empty() { None } else { Some(sort) };

    let tags = if tags.is_empty() { None } else { Some(tags) };
    let exclude_tags = if exclude_tags.is_empty() {
        None
    } else {
        Some(exclude_tags)
    };
    let search = if search.is_empty() {
        None
    } else {
        Some(search)
    };

    let worlds =
        match ApiService::search_worlds(cookie_store, sort, tags, exclude_tags, search, page).await
        {
            Ok(worlds) => worlds,
            Err(e) => {
                log::info!("Failed to fetch worlds: {}", e);
                return Err(format!("Failed to fetch worlds: {}", e));
            }
        };

    Ok(worlds)
}

#[tauri::command]
#[specta::specta]
pub async fn create_world_instance(
    world_id: String,
    instance_type_str: String,
    region_str: String,
    handle: State<'_, AppHandle>,
) -> Result<InstanceInfo, String> {
    let cookie_store = AUTHENTICATOR.get().read().await.get_cookies();
    let user_id = INITSTATE.get().read().await.user_id.clone();

    let result = ApiService::create_world_instance(
        world_id,
        instance_type_str,
        region_str,
        cookie_store,
        user_id,
        (*handle).clone(),
    )
    .await;

    match result {
        Ok(info) => Ok(info),
        Err(e) => {
            log::info!("Failed to create world instance: {}", e);
            Err(format!("Failed to create world instance: {}", e))
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn get_user_groups() -> Result<Vec<UserGroup>, String> {
    let cookie_store = AUTHENTICATOR.get().read().await.get_cookies();
    let user_id = INITSTATE.get().read().await.user_id.clone();

    let groups = match ApiService::get_user_groups(cookie_store, user_id).await {
        Ok(groups) => groups,
        Err(e) => {
            log::info!("Failed to fetch user groups: {}", e);
            return Err(format!("Failed to fetch user groups: {}", e));
        }
    };

    Ok(groups)
}

#[tauri::command]
#[specta::specta]
pub async fn get_permission_for_create_group_instance(
    group_id: String,
) -> Result<GroupInstancePermissionInfo, String> {
    let cookie_store = AUTHENTICATOR.get().read().await.get_cookies();
    let permission =
        match ApiService::get_permission_for_create_group_instance(cookie_store, group_id).await {
            Ok(permission) => permission,
            Err(e) => {
                log::info!("Failed to fetch group instance create permission: {}", e);
                return Err(format!(
                    "Failed to fetch group instance create permission: {}",
                    e
                ));
            }
        };

    Ok(permission)
}

#[tauri::command]
#[specta::specta]
pub async fn create_group_instance(
    world_id: String,
    group_id: String,
    instance_type_str: String,
    allowed_roles: Option<Vec<String>>,
    region_str: String,
    queue_enabled: bool,
    handle: State<'_, AppHandle>,
) -> Result<InstanceInfo, String> {
    let cookie_store = AUTHENTICATOR.get().read().await.get_cookies();

    let result = ApiService::create_group_instance(
        world_id,
        group_id,
        instance_type_str,
        allowed_roles,
        region_str,
        queue_enabled,
        cookie_store,
        (*handle).clone(),
    )
    .await;

    match result {
        Ok(info) => Ok(info),
        Err(e) => {
            log::info!("Failed to create group instance: {}", e);
            Err(format!("Failed to create group instance: {}", e))
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn open_instance_in_client(
    world_id: String,
    instance_id: String,
    handle: State<'_, AppHandle>,
) -> Result<String, String> {
    let cookie_store = AUTHENTICATOR.get().read().await.get_cookies();

    ApiService::open_instance_in_client(cookie_store, &world_id, &instance_id, (*handle).clone())
        .await
}
