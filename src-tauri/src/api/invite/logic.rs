use super::definitions::SelfInviteResponse;
use crate::api::common::{
    check_rate_limit, get_reqwest_client, handle_api_response, record_rate_limit, reset_backoff,
    API_BASE_URL,
};
use reqwest::cookie::Jar;
use std::sync::Arc;

pub async fn invite_self_to_instance<J: Into<Arc<Jar>>>(
    cookie: J,
    world_id: &str,
    instance_id: &str,
) -> Result<SelfInviteResponse, String> {
    const OPERATION: &str = "invite_self_to_instance";

    check_rate_limit(OPERATION)?;

    let cookie_jar: Arc<Jar> = cookie.into();
    let client = get_reqwest_client(&cookie_jar);

    let result = client
        .post(format!(
            "{}/invite/myself/to/{}:{}",
            API_BASE_URL, world_id, instance_id
        ))
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

    let text = result.text().await;

    if let Err(e) = text {
        return Err(format!("Failed to send invite request: {}", e.to_string()));
    }

    let text = text.unwrap();

    let response: SelfInviteResponse = match serde_json::from_str(&text) {
        Ok(response) => response,
        Err(e) => {
            log::info!("Failed to parse invite response: {}", e.to_string());
            log::info!("Response: {}", text);
            return Err(format!(
                "Failed to parse invite response: {}",
                e.to_string()
            ));
        }
    };

    Ok(response)
}
