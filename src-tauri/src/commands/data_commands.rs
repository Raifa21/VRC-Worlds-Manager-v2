use reqwest::Client;

use crate::definitions::{PatreonData, PatreonVRChatNames, WorldBlacklist};

#[tauri::command]
#[specta::specta]
pub async fn fetch_patreon_data() -> Result<PatreonData, String> {
    let client = Client::new();
    let response = client
        .get("https://data.raifaworks.com/data/patreons.json")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let data = response
        .json::<PatreonData>()
        .await
        .map_err(|e| e.to_string())?;

    Ok(data)
}

#[tauri::command]
#[specta::specta]
pub async fn fetch_patreon_vrchat_names() -> Result<PatreonVRChatNames, String> {
    let client = Client::new();
    let response = client
        .get("https://data.raifaworks.com/data/patreons-vrchat-usernames.json")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let data = response
        .json::<PatreonVRChatNames>()
        .await
        .map_err(|e| e.to_string())?;

    Ok(data)
}

#[tauri::command]
#[specta::specta]
pub async fn fetch_blacklist() -> Result<WorldBlacklist, String> {
    let client = Client::new();
    let response = client
        .get("https://data.raifaworks.com/data/blacklist.json")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let blacklist = response
        .json::<WorldBlacklist>()
        .await
        .map_err(|e| e.to_string())?;

    Ok(blacklist)
}
