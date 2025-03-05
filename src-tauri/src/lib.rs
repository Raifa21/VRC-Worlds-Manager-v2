use std::sync::Arc;
use tauri_plugin_log::{Target, TargetKind};

mod commands;
mod definitions;
mod services;
mod state;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = match state::AppState::initialize() {
        Ok(state) => Arc::new(state),
        Err(e) => {
            eprintln!("Failed to initialize app state: {}", e);
            Arc::new(state::AppState::new())
        }
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().target(tauri_plugin_log::Target::new(
            tauri_plugin_log::TargetKind::Stdout,
                ))
                .build())
        .manage(state)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
