use crate::definitions::{FolderModel, WorldModel};
use crate::errors::{AppError, ConcurrencyError, EntityError};
use crate::state::app_state::AppState;

/// Service for managing world/folder operations
#[derive(Debug)]
pub struct FolderManager;

impl FolderManager {
    /// Adds a world to a folder
    /// Updates existing world data if the world is already in the folder
    ///
    /// # Arguments
    /// * `state` - The application state
    /// * `folder_name` - The name of the folder
    /// * `world_id` - The ID of the world to add
    ///
    /// # Returns
    /// Ok if the world was added successfully
    ///
    /// # Errors
    /// Returns an error if the folder is not found
    /// Returns an error if the world is not found
    /// Returns an error if the folders lock is poisoned
    #[must_use]
    pub fn add_world_to_folder(
        state: &AppState,
        folder_name: String,
        world_id: String,
    ) -> Result<(), AppError> {
        let mut folders_lock = state
            .folders
            .lock()
            .map_err(|_| -> AppError { ConcurrencyError::PoisonedLock.into() })?;
        let folder = folders_lock
            .iter_mut()
            .find(|f| f.folder_name == folder_name);

        let mut worlds_lock = state
            .worlds
            .lock()
            .map_err(|_| -> AppError { ConcurrencyError::PoisonedLock.into() })?;
        let world = worlds_lock
            .iter_mut()
            .find(|w| w.api_data.world_id == world_id);

        match folder {
            Some(folder) => {
                match world {
                    Some(world) => {
                        if !world.user_data.folders.iter().any(|f| f == &folder_name) {
                            folder.world_ids.push(world_id.clone());
                        }
                    }
                    None => return Err(EntityError::WorldNotFound(world_id).into()),
                }
                Ok(())
            }
            None => Err(EntityError::FolderNotFound(folder_name).into()),
        }
    }

    /// Removes a world from a folder
    /// Does not do anything if the world is not in the folder
    /// If the world is not in any other folder, add to "Unclassified" folder
    ///
    /// # Arguments
    /// * `state` - The application state
    /// * `folder_name` - The name of the folder
    /// * `world_id` - The ID of the world to remove
    ///
    /// # Returns
    /// Ok if the world was removed successfully
    ///
    /// # Errors
    /// Returns an error if the folder is not found
    /// Returns an error if the folders lock is poisoned
    #[must_use]
    pub fn remove_world_from_folder(
        state: &AppState,
        folder_name: String,
        world_id: String,
    ) -> Result<(), AppError> {
        let (_unused1, mut folders, mut worlds, _unused2) = state
            .access_all()
            .map_err(|_| -> AppError { ConcurrencyError::PoisonedLock.into() })?;
        let folders = folders.iter_mut().find(|f| f.folder_name == folder_name);
        let worlds = worlds.iter_mut().find(|w| w.api_data.world_id == world_id);
        if folders.is_none() {
            return Err(EntityError::FolderNotFound(folder_name).into());
        }
        if worlds.is_none() {
            return Err(EntityError::WorldNotFound(world_id).into());
        }
        let folders = folders.unwrap();
        let worlds = worlds.unwrap();

        let mut world_folders = &mut worlds.user_data.folders;
        if world_folders.iter().any(|f| f == &folder_name) {
            //remove the folder from the world's folders
            let folder_index = world_folders.iter().position(|f| f == &folder_name);
            if let Some(index) = folder_index {
                world_folders.remove(index);
            }

            //remove the world from the folder's world_ids
            let folder_index = folders.world_ids.iter().position(|id| id == &world_id);
            if let Some(index) = folder_index {
                folders.world_ids.remove(index);
            }

            //if the world is not in any other folder after removing the current folder, add it to "Unclassified"
            if folders.world_ids.is_empty() {
                Self::add_world_to_folder(state, "Unclassified".to_string(), world_id)?;
            }
        }
        Ok(())
    }

    /// Get the names of all folders
    ///
    /// # Arguments
    /// * `state` - The application state
    ///
    /// # Returns
    /// A vector of folder names
    ///
    /// # Errors
    /// Returns an error if the folders lock is poisoned
    #[must_use]
    pub fn get_folders(state: &AppState) -> Result<Vec<String>, AppError> {
        Ok(state
            .folders
            .lock()
            .map_err(|_| -> AppError { ConcurrencyError::PoisonedLock.into() })?
            .iter()
            .map(|folder| folder.folder_name.clone())
            .collect())
    }

