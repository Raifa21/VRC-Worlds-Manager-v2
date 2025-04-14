use std::sync::Arc;

use reqwest::cookie::Jar;

pub const API_BASE_URL: &str = "https://api.vrchat.cloud/api/1";

const USER_AGENT: &str = "WM (formerly VRC Worlds Manager)/0.0.1 discord:raifa";

pub fn get_reqwest_client(cookies: &Arc<Jar>) -> reqwest::Client {
    reqwest::ClientBuilder::new()
        .user_agent(USER_AGENT)
        .cookie_provider(cookies.clone())
        .build()
        .expect("Failed to create reqwest client")
}
