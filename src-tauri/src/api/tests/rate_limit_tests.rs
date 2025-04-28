use crate::api::common::{
    check_rate_limit, get_reqwest_client, handle_api_response, record_rate_limit, reset_backoff,
};
use crate::{api::RateLimitStore, RATE_LIMIT_STORE};
use chrono::Utc;
use reqwest::cookie::Jar;
use std::sync::{Arc, RwLock};
use std::time::Duration;
use tempfile::tempdir;
use tokio::time::sleep;
use wiremock::{
    matchers::{method, path},
    Mock, MockServer, ResponseTemplate,
};

// Helper function to set up a mock server
async fn setup_mock_server() -> MockServer {
    MockServer::start().await
}

// Initialize the global store for tests
fn init_rate_limit_store() {
    // Create a temporary directory for test data
    let temp_dir = tempdir().expect("Failed to create temp directory");
    let file_path = temp_dir.path().join("rate_limits_test.json");

    // Initialize the global store
    // The 'set_once' option allows us to set it multiple times during tests
    let _ = RATE_LIMIT_STORE.set(RwLock::new(RateLimitStore {
        endpoints: std::collections::HashMap::new(),
        data_path: Some(file_path),
    }));
}

#[tokio::test]
async fn test_rate_limit_detection() {
    // Initialize store before test
    init_rate_limit_store();

    // Start mock server
    let mock_server = setup_mock_server().await;

    // Set up a mock response with 429 status
    Mock::given(method("GET"))
        .and(path("/api/1/worlds/test-world"))
        .respond_with(ResponseTemplate::new(429))
        .mount(&mock_server)
        .await;

    // Create test client
    let jar = Arc::new(Jar::default());
    let client = get_reqwest_client(&jar);

    // Make a request to the mock server
    let endpoint = "test_world_api";
    let result = client
        .get(format!("{}/api/1/worlds/test-world", mock_server.uri()))
        .send()
        .await
        .expect("Request failed");

    // Handle the response
    let response = handle_api_response(result, endpoint).await;

    // Verify that it was detected as a rate limit
    assert!(response.is_err());
    let error_msg = response.unwrap_err();
    assert!(error_msg.contains("Rate limit exceeded"));

    // Record manually for subsequent tests
    record_rate_limit(endpoint);
}

#[tokio::test]
async fn test_exponential_backoff() {
    // Initialize store before test
    init_rate_limit_store();

    let endpoint = "test_exponential_backoff";

    // Record first rate limit
    let first_backoff = record_rate_limit(endpoint);
    assert_eq!(first_backoff, 600000); // First backoff should be the base value (10 minutes)

    // Record second rate limit
    let second_backoff = record_rate_limit(endpoint);
    assert_eq!(second_backoff, 1200000); // Second should be doubled (20 minutes)

    // Record third rate limit
    let third_backoff = record_rate_limit(endpoint);
    assert_eq!(third_backoff, 2400000); // Third should be doubled again (40 minutes)

    // Record fourth rate limit - should cap at 1 hour
    let fourth_backoff = record_rate_limit(endpoint);
    assert_eq!(fourth_backoff, 3600000); // Should cap at 1 hour (3600000 ms)

    // Clean up
    reset_backoff(endpoint);
}

#[tokio::test]
async fn test_check_rate_limit() {
    // Initialize store before test
    init_rate_limit_store();

    let endpoint = "test_check_rate_limit";

    // Initially, there should be no rate limit
    let result = check_rate_limit(endpoint);
    assert!(result.is_ok());

    // Record a rate limit
    record_rate_limit(endpoint);

    // Now check_rate_limit should return an error
    let result = check_rate_limit(endpoint);
    assert!(result.is_err());
    let error = result.unwrap_err();
    assert!(error.contains("Rate limit active"));
    assert!(error.contains("Please try again in"));

    // Clean up
    reset_backoff(endpoint);
}