    /// Returns a unique name for a folder, as a string
    /// If the passed name is "", the default name "New Folder" is used
    /// If the folder already exists, we append a number to the name
    /// When appending, we first check if it is already a numbered folder
    /// If it is, we increment the number
    ///
    /// # Arguments
    /// * `state` - The application state
    /// * `name` - The name of the new folder
    ///
    /// # Returns
    /// The unique folder name
    ///
    /// # Errors
    /// Returns an error if the folders lock is poisoned
    #[must_use]
    fn increment_folder_name(state: &AppState, name: String) -> Result<String, AppError> {
        let folders_lock = state
            .folders
            .lock()
            .map_err(|_| -> AppError { ConcurrencyError::PoisonedLock.into() })?;

        let mut new_name = name.clone();
        let mut base_name = name.clone();
        let mut count = 1;
        // check if the end of the name is a number
        if let Some(index) = name.rfind(" (") {
            if name.ends_with(')') {
                let number = &name[index + 2..name.len() - 1];
                base_name = name[..index].to_string();
                if let Ok(parsed_number) = number.parse::<u32>() {
                    count = parsed_number;
                } else {
                    count = 1;
                }
            }
        }
        // if not, check if the name already exists
        while folders_lock.iter().any(|f| f.folder_name == new_name) {
            new_name = format!("{} ({})", base_name, count);
            count += 1;
        }
        Ok(new_name)
    }

    /// Create a new folder, adding it to the list of folders
    /// Use the increment_folder_name function to get a unique name
    ///
    /// # Arguments
    /// * `state` - The application state
    /// * `name` - The name of the new folder
    ///
    /// # Returns
    /// The new folder
    ///
    /// # Errors
    /// Returns an error if the folders lock is poisoned
    #[must_use]
    pub fn create_folder(state: &AppState, name: String) -> Result<FolderModel, AppError> {
        let new_name = FolderManager::increment_folder_name(state, name)?;
        let mut folders_lock = state
            .folders
            .lock()
            .map_err(|_| -> AppError { ConcurrencyError::PoisonedLock.into() })?;

        let new_folder = FolderModel::new(new_name);
        folders_lock.push(new_folder.clone());
        Ok(new_folder)
    }

    /// Delete a folder by name
    /// For each world in the folder, pass to remove_world_from_folder
    /// Reject deletion if the folder is the "Unclassified" folder
    ///
    ///
    /// # Arguments
    /// * `state` - The application state
    /// * `name` - The name of the folder to delete
    ///
    /// # Returns
    /// Ok if the folder was deleted successfully
    ///
    /// # Errors
    /// Returns an error if the folder is not found
    #[must_use]
    pub fn delete_folder(state: &AppState, name: String) -> Result<(), AppError> {
        if name == "Unclassified" {
            return Err(EntityError::InvalidOperation(
                "Cannot delete the 'Unclassified' folder".to_string(),
            )
            .into());
        }
        let mut folders_lock = state
            .folders
            .lock()
            .map_err(|_| -> AppError { ConcurrencyError::PoisonedLock.into() })?;
        let folder_index = folders_lock.iter().position(|f| f.folder_name == name);
        match folder_index {
            Some(index) => {
                let folder = folders_lock.remove(index);
                for world_id in folder.world_ids {
                    Self::remove_world_from_folder(state, name.clone(), world_id)?;
                }
                Ok(())
            }
            None => Err(EntityError::FolderNotFound(name).into()),
        }
    }

    /// Get a world by its ID
    ///
    /// # Arguments
    /// * state - The application state
    /// * world_id - The ID of the world
    ///
    /// # Returns
    /// Returns the world with the specified ID if found
    ///
    /// # Errors
    /// Returns an error if the world is not found
    #[must_use]
    fn get_world(state: &AppState, world_id: String) -> Result<WorldModel, AppError> {
        let worlds_lock = state
            .worlds
            .lock()
            .map_err(|_| -> AppError { ConcurrencyError::PoisonedLock.into() })?;
        match worlds_lock.iter().find(|w| w.api_data.world_id == world_id) {
            Some(world) => Ok(world.clone()),
            None => Err(EntityError::WorldNotFound(world_id).into()),
        }
    }

    /// Get the worlds in a folder by name
    /// Calls get_world for each world ID in the folder
    ///
    /// # Arguments
    /// * `state` - The application state
    /// * `folder_name` - The name of the folder
    ///
    /// # Returns
    /// A vector of world models
    ///
    /// # Errors
    /// Returns an error if the folder is not found
    /// Returns an error if the folders lock is poisoned
    #[must_use]
    pub fn get_worlds(state: &AppState, folder_name: String) -> Result<Vec<WorldModel>, AppError> {
        let folders_lock = state
            .folders
            .lock()
            .map_err(|_| -> AppError { ConcurrencyError::PoisonedLock.into() })?;
        let folder = folders_lock.iter().find(|f| f.folder_name == folder_name);
        match folder {
            Some(folder) => {
                let worlds_lock = state
                    .worlds
                    .lock()
                    .map_err(|_| -> AppError { ConcurrencyError::PoisonedLock.into() })?;
                let worlds = folder
                    .world_ids
                    .iter()
                    .map(
                        |id| match worlds_lock.iter().find(|w| &w.api_data.world_id == id) {
                            Some(world) => Ok(world.clone()),
                            None => Err(EntityError::WorldNotFound(id.clone()).into()),
                        },
                    )
                    .collect::<Result<Vec<WorldModel>, AppError>>()?;
                Ok(worlds)
            }
            None => Err(EntityError::FolderNotFound(folder_name).into()),
        }
    }
}

