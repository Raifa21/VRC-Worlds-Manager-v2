use definitions::{FolderModel, InitState, PreferenceModel, WorldModel};
use reqwest::cookie::Jar;
use services::ApiService;
use state::InitCell;
use std::sync::{Arc, RwLock};
use tauri_plugin_log::{Target, TargetKind};

mod commands;
mod definitions;
mod errors;
mod services;

static PREFERENCES: InitCell<RwLock<PreferenceModel>> = InitCell::new();
static FOLDERS: InitCell<RwLock<Vec<FolderModel>>> = InitCell::new();
static WORLDS: InitCell<RwLock<Vec<WorldModel>>> = InitCell::new();
static INITSTATE: InitCell<RwLock<InitState>> = InitCell::new();
static COOKIE_STORE: InitCell<Arc<Jar>> = InitCell::new();

/// Application entry point for all platforms
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    match services::initialize_service::initialize_app() {
        Ok((preferences, folders, worlds, cookies, init_state)) => {
            PREFERENCES.set(RwLock::new(preferences));
            FOLDERS.set(RwLock::new(folders));
            WORLDS.set(RwLock::new(worlds));
            COOKIE_STORE.set(services::ApiService::initialize_with_cookies(cookies));

            INITSTATE.set(RwLock::new(init_state));
        }
        Err(e) => {
            PREFERENCES.set(RwLock::new(PreferenceModel::new()));
            FOLDERS.set(RwLock::new(vec![]));
            WORLDS.set(RwLock::new(vec![]));
            INITSTATE.set(RwLock::new(InitState::error(false, e)));
        }
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(Target::new(TargetKind::Stdout))
                .level(log::LevelFilter::Info)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::folder_commands::get_folders,
            commands::folder_commands::create_folder,
            commands::folder_commands::delete_folder,
            commands::folder_commands::add_world_to_folder,
            commands::folder_commands::remove_world_from_folder,
            commands::folder_commands::get_worlds,
            commands::folder_commands::get_all_worlds,
            commands::folder_commands::get_unclassified_worlds,
            commands::preferences_commands::get_card_size,
            commands::api_commands::try_login,
            commands::api_commands::login_with_credentials,
            commands::api_commands::login_with_2fa,
            commands::data::read_data_commands::require_initial_setup,
            commands::data::read_data_commands::check_files_loaded,
            commands::data::read_data_commands::detect_old_installation,
            commands::data::read_data_commands::migrate_old_data,
            commands::data::read_data_commands::pass_paths,
            commands::data::write_data_commands::create_empty_auth,
            commands::data::write_data_commands::create_empty_files,
            commands::data::write_data_commands::set_preferences,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    log::info!("Application started");
}
