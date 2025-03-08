use crate::definitions::InitState;
use crate::services;
use crate::PREFERENCES;

/// Checks if the app is being run for the first time
/// As this is called every time / is loaded from the frontend, cache result in the state
#[tauri::command]
pub async fn require_initial_setup() -> bool {
    //check if the result is already cached
    let mut preferences_lock = PREFERENCES.get().write();
    let preference = preferences_lock.as_mut().unwrap();
    if preference.first_time {
        return true;
    }

    // Check for first time run
    let first_time = services::file_service::FileService::check_first_time();
    if first_time {
        preference.first_time = true;
        return true;
    } else {
        preference.first_time = false;
        return false;
    }
}

/// Checks if files have been loaded from disk successfully
/// As this is called every time / is loaded from the frontend, cache result in the state
///
/// # Returns
/// Returns a boolean indicating if the files have been loaded successfully
///
/// # Errors
/// Returns a tuple containing a boolean indicating if the files have been loaded, and an error message
#[tauri::command]
pub async fn check_files_loaded() -> Result<bool, String> {
    let init_state_lock = crate::INITSTATE.get().read();
    let init_state = init_state_lock.as_ref().unwrap();
    match init_state.success {
        true => Ok(true),
        false => Err(init_state.message.clone()),
    }
}
