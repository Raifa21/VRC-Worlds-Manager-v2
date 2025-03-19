use crate::definitions::{FolderModel, WorldDisplayData, WorldModel};
use crate::errors::{AppError, ConcurrencyError, EntityError};
use std::collections::HashSet;
use std::sync::RwLock;

/// Service for managing world/folder operations
#[derive(Debug)]
pub struct FolderManager;

impl FolderManager {
    /// Adds a world to a folder
    /// Updates existing world data if the world is already in the folder
    ///
    /// # Arguments
    /// * `folder_name` - The name of the folder
    /// * `world_id` - The ID of the world to add
    /// * `folders` - The list of folders, as a RwLock
    /// * `worlds` - The list of worlds, as a RwLock
    ///
    /// # Returns
    /// Ok if the world was added successfully
    ///
    /// # Errors
    /// Returns an error if the folder is not found
    /// Returns an error if the world is not found
    /// Returns an error if the folders lock is poisoned
    pub fn add_world_to_folder(
        folder_name: String,
        world_id: String,
        folders: &RwLock<Vec<FolderModel>>,
        worlds: &RwLock<Vec<WorldModel>>,
    ) -> Result<(), AppError> {
        let mut folders_lock = folders
            .write()
            .map_err(|_| ConcurrencyError::PoisonedLock)?;
        let mut worlds_lock = worlds.write().map_err(|_| ConcurrencyError::PoisonedLock)?;

        let folder = folders_lock
            .iter_mut()
            .find(|f| f.folder_name == folder_name);
        let world = worlds_lock
            .iter_mut()
            .find(|w| w.api_data.world_id == world_id);

        if folder.is_none() {
            return Err(EntityError::FolderNotFound(folder_name).into());
        }
        if world.is_none() {
            return Err(EntityError::WorldNotFound(world_id).into());
        }
        let folder = folder.unwrap();
        let world = world.unwrap();

        if !world.user_data.folders.iter().any(|f| f == &folder_name) {
            folder.world_ids.push(world_id.clone());
            world.user_data.folders.push(folder_name.clone());
        }
        Ok(())
    }

    /// Removes a world from a folder
    /// Does not do anything if the world is not in the folder
    ///
    /// # Arguments
    /// * `folder_name` - The name of the folder
    /// * `world_id` - The ID of the world to remove
    /// * `folders` - The list of folders, as a RwLock
    /// * `worlds` - The list of worlds, as a RwLock
    ///
    /// # Returns
    /// Ok if the world was removed successfully
    ///
    /// # Errors
    /// Returns an error if the folder is not found
    /// Returns an error if the folders lock is poisoned
    pub fn remove_world_from_folder(
        folder_name: String,
        world_id: String,
        folders: &RwLock<Vec<FolderModel>>,
        worlds: &RwLock<Vec<WorldModel>>,
    ) -> Result<(), AppError> {
        let mut folders_lock = folders
            .write()
            .map_err(|_| ConcurrencyError::PoisonedLock)?;
        let mut worlds_lock = worlds.write().map_err(|_| ConcurrencyError::PoisonedLock)?;

        let folder = folders_lock
            .iter_mut()
            .find(|f| f.folder_name == folder_name);
        let world = worlds_lock
            .iter_mut()
            .find(|w| w.api_data.world_id == world_id);
        if folder.is_none() {
            return Err(EntityError::FolderNotFound(folder_name).into());
        }
        if world.is_none() {
            return Err(EntityError::WorldNotFound(world_id).into());
        }
        let folder = folder.unwrap();
        let world = world.unwrap();

        if world.user_data.folders.contains(&folder_name) {
            // Remove folder from world's folders
            if let Some(index) = world
                .user_data
                .folders
                .iter()
                .position(|f| f == &folder_name)
            {
                world.user_data.folders.remove(index);
            }
            // Remove world from folder's world_ids
            if let Some(index) = folder.world_ids.iter().position(|id| id == &world_id) {
                folder.world_ids.remove(index);
            }
        } else {
            return Err(EntityError::FolderNotFound(folder.folder_name.clone()).into());
        }

        Ok(())
    }

