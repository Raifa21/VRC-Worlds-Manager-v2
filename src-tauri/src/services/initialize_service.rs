use crate::definitions::{AuthCookies, FolderModel, InitState, PreferenceModel, WorldModel};
use crate::services::file_service::FileService;
use crate::PREFERENCES;

/// Runs startup tasks for the application
/// Checks if the app is being run for the first time, and loads the data
///
/// # Arguments
/// * `app` - A handle to the Tauri application
///
/// # Returns
/// Returns a tuple containing the authentication cookies, folders, and worlds
///
///
/// # Errors
/// Returns a string error message if the app is being run for the first time, or if there was an error loading the data
pub fn initialize_app() -> Result<
    (
        PreferenceModel,
        Vec<FolderModel>,
        Vec<WorldModel>,
        AuthCookies,
        InitState,
    ),
    String,
> {
    // Check for first time run
    let first_time = FileService::check_first_time();
    if first_time {
        return Err("First time run".to_string());
    } else {
        let mut preferences_lock = PREFERENCES.get().write();
        let preference = preferences_lock.as_mut().unwrap();
        preference.first_time = false;
    }

    // Load data from disk
    match FileService::load_data() {
        Ok((preferences, folders, worlds, auth)) => {
            Ok((preferences, folders, worlds, auth, InitState::success()))
        }
        Err(e) => Err(e.to_string()),
    }
}
