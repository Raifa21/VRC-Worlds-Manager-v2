use crate::services;
use crate::services::migration_service::MigrationService;
use crate::PREFERENCES;
use directories::BaseDirs;
/// Checks if the app is being run for the first time
/// As this is called every time / is loaded from the frontend, cache result in the state
#[tauri::command]
#[specta::specta]
pub async fn require_initial_setup() -> bool {
    //check if the result is already cached
    let mut preferences_lock = PREFERENCES.get().write();
    let preference = preferences_lock.as_mut().unwrap();
    if !preference.first_time {
        println!("Not first time, cached result");
        return false;
    }

    // Check for first time run
    let first_time = services::file_service::FileService::check_first_time();
    println!("First time: {}", first_time);
    if first_time {
        preference.first_time = true;
        true
    } else {
        preference.first_time = false;
        false
    }
}

/// Checks if files have been loaded from disk successfully
///
/// # Returns
/// Returns a boolean indicating if the files have been loaded successfully
///
/// # Errors
/// Returns a tuple containing a boolean indicating if the files have been loaded, and an error message
#[tauri::command]
#[specta::specta]
pub async fn check_files_loaded() -> Result<bool, String> {
    let init_state_lock = crate::INITSTATE.get().read();
    let init_state = init_state_lock.await;
    match init_state.success {
        true => Ok(true),
        false => Err(init_state.message.clone()),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn detect_old_installation() -> Result<(String, String), String> {
    MigrationService::detect_old_installation()
}

#[tauri::command]
#[specta::specta]
pub async fn check_existing_data() -> Result<(bool, bool), String> {
    MigrationService::check_existing_data().map_err(|e| e.to_string())
}

/// Passes the paths to the frontend
/// Gets the path to the local app data directory
///
/// # Returns
/// Returns the path to the local app data directory
///
/// # Errors
/// Returns an error message if the path to the local app data directory could not be found
#[tauri::command]
#[specta::specta]
pub async fn pass_paths() -> Result<String, String> {
    let base_dirs = BaseDirs::new().ok_or("Could not get base directories")?;
    base_dirs
        .data_local_dir()
        .join("VRC_World_Manager")
        .to_str()
        .ok_or("Could not convert path to string")
        .map(|s| s.to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn migrate_old_data(
    worlds_path: String,
    folders_path: String,
    dont_overwrite: [bool; 2],
) -> Result<(), String> {
    MigrationService::migrate_old_data(worlds_path, folders_path, dont_overwrite)
        .await
        .map_err(|e| e.to_string())
}
