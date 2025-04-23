use std::path::Path;

fn main() {
    // Check if .env exists in the same directory as build.rs
    if Path::new(".env").exists() {
        println!("cargo:warning=Found .env file, loading environment variables for development");
        dotenv_build::output(dotenv_build::Config::default()).unwrap();
    } else {
        println!("cargo:warning=No .env file found, using production environment");
    }

    // Run the standard Tauri build process
    tauri_build::build()
}
