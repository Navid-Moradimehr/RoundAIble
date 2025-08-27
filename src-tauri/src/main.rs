// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
async fn check_backend_connection() -> Result<bool, String> {
    let client = reqwest::Client::new();
    let url = "http://localhost:4000/api/health";
    
    match client.get(url).timeout(std::time::Duration::from_secs(5)).send().await {
        Ok(response) => {
            if response.status().is_success() {
                Ok(true)
            } else {
                Ok(false)
            }
        }
        Err(_) => Ok(false)
    }
}

#[tauri::command]
async fn get_backend_status() -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = "http://localhost:4000/api/health";
    
    match client.get(url).timeout(std::time::Duration::from_secs(5)).send().await {
        Ok(response) => {
            if response.status().is_success() {
                match response.text().await {
                    Ok(text) => Ok(text),
                    Err(_) => Ok("Backend is running".to_string())
                }
            } else {
                Ok("Backend is not responding properly".to_string())
            }
        }
        Err(_) => Ok("Backend is not available. Please start the backend server first.".to_string())
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|_app| {
            #[cfg(debug_assertions)]
            _app.get_window("main").unwrap().open_devtools();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_backend_connection,
            get_backend_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
} 