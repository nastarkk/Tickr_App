#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{LogicalPosition, LogicalSize, Manager, Position, Size, Window, WindowBuilder, WindowUrl};

const RUNNING_WIDTH: f64 = 130.0;
const RUNNING_HEIGHT: f64 = 90.0;
const MARGIN_X: f64 = 16.0;
const MARGIN_Y: f64 = 16.0;

fn resolve_monitor(window: &Window) -> Option<tauri::Monitor> {
  window
    .current_monitor()
    .ok()
    .flatten()
    .or_else(|| window.primary_monitor().ok().flatten())
    .or_else(|| window.available_monitors().ok().and_then(|m| m.into_iter().next()))
}

fn bottom_right_for_monitor(monitor: &tauri::Monitor) -> (f64, f64) {
  let scale = monitor.scale_factor();
  let monitor_pos = monitor.position().to_logical::<f64>(scale);
  let monitor_size = monitor.size().to_logical::<f64>(scale);
  let x = monitor_pos.x + monitor_size.width - RUNNING_WIDTH - MARGIN_X;
  let y = monitor_pos.y + monitor_size.height - RUNNING_HEIGHT - MARGIN_Y;
  (x, y)
}

#[tauri::command]
fn apply_running_mode(window: Window) -> Result<(), String> {
  window
    .set_size(Size::Logical(LogicalSize::new(RUNNING_WIDTH, RUNNING_HEIGHT)))
    .map_err(|e| e.to_string())?;
  window.set_resizable(false).map_err(|e| e.to_string())?;
  window.set_always_on_top(true).map_err(|e| e.to_string())?;
  window.set_decorations(false).map_err(|e| e.to_string())?;
  let _ = window.set_skip_taskbar(true);

  stick_bottom_right(window)
}

#[tauri::command]
fn stick_bottom_right(window: Window) -> Result<(), String> {
  if let Some(monitor) = resolve_monitor(&window) {
    let (x, y) = bottom_right_for_monitor(&monitor);
    window
      .set_position(Position::Logical(LogicalPosition::new(x, y)))
      .map_err(|e| e.to_string())?;
  }

  Ok(())
}

#[tauri::command]
fn start_dragging(window: Window) -> Result<(), String> {
  window.start_dragging().map_err(|e| e.to_string())
}

#[tauri::command]
fn set_window_position_logical(window: Window, x: f64, y: f64) -> Result<(), String> {
  window
    .set_position(Position::Logical(LogicalPosition::new(x, y)))
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn open_running_window(app: tauri::AppHandle, window: Window, task: String, minutes: u32) -> Result<(), String> {
  println!("open_running_window called task='{}' minutes={}", task, minutes);
  let app_handle = app.clone();
  let setup_window = window.clone();
  let (tx, rx) = std::sync::mpsc::channel::<Result<(), String>>();

  app
    .run_on_main_thread(move || {
      let label = "running";
      let url = "http://127.0.0.1:1420/index.html?mode=running"
        .parse()
        .map(WindowUrl::External)
        .map_err(|e| format!("running url parse error: {}", e));

      if let Some(existing) = app_handle.get_window(label) {
        let _ = existing.close();
      }

      // Avoid monitor queries in this path; running window JS will place it.
      let (x, y) = (100.0, 100.0);
      println!("building running window");

      let build_result = match url {
        Ok(url) => WindowBuilder::new(&app_handle, label, url)
          .inner_size(RUNNING_WIDTH, RUNNING_HEIGHT)
          .position(x, y)
          .resizable(false)
          .decorations(false)
          .always_on_top(true)
          .skip_taskbar(false)
          .transparent(true)
          .focused(true)
          .build()
          .map_err(|e| format!("open_running_window build error: {}", e)),
        Err(err) => Err(err)
      };

      let result = match build_result {
        Ok(_) => {
          println!("running window created, closing setup window");
          setup_window
            .close()
            .map_err(|e| format!("setup window close error: {}", e))
        }
        Err(err) => {
          eprintln!("{}", err);
          Err(err)
        }
      };

      let _ = tx.send(result);
    })
    .map_err(|e| format!("run_on_main_thread error: {}", e))?;

  rx.recv()
    .map_err(|e| format!("open_running_window recv error: {}", e))?
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      apply_running_mode,
      stick_bottom_right,
      start_dragging,
      set_window_position_logical,
      open_running_window
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