#[cfg(test)]
mod tests {
    use chrono::{NaiveDate, NaiveDateTime, NaiveTime};

    use super::*;

    fn setup_test_state() -> AppState {
        AppState::initialize()
    }

    fn add_test_world_to_state(state: &AppState, world_id: String) -> Result<(), AppError> {
        let world = WorldModel::new(
            "".to_string(),
            "".to_string(),
            world_id,
            "Test World".to_string(),
            "Test Description".to_string(),
            1,
            Some(1),
            vec!["Test Tag".to_string()],
            NaiveDateTime::new(
                NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
                NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
            ),
            NaiveDateTime::new(
                NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
                NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
            ),
            "description".to_string(),
            Some(1),
            1,
            vec!["platform".to_string()],
        );
        let mut worlds_lock = state
            .worlds
            .lock()
            .map_err(|_| -> AppError { ConcurrencyError::PoisonedLock.into() })?;
        worlds_lock.push(world.clone());
        Ok(())
    }

    #[test]
    fn test_increment_folder_name() {
        let state = setup_test_state();
        let name = "Test Folder".to_string();

        // Test basic increment
        let result = FolderManager::increment_folder_name(&state, name.clone()).unwrap();
        assert_eq!(result, "Test Folder");

        // Test increment with existing folder
        let _ = FolderManager::create_folder(&state, name.clone());
        let result = FolderManager::increment_folder_name(&state, name).unwrap();
        assert_eq!(result, "Test Folder (1)");
    }
    #[test]
    fn test_increment_folder_name_numbered() {
        let state = setup_test_state();
        let _ = FolderManager::create_folder(&state, "Test Folder".to_string());
        let name = "Test Folder (1)".to_string();

        // Test increment of already numbered folder
        let result = FolderManager::increment_folder_name(&state, name).unwrap();
        assert_eq!(result, "Test Folder (1)");

        // Test increment with existing numbered folder
        let _ = FolderManager::create_folder(&state, "Test Folder (1)".to_string());
        let result =
            FolderManager::increment_folder_name(&state, "Test Folder (1)".to_string()).unwrap();
        assert_eq!(result, "Test Folder (2)");
    }

    #[test]
    fn test_create_folder() {
        let state = setup_test_state();
        let name = "Test Folder".to_string();

        let result = FolderManager::create_folder(&state, name.clone()).unwrap();
        assert_eq!(result.folder_name, name);

        // Test creating duplicate folder
        let result = FolderManager::create_folder(&state, name).unwrap();
        assert_eq!(result.folder_name, "Test Folder (1)");
    }

    #[test]
    fn test_delete_folder() {
        let state = setup_test_state();
        let name = "Test Folder".to_string();

        // Test delete existing folder
        let _ = FolderManager::create_folder(&state, name.clone());
        let result = FolderManager::delete_folder(&state, name);
        assert!(result.is_ok());

        // Test delete non-existent folder
        let result = FolderManager::delete_folder(&state, "NonExistent".to_string());
        assert!(result.is_err());

        // Test delete Unclassified folder
        let result = FolderManager::delete_folder(&state, "Unclassified".to_string());
        assert!(result.is_err());
    }

    #[test]
    fn test_add_world_to_folder() {
        let state = setup_test_state();
        let folder_name = "Test Folder".to_string();
        let world_id = "test_world".to_string();
        add_test_world_to_state(&state, world_id.clone()).unwrap();

        let _ = FolderManager::create_folder(&state, folder_name.clone());
        let result = FolderManager::add_world_to_folder(&state, folder_name, world_id);
        assert!(result.is_ok());
    }

    #[test]
    fn test_remove_world_from_folder() {
        let state = setup_test_state();
        let folder_name = "Test Folder".to_string();
        let world_id = "test_world".to_string();
        add_test_world_to_state(&state, world_id.clone()).unwrap();

        let _ = FolderManager::create_folder(&state, folder_name.clone());

        let _ = FolderManager::add_world_to_folder(&state, folder_name.clone(), world_id.clone());

        let result = FolderManager::remove_world_from_folder(&state, folder_name, world_id);

        assert!(result.is_ok());
    }

    #[test]
    fn test_get_worlds() {
        let state = setup_test_state();
        let name = "Test Folder".to_string();
        let _ = FolderManager::create_folder(&state, name.clone());
        let result = FolderManager::get_worlds(&state, name);
        assert!(result.is_ok());
    }

    #[test]
    fn test_get_world() {
        let state = setup_test_state();
        let world_id = "test_world".to_string();

        // Test get non-existent world
        let result = FolderManager::get_world(&state, world_id);
        assert!(result.is_err());
    }
}
