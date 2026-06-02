mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|_app| Ok(()))
        .invoke_handler(tauri::generate_handler![
            commands::posts::list_posts,
            commands::posts::read_post,
            commands::posts::write_post,
            commands::posts::delete_post,
            commands::posts::ensure_posts_dir,
            commands::assets::copy_asset,
            commands::assets::ensure_assets_dir,
            commands::settings::get_settings,
            commands::settings::save_settings,
            commands::templates::list_templates,
            commands::templates::read_template,
            commands::templates::write_template,
            commands::templates::delete_template,
            commands::templates::ensure_templates_dir,
            commands::versions::save_version,
            commands::versions::list_versions,
            commands::versions::read_version,
            commands::versions::delete_versions_for_post,
            commands::print::print_active_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
