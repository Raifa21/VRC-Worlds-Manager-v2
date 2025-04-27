use api::auth::VRChatAPIClientAuthenticator;
use commands::generate_tauri_specta_builder;
use definitions::{FolderModel, InitState, PreferenceModel, WorldModel};
use services::ApiService;
use specta_typescript::{BigIntExportBehavior, Typescript};
use state::InitCell;
use std::sync::RwLock;
use tauri::Manager;
use tauri_plugin_updater::UpdaterExt;

mod api;
mod backup;
mod commands;
mod definitions;
mod errors;
mod logging;
mod migration;
mod services;

static PREFERENCES: InitCell<RwLock<PreferenceModel>> = InitCell::new();
static FOLDERS: InitCell<RwLock<Vec<FolderModel>>> = InitCell::new();
static WORLDS: InitCell<RwLock<Vec<WorldModel>>> = InitCell::new();
static INITSTATE: InitCell<tokio::sync::RwLock<InitState>> = InitCell::new();
static AUTHENTICATOR: InitCell<tokio::sync::RwLock<VRChatAPIClientAuthenticator>> = InitCell::new();

/// Application entry point for all platforms
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .target({
                    let timestamp = chrono::Utc::now()
                        .format("%Y-%m-%d_%H-%M-%S.%6f")
                        .to_string();
                    let log_path = format!("vrc-worlds-manager-{}", timestamp);
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some(log_path),
                    })
                })
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            let handle = app.handle().clone();
            let logs_dir = handle.path().app_log_dir().unwrap();
            logging::purge_outdated_logs(&logs_dir).expect("Failed to purge outdated logs");
            tauri::async_runtime::spawn(async move {
                update(handle).await.unwrap();
            });
            if let Err(e) = initialize_app() {
                log::error!("Failed to initialize app: {}", e);
            }
            Ok(())
        })
        .invoke_handler(builder.invoke_handler())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    log::info!("Application started");
}

async fn update(app: tauri::AppHandle) -> tauri_plugin_updater::Result<()> {
    if let Some(update) = app.updater()?.check().await? {
        let mut downloaded = 0;

        log::info!("update found: {}", update.version);
        log::info!("current version: {}", app.package_info().version);
        log::info!("latest version: {}", update.version);
        log::info!("download url: {}", update.download_url);
        update
            .download_and_install(
                |chunk_length, content_length| {
                    downloaded += chunk_length;
                    log::info!("downloaded {downloaded} from {content_length:?}");
                },
                || {
                    log::info!("download finished");
                },
            )
            .await?;

        log::info!("update installed");
        app.restart();
    }

    Ok(())
}

fn initialize_app() -> Result<(), String> {
    match services::initialize_service::initialize_app() {
        Ok((preferences, folders, worlds, cookies, init_state)) => {
            log::info!("App initialized successfully");
            PREFERENCES.set(RwLock::new(preferences));
            FOLDERS.set(RwLock::new(folders));
            WORLDS.set(RwLock::new(worlds));
            INITSTATE.set(tokio::sync::RwLock::new(init_state));
            let cookie_store = ApiService::initialize_with_cookies(cookies.clone());
            AUTHENTICATOR.set(tokio::sync::RwLock::new(
                VRChatAPIClientAuthenticator::from_cookie_store(cookie_store),
            ));
            Ok(())
        }
        Err(e) => {
            log::info!("Error initializing app: {}", e);
            PREFERENCES.set(RwLock::new(PreferenceModel::new()));
            FOLDERS.set(RwLock::new(vec![]));
            WORLDS.set(RwLock::new(vec![]));
            INITSTATE.set(tokio::sync::RwLock::new(InitState::error(e.clone())));
            AUTHENTICATOR.set(tokio::sync::RwLock::new(VRChatAPIClientAuthenticator::new(
                String::new(),
            )));
            Err(e)
        }
    }
}
