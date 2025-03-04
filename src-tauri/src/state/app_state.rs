use crate::definitions::{AuthCookies, RuntimeFolder};
use crate::services::file_service::FileService;
use std::sync::Mutex;
pub struct AppState {
    pub auth: Mutex<AuthCookies>,
    pub folders: Mutex<Vec<RuntimeFolder>>,
}

impl AppState {
    pub fn initialize() -> Result<Self, String> {
        let (auth, folders, worlds) =
            FileService::load_data().map_err(|e| format!("Failed to load data: {}", e))?;

        Ok(AppState {
            auth: Mutex::new(auth),
            folders: Mutex::new(
                folders
                    .into_iter()
                    .map(|f| RuntimeFolder::from(f))
                    .collect(),
            ),
        })
    }
    pub fn new() -> Self {
        AppState {
            auth: Mutex::new(AuthCookies::new()),
            folders: Mutex::new(vec![]),
        }
    }
}
