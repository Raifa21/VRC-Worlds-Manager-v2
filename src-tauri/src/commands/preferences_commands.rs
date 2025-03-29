use crate::definitions::CardSize;
use crate::PREFERENCES;

#[tauri::command]
#[specta::specta]
pub fn get_card_size() -> Result<CardSize, String> {
    let preferences_lock = PREFERENCES.get().read();
    let preferences = preferences_lock.as_ref().unwrap();
    Ok(preferences.card_size.clone())
}
