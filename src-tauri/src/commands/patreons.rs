use reqwest::Client;
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct PatreonData {
    pub platinumSupporter: Vec<String>,
    pub goldSupporter: Vec<String>,
    pub silverSupporter: Vec<String>,
    pub bronzeSupporter: Vec<String>,
    pub basicSupporter: Vec<String>,
}

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
