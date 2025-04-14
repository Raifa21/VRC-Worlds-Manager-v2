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

    println!("Fetching groups for user: {}", user_id);

    if user_id.contains("/") {
        return Err("User ID cannot contain '/'".to_string());
    }

    let result = client
        .get(format!("{API_BASE_URL}/users/{user_id}/groups"))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    println!("API Response status: {}", result.status());

    let text = result.text().await;

    if let Err(e) = text {
        println!("Failed to read response text: {}", e);
        return Err(format!("Failed to get user groups: {}", e.to_string()));
    }

    let text = text.unwrap();
    println!("Raw API Response: {}", text);

    let parsed: Vec<UserGroup> = match serde_json::from_str::<Vec<UserGroup>>(&text) {
        Ok(groups) => {
            println!("Successfully parsed {} groups", groups.len());
            groups
        }
        Err(e) => {
            println!("Failed to parse user groups: {}", e);
            println!("Response that failed parsing: {}", text);
            return Err(format!("Failed to parse user groups: {}", e.to_string()));
        }
    };

    Ok(parsed)
}

pub async fn get_permission_for_create_group_instance(
    cookie: Arc<Jar>,
    group_id: &str,
) -> Result<GroupInstancePermissionInfo, String> {
    println!("Fetching permissions for group: {}", group_id);
    let client = get_reqwest_client(&cookie);

    let result = client
        .get(format!(
            "{API_BASE_URL}/groups/{group_id}?includeRoles=true"
        ))
        .send()
        .await
        .map_err(|e| {
            println!("Failed to send request: {}", e);
            format!("Failed to fetch group: {}", e)
        })?;

    println!("API Response status: {}", result.status());

    let text = result.text().await.map_err(|e| {
        println!("Failed to read response text: {}", e);
        format!("Failed to read response: {}", e)
    })?;

    println!("Raw API Response: {}", text);

    let details: GroupDetails = match serde_json::from_str(&text) {
        Ok(d) => d,
        Err(e) => {
            // Parse the JSON into a Value for inspection
            let parsed: serde_json::Value =
                serde_json::from_str(&text).unwrap_or_else(|_| serde_json::Value::Null);

            println!("JSON structure:");
            if let Some(obj) = parsed.as_object() {
                println!("Top level keys: {:?}", obj.keys().collect::<Vec<_>>());

                // Inspect galleries array
                if let Some(galleries) = obj.get("galleries").and_then(|g| g.as_array()) {
                    println!("\nGalleries structure:");
                    for (i, gallery) in galleries.iter().enumerate() {
                        println!(
                            "Gallery {}: Keys present: {:?}",
                            i,
                            gallery
                                .as_object()
                                .map(|o| o.keys().collect::<Vec<_>>())
                                .unwrap_or_default()
                        );
                    }
                }

                // Inspect myMember object
                if let Some(member) = obj.get("myMember") {
                    println!(
                        "\nMyMember keys: {:?}",
                        member
                            .as_object()
                            .map(|o| o.keys().collect::<Vec<_>>())
                            .unwrap_or_default()
                    );
                }
            }

            println!("\nError details:");
            println!("Location: line {}, column {}", e.line(), e.column());
            println!("Kind: {:?}", e.classify());
            println!("Full error: {}", e);

            return Err(format!(
                "Failed to parse group details: {} at line {} column {}",
                e,
                e.line(),
                e.column()
            ));
        }
    };

    println!("Successfully parsed group details");
    if let Some(my_member) = &details.my_member {
        println!("Permissions: {:?}", my_member.permissions);
    } else {
        println!("No member details available to fetch permissions.");
    }

    let permissions = if let Some(my_member) = &details.my_member {
        &my_member.permissions
    } else {
        println!("No member details available to fetch permissions.");
        return Ok(GroupInstancePermissionInfo {
            permission: GroupInstanceCreatePermission::none(),
            roles: vec![],
        });
    };

    let permission = if permissions.contains(&GroupPermission::All) {
        println!("User has wildcard (*) permission");
        GroupInstanceCreatePermission::all()
    } else {
        let normal = permissions.contains(&GroupPermission::GroupInstanceOpenCreate);
        let plus = permissions.contains(&GroupPermission::GroupInstancePlusCreate);
        let public = permissions.contains(&GroupPermission::GroupInstancePublicCreate);
        let restricted = permissions.contains(&GroupPermission::GroupInstanceRestrictedCreate);

        println!(
            "Permission check results - Normal: {}, Plus: {}, Public: {}",
            normal, plus, public
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
