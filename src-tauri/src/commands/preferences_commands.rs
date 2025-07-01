use crate::api::instance::InstanceRegion;
use crate::definitions::CardSize;
use crate::definitions::FilterItemSelectorStarred;
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

#[tauri::command]
#[specta::specta]
pub fn get_starred_filter_items(id: String) -> Result<Vec<String>, String> {
    let preferences_lock = PREFERENCES.get().read();
    let preferences = preferences_lock.as_ref().unwrap();
    if let Some(filter_item_selector_starred) = &preferences.filter_item_selector_starred {
        match id.as_str() {
            "author" => Ok(filter_item_selector_starred.author.clone()),
            "tag" => Ok(filter_item_selector_starred.tag.clone()),
            "exclude_tag" => Ok(filter_item_selector_starred.exclude_tag.clone()),
            "folder" => Ok(filter_item_selector_starred.folder.clone()),
            _ => Err("Invalid ID".to_string()),
        }
    } else {
        Ok(vec![])
    }
}

#[tauri::command]
#[specta::specta]
pub fn set_starred_filter_items(id: String, values: Vec<String>) -> Result<(), String> {
    let mut preferences_lock = PREFERENCES.get().write();
    let preferences = preferences_lock.as_mut().unwrap();

    if preferences.filter_item_selector_starred.is_none() {
        let (author, tag, exclude_tag, folder) = match id.as_str() {
            "author" => (values, vec![], vec![], vec![]),
            "tag" => (vec![], values, vec![], vec![]),
            "exclude_tag" => (vec![], vec![], values, vec![]),
            "folder" => (vec![], vec![], vec![], values),
            _ => return Err("Invalid ID".to_string()),
        };
        preferences.filter_item_selector_starred = Some(FilterItemSelectorStarred {
            author,
            tag,
            exclude_tag,
            folder,
        });
    } else {
        let filter_item_selector_starred =
            preferences.filter_item_selector_starred.as_mut().unwrap();
        match id.as_str() {
            "author" => filter_item_selector_starred.author = values,
            "tag" => filter_item_selector_starred.tag = values,
            "exclude_tag" => filter_item_selector_starred.exclude_tag = values,
            "folder" => filter_item_selector_starred.folder = values,
            _ => return Err("Invalid ID".to_string()),
        }
    }
    FileService::write_preferences(preferences).map_err(|e| {
        log::error!("Error writing preferences: {}", e);
        e.to_string()
    })?;
    Ok(())
}
