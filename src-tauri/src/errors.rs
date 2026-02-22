use serde::Serialize;
use std::fmt;

#[derive(Debug, Clone, Serialize)]
pub enum AppError {
    Storage(FileError),
    Concurrency(ConcurrencyError),
    State(StateError),
    Network(NetworkError),
    Api(ApiError),
    Entity(EntityError),
}

/// Represents errors that can occur during file operations
#[derive(Debug, Serialize, Clone)]
pub enum FileError {
    /// File not found at expected location
    FileNotFound,
    /// File exists but contains invalid data
    InvalidFile {
        line: Option<usize>,
        column: Option<usize>,
        file_name: Option<String>,
        error_message: String,
    }, // line and column for JSON parsing errors
    /// File could not be decrypted correctly
    DecryptionError,
    /// The app was not given access to the file
    AccessDenied,
    /// Error occurred while writing to a file
    FileWriteError,
}

#[derive(Debug, Serialize, Clone)]
pub enum ConcurrencyError {
    /// Mutex lock was poisoned by another thread's panic
    PoisonedLock,
}

#[derive(Debug, Serialize, Clone)]
pub enum StateError {
    /// Internal state is inconsistent or corrupted
    Inconsistent(&'static str),
    /// Operation would result in invalid state
    InvalidOperation(&'static str),
    /// Required state initialization failed
    InitializationFailed,
}

#[derive(Debug, Serialize, Clone)]
pub enum NetworkError {
    /// Connection timed out
    Timeout,
    /// Failed to establish connection
    ConnectionFailed,
    /// Request failed with HTTP error
    HttpError(u16),
    /// Response parsing failed
    InvalidResponse,
}

#[derive(Debug, Serialize, Clone)]
pub enum ApiError {
    /// API authentication failed
    AuthenticationFailed,
    /// API rate limit exceeded
    RateLimitExceeded,
    /// Invalid API request parameters
    InvalidRequest(&'static str),
    /// API returned error response
    ResponseError(String),
    /// API version mismatch
    VersionMismatch,
}

#[derive(Debug, Serialize, Clone)]
pub enum EntityError {
    /// Folder with specified name not found
    FolderNotFound(String),
    /// World with specified ID not found
    WorldNotFound(String),
    /// Duplicate folder name
    DuplicateFolder(String),
    /// Duplicate world in folder
    DuplicateWorld(String),
    /// Invalid operation
    InvalidOperation(String),
    /// Invalid date format
    InvalidTimestamp(String),
}

pub enum ServiceErrors {
    /// Failed to lock mutex
    LockError,
}

impl std::error::Error for FileError {}

impl fmt::Display for FileError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            FileError::FileNotFound => write!(f, "file not found"),
            FileError::InvalidFile {
                line,
                column,
                file_name,
                error_message,
            } => {
                let line_str = line
                    .map(|l| l.to_string())
                    .unwrap_or_else(|| "unknown".to_string());
                let column_str = column
                    .map(|c| c.to_string())
                    .unwrap_or_else(|| "unknown".to_string());
                write!(
                    f,
                    "invalid format at line {}, column {} in file: {} - error: {}",
                    line_str,
                    column_str,
                    file_name.as_deref().unwrap_or("unknown"),
                    error_message
                )
            }
            FileError::DecryptionError => write!(f, "failed to decrypt file"),
            FileError::AccessDenied => write!(f, "access to file denied"),
            FileError::FileWriteError => write!(f, "failed to write file"),
        }
    }
}

impl std::error::Error for ConcurrencyError {}

impl fmt::Display for ConcurrencyError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ConcurrencyError::PoisonedLock => write!(f, "mutex lock was poisoned"),
        }
    }
}

impl std::error::Error for StateError {}

impl fmt::Display for StateError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            StateError::Inconsistent(msg) => write!(f, "state inconsistency: {}", msg),
            StateError::InvalidOperation(msg) => write!(f, "invalid operation: {}", msg),
            StateError::InitializationFailed => write!(f, "state initialization failed"),
        }
    }
}

