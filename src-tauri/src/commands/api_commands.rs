use crate::ApiService;
use crate::COOKIE_STORE;

#[tauri::command]
pub async fn try_login() -> Result<(), String> {
    if let Err(e) = ApiService::check_auth_token(COOKIE_STORE.get().clone()).await {
        return Err(e.to_string());
    }
    ApiService::login_with_token(COOKIE_STORE.get().clone()).await
}

#[tauri::command]
pub async fn login_with_credentials(username: String, password: String) -> Result<(), String> {
    ApiService::login_with_credentials(username, password, COOKIE_STORE.get().clone()).await
}

#[tauri::command]
pub async fn login_with_2fa(code: String, two_factor_type: String) -> Result<(), String> {
    ApiService::login_with_2fa(code, COOKIE_STORE.get().clone(), two_factor_type).await
}
