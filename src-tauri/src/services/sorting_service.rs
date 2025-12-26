use std::cmp::Ordering;

use crate::definitions::{WorldDisplayData, WorldModel};

pub struct SortingService;

impl SortingService {
    fn cmp_case_insensitive(left: &str, right: &str) -> Ordering {
        // Mirrors frontend locale-insensitive compare used in list view sorting
        left.to_lowercase().cmp(&right.to_lowercase())
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
