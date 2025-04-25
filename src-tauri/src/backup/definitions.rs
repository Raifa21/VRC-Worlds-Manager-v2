use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Deserialize, Serialize, Type)]
pub struct BackupMetaData {
    pub date: String,           // Date of the backup
    pub number_of_folders: u32, // Number of folders in the backup
    pub number_of_worlds: u32,  // Number of worlds in the backup
    pub app_version: String,    // Version of the application at the time of backup
}
