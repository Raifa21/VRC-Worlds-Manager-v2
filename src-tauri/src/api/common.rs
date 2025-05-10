use chrono::Utc;
use reqwest::{cookie::Jar, Response, StatusCode};
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use tokio::time::{sleep, Duration};

use crate::api::RateLimitStore;
use crate::RATE_LIMIT_STORE;

pub const API_BASE_URL: &str = "https://api.vrchat.cloud/api/1";

const USER_AGENT: &str = "VRC Worlds Manager (tauri)/0.1.12 discord:raifa";

pub fn get_reqwest_client(cookies: &Arc<Jar>) -> reqwest::Client {
    reqwest::ClientBuilder::new()
        .user_agent(USER_AGENT)
        .cookie_provider(cookies.clone())
        .build()
        .expect("Failed to create reqwest client")
}

/// Helper to handle response status and extract rate limit information
pub async fn handle_api_response(response: Response, operation: &str) -> Result<Response, String> {
    let status = response.status();

    // Check for rate limit
    if status == StatusCode::TOO_MANY_REQUESTS {
        return Err(format!("Rate limit exceeded for {}", operation));
    }

    // Pass through other responses
    Ok(response)
}

/// Record a rate limit for an endpoint and calculate backoff
pub fn record_rate_limit(endpoint: &str) -> u64 {
    let mut store = RATE_LIMIT_STORE.get().write().unwrap();
    let temp;
    {
        let data = store.endpoints.entry(endpoint.to_string()).or_default();

        data.last_rate_limited = Some(Utc::now());
        data.consecutive_failures += 1;

        // Calculate new backoff with exponential increase
        let base_backoff = 600000; // 10 minutes in milliseconds
        let max_backoff = 3600000; // Max 1 hour

        // Use equal jitter algorithm for exponential backoff
        let backoff = if data.consecutive_failures > 0 {
            base_backoff * (2u64.pow((data.consecutive_failures - 1) as u32))
        } else {
            base_backoff
        };

        data.current_backoff_ms = backoff.min(max_backoff);
        temp = apply_jitter(data.current_backoff_ms);
        log::warn!(
            "Rate limit recorded for {}: {} consecutive failures, backoff: {}ms",
            endpoint,
            data.consecutive_failures,
            temp
        );
    }

    // Save to disk
    store.save();

    temp
}

/// Check if we should wait before making a request
pub fn should_backoff(endpoint: &str) -> Option<u64> {
    let store = RATE_LIMIT_STORE.get().read().unwrap();

    if let Some(data) = store.endpoints.get(endpoint) {
        if let Some(last_limited) = data.last_rate_limited {
            let elapsed = (Utc::now() - last_limited).num_milliseconds() as u64;

            // If we're still in the backoff period
            if elapsed < data.current_backoff_ms {
                let remaining = data.current_backoff_ms - elapsed;
                return Some(remaining);
            }
        }
    }

    None
}

/// Reset the backoff for an endpoint after successful request
pub fn reset_backoff(endpoint: &str) {
    let mut store = RATE_LIMIT_STORE.get().write().unwrap();

    if let Some(data) = store.endpoints.get_mut(endpoint) {
        // Only reset if we had failures
        if data.consecutive_failures > 0 {
            data.consecutive_failures = 0;
            data.current_backoff_ms = 600000; // Reset to base
            data.last_rate_limited = None; // Clear last rate limited time
            store.save();
            log::info!("Reset rate limit backoff for {}", endpoint);
        }
    }
}

/// Check if an endpoint is rate limited and return a formatted error if it is
pub fn check_rate_limit(endpoint: &str) -> Result<(), String> {
    if let Some(backoff_ms) = should_backoff(endpoint) {
        let seconds = (backoff_ms / 1000) + 1; // Round up to nearest second
        return Err(format!(
            "Rate limit active for {}. Please try again in {} seconds.",
            endpoint, seconds
        ));
    }
    Ok(())
}

pub fn apply_jitter(backoff_ms: u64) -> u64 {
    use rand::Rng;

    // Equal jitter algorithm:
    // - Take half the backoff as a constant delay
    // - Add a random amount between 0 and half the original backoff
    // This reduces average wait time while still preventing retry storms

    let half_backoff = backoff_ms / 2;
    let jitter = rand::thread_rng().gen_range(0..=half_backoff);

    half_backoff + jitter
}
