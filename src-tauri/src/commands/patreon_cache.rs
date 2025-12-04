use crate::definitions::PatreonVRChatNames;
use reqwest::Client;
use std::sync::RwLock;
use std::time::{Duration, SystemTime};

pub struct PatreonCache {
    data: Option<PatreonVRChatNames>,
    last_fetched: Option<SystemTime>,
    cache_duration: Duration,
}

impl PatreonCache {
    pub fn new() -> Self {
        Self {
            data: None,
            last_fetched: None,
            cache_duration: Duration::from_secs(24 * 60 * 60), // 24 hours
        }
    }

    pub fn is_expired(&self) -> bool {
        match self.last_fetched {
            None => true,
            Some(last_fetched) => SystemTime::now()
                .duration_since(last_fetched)
                .map(|elapsed| elapsed >= self.cache_duration)
                .unwrap_or(true),
        }
    }

    pub fn get_cached_data(&self) -> Option<&PatreonVRChatNames> {
        if !self.is_expired() {
            self.data.as_ref()
        } else {
            None
        }
    }

    pub fn update_cache(&mut self, data: PatreonVRChatNames) {
        self.data = Some(data);
        self.last_fetched = Some(SystemTime::now());
    }
}

static PATREON_CACHE: state::InitCell<RwLock<PatreonCache>> = state::InitCell::new();

pub fn init_cache() {
    PATREON_CACHE.set(RwLock::new(PatreonCache::new()));
}

#[tauri::command]
#[specta::specta]
pub async fn fetch_patreon_vrchat_names() -> Result<PatreonVRChatNames, String> {
    // Try to get cached data first
    {
        let cache = PATREON_CACHE
            .get()
            .read()
            .map_err(|e| format!("Failed to acquire cache read lock: {}", e))?;

        if let Some(cached_data) = cache.get_cached_data() {
            log::info!("Returning cached Patreon VRChat names");
            return Ok((*cached_data).clone());
        }
    }

    // Cache is expired or empty, fetch fresh data
    log::info!("Fetching fresh Patreon VRChat names from server");
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

    // Update cache
    {
        let mut cache = PATREON_CACHE
            .get()
            .write()
            .map_err(|e| format!("Failed to acquire cache write lock: {}", e))?;

        cache.update_cache(data.clone());
    }

    Ok(data)
}
