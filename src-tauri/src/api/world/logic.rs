use std::sync::Arc;

use reqwest::cookie::Jar;
use serde::Deserialize;

use crate::api::common::{
    check_rate_limit, get_reqwest_client, handle_api_response, record_rate_limit, reset_backoff,
    API_BASE_URL,
};

use super::definitions::{
    FavoriteWorld, FavoriteWorldParser, VRChatWorld, WorldDetails, WorldSearchParameters,
};

pub async fn get_favorite_worlds<J: Into<Arc<Jar>>>(
    cookie: J,
) -> Result<Vec<FavoriteWorld>, String> {
    const OPERATION: &str = "get_favorite_worlds";

    let cookie_jar: Arc<Jar> = cookie.into();
    let client = get_reqwest_client(&cookie_jar);
    let mut all_favorites = Vec::new();
    let mut offset = 0;
    let n = 100; // Set page size to 100
    let mut current_page = 0;
    let max_pages = 4; // VRChat only allows max 400 favorites

    loop {
        log::info!(
            "Fetching favorite worlds page {} (offset {})",
            current_page + 1,
            offset
        );

        check_rate_limit(OPERATION)?;

        let result = client
            .get(format!("{}/worlds/favorites", API_BASE_URL))
            .query(&[("n", n), ("offset", offset)])
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
            .map_err(|e| format!("Failed to get favorite worlds: {}", e.to_string()))?;

        let parsed: Vec<FavoriteWorldParser> = match serde_json::from_str(&text) {
            Ok(worlds) => worlds,
            Err(e) => {
                log::error!("Failed to parse favorite worlds: {}", e.to_string());
                log::info!("Response: {}", text);
                return Err(format!(
                    "Failed to parse favorite worlds: {}",
                    e.to_string()
                ));
            }
        };

        // Process this page of results
        let page_size = parsed.len();
        for world in parsed {
            match world {
                FavoriteWorldParser::World(favorite_world) => all_favorites.push(favorite_world),
                FavoriteWorldParser::HiddenWorld(_) => (),
            }
        }

        // Increment for next page
        offset += n;
        current_page += 1;

        // Stop conditions
        if page_size < n {
            // Received fewer results than requested, must be the last page
            break;
        }

        // Safeguard: Stop after max_pages to avoid excessive API calls
        if current_page >= max_pages {
            log::info!("Reached maximum page limit of {} pages", max_pages);
            break;
        }
    }

    log::info!(
        "Fetched {} favorite worlds from {} pages",
        all_favorites.len(),
        current_page
    );
    Ok(all_favorites)
}

pub async fn get_recently_visited_worlds<J: Into<Arc<Jar>>>(
    cookie: J,
) -> Result<Vec<VRChatWorld>, String> {
    const OPERATION: &str = "get_recently_visited_worlds";

    // Check for rate limit
    check_rate_limit(OPERATION)?;

    let cookie_jar: Arc<Jar> = cookie.into();
    let client = get_reqwest_client(&cookie_jar);

    let result = client
        .get(format!("{}/worlds/recent", API_BASE_URL))
        .send()
        .await
        .map_err(|e| format!("Failed to get recently visited worlds: {}", e.to_string()))?;

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
        return Err(format!(
            "Failed to get recently visited worlds: {}",
            e.to_string()
        ));
    }

    let text = text.unwrap();

    let worlds: Vec<VRChatWorld> = match serde_json::from_str(&text) {
        Ok(worlds) => worlds,
        Err(e) => {
            log::error!("Failed to parse vrchat worlds: {}", e.to_string());
            log::info!("Response: {}", text);
            return Err(format!("Failed to parse vrchat worlds: {}", e.to_string()));
        }
    };

    Ok(worlds)
}

pub async fn get_world_by_id<J: Into<Arc<Jar>>, S: AsRef<str>>(
    cookie: J,
    id: S,
) -> Result<WorldDetails, String> {
    const OPERATION: &str = "get_world_by_id";

    check_rate_limit(OPERATION)?;

    let cookie_jar: Arc<Jar> = cookie.into();
    let client = get_reqwest_client(&cookie_jar);

    let result = client
        .get(format!("{}/worlds/{}", API_BASE_URL, id.as_ref()))
        .send()
        .await
        .map_err(|e| format!("Failed to get world by ID: {}", e.to_string()))?;

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
        return Err(format!("Failed to get world by ID: {}", e.to_string()));
    }

    let text = text.unwrap();

    let world: WorldDetails = match serde_json::from_str(&text) {
        Ok(world) => world,
        Err(e) => {
            log::error!("Failed to parse vrchat world: {}", e.to_string());
            log::info!("Response: {}", text);
            return Err(format!("Failed to parse vrchat world: {}", e.to_string()));
        }
    };

    Ok(world)
}

pub async fn search_worlds<J: Into<Arc<Jar>>>(
    cookie: J,
    search_parameters: &WorldSearchParameters,
) -> Result<Vec<VRChatWorld>, String> {
    const OPERATION: &str = "search_worlds";

    check_rate_limit(OPERATION)?;

    let cookie_jar: Arc<Jar> = cookie.into();
    let client = get_reqwest_client(&cookie_jar);

    let result = client
        .get(format!("{}/worlds", API_BASE_URL))
        .query(search_parameters)
        .send()
        .await
        .expect("Failed to search worlds");

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
        return Err(format!("Failed to search worlds: {}", e.to_string()));
    }

    let text = text.unwrap();

    let worlds: Vec<VRChatWorld> = match serde_json::from_str(&text) {
        Ok(worlds) => worlds,
        Err(e) => {
            log::error!("Failed to parse vrchat worlds: {}", e.to_string());
            log::info!("Response: {}", text);
            return Err(format!("Failed to parse vrchat worlds: {}", e.to_string()));
        }
    };

    Ok(worlds)
}
