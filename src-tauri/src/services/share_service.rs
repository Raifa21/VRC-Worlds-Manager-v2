use crate::definitions::{FolderModel, WorldApiData, WorldModel};
use chrono::Utc;
use hex;
use hmac::{Hmac, Mac};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::env;
use std::sync::RwLock;

/// The shape of the share response
#[derive(Deserialize)]
pub struct ShareResponse {
    pub id: String,
}

/// The shape of our POST payload (concrete WorldApiData)
#[derive(Serialize)]
struct ShareRequestPayload<'a> {
    name: &'a str,
    worlds: &'a [WorldApiData],
    ts: String,
    hmac: String,
}

/// Shape of return data from the GET request
#[derive(Deserialize, Serialize, Debug)]
pub struct ShareRequest {
    pub name: String,
    pub worlds: Vec<WorldApiData>,
    pub ts: String,
    pub hmac: String,
}

/// The shape of the signing payload
#[derive(Serialize)]
struct SigningPayload<'a> {
    name: &'a str,
    worlds: &'a [WorldApiData],
}

const HMAC_KEY: Option<&str> = option_env!("HMAC_KEY");

/// Compute a hex‐encoded HMAC SHA-256
fn compute_hmac(data: &str) -> Result<String, String> {
    let key = HMAC_KEY
        .ok_or_else(|| "HMAC_KEY environment variable not set at compile time".to_string())?;

    let mut mac = Hmac::<Sha256>::new_from_slice(key.as_bytes())
        .map_err(|e| format!("Failed to create HMAC: {}", e))?;
    mac.update(data.as_bytes());
    let result = mac.finalize();
    let code_bytes = result.into_bytes();
    let sig = hex::encode(code_bytes);
    Ok(sig)
}

fn get_worlds(
    name: &str,
    folders_lock: &RwLock<Vec<FolderModel>>,
    worlds_lock: &RwLock<Vec<WorldModel>>,
) -> Result<Vec<WorldApiData>, String> {
    let folders = folders_lock
        .read()
        .map_err(|_| "Failed to read folders".to_string())?;
    let worlds = worlds_lock
        .read()
        .map_err(|_| "Failed to read worlds".to_string())?;

    let mut world_data = Vec::new();
    for folder in folders.iter() {
        if folder.folder_name == name {
            for world_id in &folder.world_ids {
                if let Some(world) = worlds.iter().find(|w| w.api_data.world_id == *world_id) {
                    world_data.push(world.api_data.clone());
                }
            }
        }
    }

    // Truncate bulky fields before returning
    fn trunc(s: &str) -> String {
        s.chars().take(50).collect()
    }
    let truncated: Vec<WorldApiData> = world_data
        .into_iter()
        .map(|mut w| {
            // name & author_name ≤ 50 chars
            w.world_name = trunc(&w.world_name);
            w.author_name = trunc(&w.author_name);
            // description ≤ 50 chars
            w.description = trunc(&w.description);
            // each tag ≤ 50 chars
            w.tags = w.tags.into_iter().map(|t| trunc(&t)).collect();
            w
        })
        .collect();
    Ok(truncated)
}

// returns id and the ts for setting the expires_at field
async fn post_folder(name: &str, worlds: &[WorldApiData]) -> Result<(String, String), String> {
    let api_url = "https://folder-sharing-worker.raifaworks.workers.dev";

    let ts: String = Utc::now().to_rfc3339();
    let signing = SigningPayload { name, worlds };
    let data_str = serde_json::to_string(&signing).map_err(|e| e.to_string())?;

    let hmac = compute_hmac(&data_str).map_err(|e| format!("Failed to compute HMAC: {}", e))?;

    let client = Client::new();
    let full_url = format!("{}/api/share/folder", api_url);

    let req = ShareRequestPayload {
        name,
        worlds,
        ts: ts.clone(),
        hmac,
    };
    let res = client
        .post(&full_url)
        .json(&req)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status();
    if !status.is_success() {
        let txt = res.text().await.unwrap_or_default();
        return Err(format!("Share failed: {} – {}", status, txt));
    }

    let body: ShareResponse = res.json().await.map_err(|e| e.to_string())?;
    Ok((body.id, ts))
}

