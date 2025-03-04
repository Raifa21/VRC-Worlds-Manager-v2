#[derive(Debug, Serialize)]
pub enum AppError {
    ConfigNotFound,
    InvalidConfig,
    FileReadError,
    FileWriteError,
    
}