use crate::ApiService;

#[tauri::command]
pub async fn check_auth_token() -> Result<(), String> {
    ApiService::check_auth_token().await
}

#[tauri::command]
pub async fn login_with_credentials(username: String, password: String) -> Result<(), String> {
    ApiService::login_with_credentials(username, password).await
}
