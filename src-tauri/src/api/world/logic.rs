use std::sync::Arc;

use reqwest::cookie::Jar;

use crate::api::common::{get_reqwest_client, API_BASE_URL};

use super::definitions::{FavoriteWorld, FavoriteWorldParser};

pub async fn get_favorite_worlds<J: Into<Arc<Jar>>>(
    cookie: J,
) -> Result<Vec<FavoriteWorld>, String> {
    let cookie_jar: Arc<Jar> = cookie.into();
    let client = get_reqwest_client(&cookie_jar);

    let result = client
        .get(format!("{}/worlds/favorites", API_BASE_URL))
        .send()
        .await
        .expect("Failed to get favorite worlds");

    let text = result.text().await;

    if let Err(e) = text {
        return Err(format!("Failed to get favorite worlds: {}", e.to_string()));
    }

    let text = text.unwrap();

    let parsed: Vec<FavoriteWorldParser> = match serde_json::from_str(&text) {
        Ok(worlds) => worlds,
        Err(e) => {
            println!("Failed to parse favorite worlds: {}", e.to_string());
            println!("Response: {}", text);
            return Err(format!(
                "Failed to parse favorite worlds: {}",
                e.to_string()
            ));
        }
    };

    let mut favorites = Vec::new();
    for world in parsed {
        match world {
            FavoriteWorldParser::World(favorite_world) => favorites.push(favorite_world),
            FavoriteWorldParser::HiddenWorld(_) => (),
        }
    }

    Ok(favorites)
}
