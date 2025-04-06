use std::sync::Arc;

use reqwest::cookie::Jar;
use serde::Deserialize;

use crate::api::common::{get_reqwest_client, API_BASE_URL};

use super::definitions::{GroupInstanceCreatePermission, UserGroup};

pub async fn get_user_groups<J: Into<Arc<Jar>>>(
    cookie: J,
    user_id: &str,
) -> Result<Vec<UserGroup>, String> {
    let cookie_jar: Arc<Jar> = cookie.into();
    let client = get_reqwest_client(&cookie_jar);

    if user_id.contains("/") {
        return Err("User ID cannot contain '/'".to_string());
    }

    let result = client
        .get(format!("{API_BASE_URL}/users/{user_id}/groups"))
        .send()
        .await
        .expect("Failed to get user groups");

    let text = result.text().await;

    if let Err(e) = text {
        return Err(format!("Failed to get user groups: {}", e.to_string()));
    }

    let text = text.unwrap();

    let parsed: Vec<UserGroup> = match serde_json::from_str(&text) {
        Ok(groups) => groups,
        Err(e) => {
            println!("Failed to parse user groups: {}", e.to_string());
            println!("Response: {text}");
            return Err(format!("Failed to parse user groups: {}", e.to_string()));
        }
    };

    Ok(parsed)
}

pub async fn get_permission_for_create_group_instance(
    cookie: Arc<Jar>,
    group_id: &str,
) -> Result<GroupInstanceCreatePermission, String> {
    let client = get_reqwest_client(&cookie);

    let result = client
        .get(format!("{API_BASE_URL}/groups/{group_id}"))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let details: GroupDetails = result.json().await.map_err(|e| e.to_string())?;
    let permissions = details.my_member.permissions;

    if permissions.iter().any(|p| p == "*") {
        return Ok(GroupInstanceCreatePermission::all());
    }

    let normal = permissions
        .iter()
        .any(|p| p == "group-instance-open-create");
    let plus = permissions
        .iter()
        .any(|p| p == "group-instance-plus-create");
    let public = permissions
        .iter()
        .any(|p| p == "group-instance-public-create");

    if normal && plus && public {
        return Ok(GroupInstanceCreatePermission::all());
    }

    if !normal && !plus && !public {
        return Ok(GroupInstanceCreatePermission::none());
    }

    return Ok(GroupInstanceCreatePermission::partial(normal, plus, public));
}

#[derive(Deserialize)]
struct GroupDetails {
    #[serde(rename = "myMember")]
    my_member: GroupMyMember,
}

#[derive(Deserialize)]
struct GroupMyMember {
    permissions: Vec<String>,
}
