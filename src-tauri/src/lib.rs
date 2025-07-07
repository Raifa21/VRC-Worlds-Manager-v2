use api::auth::VRChatAPIClientAuthenticator;
use commands::generate_tauri_specta_builder;
use definitions::{FolderModel, InitState, PreferenceModel, WorldModel};
use directories::BaseDirs;
use services::ApiService;
use specta_typescript::{BigIntExportBehavior, Typescript};
use state::InitCell;
use std::sync::RwLock;
use tauri::{AppHandle, Manager};
use tauri_plugin_updater::UpdaterExt;
use tauri_specta::collect_events;

use crate::services::memo_manager::MemoManager;
use crate::task::cancellable_task::TaskContainer;
use crate::task::definitions::TaskStatusChanged;
use crate::updater::update_handler::{UpdateChannel, UpdateHandler, UpdateProgress};

mod api;
mod backup;
mod changelog;
mod commands;
mod definitions;
mod errors;
mod logging;
mod migration;
mod services;
mod task;
mod updater;

static PREFERENCES: InitCell<RwLock<PreferenceModel>> = InitCell::new();
static FOLDERS: InitCell<RwLock<Vec<FolderModel>>> = InitCell::new();
static WORLDS: InitCell<RwLock<Vec<WorldModel>>> = InitCell::new();
static INITSTATE: InitCell<tokio::sync::RwLock<InitState>> = InitCell::new();
static AUTHENTICATOR: InitCell<tokio::sync::RwLock<VRChatAPIClientAuthenticator>> = InitCell::new();
static RATE_LIMIT_STORE: InitCell<RwLock<api::RateLimitStore>> = InitCell::new();
static MEMO_MANAGER: InitCell<RwLock<MemoManager>> = InitCell::new();
static TASK_CONTAINER: InitCell<RwLock<TaskContainer>> = InitCell::new();
static UPDATE_HANDLER: InitCell<UpdateHandler> = InitCell::new();

/// Application entry point for all platforms
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder =
        generate_tauri_specta_builder().events(collect_events![TaskStatusChanged, UpdateProgress,]);

    #[cfg(debug_assertions)]
    builder
        .export(
            Typescript::default()
                .bigint(BigIntExportBehavior::Number)
                .header("/* eslint-disable */\n// @ts-nocheck"),
            "../src/lib/bindings.ts",
        )
        .expect("Failed to export typescript bindings");

    let mut tauri_builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        tauri_builder = tauri_builder.plugin(tauri_plugin_single_instance::init(|_app, argv, _cwd| {
            println!("a new app instance was opened with {argv:?} and the deep link event was already triggered");
            // when defining deep link schemes at runtime, you must also check `argv` here
        }));
        tauri_builder =
            tauri_builder.plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
                let _ = app
                    .get_webview_window("main")
                    .expect("no main window")
                    .set_focus();
            }));
    }

    tauri_builder = tauri_builder.plugin(tauri_plugin_deep_link::init());

    tauri_builder
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
            app.manage(app.handle().clone());

            TASK_CONTAINER.set(RwLock::new(TaskContainer::new(app.handle().clone())));

            let handle = app.handle().clone();
            let logs_dir = handle.path().app_log_dir().unwrap();
            logging::purge_outdated_logs(&logs_dir).expect("Failed to purge outdated logs");

            let app_data_dir = handle.path().app_data_dir().unwrap_or_else(|_| {
                log::warn!(
                    "Could not resolve app data directory, using temp dir for rate limit data"
                );
                std::env::temp_dir()
            });
            let rate_limit_path = app_data_dir.join("rate_limits.json");
            RATE_LIMIT_STORE.set(RwLock::new(api::RateLimitStore::load(rate_limit_path)));
            log::info!("Rate limit store initialized");

            if let Err(e) = initialize_app() {
                log::error!("Failed to initialize app: {}", e);
            }
            UPDATE_HANDLER.set(get_update_handler(
                app.handle().clone(),
                &PREFERENCES
                    .get()
                    .read()
                    .expect("Failed to read preferences")
                    .update_channel,
            ));

            Ok(())
        })
        .invoke_handler(builder.invoke_handler())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    log::info!("Application started");
}

fn initialize_app() -> Result<(), String> {
    match services::initialize_service::initialize_app() {
        Ok((preferences, folders, worlds, cookies, init_state)) => {
            let memo_path = BaseDirs::new()
                .expect("Failed to get base directories")
                .data_local_dir()
                .join("VRC_Worlds_Manager_new")
                .join("memo.json");
            let memo_manager = MemoManager::load(memo_path)?;

            log::info!("App initialized successfully");
            PREFERENCES.set(RwLock::new(preferences));
            FOLDERS.set(RwLock::new(folders));
            WORLDS.set(RwLock::new(worlds));
            INITSTATE.set(tokio::sync::RwLock::new(init_state));
            let cookie_store = ApiService::initialize_with_cookies(cookies.clone());
            AUTHENTICATOR.set(tokio::sync::RwLock::new(
                VRChatAPIClientAuthenticator::from_cookie_store(cookie_store),
            ));
            MEMO_MANAGER.set(RwLock::new(memo_manager));
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

fn get_update_handler(app: AppHandle, channel: &UpdateChannel) -> UpdateHandler {
    tauri::async_runtime::block_on(async move {
        let mut update_handler = UpdateHandler::new(app);
        let result = update_handler.check_for_update(channel).await;

        if result.is_err() {
            log::error!("Failed to check for update: {}", result.unwrap_err());
        }

        update_handler
    })
}
