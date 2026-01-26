use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Clear WebView cache on startup in dev mode
            #[cfg(debug_assertions)]
            if let Some(window) = app.get_webview_window("main") {
                window.clear_all_browsing_data().ok();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