#[tokio::test]
async fn test_full_flow() {
    // Initialize store before test
    init_rate_limit_store();

    // Start mock server
    let mock_server = setup_mock_server().await;
    let endpoint = "test_full_flow";

    // First set up a 429 response
    Mock::given(method("GET"))
        .and(path("/api/1/test"))
        .respond_with(ResponseTemplate::new(429))
        .expect(1) // We expect exactly one call
        .mount(&mock_server)
        .await;

    // Create test client
    let jar = Arc::new(Jar::default());
    let client = get_reqwest_client(&jar);

    // Helper function to make API calls with rate limit handling
    async fn make_api_call(
        client: &reqwest::Client,
        url: &str,
        endpoint: &str,
    ) -> Result<String, String> {
        // Check for rate limit first
        check_rate_limit(endpoint)?;

        // Make the request
        let response = client
            .get(url)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        // Handle response
        let response = handle_api_response(response, endpoint).await?;

        // Success
        reset_backoff(endpoint);
        Ok(response.status().to_string())
    }

    // First call should trigger rate limit
    let result = make_api_call(
        &client,
        &format!("{}/api/1/test", mock_server.uri()),
        endpoint,
    )
    .await;
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Rate limit exceeded"));

    // Record the rate limit
    record_rate_limit(endpoint);

    // Let's add a small delay to ensure any async operations complete
    sleep(Duration::from_millis(10)).await;

    // Debug the store state
    {
        let store = RATE_LIMIT_STORE.get().read().unwrap();
        let data = store.endpoints.get(endpoint);
        println!("Rate limit data before second call: {:?}", data);
    }

    // Second call should be rejected due to active rate limit
    let result = make_api_call(
        &client,
        &format!("{}/api/1/test", mock_server.uri()),
        endpoint,
    )
    .await;
    assert!(result.is_err());
    let err_msg = result.unwrap_err();
    println!("Second call error: {}", err_msg);
    assert!(err_msg.contains("Rate limit active"));

    // Manually reset the backoff to test successful call
    reset_backoff(endpoint);

    // Debug after reset
    {
        let store = RATE_LIMIT_STORE.get().read().unwrap();
        let data = store.endpoints.get(endpoint);
        println!("Rate limit data after reset: {:?}", data);

        // Verify timestamp is cleared
        if let Some(data) = data {
            assert!(
                data.last_rate_limited.is_none(),
                "last_rate_limited should be None after reset, but was {:?}",
                data.last_rate_limited
            );
        }
    }

    // ⚠️ IMPORTANT: Reset the mock server to clear previous expectations ⚠️
    mock_server.reset().await;

    // Third call should succeed - use a new mock with explicit matching
    Mock::given(method("GET"))
        .and(path("/api/1/test"))
        .respond_with(ResponseTemplate::new(200))
        .mount(&mock_server)
        .await;

    println!("Making third API call...");
    let result = make_api_call(
        &client,
        &format!("{}/api/1/test", mock_server.uri()),
        endpoint,
    )
    .await;

    // Print out the result for debugging
    println!("Third call result: {:?}", result);

    assert!(result.is_ok());
    assert_eq!(result.unwrap(), "200 OK");
}

// Add this test to verify reset_backoff works properly
#[tokio::test]
async fn test_reset_backoff() {
    // Initialize store before test
    init_rate_limit_store();

    let endpoint = "test_reset";

    // Record a rate limit
    record_rate_limit(endpoint);

    // Verify it's recorded
    {
        let store = RATE_LIMIT_STORE.get().read().unwrap();
        let data = store
            .endpoints
            .get(endpoint)
            .expect("Rate limit should be recorded");
        assert!(data.last_rate_limited.is_some(), "Timestamp should be set");
        assert!(data.consecutive_failures > 0, "Failures should be recorded");
    }

    // Reset the backoff
    reset_backoff(endpoint);

    // Verify it's fully reset
    {
        let store = RATE_LIMIT_STORE.get().read().unwrap();
        let data = store
            .endpoints
            .get(endpoint)
            .expect("Rate limit entry should still exist");
        assert!(
            data.last_rate_limited.is_none(),
            "Timestamp should be cleared"
        );
        assert_eq!(data.consecutive_failures, 0, "Failures should be reset");
    }
}
