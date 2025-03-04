use std::sync::Arc;
use tauri::State;
use crate::state::AppState;

#[tauri::command]
pub async fn get_data(state: State<'_, Arc<AppState>>) -> Result<Vec<RuntimeFolder>, String> {
    let folders = state.folders.lock().map_err(|_| "Failed to lock folders")?;
    Ok(folders.clone())
}