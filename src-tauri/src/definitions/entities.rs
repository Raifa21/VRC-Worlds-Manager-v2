use datetime::DateTime;

pub struct WorldModel {
    pub imageUrl: String,
    pub worldName: String,
    pub worldId: String,
    pub authorName: String,
    pub authorId: String,
    pub capacity: i32,
    pub recommendedCapacity: Option<i32>,
    pub tags: Vec<String>,
    pub publicationDate: DateTime,
    pub lastUpdate: DateTime,
    pub description: String,
    pub visits: Option<i32>,
    pub favorites: i32,
    pub dateAdded: DateTime,
    pub platform: Vec<String>,
    pub memo: Option<String>,
}

pub struct FolderModel {
    pub folderName: String,
    pub worlds: Vec<WorldModel>,
}