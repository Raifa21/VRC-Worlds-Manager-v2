use crate::api::instance::InstanceRegion;
use crate::definitions::CardSize;
use crate::definitions::FilterItemSelectorStarred;
use crate::definitions::FilterItemSelectorStarredType;
use crate::definitions::FolderRemovalPreference;
use crate::services::FileService;
use crate::updater::update_handler::UpdateChannel;
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
pub fn set_theme(theme: String) -> Result<(), String> {
    let mut preferences_lock = PREFERENCES.get().write();
    let preferences = preferences_lock.as_mut().unwrap();
    preferences.theme = theme;
    FileService::write_preferences(preferences).map_err(|e| {
        log::error!("Error writing preferences: {}", e);
        e.to_string()
    })?;
    Ok(())
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
pub fn set_language(language: String) -> Result<(), String> {
    let mut preferences_lock = PREFERENCES.get().write();
    let preferences = preferences_lock.as_mut().unwrap();
    preferences.language = language;
    FileService::write_preferences(preferences).map_err(|e| {
        log::error!("Error writing preferences: {}", e);
        e.to_string()
    })?;
    Ok(())
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
pub fn set_card_size(card_size: CardSize) -> Result<(), String> {
    let mut preferences_lock = PREFERENCES.get().write();
    let preferences = preferences_lock.as_mut().unwrap();
    preferences.card_size = card_size;
    FileService::write_preferences(preferences).map_err(|e| {
        log::error!("Error writing preferences: {}", e);
        e.to_string()
    })?;
    Ok(())
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
pub fn get_starred_filter_items(id: FilterItemSelectorStarredType) -> Result<Vec<String>, String> {
    let preferences_lock = PREFERENCES.get().read();
    let preferences = preferences_lock.as_ref().unwrap();
    if let Some(filter_item_selector_starred) = &preferences.filter_item_selector_starred {
        match id {
            FilterItemSelectorStarredType::Author => {
                Ok(filter_item_selector_starred.author.clone())
            }
            FilterItemSelectorStarredType::Tag => Ok(filter_item_selector_starred.tag.clone()),
            FilterItemSelectorStarredType::ExcludeTag => {
                Ok(filter_item_selector_starred.exclude_tag.clone())
            }
            FilterItemSelectorStarredType::Folder => {
                Ok(filter_item_selector_starred.folder.clone())
            }
        }
    } else {
        Ok(vec![])
    }
}

#[tauri::command]
#[specta::specta]
pub fn set_starred_filter_items(
    id: FilterItemSelectorStarredType,
    values: Vec<String>,
) -> Result<(), String> {
    let mut preferences_lock = PREFERENCES.get().write();
    let preferences = preferences_lock.as_mut().unwrap();

    if preferences.filter_item_selector_starred.is_none() {
        let (author, tag, exclude_tag, folder) = match id {
            FilterItemSelectorStarredType::Author => (values, vec![], vec![], vec![]),
            FilterItemSelectorStarredType::Tag => (vec![], values, vec![], vec![]),
            FilterItemSelectorStarredType::ExcludeTag => (vec![], vec![], values, vec![]),
            FilterItemSelectorStarredType::Folder => (vec![], vec![], vec![], values),
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
        match id {
            FilterItemSelectorStarredType::Author => {
                filter_item_selector_starred.author = values;
            }
            FilterItemSelectorStarredType::Tag => {
                filter_item_selector_starred.tag = values;
            }
            FilterItemSelectorStarredType::ExcludeTag => {
                filter_item_selector_starred.exclude_tag = values;
            }
            FilterItemSelectorStarredType::Folder => {
                filter_item_selector_starred.folder = values;
            }
        }
    }
    FileService::write_preferences(preferences).map_err(|e| {
        log::error!("Error writing preferences: {}", e);
        e.to_string()
    })?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn get_folder_removal_preference() -> Result<FolderRemovalPreference, String> {
    let preferences_lock = PREFERENCES.get().read();
    let preferences = preferences_lock.as_ref().unwrap();
    Ok(preferences.dont_show_remove_from_folder)
}

#[tauri::command]
#[specta::specta]
pub fn set_folder_removal_preference(
    dont_show_remove_from_folder: FolderRemovalPreference,
) -> Result<(), String> {
    let mut preferences_lock = PREFERENCES.get().write();
    let preferences = preferences_lock.as_mut().unwrap();
    preferences.dont_show_remove_from_folder = dont_show_remove_from_folder;
    FileService::write_preferences(preferences).map_err(|e| {
        log::error!("Error writing preferences: {}", e);
        e.to_string()
    })?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn get_update_channel() -> Result<UpdateChannel, String> {
    let preferences_lock = PREFERENCES.get().read();
    let preferences = preferences_lock.as_ref().unwrap();
    Ok(preferences.update_channel.clone())
}

#[tauri::command]
#[specta::specta]
pub fn set_update_channel(channel: UpdateChannel) -> Result<(), String> {
    let mut preferences_lock = PREFERENCES.get().write();
    let preferences = preferences_lock.as_mut().unwrap();
    preferences.update_channel = channel;
    FileService::write_preferences(preferences).map_err(|e| {
        log::error!("Error writing preferences: {}", e);
        e.to_string()
    })?;
    Ok(())
}
