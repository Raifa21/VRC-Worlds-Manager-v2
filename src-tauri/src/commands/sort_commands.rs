use crate::definitions::WorldDisplayData;
use crate::services::SortingService;

#[tauri::command]
#[specta::specta]
pub fn sort_worlds_display(
    worlds: Vec<WorldDisplayData>,
    sort_field: String,
    sort_direction: String,
) -> Result<Vec<WorldDisplayData>, String> {
    Ok(SortingService::sort_world_display_data(
        worlds,
        &sort_field,
        &sort_direction,
    ))
}
