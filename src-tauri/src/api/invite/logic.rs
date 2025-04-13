use super::definitions::SelfInviteResponse;
use crate::api::common::{get_reqwest_client, API_BASE_URL};
use reqwest::cookie::Jar;
use std::sync::Arc;

pub async fn invite_self_to_instance<J: Into<Arc<Jar>>>(
    cookie: J,
    world_id: &str,
    instance_id: &str,
) -> Result<SelfInviteResponse, String> {
    let cookie_jar: Arc<Jar> = cookie.into();
    let client = get_reqwest_client(&cookie_jar);

    let result = client
        .post(format!(
            "{}/invite/myself/to/{}:{}",
            API_BASE_URL, world_id, instance_id
        ))
        .send()
        .await
        .expect("Failed to send invite request");

    let text = result.text().await;

    if let Err(e) = text {
        return Err(format!("Failed to send invite request: {}", e.to_string()));
    }

    let text = text.unwrap();

    let response: SelfInviteResponse = match serde_json::from_str(&text) {
        Ok(response) => response,
        Err(e) => {
            println!("Failed to parse invite response: {}", e.to_string());
            println!("Response: {}", text);
            return Err(format!(
                "Failed to parse invite response: {}",
                e.to_string()
            ));
        }
    };

    Ok(response)
}
