use crate::definitions::CardSize;
use crate::services;

#[tauri::command]
pub async fn set_preferences(
    theme: String,
    language: String,
    card_size: CardSize,
) -> Result<(), String> {
    match services::set_preferences(theme, language, card_size) {
        Ok(true) => Ok(()),
        Ok(false) => Err("Failed to set preferences".to_string()),
        Err(e) => Err(e.to_string()),
    }
}
