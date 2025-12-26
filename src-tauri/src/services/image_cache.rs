use image::{imageops::FilterType, GenericImageView, ImageFormat};
use log::{error, info};
use reqwest;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};

const MAX_IMAGE_SIZE: u32 = 1024;

/// Get the image cache directory path
pub fn get_image_cache_dir() -> Result<PathBuf, String> {
    let app_data_dir =
        directories::ProjectDirs::from("com", "vrcworldsmanager", "VRCWorldsManager")
            .ok_or("Failed to get app data directory")?;
    let cache_dir = app_data_dir.data_dir().join("images");

    if !cache_dir.exists() {
        fs::create_dir_all(&cache_dir)
            .map_err(|e| format!("Failed to create cache directory: {}", e))?;
    }

    Ok(cache_dir)
}

/// Generate a cache key (filename) from an image URL
fn generate_cache_key(url: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(url.as_bytes());
    let result = hasher.finalize();
    format!("{:x}.jpg", result)
}

/// Get the cached image path if it exists, otherwise download and cache it
pub async fn get_cached_image_path(url: String) -> Result<String, String> {
    let cache_dir = get_image_cache_dir()?;
    let cache_key = generate_cache_key(&url);
    let cache_path = cache_dir.join(&cache_key);

    // Check if the image is already cached
    if cache_path.exists() {
        info!("Image found in cache: {}", cache_key);
        return cache_path
            .to_str()
            .ok_or("Failed to convert path to string".to_string())
            .map(|s| s.to_string());
    }

    // Download the image
    info!("Downloading image from: {}", url);
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to download image: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Failed to download image: HTTP {}",
            response.status()
        ));
    }

    let image_bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read image bytes: {}", e))?;

    // Load and process the image
    let img = image::load_from_memory(&image_bytes)
        .map_err(|e| format!("Failed to load image: {}", e))?;

    let (width, height) = img.dimensions();
    let processed_img = if width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE {
        info!(
            "Resizing image from {}x{} to fit within {}x{}",
            width, height, MAX_IMAGE_SIZE, MAX_IMAGE_SIZE
        );
        // Scale down maintaining aspect ratio
        img.resize(MAX_IMAGE_SIZE, MAX_IMAGE_SIZE, FilterType::Lanczos3)
    } else {
        img
    };

    // Save the processed image
    processed_img
        .save_with_format(&cache_path, ImageFormat::Jpeg)
        .map_err(|e| format!("Failed to save image: {}", e))?;

    info!("Image cached successfully: {}", cache_key);

    cache_path
        .to_str()
        .ok_or("Failed to convert path to string".to_string())
        .map(|s| s.to_string())
}

/// Clear all unused cached images (images not referenced by any world in the database)
pub async fn clear_unused_images(referenced_urls: Vec<String>) -> Result<usize, String> {
    let cache_dir = get_image_cache_dir()?;

    // Generate cache keys for all referenced URLs
    let referenced_keys: std::collections::HashSet<String> = referenced_urls
        .iter()
        .map(|url| generate_cache_key(url))
        .collect();

    let mut removed_count = 0;

    // Iterate through all files in cache directory
    let entries =
        fs::read_dir(&cache_dir).map_err(|e| format!("Failed to read cache directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();

        if path.is_file() {
            if let Some(filename) = path.file_name().and_then(|n| n.to_str()) {
                if !referenced_keys.contains(filename) {
                    match fs::remove_file(&path) {
                        Ok(_) => {
                            info!("Removed unused cached image: {}", filename);
                            removed_count += 1;
                        }
                        Err(e) => {
                            error!("Failed to remove cached image {}: {}", filename, e);
                        }
                    }
                }
            }
        }
    }

    info!("Removed {} unused cached images", removed_count);
    Ok(removed_count)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_cache_key() {
        let url1 = "https://example.com/image1.jpg";
        let url2 = "https://example.com/image2.jpg";

        let key1 = generate_cache_key(url1);
        let key2 = generate_cache_key(url2);

        // Keys should be different for different URLs
        assert_ne!(key1, key2);

        // Same URL should generate same key
        assert_eq!(generate_cache_key(url1), key1);
    }
}
