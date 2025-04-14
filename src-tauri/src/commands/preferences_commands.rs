use crate::definitions::CardSize;
use crate::PreferenceModel;
use crate::PREFERENCES;

#[tauri::command]
#[specta::specta]
pub fn get_theme() -> Result<String, String> {
    let preferences_lock = PREFERENCES.get().read();
    let preferences = preferences_lock.as_ref().unwrap();
    Ok(preferences.theme.clone())
}

#[tauri::command]
#[specta::specta]
pub fn get_language() -> Result<String, String> {
    let preferences_lock = PREFERENCES.get().read();
    let preferences = preferences_lock.as_ref().unwrap();
    Ok(preferences.language.clone())
}

#[tauri::command]
#[specta::specta]
pub fn get_card_size() -> Result<CardSize, String> {
    let preferences_lock = PREFERENCES.get().read();
    let preferences = preferences_lock.as_ref().unwrap();
    Ok(preferences.card_size.clone())
}
