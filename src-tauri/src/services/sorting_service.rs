use std::cmp::Ordering;

use unicode_normalization::UnicodeNormalization;

use crate::definitions::{WorldDisplayData, WorldModel};

pub struct SortingService;

impl SortingService {
    fn normalize_for_sorting(value: &str) -> String {
        // Approximate frontend localeCompare(sensitivity: "base") by normalizing (NFKC) and lowercasing
        value.nfkc().flat_map(|c| c.to_lowercase()).collect()
    }

    fn cmp_case_insensitive(left: &str, right: &str) -> Ordering {
        let l = Self::normalize_for_sorting(left);
        let r = Self::normalize_for_sorting(right);
        l.cmp(&r)
    }

    fn apply_direction(ordering: Ordering, ascending: bool) -> Ordering {
        if ascending {
            ordering
        } else {
            ordering.reverse()
        }
    }

    fn sort_field_ordering_for_model(a: &WorldModel, b: &WorldModel, sort_field: &str) -> Ordering {
        match sort_field {
            "name" => Self::cmp_case_insensitive(&a.api_data.world_name, &b.api_data.world_name),
            "authorName" => {
                Self::cmp_case_insensitive(&a.api_data.author_name, &b.api_data.author_name)
            }
            "visits" => a
                .api_data
                .visits
                .unwrap_or(0)
                .cmp(&b.api_data.visits.unwrap_or(0)),
            "favorites" => a.api_data.favorites.cmp(&b.api_data.favorites),
            "capacity" => a.api_data.capacity.cmp(&b.api_data.capacity),
            "dateAdded" => a.user_data.date_added.cmp(&b.user_data.date_added),
            "lastUpdated" => a.api_data.last_update.cmp(&b.api_data.last_update),
            _ => Ordering::Equal,
        }
    }

    fn sort_field_ordering_for_display(
        a: &WorldDisplayData,
        b: &WorldDisplayData,
        sort_field: &str,
    ) -> Ordering {
        match sort_field {
            "name" => Self::cmp_case_insensitive(&a.name, &b.name),
            "authorName" => Self::cmp_case_insensitive(&a.author_name, &b.author_name),
            "visits" => a.visits.cmp(&b.visits),
            "favorites" => a.favorites.cmp(&b.favorites),
            "capacity" => a.capacity.cmp(&b.capacity),
            "dateAdded" => a.date_added.cmp(&b.date_added),
            "lastUpdated" => a.last_updated.cmp(&b.last_updated),
            _ => Ordering::Equal,
        }
    }

    fn apply_stable_tiebreakers_model(
        a: &WorldModel,
        b: &WorldModel,
        ordering: Ordering,
    ) -> Ordering {
        ordering
            .then_with(|| {
                Self::cmp_case_insensitive(&a.api_data.world_name, &b.api_data.world_name)
            })
            .then_with(|| a.api_data.world_id.cmp(&b.api_data.world_id))
    }

    fn apply_stable_tiebreakers_display(
        a: &WorldDisplayData,
        b: &WorldDisplayData,
        ordering: Ordering,
    ) -> Ordering {
        ordering
            .then_with(|| Self::cmp_case_insensitive(&a.name, &b.name))
            .then_with(|| a.world_id.cmp(&b.world_id))
    }

    pub fn sort_world_models(
        mut worlds: Vec<WorldModel>,
        sort_field: &str,
        sort_direction: &str,
    ) -> Vec<WorldModel> {
        let ascending = sort_direction == "asc";

        worlds.sort_by(|a, b| {
            let ordering = Self::sort_field_ordering_for_model(a, b, sort_field);
            let ordering = Self::apply_stable_tiebreakers_model(a, b, ordering);
            Self::apply_direction(ordering, ascending)
        });

        worlds
    }

