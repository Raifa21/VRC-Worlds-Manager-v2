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
struct ShareRequest<'a> {
    name: &'a str,
    worlds: &'a [WorldApiData],
    ts: String,
    hmac: String,
}

/// Compute a hex‐encoded HMAC SHA-256
fn compute_hmac(secret: &str, data: &str) -> String {
    let mut mac: Hmac<Sha256> =
        Hmac::new_from_slice(secret.as_bytes()).expect("HMAC key length valid");
    mac.update(data.as_bytes());
    hex::encode(mac.finalize().into_bytes())
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
    Ok(world_data)
}

/// Share the folder with the remote Worker
pub async fn share_folder(
    name: &str,
    folders_lock: &RwLock<Vec<FolderModel>>,
    worlds_lock: &RwLock<Vec<WorldModel>>,
) -> Result<String, String> {
    // 1) Load worlds from the specified folder
    let worlds = get_worlds(name, folders_lock, worlds_lock)
        .map_err(|e| format!("Failed to get worlds: {}", e))?;

    // 1) Load secret & endpoint from .env
    let secret = env::var("HMAC_SECRET").map_err(|_| "Missing HMAC_SECRET in .env".to_string())?;
    let api_url = "folder-sharing-worker.raifaworks.workers.dev";

    // 2) Build payload and timestamp
    let ts = Utc::now().to_rfc3339();
    let mut data = serde_json::to_value((&name, &worlds, &ts)).map_err(|e| e.to_string())?;
    // data must be `{ name, worlds, ts }`
    let data = serde_json::json!({
        "name": name,
        "worlds": worlds,
        "ts": ts
    });
    let data_str = serde_json::to_string(&data).map_err(|e| e.to_string())?;

    // 3) Compute HMAC
    let hmac = compute_hmac(&secret, &data_str);

    // 4) Send POST
    let client = Client::new();
    let req = ShareRequest {
        name,
        worlds: &worlds,
        ts: ts.clone(),
        hmac,
    };
    let res = client
        .post(format!("{}/api/share/folder", api_url))
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
    Ok(body.id)
}
