use log::info;

use crate::definitions::{FolderModel, WorldApiData, WorldDisplayData, WorldModel};
use crate::errors::{AppError, ConcurrencyError, EntityError};
use std::collections::{HashMap, HashSet};
use std::sync::RwLock;

use super::FileService;

/// Service for managing world/folder operations
#[derive(Debug)]
pub struct FolderManager;

impl FolderManager {
    /// Adds a world to a folder
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
        FileService::write_folders(&*folders_lock)?;
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
        FileService::write_folders(&*folders_lock)?;
        Ok(())
    }

    /// Hide a world
    /// This is done by setting the hidden flag to true
    /// Remove the world from all folders
    ///
    /// # Arguments
    /// * `world_id` - The ID of the world to hide
    /// * `folders` - The list of folders, as a RwLock
    /// * `worlds` - The list of worlds, as a RwLock
    ///
    /// # Returns
    /// Ok if the world was hidden successfully
    ///
    /// # Errors
    /// Returns an error if the world is not found
    /// Returns an error if the worlds lock is poisoned
    pub fn hide_world(
        world_id: String,
        folders: &RwLock<Vec<FolderModel>>,
        worlds: &RwLock<Vec<WorldModel>>,
    ) -> Result<(), AppError> {
        let mut worlds_lock = worlds.write().map_err(|_| ConcurrencyError::PoisonedLock)?;
        let world = worlds_lock
            .iter_mut()
            .find(|w| w.api_data.world_id == world_id);
        if world.is_none() {
            return Err(EntityError::WorldNotFound(world_id).into());
        }
        let world = world.unwrap();
        world.user_data.hidden = true;

        let folders_lock = folders
            .write()
            .map_err(|_| ConcurrencyError::PoisonedLock)?;
        let folders_to_remove: Vec<String> = folders_lock
            .iter()
            .filter(|folder| folder.world_ids.contains(&world_id))
            .map(|folder| folder.folder_name.clone())
            .collect();
        drop(folders_lock);
        FileService::write_worlds(&*worlds_lock)?;
        drop(worlds_lock);

        for folder_name in folders_to_remove {
            FolderManager::remove_world_from_folder(
                folder_name,
                world_id.clone(),
                folders,
                worlds,
            )?;
        }

        Ok(())
    }

    /// Unhide a world
    /// This is done by setting the hidden flag to false
    /// If the world.user_data.folders contains any folders, we add the world back to the folders
    ///
    ///
    /// # Arguments
    /// * `world_id` - The ID of the world to unhide
    /// * `folders` - The list of folders, as a RwLock
    /// * `worlds` - The list of worlds, as a RwLock
    ///
    /// # Returns
    /// Ok if the world was unhidden successfully
    ///
    /// # Errors
    /// Returns an error if the world is not found
    /// Returns an error if the worlds lock is poisoned
    pub fn unhide_world(
        world_id: String,
        folders: &RwLock<Vec<FolderModel>>,
        worlds: &RwLock<Vec<WorldModel>>,
    ) -> Result<(), AppError> {
        let mut worlds_lock = worlds.write().map_err(|_| ConcurrencyError::PoisonedLock)?;
        let world = worlds_lock
            .iter_mut()
            .find(|w| w.api_data.world_id == world_id);
        if world.is_none() {
            return Err(EntityError::WorldNotFound(world_id).into());
        }
        let world = world.unwrap();
        world.user_data.hidden = false;

        let folders_lock = folders
            .write()
            .map_err(|_| ConcurrencyError::PoisonedLock)?;
        let folders_to_add: Vec<String> = folders_lock
            .iter()
            .filter(|folder| world.user_data.folders.contains(&folder.folder_name))
            .map(|folder| folder.folder_name.clone())
            .collect();
        drop(folders_lock);
        FileService::write_worlds(&*worlds_lock)?;
        drop(worlds_lock);

        for folder_name in folders_to_add {
            FolderManager::add_world_to_folder(folder_name, world_id.clone(), folders, worlds)?;
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
            log::info!("Folder name exists: {}", new_name);
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
        FileService::write_folders(&*folders_lock)?;
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
                FileService::write_folders(&*folders_lock)?;
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

    /// Move a folder to a new position in the list
    ///
    /// # Arguments
    /// * `folder_name` - The name of the folder to move
    /// * `new_index` - The new index for the folder
    /// * `folders` - The list of folders, as a RwLock
    ///
    /// # Returns
    /// Ok if the folder was moved successfully
    ///
    /// # Errors
    /// Returns an error if the folder is not found
    pub fn move_folder(
        folder_name: String,
        new_index: usize,
        folders: &RwLock<Vec<FolderModel>>,
    ) -> Result<(), AppError> {
        let mut folders_lock = folders
            .write()
            .map_err(|_| ConcurrencyError::PoisonedLock)?;

        let current_index = folders_lock
            .iter()
            .position(|f| f.folder_name == folder_name)
            .ok_or_else(|| EntityError::FolderNotFound(folder_name))?;
        // Remove from current position and insert at new position
        let folder = folders_lock.remove(current_index);
        folders_lock.insert(new_index, folder);

        FileService::write_folders(&*folders_lock)?;
        Ok(())
    }

    /// Rename a folder
    /// This is done by removing the folder from the list, and adding it back with the new name
    /// We also need to update the world user_data.folders list
    ///
    /// # Arguments
    /// * `old_name` - The old name of the folder
    /// * `new_name` - The new name of the folder
    /// * `folders` - The list of folders, as a RwLock
    /// * `worlds` - The list of worlds, as a RwLock
    ///
    /// # Returns
    /// Ok if the folder was renamed successfully
    ///
    /// # Errors
    /// Returns an error if the folder is not found
    /// Returns an error if the worlds lock is poisoned
    /// Returns an error if the folders lock is poisoned
    pub fn rename_folder(
        old_name: String,
        new_name: String,
        folders: &RwLock<Vec<FolderModel>>,
        worlds: &RwLock<Vec<WorldModel>>,
    ) -> Result<(), AppError> {
        let mut folders_lock = folders
            .write()
            .map_err(|_| ConcurrencyError::PoisonedLock)?;
        let mut worlds_lock = worlds.write().map_err(|_| ConcurrencyError::PoisonedLock)?;

        let folder_index = folders_lock.iter().position(|f| f.folder_name == old_name);
        match folder_index {
            Some(index) => {
                let world_ids = folders_lock[index].world_ids.clone();
                folders_lock[index].folder_name = new_name.clone();
                FileService::write_folders(&*folders_lock)?;
                drop(folders_lock);
                for world_id in world_ids {
                    if let Some(world) = worlds_lock
                        .iter_mut()
                        .find(|w| w.api_data.world_id == world_id)
                    {
                        world.user_data.folders.retain(|folder| folder != &old_name);
                        if !world.user_data.folders.contains(&new_name) {
                            world.user_data.folders.push(new_name.clone());
                        }
                    }
                }
                FileService::write_worlds(&*worlds_lock)?;
                Ok(())
            }
            None => Err(EntityError::FolderNotFound(old_name).into()),
        }
    }

    /// Get a world by its ID
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
    /// Hidden worlds are excluded.
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
        let worlds_lock = worlds_lock
            .iter()
            .filter(|w| w.user_data.hidden == false)
            .cloned()
            .collect::<Vec<WorldModel>>();
        let all_worlds = worlds_lock.iter().map(|w| w.to_display_data()).collect();
        Ok(all_worlds)
    }

    /// Get all worlds that are Unclassified
    /// Check all worlds, and return those that are not in any folder
    /// This is done by checking if the world's folders list is empty, and the hidden flag is false
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
            .filter(|w| w.user_data.folders.is_empty() && w.user_data.hidden == false)
            .cloned()
            .map(|w| w.to_display_data())
            .collect();
        Ok(unclassified_worlds)
    }
    /// Get all worlds that are Hidden
    /// Check all worlds, and return those that are in any folder
    /// This is done by checking if the hidden flag is true
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
    pub fn get_hidden_worlds(
        worlds: &RwLock<Vec<WorldModel>>,
    ) -> Result<Vec<WorldDisplayData>, AppError> {
        let worlds_lock = worlds.read().map_err(|_| ConcurrencyError::PoisonedLock)?;
        let hidden_worlds = worlds_lock
            .iter()
            .filter(|w| w.user_data.hidden == true)
            .cloned()
            .map(|w| w.to_display_data())
            .collect();
        Ok(hidden_worlds)
    }

    /// Adds worlds to data
    /// This is called when the api returns a list of worlds
    /// or when we add via the folder sharing feature
    /// We check if the world is already in the list
    /// If it is, we update the world data and set the last checked time
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
        new_worlds: Vec<WorldApiData>,
    ) -> Result<(), AppError> {
        let mut worlds_lock = worlds.write().map_err(|_| ConcurrencyError::PoisonedLock)?;
        for new_world in new_worlds {
            let world_id = new_world.world_id.clone();
            log::info!("Adding world: {}", world_id);
            let existing_world = worlds_lock
                .iter_mut()
                .find(|w| w.api_data.world_id == world_id);
            match existing_world {
                Some(world) => {
                    log::info!("World already exists, updating world data: {}", world_id);
                    world.api_data = new_world;
                    world.user_data.last_checked = chrono::Utc::now();
                }
                None => {
                    worlds_lock.push(WorldModel::new(new_world));
                }
            }
        }
        FileService::write_worlds(&*worlds_lock)?;
        Ok(())
    }

    /// return a list of tags, sorted by the number of worlds in each tag
    ///
    /// # Arguments
    /// * `worlds` - The list of worlds, as a RwLock
    ///
    /// # Returns
    /// A vector of tags
    ///
    /// # Errors
    /// Returns an error if the worlds lock is poisoned
    #[must_use]
    pub fn get_tags_by_count(worlds: &RwLock<Vec<WorldModel>>) -> Result<Vec<String>, AppError> {
        let worlds_lock = worlds.read().map_err(|_| ConcurrencyError::PoisonedLock)?;
        // create a map which contains the tag and the number of worlds in that tag
        let mut tag_map: HashMap<String, usize> = HashMap::new();
        for world in worlds_lock.iter() {
            for tag in &world.api_data.tags {
                if tag.starts_with("author_tag_") {
                    let stripped_tag = tag.strip_prefix("author_tag_").unwrap().to_string();
                    *tag_map.entry(stripped_tag).or_insert(0) += 1;
                }
            }
        }
        // sort the map by the number of worlds in each tag
        let mut tags: Vec<(String, usize)> = tag_map.into_iter().collect();
        tags.sort_by(|a, b| b.1.cmp(&a.1));

        let tags: Vec<String> = tags.into_iter().map(|(tag, _)| tag).collect();

        Ok(tags)
    }

    /// return a list of authors, sorted by the number of worlds in each author
    ///
    /// /// # Arguments
    /// * `worlds` - The list of worlds, as a RwLock
    ///
    /// # Returns
    /// A vector of author names
    ///
    /// # Errors
    /// Returns an error if the worlds lock is poisoned
    #[must_use]
    pub fn get_authors_by_count(worlds: &RwLock<Vec<WorldModel>>) -> Result<Vec<String>, AppError> {
        let worlds_lock = worlds.read().map_err(|_| ConcurrencyError::PoisonedLock)?;
        // create a map which contains the author name and the number of worlds by that author
        let mut author_map: HashMap<String, usize> = HashMap::new();
        for world in worlds_lock.iter() {
            *author_map
                .entry(world.api_data.author_name.clone())
                .or_insert(0) += 1;
        }
        // sort the map by the number of worlds by each author
        let mut authors: Vec<(String, usize)> = author_map.into_iter().collect();
        authors.sort_by(|a, b| b.1.cmp(&a.1));

        let authors: Vec<String> = authors.into_iter().map(|(author, _)| author).collect();

        Ok(authors)
    }

    /// Completely delete a world
    /// This is done by removing the world from all folders, and deleting the world
    ///
    /// # Arguments
    /// * `world_id` - The ID of the world to delete
    /// * `folders` - The list of folders, as a RwLock
    /// * `worlds` - The list of worlds, as a RwLock
    ///
    /// # Returns
    /// Ok if the world was deleted successfully
    ///
    /// # Errors
    /// Returns an error if the world is not found
    /// Returns an error if the worlds lock is poisoned
    /// Returns an error if the folders lock is poisoned
    pub fn delete_world(
        world_id: String,
        folders: &RwLock<Vec<FolderModel>>,
        worlds: &RwLock<Vec<WorldModel>>,
    ) -> Result<(), AppError> {
        let mut worlds_lock = worlds.write().map_err(|_| ConcurrencyError::PoisonedLock)?;
        let world = worlds_lock
            .iter()
            .position(|w| w.api_data.world_id == world_id);
        if world.is_none() {
            return Err(EntityError::WorldNotFound(world_id).into());
        }
        let world_index = world.unwrap();
        let world = worlds_lock.remove(world_index);
        info!("Deleting world: {}", world.api_data.world_id);
        FileService::write_worlds(&*worlds_lock)?;
        drop(worlds_lock);

        // First, collect the folder names that contain the world
        let folders_to_update: Vec<String> = folders
            .read()
            .map_err(|_| ConcurrencyError::PoisonedLock)?
            .iter()
            .filter(|folder| folder.world_ids.contains(&world.api_data.world_id))
            .map(|folder| folder.folder_name.clone())
            .collect();

        // Now, for each folder, remove the world from its world_ids
        if !folders_to_update.is_empty() {
            let mut folders_lock = folders
                .write()
                .map_err(|_| ConcurrencyError::PoisonedLock)?;
            for folder_name in folders_to_update {
                log::info!("Removing world from folder: {}", folder_name);
                if let Some(folder) = folders_lock
                    .iter_mut()
                    .find(|f| f.folder_name == folder_name)
                {
                    if let Some(index) = folder.world_ids.iter().position(|id| id == &world_id) {
                        folder.world_ids.remove(index);
                    }
                }
            }
            FileService::write_folders(&*folders_lock)?;
        }
        Ok(())
    }

    /// Set the share field of a folder
    /// Set the given ID and expiry time for the share
    /// If the folder does not exist, return an error
    /// # Arguments
    /// * `folder_name` - The name of the folder to set the share
    /// * `folders` - The list of folders, as a RwLock
    /// * `share_id` - The ID of the share to set
    ///
    /// # Returns
    /// Ok if the share was set successfully
    ///
    /// # Errors
    /// Returns an error if the folder is not found
    /// Returns an error if the folders lock is poisoned
    pub fn set_folder_share(
        folder_name: String,
        folders: &RwLock<Vec<FolderModel>>,
        share_id: String,
        ts: String,
    ) -> Result<(), AppError> {
        let mut folders_lock = folders
            .write()
            .map_err(|_| ConcurrencyError::PoisonedLock)?;

        let folder = match folders_lock
            .iter_mut()
            .find(|f| f.folder_name == folder_name)
        {
            Some(f) => f,
            None => return Err(EntityError::FolderNotFound(folder_name).into()),
        };

        let time = ts
            .parse::<chrono::DateTime<chrono::Utc>>()
            .map_err(|_| EntityError::InvalidTimestamp(ts))?;

        folder.share = Some(crate::definitions::ShareInfo {
            id: share_id,
            expiry_time: time + chrono::Duration::days(30), // Set expiry time to 30 days from now
        });

        FileService::write_folders(&*folders_lock)?;
        Ok(())
    }

    /// Get the share field of a folder.
    /// If share is None, do nothing.
    /// If share is Some, check if the id has already expired using the expiry_time field.
    /// If it has expired, set share to None and persist the change.
    /// If it has not , return the ID of the share.
    ///
    /// # Arguments
    /// * `folder_name` - The name of the folder to update share
    /// * `folders` - The list of folders, as a RwLock
    ///
    /// # Returns
    /// Ok with the share ID if it is still valid, or None if it has expired
    ///
    /// # Errors
    /// Returns an error if the folder is not found
    /// Returns an error if the folders lock is poisoned
    pub fn update_folder_share(
        folder_name: String,
        folders: &RwLock<Vec<FolderModel>>,
    ) -> Result<Option<String>, AppError> {
        let mut folders_lock = folders
            .write()
            .map_err(|_| ConcurrencyError::PoisonedLock)?;

        let folder = match folders_lock
            .iter_mut()
            .find(|f| f.folder_name == folder_name)
        {
            Some(f) => f,
            None => return Err(EntityError::FolderNotFound(folder_name).into()),
        };

        if let Some(ref share_info) = folder.share {
            if share_info.expiry_time <= chrono::Utc::now() {
                folder.share = None;
                log::info!(
                    "Share ID for folder '{}' has expired, setting share to None",
                    folder_name
                );
                FileService::write_folders(&*folders_lock)?;
                Ok(None)
            } else {
                Ok(Some(share_info.id.clone()))
            }
        } else {
            Ok(None)
        }
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
        let world = WorldModel::new(WorldApiData {
            world_id: world_id.clone(),
            world_name: "Test World".to_string(),
            description: "Test Description".to_string(),
            author_name: "Test Author".to_string(),
            author_id: "test_author".to_string(),
            tags: vec!["Test Tag".to_string()],
            publication_date: Some(
                NaiveDateTime::new(
                    NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
                    NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
                )
                .and_local_timezone(chrono::Utc)
                .unwrap(),
            ),
            last_update: NaiveDateTime::new(
                NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
                NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
            )
            .and_local_timezone(chrono::Utc)
            .unwrap(),
            image_url: "".to_string(),
            capacity: 0,
            recommended_capacity: Some(0),
            visits: Some(0),
            favorites: 0,
            platform: vec!["platform".to_string()],
        });
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
            log::error!("Error deleting folder: {}", e);
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
            log::error!("Error adding world to folder: {}", e);
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
            log::error!("Error removing world from folder: {}", e);
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
            log::error!("Error getting worlds: {}", e);
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
            log::error!("Error getting unclassified worlds: {}", e);
        }
        assert!(result.is_ok());
    }

    #[test]
    fn test_move_folder() {
        let state = setup_test_state();

        // Create test folders
        let folder1 = FolderManager::create_folder("Folder 1".to_string(), &state.folders).unwrap();
        let folder2 = FolderManager::create_folder("Folder 2".to_string(), &state.folders).unwrap();
        let folder3 = FolderManager::create_folder("Folder 3".to_string(), &state.folders).unwrap();

        // Test moving folder to new position
        let result = FolderManager::move_folder(folder2.clone(), 0, &state.folders);
        assert!(result.is_ok());

        // Verify new order
        let folders = FolderManager::get_folders(&state.folders).unwrap();
        assert_eq!(folders[0], folder2);
        assert_eq!(folders[1], folder1);
        assert_eq!(folders[2], folder3);

        // Test moving non-existent folder
        let result = FolderManager::move_folder("NonExistent".to_string(), 0, &state.folders);
        assert!(result.is_err());
    }

    #[test]
    fn test_delete_world() {
        let state = setup_test_state();
        let world_id = "test_world_to_delete".to_string();
        let folder_name = "Test Folder".to_string();

        // Add a test world
        add_test_world_to_state(world_id.clone(), &state.worlds).unwrap();

        // Create a folder and add the world to it
        let _ = FolderManager::create_folder(folder_name.clone(), &state.folders).unwrap();
        let _ = FolderManager::add_world_to_folder(
            folder_name.clone(),
            world_id.clone(),
            &state.folders,
            &state.worlds,
        )
        .unwrap();

        // Verify world is in the folder
        let worlds_in_folder =
            FolderManager::get_worlds(folder_name.clone(), &state.folders, &state.worlds).unwrap();
        assert_eq!(worlds_in_folder.len(), 1);
        assert_eq!(worlds_in_folder[0].world_id, world_id);

        // Delete the world
        let result = FolderManager::delete_world(world_id.clone(), &state.folders, &state.worlds);
        assert!(result.is_ok());

        // Verify world is removed from the folder
        let worlds_in_folder =
            FolderManager::get_worlds(folder_name, &state.folders, &state.worlds).unwrap();
        assert_eq!(worlds_in_folder.len(), 0);

        // Verify the world is no longer in the worlds list
        let all_worlds = FolderManager::get_all_worlds(&state.worlds).unwrap();
        assert!(all_worlds.iter().find(|w| w.world_id == world_id).is_none());

        // Test deleting a non-existent world
        let non_existent_id = "non_existent_world".to_string();
        let result = FolderManager::delete_world(non_existent_id, &state.folders, &state.worlds);
        assert!(result.is_err());
    }

    #[test]
    fn test_delete_world_in_multiple_folders() {
        let state = setup_test_state();
        let world_id = "test_world_multi_folders".to_string();
        let folder1 = "Folder One".to_string();
        let folder2 = "Folder Two".to_string();

        // Add a test world
        add_test_world_to_state(world_id.clone(), &state.worlds).unwrap();

        // Create two folders and add the world to both
        let _ = FolderManager::create_folder(folder1.clone(), &state.folders).unwrap();
        let _ = FolderManager::create_folder(folder2.clone(), &state.folders).unwrap();

        let _ = FolderManager::add_world_to_folder(
            folder1.clone(),
            world_id.clone(),
            &state.folders,
            &state.worlds,
        )
        .unwrap();

        let _ = FolderManager::add_world_to_folder(
            folder2.clone(),
            world_id.clone(),
            &state.folders,
            &state.worlds,
        )
        .unwrap();

        // Verify world is in both folders
        let worlds_in_folder1 =
            FolderManager::get_worlds(folder1.clone(), &state.folders, &state.worlds).unwrap();
        assert_eq!(worlds_in_folder1.len(), 1);

        let worlds_in_folder2 =
            FolderManager::get_worlds(folder2.clone(), &state.folders, &state.worlds).unwrap();
        assert_eq!(worlds_in_folder2.len(), 1);

        // Delete the world
        let result = FolderManager::delete_world(world_id.clone(), &state.folders, &state.worlds);
        assert!(result.is_ok());

        // Verify world is removed from both folders
        let worlds_in_folder1 =
            FolderManager::get_worlds(folder1, &state.folders, &state.worlds).unwrap();
        assert_eq!(worlds_in_folder1.len(), 0);

        let worlds_in_folder2 =
            FolderManager::get_worlds(folder2, &state.folders, &state.worlds).unwrap();
        assert_eq!(worlds_in_folder2.len(), 0);
    }

    #[test]
    fn test_delete_hidden_world() {
        let state = setup_test_state();
        let world_id = "test_hidden_world".to_string();

        // Add a test world and hide it
        add_test_world_to_state(world_id.clone(), &state.worlds).unwrap();
        let _ = FolderManager::hide_world(world_id.clone(), &state.folders, &state.worlds).unwrap();

        // Verify the world is in hidden worlds
        let hidden_worlds = FolderManager::get_hidden_worlds(&state.worlds).unwrap();
        assert_eq!(hidden_worlds.len(), 1);
        assert_eq!(hidden_worlds[0].world_id, world_id);

        // Delete the hidden world
        let result = FolderManager::delete_world(world_id.clone(), &state.folders, &state.worlds);
        assert!(result.is_ok());

        // Verify the world is no longer in hidden worlds
        let hidden_worlds = FolderManager::get_hidden_worlds(&state.worlds).unwrap();
        assert_eq!(hidden_worlds.len(), 0);
    }
}