    pub fn sort_world_display_data(
        mut worlds: Vec<WorldDisplayData>,
        sort_field: &str,
        sort_direction: &str,
    ) -> Vec<WorldDisplayData> {
        let ascending = sort_direction == "asc";

        worlds.sort_by(|a, b| {
            let ordering = Self::sort_field_ordering_for_display(a, b, sort_field);
            let ordering = Self::apply_stable_tiebreakers_display(a, b, ordering);
            Self::apply_direction(ordering, ascending)
        });

        worlds
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::definitions::{Platform, WorldApiData, WorldUserData};
    use chrono::{NaiveDate, NaiveDateTime, NaiveTime, Utc};

    fn create_test_world_model(
        id: &str,
        name: &str,
        author: &str,
        visits: Option<i32>,
        favorites: i32,
        capacity: i32,
        date_added_days_ago: i64,
        last_updated_days_ago: i64,
    ) -> WorldModel {
        let now = Utc::now();
        let date_added = now - chrono::Duration::days(date_added_days_ago);
        let last_update = now - chrono::Duration::days(last_updated_days_ago);

        WorldModel {
            api_data: WorldApiData {
                world_id: id.to_string(),
                world_name: name.to_string(),
                image_url: "".to_string(),
                author_name: author.to_string(),
                author_id: format!("usr_{}", author),
                capacity,
                recommended_capacity: Some(capacity),
                tags: vec![],
                publication_date: Some(last_update),
                last_update,
                description: "".to_string(),
                visits,
                favorites,
                platform: vec!["standalonewindows".to_string()],
            },
            user_data: WorldUserData {
                date_added,
                last_checked: now,
                memo: "".to_string(),
                folders: vec![],
                hidden: false,
                custom_tags: vec![],
            },
        }
    }

    fn create_test_world_display_data(
        id: &str,
        name: &str,
        author: &str,
        visits: i32,
        favorites: i32,
        capacity: i32,
        date_added: &str,
        last_updated: &str,
    ) -> WorldDisplayData {
        WorldDisplayData {
            world_id: id.to_string(),
            name: name.to_string(),
            thumbnail_url: "".to_string(),
            author_name: author.to_string(),
            favorites,
            last_updated: last_updated.to_string(),
            visits,
            date_added: date_added.to_string(),
            platform: Platform::PC,
            folders: vec![],
            tags: vec![],
            capacity,
        }
    }

    #[test]
    fn test_sort_by_name_ascending() {
        let worlds = vec![
            create_test_world_model("1", "Zebra World", "Author1", Some(100), 10, 16, 1, 1),
            create_test_world_model("2", "Alpha World", "Author2", Some(200), 20, 16, 2, 2),
            create_test_world_model("3", "Beta World", "Author3", Some(150), 15, 16, 3, 3),
        ];

        let sorted = SortingService::sort_world_models(worlds, "name", "asc");

        assert_eq!(sorted[0].api_data.world_name, "Alpha World");
        assert_eq!(sorted[1].api_data.world_name, "Beta World");
        assert_eq!(sorted[2].api_data.world_name, "Zebra World");
    }

    #[test]
    fn test_sort_by_name_descending() {
        let worlds = vec![
            create_test_world_model("1", "Alpha World", "Author1", Some(100), 10, 16, 1, 1),
            create_test_world_model("2", "Zebra World", "Author2", Some(200), 20, 16, 2, 2),
            create_test_world_model("3", "Beta World", "Author3", Some(150), 15, 16, 3, 3),
        ];

        let sorted = SortingService::sort_world_models(worlds, "name", "desc");

        assert_eq!(sorted[0].api_data.world_name, "Zebra World");
        assert_eq!(sorted[1].api_data.world_name, "Beta World");
        assert_eq!(sorted[2].api_data.world_name, "Alpha World");
    }

    #[test]
    fn test_sort_by_name_case_insensitive() {
        let worlds = vec![
            create_test_world_model("1", "zebra", "Author1", Some(100), 10, 16, 1, 1),
            create_test_world_model("2", "ALPHA", "Author2", Some(200), 20, 16, 2, 2),
            create_test_world_model("3", "Beta", "Author3", Some(150), 15, 16, 3, 3),
        ];

        let sorted = SortingService::sort_world_models(worlds, "name", "asc");

        assert_eq!(sorted[0].api_data.world_name, "ALPHA");
        assert_eq!(sorted[1].api_data.world_name, "Beta");
        assert_eq!(sorted[2].api_data.world_name, "zebra");
    }

    #[test]
    fn test_sort_by_name_locale_friendly() {
        // Includes composed and decomposed diacritics to ensure normalization aligns with frontend localeCompare(sensitivity: "base")
        let worlds = vec![
            create_test_world_model("1", "Éclair", "Author1", Some(100), 10, 16, 1, 1),
            create_test_world_model("2", "E2clair", "Author2", Some(100), 10, 16, 1, 1), // uses Latin small letter e + combining acute
            create_test_world_model("3", "eclair", "Author3", Some(100), 10, 16, 1, 1),
            create_test_world_model("4", "ÉCLAIR", "Author4", Some(100), 10, 16, 1, 1),
        ];

        let sorted = SortingService::sort_world_models(worlds, "name", "asc");

        let names: Vec<_> = sorted
            .iter()
            .map(|w| w.api_data.world_name.as_str())
            .collect();

        // All variants should group together; with identical normalized keys, stability falls back to id ordering
        assert_eq!(names, vec!["E2clair", "eclair", "Éclair", "ÉCLAIR"]);
    }

    #[test]
    fn test_sort_by_author_name() {
        let worlds = vec![
            create_test_world_model("1", "World1", "Zack", Some(100), 10, 16, 1, 1),
            create_test_world_model("2", "World2", "Alice", Some(200), 20, 16, 2, 2),
            create_test_world_model("3", "World3", "Bob", Some(150), 15, 16, 3, 3),
        ];

        let sorted = SortingService::sort_world_models(worlds, "authorName", "asc");

        assert_eq!(sorted[0].api_data.author_name, "Alice");
        assert_eq!(sorted[1].api_data.author_name, "Bob");
        assert_eq!(sorted[2].api_data.author_name, "Zack");
    }

    #[test]
    fn test_sort_by_visits_with_nulls() {
        let worlds = vec![
            create_test_world_model("1", "World1", "Author1", None, 10, 16, 1, 1),
            create_test_world_model("2", "World2", "Author2", Some(200), 20, 16, 2, 2),
            create_test_world_model("3", "World3", "Author3", Some(100), 15, 16, 3, 3),
        ];

        let sorted = SortingService::sort_world_models(worlds, "visits", "asc");

        // None should be treated as 0
        assert_eq!(sorted[0].api_data.world_id, "1"); // 0 (None)
        assert_eq!(sorted[1].api_data.world_id, "3"); // 100
        assert_eq!(sorted[2].api_data.world_id, "2"); // 200
    }

    #[test]
    fn test_sort_by_favorites_descending() {
        let worlds = vec![
            create_test_world_model("1", "World1", "Author1", Some(100), 5, 16, 1, 1),
            create_test_world_model("2", "World2", "Author2", Some(200), 20, 16, 2, 2),
            create_test_world_model("3", "World3", "Author3", Some(150), 10, 16, 3, 3),
        ];

        let sorted = SortingService::sort_world_models(worlds, "favorites", "desc");

        assert_eq!(sorted[0].api_data.favorites, 20);
        assert_eq!(sorted[1].api_data.favorites, 10);
        assert_eq!(sorted[2].api_data.favorites, 5);
    }

    #[test]
    fn test_sort_by_capacity() {
        let worlds = vec![
            create_test_world_model("1", "World1", "Author1", Some(100), 10, 32, 1, 1),
            create_test_world_model("2", "World2", "Author2", Some(200), 20, 8, 2, 2),
            create_test_world_model("3", "World3", "Author3", Some(150), 15, 16, 3, 3),
        ];

        let sorted = SortingService::sort_world_models(worlds, "capacity", "asc");

        assert_eq!(sorted[0].api_data.capacity, 8);
        assert_eq!(sorted[1].api_data.capacity, 16);
        assert_eq!(sorted[2].api_data.capacity, 32);
    }

    #[test]
    fn test_sort_by_date_added() {
        let worlds = vec![
            create_test_world_model("1", "World1", "Author1", Some(100), 10, 16, 3, 1),
            create_test_world_model("2", "World2", "Author2", Some(200), 20, 16, 1, 2),
            create_test_world_model("3", "World3", "Author3", Some(150), 15, 16, 2, 3),
        ];

        let sorted = SortingService::sort_world_models(worlds, "dateAdded", "desc");

        // Most recent first (smallest days_ago)
        assert_eq!(sorted[0].api_data.world_id, "2"); // 1 day ago
        assert_eq!(sorted[1].api_data.world_id, "3"); // 2 days ago
        assert_eq!(sorted[2].api_data.world_id, "1"); // 3 days ago
    }

    #[test]
    fn test_sort_by_last_updated() {
        let worlds = vec![
            create_test_world_model("1", "World1", "Author1", Some(100), 10, 16, 1, 5),
            create_test_world_model("2", "World2", "Author2", Some(200), 20, 16, 2, 2),
            create_test_world_model("3", "World3", "Author3", Some(150), 15, 16, 3, 10),
        ];

        let sorted = SortingService::sort_world_models(worlds, "lastUpdated", "desc");

        // Most recent first (smallest days_ago)
        assert_eq!(sorted[0].api_data.world_id, "2"); // 2 days ago
        assert_eq!(sorted[1].api_data.world_id, "1"); // 5 days ago
        assert_eq!(sorted[2].api_data.world_id, "3"); // 10 days ago
    }

    #[test]
    fn test_tiebreaker_by_name_then_id() {
        let worlds = vec![
            create_test_world_model("3", "Same World", "Author1", Some(100), 10, 16, 1, 1),
            create_test_world_model("1", "Same World", "Author1", Some(100), 10, 16, 1, 1),
            create_test_world_model("2", "Same World", "Author1", Some(100), 10, 16, 1, 1),
        ];

        let sorted = SortingService::sort_world_models(worlds, "favorites", "asc");

        // All have same favorites, should be sorted by name (all same) then ID
        assert_eq!(sorted[0].api_data.world_id, "1");
        assert_eq!(sorted[1].api_data.world_id, "2");
        assert_eq!(sorted[2].api_data.world_id, "3");
    }

    #[test]
    fn test_invalid_sort_field() {
        let worlds = vec![
            create_test_world_model("1", "World1", "Author1", Some(100), 10, 16, 1, 1),
            create_test_world_model("2", "World2", "Author2", Some(200), 20, 16, 2, 2),
        ];

        let sorted = SortingService::sort_world_models(worlds.clone(), "invalidField", "asc");

        // Should maintain stable order with tiebreakers (name then id)
        assert_eq!(sorted[0].api_data.world_id, "1");
        assert_eq!(sorted[1].api_data.world_id, "2");
    }

    #[test]
    fn test_sort_world_display_data_by_name() {
        let worlds = vec![
            create_test_world_display_data(
                "1",
                "Zebra",
                "Author1",
                100,
                10,
                16,
                "2024-01-01T00:00:00.000Z",
                "2024-01-01",
            ),
            create_test_world_display_data(
                "2",
                "Alpha",
                "Author2",
                200,
                20,
                16,
                "2024-01-02T00:00:00.000Z",
                "2024-01-02",
            ),
            create_test_world_display_data(
                "3",
                "Beta",
                "Author3",
                150,
                15,
                16,
                "2024-01-03T00:00:00.000Z",
                "2024-01-03",
            ),
        ];

        let sorted = SortingService::sort_world_display_data(worlds, "name", "asc");

        assert_eq!(sorted[0].name, "Alpha");
        assert_eq!(sorted[1].name, "Beta");
        assert_eq!(sorted[2].name, "Zebra");
    }

    #[test]
    fn test_sort_world_display_data_by_visits() {
        let worlds = vec![
            create_test_world_display_data(
                "1",
                "World1",
                "Author1",
                300,
                10,
                16,
                "2024-01-01T00:00:00.000Z",
                "2024-01-01",
            ),
            create_test_world_display_data(
                "2",
                "World2",
                "Author2",
                100,
                20,
                16,
                "2024-01-02T00:00:00.000Z",
                "2024-01-02",
            ),
            create_test_world_display_data(
                "3",
                "World3",
                "Author3",
                200,
                15,
                16,
                "2024-01-03T00:00:00.000Z",
                "2024-01-03",
            ),
        ];

        let sorted = SortingService::sort_world_display_data(worlds, "visits", "asc");

        assert_eq!(sorted[0].visits, 100);
        assert_eq!(sorted[1].visits, 200);
        assert_eq!(sorted[2].visits, 300);
    }

    #[test]
    fn test_sort_world_display_data_descending() {
        let worlds = vec![
            create_test_world_display_data(
                "1",
                "World1",
                "Author1",
                100,
                5,
                16,
                "2024-01-01T00:00:00.000Z",
                "2024-01-01",
            ),
            create_test_world_display_data(
                "2",
                "World2",
                "Author2",
                200,
                20,
                16,
                "2024-01-02T00:00:00.000Z",
                "2024-01-02",
            ),
            create_test_world_display_data(
                "3",
                "World3",
                "Author3",
                150,
                10,
                16,
                "2024-01-03T00:00:00.000Z",
                "2024-01-03",
            ),
        ];

        let sorted = SortingService::sort_world_display_data(worlds, "favorites", "desc");

        assert_eq!(sorted[0].favorites, 20);
        assert_eq!(sorted[1].favorites, 10);
        assert_eq!(sorted[2].favorites, 5);
    }

    #[test]
    fn test_empty_list() {
        let worlds: Vec<WorldModel> = vec![];
        let sorted = SortingService::sort_world_models(worlds, "name", "asc");
        assert_eq!(sorted.len(), 0);
    }

    #[test]
    fn test_single_item() {
        let worlds = vec![create_test_world_model(
            "1",
            "Only World",
            "Author1",
            Some(100),
            10,
            16,
            1,
            1,
        )];

        let sorted = SortingService::sort_world_models(worlds, "name", "asc");

        assert_eq!(sorted.len(), 1);
        assert_eq!(sorted[0].api_data.world_name, "Only World");
    }
}
