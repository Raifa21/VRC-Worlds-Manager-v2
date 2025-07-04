use crate::MEMO_MANAGER;

#[tauri::command]
#[specta::specta]
pub fn get_memo(world_id: String) -> Result<String, String> {
    let memo_manager = MEMO_MANAGER.get().read().map_err(|e| e.to_string())?;
    let memo = memo_manager.get_memo(&world_id).unwrap_or("");
    Ok(memo.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn set_memo_and_save(world_id: String, memo: String) -> Result<(), String> {
    let mut memo_manager = MEMO_MANAGER.get().write().map_err(|e| e.to_string())?;
    memo_manager.set_memo(&world_id, &memo);
    memo_manager.save().map_err(|e| {
        log::error!("Error saving memo: {}", e);
        e.to_string()
    })?;
    Ok(())
}