/// Share the folder with the remote Worker
pub async fn share_folder(
    name: &str,
    folders_lock: &RwLock<Vec<FolderModel>>,
    worlds_lock: &RwLock<Vec<WorldModel>>,
) -> Result<(String, String), String> {
    // 1) Load worlds from the specified folder
    let worlds = get_worlds(name, folders_lock, worlds_lock)
        .map_err(|e| format!("Failed to get worlds: {}", e))?;

    if worlds.is_empty() {
        return Err("No worlds found in the specified folder".to_string());
    }

    // 2) Post the folder
    post_folder(name, &worlds)
        .await
        .map_err(|e| format!("Failed to post folder: {}", e))
}

pub async fn download_folder(share_id: &str) -> Result<(String, Vec<WorldApiData>), String> {
    let api_url = "https://folder-sharing-worker.raifaworks.workers.dev";
    let full_url = format!("{}/api/share/folder/{}", api_url, share_id);

    let client = Client::new();
    let res = client
        .get(&full_url)
        .send()
        .await
        .map_err(|e| format!("Failed to download folder: {}", e))?;

    let status = res.status();
    if !status.is_success() {
        let txt = res.text().await.unwrap_or_default();
        return Err(format!("Download failed: {} – {}", status, txt));
    }

    let folder: ShareRequest = res.json().await.map_err(|e| e.to_string())?;
    // Validate the HMAC
    let signing = SigningPayload {
        name: &folder.name,
        worlds: &folder.worlds,
    };
    let data_str = serde_json::to_string(&signing).map_err(|e| e.to_string())?;
    let expected_hmac =
        compute_hmac(&data_str).map_err(|e| format!("Failed to compute HMAC: {}", e))?;
    if expected_hmac != folder.hmac {
        return Err(format!(
            "HMAC mismatch: expected {}, got {}",
            expected_hmac, folder.hmac
        ));
    }

    // Return the folder name and worlds
    Ok((folder.name, folder.worlds))
}

// === TESTS ===
#[cfg(test)]
mod integration_tests {
    use super::post_folder;
    use crate::definitions::{Platform, WorldApiData};
    use serde_json::Value;
    use std::env;
    use std::fs;

    /// Build a minimal WorldApiData for testing
    fn dummy_world() -> WorldApiData {
        WorldApiData {
            image_url: "https://api.vrchat.cloud/api/1/file/file_4e4683f3-2717-4a31-9aab-37f78ec68426/3/file".into(),
            world_name: "Starfarer".into(),
            world_id: "wrld_e9ca960a-7b7b-4b2d-8133-5fe3d074512e".into(),
            author_name: "Waai!".into(),
            author_id: "usr_f7d7b225-fbb5-4752-a8cb-364f0b6fcd53".into(),
            capacity: 80,
            recommended_capacity: Some(30),
            tags: vec![
                "author_tag_udon".into(),
                "author_tag_train".into(),
                "author_tag_cute".into(),
                "author_tag_chill".into(),
                "system_approved".into(),
            ],
            publication_date: None,
            last_update: "2024-03-02T07:10:51.693Z".parse().unwrap(),
            description: "A train headed for the center of the cosmos‚ where wishes are granted․ All music in world is stream-safe․".into(),
            visits: Some(590502),
            favorites: 31292,
            platform: vec![Platform::StandaloneWindows, Platform::Android],
        }
    }

    #[tokio::test]
    #[ignore = "requires HMAC_KEY + running Worker at SHARE_API_URL"]
    async fn integration_post_and_get_folder() {
        // ensure HMAC secret is set
        let _ = env::var("HMAC_KEY").expect("export HMAC_KEY for integration test");

        // 1) POST the folder
        let worlds = vec![dummy_world()];
        let folder_name = "IntegrationTestFolder";
        let (id, _ts) = post_folder(folder_name, &worlds)
            .await
            .expect("post_folder failed");
        assert!(!id.is_empty(), "received empty share ID");
    }

    #[tokio::test]
    #[ignore = "requires HMAC_KEY + running Worker at SHARE_API_URL"]
    async fn integration_no_worlds_error() {
        let _ = env::var("HMAC_KEY").expect("export HMAC_KEY for integration test");
        // posting with empty worlds should error early
        let err = post_folder("EmptyFolder", &[])
            .await
            .expect_err("expected error for no worlds");
        assert!(err.contains("Failed to post folder"), "got: {}", err);
    }
}
