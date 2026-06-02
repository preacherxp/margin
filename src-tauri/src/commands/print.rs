use tauri::{command, WebviewWindow};

use super::error::{AppError, AppResult};

/// Trigger the WebView's native print panel.
///
/// On macOS this wraps WKWebView's `printOperation(with:)` via wry, which
/// shows the standard macOS print sheet (the user can then pick "Save as
/// PDF" or "Open in Preview"). The shell keeps ownership of the file
/// destination — we intentionally do not return a path, because macOS
/// does not tell us where the user chose to save.
///
/// In the webview2 backend (Windows) and webkitgtk (Linux) wry falls
/// back to its own print operation. Behaviour is otherwise identical.
#[command]
pub fn print_active_window(window: WebviewWindow) -> AppResult<()> {
    window.print().map_err(|e| AppError::Invalid(format!("print: {e}")))
}
