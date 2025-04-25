/*
 * This file is adapted from the KonoAsset project
 * https://github.com/siloneco/KonoAsset
 * Copyright (c) 2025 siloneco and other contributors
 *
 * That file was originally derived from the vrc-get project:
 * https://github.com/vrc-get/vrc-get/blob/master/vrc-get-gui/src/logging.rs
 * Copyright (c) 2023 anatawa12 and other contributors
 *
 * Further modifications by @raifa21
 */

use std::path::PathBuf;
use std::sync::Mutex;

use ringbuffer::{ConstGenericRingBuffer, RingBuffer};

use super::definitions::LogEntry;

const LOG_RETENTION_DAYS: i64 = 14;

static LOG_BUFFER: Mutex<ConstGenericRingBuffer<LogEntry, 256>> =
    Mutex::new(ConstGenericRingBuffer::new());

pub fn get_logs() -> Vec<LogEntry> {
    let buffer = LOG_BUFFER.lock().unwrap();
    buffer.iter().cloned().collect()
}

pub fn purge_outdated_logs(logs_dir: &PathBuf) -> Result<(), std::io::Error> {
    log::info!("Checking logs in directory: {}", logs_dir.display());
    let readdir = logs_dir.read_dir()?;

    for entry in readdir {
        match entry {
            Ok(path) => {
                let path = path.path();
                let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");

                log::debug!("Processing log file: {}", file_name);

                // Handle old format log files
                // This is for backward compatibility
                // and should be removed in the future
                if file_name == "logs.log" || file_name == "vrc-worlds-manager.log" {
                    log::info!("removing old format log file: {}", path.display());
                    if let Err(e) = std::fs::remove_file(&path) {
                        log::warn!("failed to remove old log file: {}", e);
                    }
                    continue;
                }

                // Handle new format log files
                if let Some(file_stem) = path.file_stem().and_then(|s| s.to_str()) {
                    if file_stem.starts_with("vrc-worlds-manager-") {
                        let timestamp = &file_stem[19..];
                        if is_outdated_timestamp(timestamp) {
                            log::info!("purging outdated log file: {}", path.display());
                            if let Err(e) = std::fs::remove_file(&path) {
                                log::warn!("failed to remove outdated log file: {}", e);
                            }
                        }
                    }
                }
            }
            Err(e) => {
                log::warn!("error while reading log directory entry: {}", e);
            }
        }
    }

    Ok(())
}

fn is_outdated_timestamp(timestamp: &str) -> bool {
    let timestamp = match chrono::NaiveDateTime::parse_from_str(&timestamp, "%Y-%m-%d_%H-%M-%S.%6f")
    {
        Ok(timestamp) => timestamp,
        Err(e) => {
            log::error!("error while parsing timestamp: {}, {}", e, timestamp);
            return false;
        }
    };

    let timestamp = chrono::DateTime::<chrono::Utc>::from_naive_utc_and_offset(
        timestamp,
        chrono::Utc::now().offset().clone(),
    );

    let threshold = chrono::Utc::now() - chrono::Duration::days(LOG_RETENTION_DAYS);

    timestamp < threshold
}

#[cfg(test)]
mod tests {
    use chrono::Duration;

    use super::*;

    #[test]
    fn test_is_outdated_timestamp() {
        let threshold = chrono::Utc::now() - Duration::days(LOG_RETENTION_DAYS);

        let outdated_time = threshold - Duration::minutes(1);
        let outdated_str = outdated_time.format("%Y-%m-%d_%H-%M-%S.%6f").to_string();
        assert!(is_outdated_timestamp(&outdated_str));

        let fresh_time = threshold + Duration::minutes(1);
        let fresh_str = fresh_time.format("%Y-%m-%d_%H-%M-%S.%6f").to_string();
        assert!(!is_outdated_timestamp(&fresh_str));
    }

    #[test]
    fn test_invalid_timestamp() {
        assert!(!is_outdated_timestamp("invalid"));
    }
}
