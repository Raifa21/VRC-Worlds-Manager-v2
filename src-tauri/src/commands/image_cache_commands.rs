use crate::services::image_cache::{clear_unused_images, get_cached_image_path};
use crate::WORLDS;
use log::info;

/// Get the cached image path for a given URL.
/// If the image is not cached, it will be downloaded, processed, and cached.
#[tauri::command]
#[specta::specta]
pub async fn get_image_cache_path(url: String) -> Result<String, String> {
    info!("Getting cached image path for URL: {}", url);
    get_cached_image_path(url).await
}

/// Clear all unused cached images.
/// This removes all cached images that are not referenced by any world in the database.
#[tauri::command]
#[specta::specta]
pub async fn clear_unused_cached_images() -> Result<usize, String> {
    info!("Clearing unused cached images");

    // Extract all thumbnail URLs in a separate scope to avoid holding the lock
    let thumbnail_urls: Vec<String> = {
        let worlds = WORLDS
            .get()
            .read()
            .map_err(|e| format!("Failed to read worlds: {}", e))?;

        worlds
            .iter()
            .map(|world| world.api_data.image_url.clone())
            .collect()
    };

    // Clear unused images
    clear_unused_images(thumbnail_urls).await
}
