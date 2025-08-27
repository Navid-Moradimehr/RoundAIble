use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use reqwest::Client;
use serde_json::Value;

pub struct BackendManager {
    process: Arc<Mutex<Option<Child>>>,
    client: Client,
    port: u16,
}

impl BackendManager {
    pub fn new(port: u16) -> Self {
        Self {
            process: Arc::new(Mutex::new(None)),
            client: Client::new(),
            port,
        }
    }

    pub fn start_backend(&self) -> Result<(), Box<dyn std::error::Error>> {
        let mut process_guard = self.process.lock().unwrap();
        
        if process_guard.is_some() {
            println!("Backend is already running");
            return Ok(());
        }

        // Build the backend first
        println!("Building backend...");
        let build_status = Command::new("npm")
            .args(&["run", "build"])
            .current_dir("../backend")
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .status()?;

        if !build_status.success() {
            return Err("Failed to build backend".into());
        }

        // Start the backend server
        println!("Starting backend server on port {}...", self.port);
        let child = Command::new("node")
            .args(&["dist/server.js"])
            .current_dir("../backend")
            .env("PORT", self.port.to_string())
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .spawn()?;

        *process_guard = Some(child);

        // Wait a bit for the server to start
        thread::sleep(Duration::from_secs(2));

        // Test if the server is running
        self.wait_for_backend_ready()?;

        println!("Backend server started successfully!");
        Ok(())
    }

    pub fn stop_backend(&self) -> Result<(), Box<dyn std::error::Error>> {
        let mut process_guard = self.process.lock().unwrap();
        
        if let Some(mut child) = process_guard.take() {
            println!("Stopping backend server...");
            child.kill()?;
            child.wait()?;
            println!("Backend server stopped");
        }
        
        Ok(())
    }

    pub fn is_backend_running(&self) -> bool {
        self.process.lock().unwrap().is_some()
    }

    async fn wait_for_backend_ready(&self) -> Result<(), Box<dyn std::error::Error>> {
        let health_url = format!("http://localhost:{}/api/health", self.port);
        
        for _ in 0..30 { // Try for 30 seconds
            match self.client.get(&health_url).send().await {
                Ok(response) => {
                    if response.status().is_success() {
                        println!("Backend health check passed");
                        return Ok(());
                    }
                }
                Err(_) => {
                    // Server not ready yet, wait and try again
                    thread::sleep(Duration::from_millis(1000));
                }
            }
        }
        
        Err("Backend server failed to start within 30 seconds".into())
    }

    pub async fn test_backend_connection(&self) -> Result<Value, Box<dyn std::error::Error>> {
        let health_url = format!("http://localhost:{}/api/health", self.port);
        
        let response = self.client.get(&health_url).send().await?;
        let json: Value = response.json().await?;
        
        Ok(json)
    }
}

impl Drop for BackendManager {
    fn drop(&mut self) {
        if let Err(e) = self.stop_backend() {
            eprintln!("Error stopping backend: {}", e);
        }
    }
} 