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

    let parsed: Vec<FavoriteWorldParser> = match result.json().await {
        Ok(worlds) => worlds,
        Err(e) => {
            return Err(format!(
                "Failed to parse favorite worlds: {}",
                e.to_string()
            ))
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
