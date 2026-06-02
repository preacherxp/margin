use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::command;

use super::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CopiedAsset {
    pub rel_path: String,
    pub abs_path: String,
    pub name: String,
}

const ASSETS_DIR: &str = "assets";

fn sanitize_segment(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for ch in s.chars() {
        if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' || ch == '.' {
            out.push(ch);
        } else {
            out.push('_');
        }
    }
    if out.is_empty() {
        out.push('a');
    }
    out
}

fn unique_dest(dest_dir: &Path, original_name: &str) -> AppResult<PathBuf> {
    std::fs::create_dir_all(dest_dir)?;
    let stem = Path::new(original_name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("image");
    let ext = Path::new(original_name)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    let stem = sanitize_segment(stem);
    let ext = sanitize_segment(ext);

    for n in 0..1000u32 {
        let suffix = if n == 0 {
            String::new()
        } else {
            format!("-{n}")
        };
        let candidate = if ext.is_empty() {
            format!("{stem}{suffix}")
        } else {
            format!("{stem}{suffix}.{ext}")
        };
        let path = dest_dir.join(&candidate);
        if !path.exists() {
            return Ok(path);
        }
    }
    Err(AppError::Invalid("could not find free asset name".into()))
}

#[command]
pub fn copy_asset(src: PathBuf, dest_dir: PathBuf) -> AppResult<CopiedAsset> {
    if !src.exists() {
        return Err(AppError::NotFound(src.to_string_lossy().to_string()));
    }
    if !src.is_file() {
        return Err(AppError::Invalid("source is not a file".into()));
    }
    let original_name = src
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| AppError::Invalid("invalid source filename".into()))?
        .to_string();
    let dest = unique_dest(&dest_dir, &original_name)?;
    std::fs::copy(&src, &dest)?;
    let abs = dest.to_string_lossy().to_string();
    let rel = format!("{ASSETS_DIR}/{}", dest.file_name().and_then(|n| n.to_str()).unwrap_or(""));
    Ok(CopiedAsset {
        rel_path: rel,
        abs_path: abs,
        name: dest
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string(),
    })
}

#[command]
pub fn ensure_assets_dir(posts_dir: PathBuf) -> AppResult<PathBuf> {
    let dir = posts_dir.join(ASSETS_DIR);
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}
