use std::sync::Arc;

use reqwest::cookie::Jar;

use crate::api::{
    common::{
        check_rate_limit, get_reqwest_client, handle_api_response, record_rate_limit,
        reset_backoff, API_BASE_URL,
    },
    instance::definitions::GetInstanceShortNameResponse,
    world,
};

use super::definitions::{CreateInstanceRequest, Instance};

pub async fn create_instance<J: Into<Arc<Jar>>>(
    cookie: J,
    request: CreateInstanceRequest,
) -> Result<Instance, String> {
    const OPERATION: &str = "create_instance";

    check_rate_limit(OPERATION)?;

    let cookie_jar: Arc<Jar> = cookie.into();
    let client = get_reqwest_client(&cookie_jar);

    let body = match serde_json::to_string(&request) {
        Ok(body) => body,
        Err(e) => {
            log::info!("Failed to serialize request: {}", e.to_string());
            return Err(format!("Failed to serialize request: {}", e.to_string()));
        }
    };

    let result = client
        .post(format!("{API_BASE_URL}/instances"))
        .header("Content-Type", "application/json")
        .body(body)
        .send()
        .await
        .map_err(|e| format!("Failed to send create instance request: {}", e))?;

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
        .map_err(|e| format!("Failed to create instance: {}", e.to_string()))?;
    let parsed: Instance = match serde_json::from_str(&text) {
        Ok(instance) => instance,
        Err(e) => {
            log::info!("Failed to parse instance: {}", e.to_string());
            log::info!("Response: {text}");
            return Err(format!("Failed to parse instance: {}", e.to_string()));
        }
    };

    Ok(parsed)
}

pub async fn get_instance_short_name<J: Into<Arc<Jar>>>(
    cookie: J,
    world_id: &str,
    instance_id: &str,
) -> Result<String, String> {
    const OPERATION: &str = "get_instance_short_name";

    check_rate_limit(OPERATION)?;

    let cookie_jar: Arc<Jar> = cookie.into();
    let client = get_reqwest_client(&cookie_jar);

    let url = format!("{API_BASE_URL}/instances/{world_id}:{instance_id}/shortName");
    let result = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to send get instance short name request: {}", e))?;

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
        .map_err(|e| format!("Failed to get instance short name: {}", e.to_string()))?;
    let parsed: GetInstanceShortNameResponse = match serde_json::from_str(&text) {
        Ok(response) => response,
        Err(e) => {
            log::info!(
                "Failed to parse get instance short name response: {}",
                e.to_string()
            );
            log::info!("Response: {text}");
            return Err(format!(
                "Failed to parse get instance short name response: {}",
                e.to_string()
            ));
        }
    };

    // if short name is None, return the secure name
    if parsed.short_name.is_none() {
        Ok(parsed.secure_name)
    } else {
        Ok(parsed.short_name.unwrap())
    }
}
