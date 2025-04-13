use api::auth::VRChatAPIClientAuthenticator;
use commands::generate_tauri_specta_builder;
use definitions::{FolderModel, InitState, PreferenceModel, WorldModel};
use reqwest::cookie::Jar;
use services::ApiService;
use specta_typescript::{BigIntExportBehavior, Typescript};
use state::InitCell;
use std::sync::RwLock;
use tauri_plugin_log::{Target, TargetKind};

mod api;
mod commands;
mod definitions;
mod errors;
mod services;

static PREFERENCES: InitCell<RwLock<PreferenceModel>> = InitCell::new();
static FOLDERS: InitCell<RwLock<Vec<FolderModel>>> = InitCell::new();
static WORLDS: InitCell<RwLock<Vec<WorldModel>>> = InitCell::new();
static INITSTATE: InitCell<RwLock<InitState>> = InitCell::new();
static AUTHENTICATOR: InitCell<tokio::sync::RwLock<VRChatAPIClientAuthenticator>> = InitCell::new();

/// Application entry point for all platforms
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub async fn run() {
    match services::initialize_service::initialize_app() {
        Ok((preferences, folders, worlds, cookies, init_state)) => {
            PREFERENCES.set(RwLock::new(preferences));
            FOLDERS.set(RwLock::new(folders));
            WORLDS.set(RwLock::new(worlds));
            INITSTATE.set(RwLock::new(init_state));
            let cookie_store = ApiService::initialize_with_cookies(cookies.clone());
            AUTHENTICATOR.set(tokio::sync::RwLock::new(
                VRChatAPIClientAuthenticator::from_cookie_store(cookie_store),
            ));
        }
        Err(e) => {
            PREFERENCES.set(RwLock::new(PreferenceModel::new()));
            FOLDERS.set(RwLock::new(vec![]));
            WORLDS.set(RwLock::new(vec![]));
            INITSTATE.set(RwLock::new(InitState::error(e)));
            AUTHENTICATOR.set(tokio::sync::RwLock::new(VRChatAPIClientAuthenticator::new(
                String::new(),
            )));
        }
    };

    let builder = generate_tauri_specta_builder();

    #[cfg(debug_assertions)]
    builder
        .export(
            Typescript::default()
                .bigint(BigIntExportBehavior::Number)
                .header("/* eslint-disable */\n// @ts-nocheck"),
            "../src/lib/bindings.ts",
        )
        .expect("Failed to export typescript bindings");

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
        .invoke_handler(builder.invoke_handler())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    log::info!("Application started");
}
