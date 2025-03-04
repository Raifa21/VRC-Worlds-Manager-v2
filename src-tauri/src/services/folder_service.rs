use crate::definitions::RuntimeFolder;
use crate::state::app_state::AppState;

pub struct FolderService;

impl FolderService {
    pub fn get_folders(state: &AppState) -> Result<Vec<RuntimeFolder>, String> {
        let folders = state.folders.lock().map_err(|_| "Failed to lock state")?;
        Ok(folders.clone())
    }

    pub fn create_folder(state: &AppState, name: String) -> Result<RuntimeFolder, String> {
        let mut folders = state.folders.lock().map_err(|_| "Failed to lock state")?;
        let new_folder = RuntimeFolder {
            folder_name: name,
            worlds: vec![],
        };
        folders.push(new_folder.clone());
        Ok(new_folder)
    }
}
