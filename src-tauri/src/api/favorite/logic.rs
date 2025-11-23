use std::sync::Arc;

use super::definitions::FavoriteWorldGroup;

use reqwest::cookie::Jar;

use crate::api::common::{
    check_rate_limit, get_reqwest_client, handle_api_response, record_rate_limit, reset_backoff,
    API_BASE_URL,
};

pub async fn get_favourite_world_groups<J: Into<Arc<Jar>>>(
    cookie: J,
) -> Result<Vec<FavoriteWorldGroup>, String> {
    const OPERATION: &str = "get_favourite_world_groups";

    check_rate_limit(OPERATION)?;

    let cookie_jar: Arc<Jar> = cookie.into();
    let client = get_reqwest_client(&cookie_jar);

    let result = client
        .get(format!("{}/favorite/groups?type=world", API_BASE_URL))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let result = match handle_api_response(result, OPERATION).await {
        Ok(response) => response,
        Err(e) => {
            log::error!("Failed to handle API response: {}", e);
            record_rate_limit(OPERATION);
            return Err(e);
        }
    };

    reset_backoff(OPERATION);

    let text = result
        .text()
        .await
        .map_err(|e| format!("Failed to get favorite world groups: {}", e.to_string()))?;

    let parsed: Vec<FavoriteWorldGroup> = match serde_json::from_str(&text) {
        Ok(groups) => groups,
        Err(e) => {
            log::error!("Failed to parse favorite world groups: {}", e.to_string());
            log::info!("Response: {}", text);
            return Err(format!(
                "Failed to parse favorite world groups: {}",
                e.to_string()
            ));
        }
    };

    Ok(parsed)
}
