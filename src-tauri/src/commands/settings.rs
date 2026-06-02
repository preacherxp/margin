use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{command, Manager};

use super::error::{AppError, AppResult};

const CONFIG_FILE: &str = "app-config.json";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub posts_folder: Option<String>,
    #[serde(default)]
    pub theme: Option<String>,
}

fn config_path(app: &tauri::AppHandle) -> AppResult<PathBuf> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| AppError::Invalid(format!("config dir: {e}")))?;
    std::fs::create_dir_all(&dir)?;
    Ok(dir.join(CONFIG_FILE))
}

#[command]
pub fn get_settings(app: tauri::AppHandle) -> AppResult<AppSettings> {
    let path = config_path(&app)?;
    if !path.exists() {
        return Ok(AppSettings::default());
    }
    let raw = std::fs::read_to_string(&path)?;
    if raw.trim().is_empty() {
        return Ok(AppSettings::default());
    }
    let s: AppSettings = serde_json::from_str(&raw)?;
    Ok(s)
}

#[command]
pub fn save_settings(app: tauri::AppHandle, settings: AppSettings) -> AppResult<()> {
    let path = config_path(&app)?;
    let raw = serde_json::to_string_pretty(&settings)?;
    std::fs::write(&path, raw)?;
    Ok(())
}
