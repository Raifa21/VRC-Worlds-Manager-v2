use crate::state::{self, AppState};

#[tauri::command]
pub async fn initialize_app(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let init_error = state.init_error.lock().unwrap();
    if let Some(e) = &*init_error {
        return Err(e.to_string());
    }
    Ok(())
}

#[tauri::command]
pub async fn check_first_time(app: tauri::AppHandle) -> Result<bool, String> {
    // TODO: Implement first time check using a flag in the app state?
    // send the user to first time set up if true
    return Ok(false);
}
