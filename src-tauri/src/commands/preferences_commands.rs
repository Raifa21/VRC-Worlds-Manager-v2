use crate::api::instance::InstanceRegion;
use crate::definitions::CardSize;
use crate::services::FileService;
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

#[tauri::command]
#[specta::specta]
pub fn get_region() -> Result<InstanceRegion, String> {
    let preferences_lock = PREFERENCES.get().read();
    let preferences = preferences_lock.as_ref().unwrap();
    Ok(preferences.region.clone())
}

#[tauri::command]
#[specta::specta]
pub fn set_region(region: InstanceRegion) -> Result<(), String> {
    let mut preferences_lock = PREFERENCES.get().write();
    let preferences = preferences_lock.as_mut().unwrap();
    preferences.region = region;
    FileService::write_preferences(preferences).map_err(|e| {
        log::error!("Error writing preferences: {}", e);
        e.to_string()
    })?;
    Ok(())
}
