use crate::definitions;
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
    }

    // Load data from disk
    match FileService::load_data() {
        Ok((preferences, folders, worlds, cookies)) => {
            Ok((preferences, folders, worlds, cookies, InitState::success()))
        }
        Err(e) => Err(e),
    }
}

/// /// Set the user's preference for first time run
/// This is called when the user has completed the initial setup
///
/// # Arguments
/// * `theme` - A string indicating the theme the user has selected
/// * `language` - A string indicating the language the user has selected
/// * `card_size` - A string indicating the size of the cards the user has selected
///
/// # Returns
/// Returns a boolean indicating if the app is being run for the first time
///
/// # Errors
/// Returns a string error message if there was an error saving the preferences
pub fn set_preferences(
    theme: String,
    language: String,
    card_size: definitions::CardSize,
) -> Result<bool, String> {
    let mut preferences_lock = PREFERENCES.get().write();
    let preference = preferences_lock.as_mut().unwrap();
    preference.theme = theme;
    preference.language = language;
    preference.card_size = card_size;
    preference.first_time = false;
    match FileService::write_preferences(preference) {
        Ok(_) => Ok(true),
        Err(e) => Err(e.to_string()),
    }
}