impl std::error::Error for NetworkError {}

impl fmt::Display for NetworkError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            NetworkError::Timeout => write!(f, "network timeout"),
            NetworkError::ConnectionFailed => write!(f, "connection failed"),
            NetworkError::HttpError(code) => write!(f, "HTTP error {}", code),
            NetworkError::InvalidResponse => write!(f, "invalid response"),
        }
    }
}

impl std::error::Error for ApiError {}

impl fmt::Display for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ApiError::AuthenticationFailed => write!(f, "authentication failed"),
            ApiError::RateLimitExceeded => write!(f, "rate limit exceeded"),
            ApiError::InvalidRequest(msg) => write!(f, "invalid request: {}", msg),
            ApiError::ResponseError(msg) => write!(f, "API error: {}", msg),
            ApiError::VersionMismatch => write!(f, "API version mismatch"),
        }
    }
}

impl std::error::Error for EntityError {}

impl fmt::Display for EntityError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            EntityError::FolderNotFound(name) => write!(f, "folder not found: {}", name),
            EntityError::WorldNotFound(id) => write!(f, "world not found: {}", id),
            EntityError::DuplicateFolder(name) => write!(f, "duplicate folder: {}", name),
            EntityError::DuplicateWorld(id) => write!(f, "duplicate world: {}", id),
            EntityError::InvalidOperation(msg) => write!(f, "invalid operation: {}", msg),
            EntityError::InvalidTimestamp(ts) => write!(f, "invalid timestamp format: {}", ts),
        }
    }
}

impl std::error::Error for AppError {}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::Storage(e) => write!(f, "Storage error: {}", e),
            AppError::Concurrency(e) => write!(f, "Concurrency error: {}", e),
            AppError::State(e) => write!(f, "State error: {}", e),
            AppError::Network(e) => write!(f, "Network error: {}", e),
            AppError::Api(e) => write!(f, "API error: {}", e),
            AppError::Entity(e) => write!(f, "Entity error: {}", e),
        }
    }
}

impl From<FileError> for AppError {
    fn from(error: FileError) -> Self {
        AppError::Storage(error)
    }
}

impl From<ConcurrencyError> for AppError {
    fn from(error: ConcurrencyError) -> Self {
        AppError::Concurrency(error)
    }
}

impl From<StateError> for AppError {
    fn from(error: StateError) -> Self {
        AppError::State(error)
    }
}

impl From<NetworkError> for AppError {
    fn from(error: NetworkError) -> Self {
        AppError::Network(error)
    }
}

impl From<ApiError> for AppError {
    fn from(error: ApiError) -> Self {
        AppError::Api(error)
    }
}

impl From<EntityError> for AppError {
    fn from(error: EntityError) -> Self {
        AppError::Entity(error)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        assert_eq!(FileError::FileNotFound.to_string(), "file not found");
    }

    #[test]
    fn test_network_error_display() {
        let test_cases = vec![
            (NetworkError::Timeout, "network timeout"),
            (NetworkError::ConnectionFailed, "connection failed"),
            (NetworkError::HttpError(404), "HTTP error 404"),
            (NetworkError::InvalidResponse, "invalid response"),
        ];

        for (error, expected) in test_cases {
            assert_eq!(error.to_string(), expected);
        }
    }

    #[test]
    fn test_api_error_display() {
        assert_eq!(
            ApiError::AuthenticationFailed.to_string(),
            "authentication failed"
        );
        assert_eq!(
            ApiError::InvalidRequest("missing parameter").to_string(),
            "invalid request: missing parameter"
        );
    }

    #[test]
    fn test_error_debug_format() {
        assert!(format!("{:?}", NetworkError::Timeout).contains("Timeout"));
        assert!(format!("{:?}", ApiError::VersionMismatch).contains("VersionMismatch"));
    }
}
