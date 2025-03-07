use std::sync::Arc;
use tauri_plugin_log::{Target, TargetKind};

mod commands;
mod definitions;
mod errors;
mod services;
mod state;
mod utils;

/// Application entry point for all platforms
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize application state with folder/world data, with error handling
    let state = Arc::new(state::app_state::AppState::initialize());

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(Target::new(TargetKind::Stdout))
                .level(log::LevelFilter::Info)
                .build(),
        )
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            commands::folder_commands::get_folders,
            commands::folder_commands::create_folder,
            commands::data::read_data_commands::initialize_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
