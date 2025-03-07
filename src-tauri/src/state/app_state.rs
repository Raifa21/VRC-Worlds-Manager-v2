use crate::definitions::{AuthCookies, FolderModel, WorldModel};
use crate::errors::AppError;
use crate::errors::ConcurrencyError;
use crate::services::file_service::FileService;
use std::sync::Mutex;

/// Represents the global application state with error handling
///
/// Contains authentication information and folder data.
/// All state is protected by mutex lock for thread safety.
pub struct AppState {
    /// Authentication cookies for VRChat API
    pub auth: Mutex<AuthCookies>,

    /// List of folders containing the ID of each world
    pub folders: Mutex<Vec<FolderModel>>,

    /// List of worlds
    pub worlds: Mutex<Vec<WorldModel>>,

    /// Error encountered during initialization
    pub init_error: Mutex<Option<AppError>>,
}

impl AppState {
    /// Initializes the application state by loading data from disk
    ///
    /// # Returns
    /// Returns initialized AppState. If initialization fails:
    /// - Sets default values for auth and folders
    /// - Stores the error in init_error for frontend handling
    pub fn initialize() -> Self {
        match FileService::load_data() {
            Ok((auth, folders, worlds)) => Self {
                auth: Mutex::new(auth),
                folders: Mutex::new(folders.into_iter().map(FolderModel::from).collect()),
                worlds: Mutex::new(worlds.into_iter().map(WorldModel::from).collect()),
                init_error: Mutex::new(None),
            },
            Err(e) => Self {
                auth: Mutex::new(AuthCookies::new()),
                folders: Mutex::new(vec![]),
                worlds: Mutex::new(vec![]),
                init_error: Mutex::new(Some(e.into())),
            },
        }
    }

    /// Helper function for safe access to multiple fields, in mutable context
    ///
    /// # Returns
    /// Returns a tuple of the auth, folders, worlds, and init_error fields
    /// wrapped in a MutexGuard
    ///
    /// # Errors
    /// Returns an error if the mutex lock is poisoned
    pub fn access_all(
        &self,
    ) -> Result<
        (
            std::sync::MutexGuard<'_, AuthCookies>,
            std::sync::MutexGuard<'_, Vec<FolderModel>>,
            std::sync::MutexGuard<'_, Vec<WorldModel>>,
            std::sync::MutexGuard<'_, Option<AppError>>,
        ),
        AppError,
    > {
        let auth = self
            .auth
            .lock()
            .map_err(|_| -> AppError { ConcurrencyError::PoisonedLock.into() })?;
        let folders = self
            .folders
            .lock()
            .map_err(|_| -> AppError { ConcurrencyError::PoisonedLock.into() })?;
        let worlds = self
            .worlds
            .lock()
            .map_err(|_| -> AppError { ConcurrencyError::PoisonedLock.into() })?;
        let init_error = self
            .init_error
            .lock()
            .map_err(|_| -> AppError { ConcurrencyError::PoisonedLock.into() })?;
        Ok((auth, folders, worlds, init_error))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
}
