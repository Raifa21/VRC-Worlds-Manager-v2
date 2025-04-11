use std::sync::Arc;

use reqwest::cookie::Jar;

use crate::api::common::{get_reqwest_client, API_BASE_URL};

use super::definitions::{CreateInstanceRequest, Instance};

pub async fn create_instance<J: Into<Arc<Jar>>>(
    cookie: J,
    request: CreateInstanceRequest,
) -> Result<Instance, String> {
    let cookie_jar: Arc<Jar> = cookie.into();
    let client = get_reqwest_client(&cookie_jar);

    let body = match serde_json::to_string(&request) {
        Ok(body) => body,
        Err(e) => {
            println!("Failed to serialize request: {}", e.to_string());
            return Err(format!("Failed to serialize request: {}", e.to_string()));
        }
    };

    println!("{body}");

    let result = client
        .post(format!("{API_BASE_URL}/instances"))
        .header("Content-Type", "application/json")
        .body(body)
        .send()
        .await
        .expect("Failed to send instance creation request");

    let text = result.text().await;

    if let Err(e) = text {
        return Err(format!("Failed to create instance: {}", e.to_string()));
    }

    let text = text.unwrap();

    let parsed: Instance = match serde_json::from_str(&text) {
        Ok(instance) => instance,
        Err(e) => {
            println!("Failed to parse instance: {}", e.to_string());
            println!("Response: {text}");
            return Err(format!("Failed to parse instance: {}", e.to_string()));
        }
    };

    Ok(parsed)
}