    /// Get the names of all folders
    ///
    /// # Arguments
    /// * `folders` - The list of folders, as a RwLock
    ///
    /// # Returns
    /// A vector of folder names
    ///
    /// # Errors
    /// Returns an error if the folders lock is poisoned
    #[must_use]
    pub fn get_folders(folders: &RwLock<Vec<FolderModel>>) -> Result<Vec<String>, AppError> {
        let folders_lock = folders.read().map_err(|_| ConcurrencyError::PoisonedLock)?;
        let folder_names = folders_lock.iter().map(|f| f.folder_name.clone()).collect();
        Ok(folder_names)
    }

    /// Returns a unique name for a folder, as a string
    /// If the passed name is "", the default name "New Folder" is used
    /// If the folder already exists, we append a number to the name
    /// When appending, we first check if it is already a numbered folder
    /// If it is, we increment the number
    ///
    /// # Arguments
    /// * `name` - The name of the new folder
    /// * `folders` - The list of folders, as a RwLock
    ///
    /// # Returns
    /// The unique folder name
    ///
    /// # Errors
    /// Returns an error if the folders lock is poisoned
    #[must_use]
    fn increment_folder_name(
        name: String,
        folders: &RwLock<Vec<FolderModel>>,
    ) -> Result<String, AppError> {
        let folders_lock = folders.read().map_err(|_| ConcurrencyError::PoisonedLock)?;

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
            println!("Folder name exists: {}", new_name);
            new_name = format!("{} ({})", base_name, count);
            count += 1;
        }
        Ok(new_name)
    }

    /// Create a new folder, adding it to the list of folders
    /// Use the increment_folder_name function to get a unique name
    ///
    /// # Arguments
    /// * `name` - The name of the new folder
    /// * `folders` - The list of folders, as a RwLock
    ///
    /// # Returns
    /// The new folder
    ///
    /// # Errors
    /// Returns an error if the folders lock is poisoned
    #[must_use]
    pub fn create_folder(
        name: String,
        folders: &RwLock<Vec<FolderModel>>,
    ) -> Result<String, AppError> {
        let new_name = FolderManager::increment_folder_name(name, folders)?;

        let mut folders_lock = folders
            .write()
            .map_err(|_| ConcurrencyError::PoisonedLock)?;

        let new_folder = FolderModel::new(new_name);
        folders_lock.push(new_folder.clone());
        Ok(new_folder.folder_name)
    }

    /// Delete a folder by name
    /// For each world in the folder, pass to remove_world_from_folder
    ///
    ///
    /// # Arguments
    /// * `name` - The name of the folder to delete
    /// * `folders` - The list of folders, as a RwLock
    /// * `worlds` - The list of worlds, as a RwLock
    ///
    /// # Returns
    /// Ok if the folder was deleted successfully
    ///
    /// # Errors
    /// Returns an error if the folder is not found
    pub fn delete_folder(
        name: String,
        folders: &RwLock<Vec<FolderModel>>,
        worlds: &RwLock<Vec<WorldModel>>,
    ) -> Result<(), AppError> {
        let mut folders_lock = folders
            .write()
            .map_err(|_| ConcurrencyError::PoisonedLock)?;

        let folder_index = folders_lock.iter().position(|f| f.folder_name == name);
        match folder_index {
            Some(index) => {
                let world_ids = folders_lock[index].world_ids.clone();
                folders_lock.remove(index);
                drop(folders_lock);
                for world_id in world_ids {
                    FolderManager::remove_world_from_folder(
                        name.clone(),
                        world_id,
                        folders,
                        worlds,
                    )?;
                }
                Ok(())
            }
            None => Err(EntityError::FolderNotFound(name).into()),
        }
    }

    /// Get a world by its ID
    /// TODO: move this to world_manager.rs
    ///
    /// # Arguments
    /// * world_id - The ID of the world
    /// * worlds - The list of worlds, as a RwLock
    ///
    /// # Returns
    /// Returns the world with the specified ID if found
    ///
    /// # Errors
    /// Returns an error if the world is not found
    #[must_use]
    fn get_world(
        world_id: String,
        worlds: &RwLock<Vec<WorldModel>>,
    ) -> Result<WorldModel, AppError> {
        let worlds_lock = worlds.read().map_err(|_| ConcurrencyError::PoisonedLock)?;
        match worlds_lock.iter().find(|w| w.api_data.world_id == world_id) {
            Some(world) => Ok(world.clone()),
            None => Err(EntityError::WorldNotFound(world_id).into()),
        }
    }

    /// Get the worlds in a folder by name
    /// Calls get_world for each world ID in the folder
    ///
    /// # Arguments
    /// * `folder_name` - The name of the folder
    /// * `folders` - The list of folders, as a RwLock
    /// * `worlds` - The list of worlds, as a RwLock
    ///
    /// # Returns
    /// A vector of world models
    ///
    /// # Errors
    /// Returns an error if the folder is not found
    /// Returns an error if the folders lock is poisoned
    #[must_use]
    pub fn get_worlds(
        folder_name: String,
        folders: &RwLock<Vec<FolderModel>>,
        worlds: &RwLock<Vec<WorldModel>>,
    ) -> Result<Vec<WorldDisplayData>, AppError> {
        let folders_lock = folders.read().map_err(|_| ConcurrencyError::PoisonedLock)?;

        let folder = folders_lock.iter().find(|f| f.folder_name == folder_name);
        match folder {
            Some(folder) => {
                let world_ids = folder.world_ids.clone();
                let mut folder_worlds = vec![];
                drop(folders_lock);
                for world_id in world_ids {
                    let world = Self::get_world(world_id, worlds)?;
                    folder_worlds.push(world.to_display_data());
                }
                Ok(folder_worlds)
            }
            None => Err(EntityError::FolderNotFound(folder_name).into()),
        }
    }

    /// Get all worlds
    ///
    /// # Arguments
    /// * `worlds` - The list of worlds, as a RwLock
    ///
    /// # Returns
    /// A vector of world models
    ///
    /// # Errors
    /// Returns an error if the worlds lock is poisoned
    #[must_use]
    pub fn get_all_worlds(
        worlds: &RwLock<Vec<WorldModel>>,
    ) -> Result<Vec<WorldDisplayData>, AppError> {
        let worlds_lock = worlds.read().map_err(|_| ConcurrencyError::PoisonedLock)?;
        println!("All worlds count: {}", worlds_lock.len());
        let world_ids: HashSet<_> = worlds_lock.iter().map(|w| &w.api_data.world_id).collect();
        println!("Unique world IDs: {}", world_ids.len());
        let all_worlds = worlds_lock.iter().map(|w| w.to_display_data()).collect();
        Ok(all_worlds)
    }

    /// Get all worlds that are Unclassified
    /// Check all worlds, and return those that are not in any folder
    /// This is done by checking if the world's folders list is empty
    ///
    /// # Arguments
    /// * `worlds` - The list of worlds, as a RwLock
    ///
    /// # Returns
    /// A vector of world models
    ///
    /// # Errors
    /// Returns an error if the worlds lock is poisoned
    #[must_use]
    pub fn get_unclassified_worlds(
        worlds: &RwLock<Vec<WorldModel>>,
    ) -> Result<Vec<WorldDisplayData>, AppError> {
        let worlds_lock = worlds.read().map_err(|_| ConcurrencyError::PoisonedLock)?;
        let unclassified_worlds = worlds_lock
            .iter()
            .filter(|w| w.user_data.folders.is_empty())
            .cloned()
            .map(|w| w.to_display_data())
            .collect();
        Ok(unclassified_worlds)
    }

    /// Adds worlds to data
    /// This is called when the api returns a list of worlds
    /// We check if the world is already in the list
    /// If it is, we update the world data
    /// If it is not, we add the world to the list
    ///
    /// # Arguments
    /// * `worlds` - The list of worlds, as a RwLock
    /// * `new_worlds` - The list of new worlds to add
    ///
    /// # Returns
    /// Ok if the worlds were added successfully
    ///
    /// # Errors
    /// Returns an error if the worlds lock is poisoned
    pub fn add_worlds(
        worlds: &RwLock<Vec<WorldModel>>,
        new_worlds: Vec<WorldModel>,
    ) -> Result<(), AppError> {
        let mut worlds_lock = worlds.write().map_err(|_| ConcurrencyError::PoisonedLock)?;
        for new_world in new_worlds {
            let world_id = new_world.api_data.world_id.clone();
            println!("Adding world: {}", world_id);
            let existing_world = worlds_lock
                .iter_mut()
                .find(|w| w.api_data.world_id == world_id);
            match existing_world {
                Some(world) => {
                    world.api_data = new_world.api_data;
                }
                None => {
                    worlds_lock.push(new_world);
                }
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::definitions::{AuthCookies, FolderModel, PreferenceModel, WorldModel};
    use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
    use std::sync::LazyLock;
    use std::sync::RwLock;

    static TEST_STATE: LazyLock<TestState> = LazyLock::new(|| TestState {
        preferences: RwLock::new(PreferenceModel::new()),
        folders: RwLock::new(vec![]),
        worlds: RwLock::new(vec![]),
        auth: RwLock::new(AuthCookies::new()),
    });

    struct TestState {
        preferences: RwLock<PreferenceModel>,
        folders: RwLock<Vec<FolderModel>>,
        worlds: RwLock<Vec<WorldModel>>,
        auth: RwLock<AuthCookies>,
    }

    fn add_test_world_to_state(
        world_id: String,
        worlds: &RwLock<Vec<WorldModel>>,
    ) -> Result<(), AppError> {
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
            )
            .and_local_timezone(chrono::Utc)
            .unwrap(),
            NaiveDateTime::new(
                NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
                NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
            )
            .and_local_timezone(chrono::Utc)
            .unwrap(),
            "description".to_string(),
            Some(1),
            1,
            vec!["platform".to_string()],
        );
        let mut worlds_lock = worlds.write().map_err(|_| ConcurrencyError::PoisonedLock)?;
        worlds_lock.push(world);
        Ok(())
    }

    fn setup_test_state() -> TestState {
        TestState {
            preferences: RwLock::new(PreferenceModel::new()),
            folders: RwLock::new(vec![]),
            worlds: RwLock::new(vec![]),
            auth: RwLock::new(AuthCookies::new()),
        }
    }

    #[test]
    fn test_increment_folder_name() {
        let state = setup_test_state();
        let name = "Test Folder".to_string();

        // Test basic increment
        let result = FolderManager::increment_folder_name(name.clone(), &state.folders).unwrap();
        assert_eq!(result, "Test Folder");

        // Test increment with existing folder
        let _ = FolderManager::create_folder(name.clone(), &state.folders).unwrap();
        let result = FolderManager::increment_folder_name(name.clone(), &state.folders).unwrap();
        assert_eq!(result, "Test Folder (1)");
    }

    #[test]
    fn test_increment_folder_name_numbered() {
        let state = setup_test_state();
        let _ = FolderManager::create_folder("Test Folder".to_string(), &state.folders).unwrap();
        let name = "Test Folder (1)".to_string();

        // Test increment of already numbered folder
        let result = FolderManager::increment_folder_name(name, &state.folders).unwrap();
        assert_eq!(result, "Test Folder (1)");

        // Test increment with existing numbered folder
        let _ =
            FolderManager::create_folder("Test Folder (1)".to_string(), &state.folders).unwrap();
        let result =
            FolderManager::increment_folder_name("Test Folder (1)".to_string(), &state.folders)
                .unwrap();
        assert_eq!(result, "Test Folder (2)");
    }

    #[test]
    fn test_create_folder() {
        let state = setup_test_state();
        let name = "Test Folder".to_string();

        let result = FolderManager::create_folder(name.clone(), &state.folders).unwrap();
        assert_eq!(result, name);

        // Test creating duplicate folder
        let result = FolderManager::create_folder(name, &state.folders).unwrap();
        assert_eq!(result, "Test Folder (1)");
    }

    #[test]
    fn test_delete_folder() {
        let state = setup_test_state();
        let name = "Test Folder".to_string();

        // Test delete existing folder
        let _ = FolderManager::create_folder(name.clone(), &state.folders).unwrap();
        let result = FolderManager::delete_folder(name, &state.folders, &state.worlds);
        if let Err(e) = result.clone() {
            eprintln!("Error deleting folder: {}", e);
        }
        assert!(result.is_ok());

        // Test delete non-existent folder
        let result =
            FolderManager::delete_folder("NonExistent".to_string(), &state.folders, &state.worlds);
        assert!(result.is_err());
    }

    #[test]
    fn test_add_world_to_folder() {
        let state = setup_test_state();
        let folder_name = "Test Folder".to_string();
        let world_id = "test_world".to_string();
        add_test_world_to_state(world_id.clone(), &state.worlds).unwrap();

        let _ = FolderManager::create_folder(folder_name.clone(), &state.folders).unwrap();
        let result = FolderManager::add_world_to_folder(
            folder_name,
            world_id,
            &state.folders,
            &state.worlds,
        );
        if let Err(e) = result.clone() {
            eprintln!("Error adding world to folder: {}", e);
        }
        assert!(result.is_ok());
    }

    #[test]
    fn test_remove_world_from_folder() {
        let state = setup_test_state();
        let folder_name = "Test Folder".to_string();
        let world_id = "test_world".to_string();
        add_test_world_to_state(world_id.clone(), &state.worlds).unwrap();

        let _ = FolderManager::create_folder(folder_name.clone(), &state.folders).unwrap();

        let _ = FolderManager::add_world_to_folder(
            folder_name.clone(),
            world_id.clone(),
            &state.folders,
            &state.worlds,
        )
        .unwrap();

        let result = FolderManager::remove_world_from_folder(
            folder_name,
            world_id,
            &state.folders,
            &state.worlds,
        );
        if let Err(e) = result.clone() {
            eprintln!("Error removing world from folder: {}", e);
        }
        assert!(result.is_ok());
    }

    #[test]
    fn test_get_worlds() {
        let state = setup_test_state();
        let name = "Test Folder".to_string();
        let _ = FolderManager::create_folder(name.clone(), &state.folders).unwrap();
        let result = FolderManager::get_worlds(name, &state.folders, &state.worlds);
        if let Err(e) = result.clone() {
            eprintln!("Error getting worlds: {}", e);
        }
        assert!(result.is_ok());
    }

    #[test]
    fn test_get_world() {
        let state = setup_test_state();
        let world_id = "test_world_123".to_string();
        let result = FolderManager::get_world(world_id, &state.worlds);
        assert!(result.is_err());
    }

    #[test]
    fn test_get_unclassified_worlds() {
        let state = setup_test_state();
        let world_id = "test_world_123".to_string();
        add_test_world_to_state(world_id.clone(), &state.worlds).unwrap();
        let result = FolderManager::get_unclassified_worlds(&state.worlds);
        if let Err(e) = result.clone() {
            eprintln!("Error getting unclassified worlds: {}", e);
        }
        assert!(result.is_ok());
    }
}
