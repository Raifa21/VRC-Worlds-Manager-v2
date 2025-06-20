pub mod api_commands;
pub mod data;
pub mod folder_commands;
pub mod patreons;
pub mod preferences_commands;

use tauri_specta::{collect_commands, Builder};

pub fn generate_tauri_specta_builder() -> Builder<tauri::Wry> {
    Builder::<tauri::Wry>::new().commands(collect_commands![
        folder_commands::add_world_to_folder,
        folder_commands::remove_world_from_folder,
        folder_commands::hide_world,
        folder_commands::unhide_world,
        folder_commands::get_folders,
        folder_commands::create_folder,
        folder_commands::delete_folder,
        folder_commands::move_folder,
        folder_commands::rename_folder,
        folder_commands::get_worlds,
        folder_commands::get_all_worlds,
        folder_commands::get_unclassified_worlds,
        folder_commands::get_hidden_worlds,
        folder_commands::get_tags_by_count,
        folder_commands::get_authors_by_count,
        folder_commands::delete_world,
        folder_commands::share_folder,
        folder_commands::update_folder_share,
        preferences_commands::get_theme,
        preferences_commands::get_language,
        preferences_commands::get_card_size,
        api_commands::try_login,
        api_commands::login_with_credentials,
        api_commands::login_with_2fa,
        api_commands::logout,
        api_commands::get_favorite_worlds,
        api_commands::get_world,
        api_commands::check_world_info,
        api_commands::get_recently_visited_worlds,
        api_commands::search_worlds,
        api_commands::create_world_instance,
        api_commands::get_user_groups,
        api_commands::get_permission_for_create_group_instance,
        api_commands::create_group_instance,
        patreons::fetch_patreon_data,
        data::read_data_commands::require_initial_setup,
        data::read_data_commands::check_files_loaded,
        data::read_data_commands::detect_old_installation,
        data::read_data_commands::pass_paths,
        data::read_data_commands::check_existing_data,
        data::read_data_commands::get_backup_metadata,
        data::read_data_commands::get_migration_metadata,
        data::write_data_commands::create_empty_auth,
        data::write_data_commands::create_empty_files,
        data::write_data_commands::set_preferences,
        data::write_data_commands::create_backup,
        data::write_data_commands::restore_from_backup,
        data::write_data_commands::migrate_old_data,
        data::write_data_commands::delete_data,
    ])
}
