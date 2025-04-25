use std::sync::Arc;

use reqwest::cookie::Jar;

use crate::api::common::{get_reqwest_client, API_BASE_URL};

use super::definitions::{
    GroupDetails, GroupInstanceCreatePermission, GroupInstancePermissionInfo, GroupPermission,
    UserGroup,
};

pub async fn get_user_groups<J: Into<Arc<Jar>>>(
    cookie: J,
    user_id: &str,
) -> Result<Vec<UserGroup>, String> {
    let cookie_jar: Arc<Jar> = cookie.into();
    let client = get_reqwest_client(&cookie_jar);

    log::info!("Fetching groups for user: {}", user_id);

    if user_id.contains("/") {
        return Err("User ID cannot contain '/'".to_string());
    }

    let result = client
        .get(format!("{API_BASE_URL}/users/{user_id}/groups"))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    log::info!("API Response status: {}", result.status());

    let text = result.text().await;

    if let Err(e) = text {
        log::info!("Failed to read response text: {}", e);
        return Err(format!("Failed to get user groups: {}", e.to_string()));
    }

    let text = text.unwrap();

    let parsed: Vec<UserGroup> = match serde_json::from_str::<Vec<UserGroup>>(&text) {
        Ok(groups) => {
            log::info!("Successfully parsed {} groups", groups.len());
            groups
        }
        Err(e) => {
            log::info!("Failed to parse user groups: {}", e);
            log::info!("Response that failed parsing: {}", text);
            return Err(format!("Failed to parse user groups: {}", e.to_string()));
        }
    };

    Ok(parsed)
}

pub async fn get_permission_for_create_group_instance(
    cookie: Arc<Jar>,
    group_id: &str,
) -> Result<GroupInstancePermissionInfo, String> {
    log::info!("Fetching permissions for group: {}", group_id);
    let client = get_reqwest_client(&cookie);

    let result = client
        .get(format!(
            "{API_BASE_URL}/groups/{group_id}?includeRoles=true"
        ))
        .send()
        .await
        .map_err(|e| {
            log::info!("Failed to send request: {}", e);
            format!("Failed to fetch group: {}", e)
        })?;

    log::info!("API Response status: {}", result.status());

    let text = result.text().await.map_err(|e| {
        log::info!("Failed to read response text: {}", e);
        format!("Failed to read response: {}", e)
    })?;

    let details: GroupDetails = match serde_json::from_str(&text) {
        Ok(d) => d,
        Err(e) => {
            // Parse the JSON into a Value for inspection
            let parsed: serde_json::Value =
                serde_json::from_str(&text).unwrap_or_else(|_| serde_json::Value::Null);
            if let Some(obj) = parsed.as_object() {
                // Inspect myMember object
                if let Some(member) = obj.get("myMember") {
                    log::info!(
                        "\nMyMember keys: {:?}",
                        member
                            .as_object()
                            .map(|o| o.keys().collect::<Vec<_>>())
                            .unwrap_or_default()
                    );
                }
            }

            return Err(format!(
                "Failed to parse group details: {} at line {} column {}",
                e,
                e.line(),
                e.column()
            ));
        }
    };

    log::info!("Successfully parsed group details");
    if let Some(my_member) = &details.my_member {
        log::info!("Permissions: {:?}", my_member.permissions);
    } else {
        log::info!("No member details available to fetch permissions.");
    }

    let permissions = if let Some(my_member) = &details.my_member {
        &my_member.permissions
    } else {
        log::info!("No member details available to fetch permissions.");
        return Ok(GroupInstancePermissionInfo {
            permission: GroupInstanceCreatePermission::none(),
            roles: vec![],
        });
    };

    let permission = if permissions.contains(&GroupPermission::All) {
        log::info!("User has wildcard (*) permission");
        GroupInstanceCreatePermission::all()
    } else {
        let normal = permissions.contains(&GroupPermission::GroupInstanceOpenCreate);
        let plus = permissions.contains(&GroupPermission::GroupInstancePlusCreate);
        let public = permissions.contains(&GroupPermission::GroupInstancePublicCreate);
        let restricted = permissions.contains(&GroupPermission::GroupInstanceRestrictedCreate);

        log::info!(
            "Permission check results - Normal: {}, Plus: {}, Public: {}, Restricted: {}",
            normal,
            plus,
            public,
            restricted
        );

        if !normal && !plus && !public && !restricted {
            GroupInstanceCreatePermission::none()
        } else {
            GroupInstanceCreatePermission::partial(normal, plus, public, restricted)
        }
    };

    let roles = details.roles;
    Ok(GroupInstancePermissionInfo { permission, roles })
}
