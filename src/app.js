const tauriRoot = window.__TAURI__ ?? null;
const tauriWindow = tauriRoot?.window ?? null;
const appWindow = tauriWindow?.appWindow ?? tauriWindow?.getCurrent?.() ?? null;
const tauriInvoke = tauriRoot?.invoke ?? tauriRoot?.tauri?.invoke ?? null;
const WebviewWindow = tauriWindow?.WebviewWindow ?? null;
const query = new URLSearchParams(window.location.search);
const isMacOs = /mac/i.test(navigator.platform || "") || /mac os/i.test(navigator.userAgent || "");

if (isMacOs) {
  document.documentElement.classList.add("os-macos");
}

const widgetRoot = document.getElementById("widgetRoot");
const setupView = document.getElementById("setupView");
const setupHeader = document.getElementById("setupHeader");
const setupMain = document.getElementById("setupMain");
const runningView = document.getElementById("runningView");
const setupTaskInput = document.getElementById("setupTaskInput");
const setupMinutesInput = document.getElementById("setupMinutesInput");
const setupStartBtn = document.getElementById("setupStartBtn");
const setupCloseBtn = document.getElementById("setupCloseBtn");
const helperText = document.getElementById("helperText");
const helperCard = document.getElementById("helperCard");
const helperToggleBtn = document.getElementById("helperToggleBtn");
const placementGrid = document.getElementById("placementGrid");
const placementButtons = document.querySelectorAll(".placement-btn");
const placementInput = document.getElementById("placementInput");

const timerDisplay = document.getElementById("timerDisplay");
const lcdStrip = document.getElementById("lcdStrip");
const lcdTrack = document.getElementById("lcdTrack");
const lcdTextA = document.getElementById("lcdTextA");
const lcdTextB = document.getElementById("lcdTextB");
const lcdTextC = document.getElementById("lcdTextC");
const commandInput = document.getElementById("commandInput");
const commandMeasure = document.getElementById("commandMeasure");
const commandCursor = document.getElementById("commandCursor");
const completionNote = document.getElementById("completionNote");

const SETUP_WIDTH = 420;
const RUNNING_WIDTH = 127;
const RUNNING_HEIGHT = 86;
const EDGE_MARGIN = 16;

const state = {
  taskName: "NO TASK SELECTED",
  initialDuration: 0,
  timeRemaining: 0,
  isRunning: false,
  isPaused: false,
  isOnBreak: false,
  breakSnapshot: null,
  isCompleted: false,
  lastTickSecond: null,
  intervalId: null,
  placement: "bottom-right",
  mode: query.get("mode") === "running" ? "running" : "setup"
};

let boundaryGuardIntervalId = null;
let setupResizeObserver = null;
let commandHintIntervalId = null;
let commandHintIndex = 0;
const commandHints = ["\\PAUSE>", "\\RESUME>", "\\HALF>", "\\RUSH>", "\\BREAK N>", "\\BACK>", "\\+N>", "\\-N>", "\\RESTART>", "\\END>"];
const completionMessages = [
  "YOU HIT FLOW, NICE WORK",
  "FOCUS SESSION COMPLETE, GREAT JOB",
  "LOCKED IN AND DELIVERED",
  "DEEP FOCUS WIN, KEEP GOING",
  "MISSION COMPLETE, WELL DONE"
];

function setDebugStatus(message) {
  if (helperText) {
    helperText.innerHTML = message;
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.max(0, seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function setTaskText(taskName) {
  const text = taskName?.trim() ? taskName.trim().toUpperCase() : "NO TASK SELECTED";
  state.taskName = text;
  renderLcdTaskTokens();
}

function setLcdTokens(a, b, c) {
  lcdTextA.textContent = a;
  lcdTextB.textContent = b;
  lcdTextC.textContent = c;
}

function renderLcdTaskTokens() {
  const taskToken = `<${state.taskName}>`;
  if (state.isPaused && !state.isCompleted && state.mode === "running" && state.timeRemaining > 0) {
    setLcdTokens(taskToken, "<TIMER PAUSED>", taskToken);
    return;
  }
  setLcdTokens(taskToken, taskToken, taskToken);
}

function updateTimerTone() {
  timerDisplay.classList.remove("timer-safe", "timer-warn", "timer-danger");

  if (state.initialDuration <= 0) {
    timerDisplay.classList.add("timer-safe");
    return;
  }

  if (state.timeRemaining > 0 && state.timeRemaining <= 15) {
    timerDisplay.classList.add("timer-danger");
  } else {
    timerDisplay.classList.add("timer-safe");
  }
}

function render() {
  timerDisplay.textContent = formatTime(state.timeRemaining);
  updateTimerTone();
}

function showCompletionNote(show) {
  state.isCompleted = show;
  if (show) {
    const randomMessage = completionMessages[Math.floor(Math.random() * completionMessages.length)];
    const doneMsg = `<${randomMessage} • \\RESTART> • \\END>`;
    setLcdTokens(doneMsg, doneMsg, doneMsg);
  } else {
    setTaskText(state.taskName);
  }
}

function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function blinkZeroRedThenDefault() {
  for (let i = 0; i < 3; i += 1) {
    timerDisplay.classList.remove("timer-safe", "timer-danger");
    timerDisplay.classList.add("timer-danger");
    await waitMs(170);

    timerDisplay.classList.remove("timer-danger", "timer-safe");
    timerDisplay.classList.add("timer-safe");
    await waitMs(170);
  }

  timerDisplay.classList.remove("timer-danger");
  timerDisplay.classList.add("timer-safe");
}

function stopCountdown() {
  if (!state.intervalId) {
    state.isRunning = false;
    state.lastTickSecond = null;
    return;
  }

  clearInterval(state.intervalId);
  state.intervalId = null;
  state.isRunning = false;
  state.lastTickSecond = null;
}

function playCompleteSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  const ctx = new AudioContextClass();
  const now = ctx.currentTime;
  const notes = [880, 1174.66, 1396.91];

  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);

    const start = now + index * 0.11;
    const end = start + 0.19;

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(end);
  });

  setTimeout(() => {
    if (ctx.state !== "closed") {
      ctx.close();
    }
  }, 1200);
}

function playLastTenTick() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  const ctx = new AudioContextClass();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "square";
  osc.frequency.setValueAtTime(1700, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.05, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.08);

  setTimeout(() => {
    if (ctx.state !== "closed") {
      ctx.close();
    }
  }, 180);
}

async function finishTimer() {
  stopCountdown();
  state.isPaused = false;
  timerDisplay.classList.add("timer-complete");
  setTimeout(() => timerDisplay.classList.remove("timer-complete"), 2700);
  await blinkZeroRedThenDefault();

  if (state.isOnBreak) {
    const breakDone = "<BREAK OVER • \\BACK> • \\END>";
    setLcdTokens(breakDone, breakDone, breakDone);
    state.isCompleted = true;
  } else {
    showCompletionNote(true);
  }

  playCompleteSound();
}

function startCountdown() {
  if (state.isRunning || state.timeRemaining <= 0) {
    return;
  }

  state.isPaused = false;
  state.isRunning = true;
  renderLcdTaskTokens();
  state.intervalId = setInterval(async () => {
    state.timeRemaining -= 1;

    if (state.timeRemaining > 0 && state.timeRemaining <= 10 && state.lastTickSecond !== state.timeRemaining) {
      state.lastTickSecond = state.timeRemaining;
      playLastTenTick();
    }

    if (state.timeRemaining <= 0) {
      state.timeRemaining = 0;
      state.lastTickSecond = null;
      render();
      await finishTimer();
      return;
    }

    render();
  }, 1000);
}

function resetTimer() {
  stopCountdown();
  state.isPaused = false;
  state.timeRemaining = state.initialDuration;
  state.lastTickSecond = null;
  showCompletionNote(false);
  render();
}

function parseCommand(raw) {
  return raw.trim().toLowerCase().replace(/^\\+/, "").replace(/>+$/, "").trim();
}

function getAnimationDurationMs(styleValue) {
  if (!styleValue) {
    return 0;
  }
  const raw = String(styleValue).split(",")[0].trim();
  if (raw.endsWith("ms")) {
    return Number.parseFloat(raw);
  }
  if (raw.endsWith("s")) {
    return Number.parseFloat(raw) * 1000;
  }
  return 0;
}

function waitForNextLcdCycle() {
  return new Promise((resolve) => {
    if (!lcdTrack || lcdTrack.classList.contains("hidden")) {
      resolve();
      return;
    }

    const computed = window.getComputedStyle(lcdTrack);
    const durationMs = getAnimationDurationMs(computed.animationDuration);
    const fallbackMs = Number.isFinite(durationMs) && durationMs > 0 ? durationMs + 250 : 1800;

    let done = false;
    const finish = () => {
      if (done) {
        return;
      }
      done = true;
      lcdTrack.removeEventListener("animationiteration", onIter);
      clearTimeout(timeoutId);
      resolve();
    };

    const onIter = () => {
      finish();
    };

    lcdTrack.addEventListener("animationiteration", onIter, { once: true });
    const timeoutId = setTimeout(finish, fallbackMs);
  });
}

function waitForSingleTokenCycle() {
  return new Promise((resolve) => {
    if (!lcdTrack || lcdTrack.classList.contains("hidden")) {
      resolve();
      return;
    }

    const computed = window.getComputedStyle(lcdTrack);
    const durationMs = getAnimationDurationMs(computed.animationDuration) || 25000;
    const fallbackMs = durationMs + 300;
    const textB = lcdTextB.textContent;
    const textC = lcdTextC.textContent;
    let done = false;

    const finish = () => {
      if (done) {
        return;
      }
      done = true;
      lcdTrack.removeEventListener("animationend", onEnd);
      clearTimeout(timeoutId);
      lcdTrack.style.animation = "";
      lcdTextB.textContent = textB;
      lcdTextC.textContent = textC;
      resolve();
    };

    const onEnd = () => finish();

    lcdTextB.textContent = "";
    lcdTextC.textContent = "";
    lcdTrack.style.animation = "none";
    void lcdTrack.offsetWidth;
    lcdTrack.style.animation = `lcd-scroll-once ${durationMs}ms linear 1`;
    lcdTrack.addEventListener("animationend", onEnd, { once: true });
    const timeoutId = setTimeout(finish, fallbackMs);
  });
}

async function showUnknownWithTaskOnce() {
  const taskToken = `<${state.taskName}>`;
  const unknownToken = "<UNKNOWN CMD>";
  setLcdTokens(unknownToken, taskToken, taskToken);
  await waitForNextLcdCycle();
  setTaskText(state.taskName);
}

async function showFlashMessage(text, options = {}) {
  const { waitForCycle = false, durationMs = 1400, singleTokenCycle = false } = options;
  const previous = state.taskName;
  setTaskText(text);
  if (waitForCycle) {
    if (singleTokenCycle) {
      await waitForSingleTokenCycle();
    } else {
      await waitForNextLcdCycle();
    }
  } else {
    await new Promise((resolve) => setTimeout(resolve, durationMs));
  }
  setTaskText(previous);
}

function getWorkArea() {
  const s = window.screen;
  const left = Number.isFinite(s.availLeft) ? s.availLeft : 0;
  const top = Number.isFinite(s.availTop) ? s.availTop : 0;
  const width = Number.isFinite(s.availWidth) ? s.availWidth : s.width;
  const height = Number.isFinite(s.availHeight) ? s.availHeight : s.height;
  const minX = left + EDGE_MARGIN;
  const minY = top + EDGE_MARGIN;
  const maxX = left + width - RUNNING_WIDTH - EDGE_MARGIN;
  const maxY = top + height - RUNNING_HEIGHT - EDGE_MARGIN;
  return { minX, minY, maxX, maxY };
}

function clampToWorkArea(pos) {
  const area = getWorkArea();
  return {
    x: Math.min(area.maxX, Math.max(area.minX, pos.x)),
    y: Math.min(area.maxY, Math.max(area.minY, pos.y))
  };
}

function getPlacementLogicalPosition(placement) {
  const area = getWorkArea();

  if (placement === "top-left") {
    return { x: area.minX, y: area.minY };
  }
  if (placement === "top-right") {
    return { x: area.maxX, y: area.minY };
  }
  if (placement === "bottom-left") {
    return { x: area.minX, y: area.maxY };
  }
  return { x: area.maxX, y: area.maxY };
}

function setPlacement(value) {
  const valid = ["top-left", "top-right", "bottom-left", "bottom-right"];
  const placement = valid.includes(value) ? value : "bottom-right";
  state.placement = placement;

  if (placementInput) {
    placementInput.value = placement;
  }

  placementButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.placement === placement);
  });
}

function sanitizeMinutesInput() {
  if (!setupMinutesInput) {
    return;
  }
  setupMinutesInput.value = setupMinutesInput.value.replace(/\D+/g, "");
}

async function setPositionLogical(x, y) {
  const bounded = clampToWorkArea({ x, y });

  if (tauriInvoke) {
    try {
      await tauriInvoke("set_window_position_logical", bounded);
      return true;
    } catch {
      // fall through
    }
  }

  if (!appWindow || !tauriWindow) {
    return false;
  }

  try {
    await appWindow.setPosition(new tauriWindow.LogicalPosition(bounded.x, bounded.y));
    return true;
  } catch {
    return false;
  }
}

async function fitSetupWindowToContent() {
  if (!appWindow || !tauriWindow || !setupMain || state.mode !== "setup") {
    return;
  }

  const headerHeight = 34;
  const mainStyles = window.getComputedStyle(setupMain);
  const padTop = Number.parseFloat(mainStyles.paddingTop || "0") || 0;
  const padBottom = Number.parseFloat(mainStyles.paddingBottom || "0") || 0;
  const items = Array.from(setupMain.children).filter((el) => !el.classList.contains("hidden"));

  const contentItemsHeight = items.reduce((total, el) => {
    const rectHeight = Math.ceil(el.getBoundingClientRect().height);
    const styles = window.getComputedStyle(el);
    const marginTop = Number.parseFloat(styles.marginTop || "0") || 0;
    const marginBottom = Number.parseFloat(styles.marginBottom || "0") || 0;
    return total + rectHeight + marginTop + marginBottom;
  }, 0);

  const desired = Math.ceil(headerHeight + padTop + padBottom + contentItemsHeight + 2);
  const height = Math.min(640, Math.max(280, desired));

  try {
    await appWindow.setSize(new tauriWindow.LogicalSize(SETUP_WIDTH, height));
  } catch {
    // ignore sizing failures
  }
}

function observeSetupContentSize() {
  if (!setupMain || state.mode !== "setup") {
    return;
  }

  if (setupResizeObserver) {
    setupResizeObserver.disconnect();
    setupResizeObserver = null;
  }

  if (!window.ResizeObserver) {
    return;
  }

  setupResizeObserver = new ResizeObserver(() => {
    fitSetupWindowToContent();
  });

  setupResizeObserver.observe(setupMain);
}

async function setWindowForRunningMode() {
  if (!tauriWindow) {
    return;
  }

  if (tauriInvoke) {
    try {
      await tauriInvoke("apply_running_mode");
      return;
    } catch {
      // fall back to JS APIs
    }
  }

  if (!appWindow) {
    return;
  }

  const safe = async (fn) => {
    try {
      await fn();
    } catch {
      // keep non-blocking
    }
  };

  await safe(async () => appWindow.setSize(new tauriWindow.LogicalSize(RUNNING_WIDTH, RUNNING_HEIGHT)));
  await safe(async () => appWindow.setResizable(false));
  await safe(async () => appWindow.setAlwaysOnTop(true));
  await safe(async () => appWindow.setDecorations(false));
  await safe(async () => appWindow.setSkipTaskbar(false));
}

function startBoundaryGuard() {
  if (!appWindow || boundaryGuardIntervalId) {
    return;
  }

  boundaryGuardIntervalId = setInterval(async () => {
    if (state.mode !== "running") {
      return;
    }

    try {
      let x = Number(window.screenX);
      let y = Number(window.screenY);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        const pos = await appWindow.outerPosition();
        const dpr = Number(window.devicePixelRatio) || 1;
        x = pos.x / dpr;
        y = pos.y / dpr;
      }

      const bounded = clampToWorkArea({ x, y });
      if (bounded.x !== x || bounded.y !== y) {
        await setPositionLogical(bounded.x, bounded.y);
      }
    } catch {
      // ignore transient failures
    }
  }, 300);
}

function setupDragging() {
  if (!tauriWindow || !setupHeader) {
    return;
  }

  setupHeader.addEventListener("mousedown", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (tauriInvoke) {
      try {
        await tauriInvoke("start_dragging");
        return;
      } catch {
        // fallback below
      }
    }

    if (appWindow) {
      try {
        await appWindow.startDragging();
      } catch {
        // ignore
      }
    }
  });
}

function showSetupMode() {
  setupView.classList.remove("hidden");
  runningView.classList.add("hidden");
  widgetRoot.classList.add("mode-setup");
  widgetRoot.classList.remove("mode-running");
  state.mode = "setup";
}

function showRunningMode() {
  setupView.classList.add("hidden");
  runningView.classList.remove("hidden");
  widgetRoot.classList.remove("mode-setup");
  widgetRoot.classList.add("mode-running");
  state.mode = "running";
}

async function launchRunningWindow(task, minutes, placement) {
  if (!WebviewWindow) {
    setDebugStatus("Debug: WebviewWindow API unavailable in setup window.");
    return false;
  }

  const target = getPlacementLogicalPosition(placement);
  const runningUrl = new URL("./index.html?mode=running", window.location.href).toString();

  try {
    localStorage.setItem("pendingSession", JSON.stringify({ task, minutes, placement }));

    const existing = WebviewWindow.getByLabel("running");
    if (existing) {
      await existing.close();
    }

    const running = new WebviewWindow("running", {
      url: runningUrl,
      width: RUNNING_WIDTH,
      height: RUNNING_HEIGHT,
      x: target.x,
      y: target.y,
      center: false,
      resizable: false,
      decorations: false,
      alwaysOnTop: true,
      skipTaskbar: false,
      transparent: true,
      focus: true
    });

    running.once("tauri://created", async () => {
      if (appWindow) {
        await appWindow.close();
      }
    });

    running.once("tauri://error", (error) => {
      setDebugStatus(`Debug: running window create error (${String(error)})`);
    });

    return true;
  } catch (error) {
    const msg = typeof error === "string" ? error : (error?.message || JSON.stringify(error));
    setDebugStatus(`Debug: launchRunningWindow failed (${msg})`);
    return false;
  }
}

function openCommandInput() {
  commandInput.classList.remove("hidden");
  if (commandCursor) {
    commandCursor.classList.remove("hidden");
  }
  lcdTrack.classList.add("hidden");
  commandInput.value = "";
  commandHintIndex = 0;
  commandInput.placeholder = commandHints[0];
  startCommandHintLoop();
  commandInput.focus();
  updateCommandCursor();
}

function closeCommandInput() {
  stopCommandHintLoop();
  commandInput.classList.add("hidden");
  if (commandCursor) {
    commandCursor.classList.add("hidden");
  }
  lcdTrack.classList.remove("hidden");
}

function startCommandHintLoop() {
  stopCommandHintLoop();

  commandHintIntervalId = setInterval(() => {
    if (!commandInput || commandInput.classList.contains("hidden")) {
      return;
    }
    if (commandInput.value.trim().length > 0) {
      commandInput.placeholder = "";
      return;
    }
    commandHintIndex = (commandHintIndex + 1) % commandHints.length;
    commandInput.placeholder = commandHints[commandHintIndex];
  }, 1600);
}

function stopCommandHintLoop() {
  if (!commandHintIntervalId) {
    return;
  }
  clearInterval(commandHintIntervalId);
  commandHintIntervalId = null;
}

function updateCommandCursor() {
  if (!commandInput || !commandCursor || !commandMeasure || commandInput.classList.contains("hidden")) {
    return;
  }

  const caret = Number.isFinite(commandInput.selectionStart) ? commandInput.selectionStart : commandInput.value.length;
  const beforeCaret = commandInput.value.slice(0, caret).replace(/ /g, "\u00a0");
  commandMeasure.textContent = beforeCaret;

  const inputRect = commandInput.getBoundingClientRect();
  const stripRect = lcdStrip.getBoundingClientRect();
  const measureRect = commandMeasure.getBoundingClientRect();

  const inputLeftInStrip = inputRect.left - stripRect.left;
  const minLeft = inputLeftInStrip + 8;
  const cursorWidth = commandCursor.offsetWidth || 5;
  const maxLeft = inputLeftInStrip + inputRect.width - 8 - cursorWidth;
  const measuredLeft = minLeft + measureRect.width;
  const left = Math.max(minLeft, Math.min(maxLeft, measuredLeft));
  commandCursor.style.left = `${left}px`;
}

async function runCommand(value) {
  const command = parseCommand(value);

  if (!command) {
    closeCommandInput();
    return;
  }

  if (command === "pause" || command === "p") {
    stopCountdown();
    state.isPaused = true;
    await showFlashMessage("PAUSED");
    closeCommandInput();
    return;
  }

  if (command === "resume" || command === "start" || command === "r") {
    startCountdown();
    await showFlashMessage("RUNNING");
    closeCommandInput();
    return;
  }

  if (command === "reset") {
    resetTimer();
    await showFlashMessage("RESET");
    closeCommandInput();
    return;
  }

  if (command === "half") {
    if (state.timeRemaining <= 1) {
      closeCommandInput();
      await showUnknownWithTaskOnce();
      return;
    }
    state.timeRemaining = Math.max(1, Math.floor(state.timeRemaining / 2));
    render();
    closeCommandInput();
    await showFlashMessage("HALVED");
    return;
  }

  if (command === "rush") {
    if (state.timeRemaining <= 15) {
      closeCommandInput();
      await showFlashMessage("RUSH READY");
      return;
    }
    state.timeRemaining = 15;
    render();
    closeCommandInput();
    await showFlashMessage("RUSH 15S");
    return;
  }

  const breakMatch = command.match(/^break\s+(\d+)$/);
  if (breakMatch) {
    const minutes = Number.parseInt(breakMatch[1], 10);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      closeCommandInput();
      await showUnknownWithTaskOnce();
      return;
    }

    if (!state.isOnBreak) {
      state.breakSnapshot = {
        taskName: state.taskName,
        initialDuration: state.initialDuration,
        timeRemaining: state.timeRemaining,
        wasRunning: state.isRunning,
        wasPaused: state.isPaused
      };
    }

    stopCountdown();
    state.isOnBreak = true;
    state.isPaused = false;
    state.isCompleted = false;
    state.initialDuration = minutes * 60;
    state.timeRemaining = state.initialDuration;
    setTaskText(`BREAK ${minutes}M`);
    render();
    startCountdown();
    closeCommandInput();
    await showFlashMessage(`BREAK ${minutes}M`);
    return;
  }

  if (command === "back") {
    if (!state.isOnBreak || !state.breakSnapshot) {
      closeCommandInput();
      await showUnknownWithTaskOnce();
      return;
    }

    const snap = state.breakSnapshot;
    stopCountdown();
    state.isOnBreak = false;
    state.breakSnapshot = null;
    state.isCompleted = false;
    state.initialDuration = snap.initialDuration;
    state.timeRemaining = snap.timeRemaining;
    state.isPaused = !!snap.wasPaused;
    setTaskText(snap.taskName);
    render();

    if (snap.wasRunning && !snap.wasPaused && state.timeRemaining > 0) {
      startCountdown();
    } else {
      renderLcdTaskTokens();
    }

    closeCommandInput();
    await showFlashMessage("BACK TO FOCUS");
    return;
  }

  const deltaMatch = command.match(/^([+-])\s*(\d+)$/);
  if (deltaMatch) {
    const sign = deltaMatch[1];
    const minutes = Number.parseInt(deltaMatch[2], 10);
    const deltaSeconds = minutes * 60;

    if (!Number.isFinite(minutes) || minutes <= 0) {
      closeCommandInput();
      await showUnknownWithTaskOnce();
      return;
    }

    if (sign === "+") {
      state.timeRemaining += deltaSeconds;
      render();
      closeCommandInput();
      await showFlashMessage(`+${minutes}M`);
      return;
    }

    state.timeRemaining = Math.max(0, state.timeRemaining - deltaSeconds);
    render();
    closeCommandInput();
    await showFlashMessage(`-${minutes}M`);
    if (state.timeRemaining === 0) {
      await finishTimer();
    }
    return;
  }

  if (command === "restart") {
    resetTimer();
    startCountdown();
    await showFlashMessage("RESTARTED");
    closeCommandInput();
    return;
  }

  if (command === "end" || command === "quit" || command === "close") {
    stopCountdown();
    if (appWindow) {
      await appWindow.close();
      return;
    }
    window.close();
    return;
  }

  closeCommandInput();
  await showUnknownWithTaskOnce();
}

async function startSession() {
  const task = setupTaskInput.value.trim();
  const minutes = Number.parseInt(setupMinutesInput.value, 10);
  const placement = placementInput?.value || state.placement || "bottom-right";

  if (!task) {
    setupTaskInput.focus();
    return;
  }

  if (Number.isNaN(minutes) || minutes <= 0) {
    setupMinutesInput.focus();
    return;
  }

  state.initialDuration = minutes * 60;
  state.timeRemaining = state.initialDuration;
  state.isPaused = false;
  state.isOnBreak = false;
  state.breakSnapshot = null;
  setPlacement(placement);
  setTaskText(task);
  showCompletionNote(false);
  render();

  if (state.mode === "setup") {
    const opened = await launchRunningWindow(task, minutes, placement);
    if (opened) {
      return;
    }
  }

  showRunningMode();
  await setWindowForRunningMode();
  const target = getPlacementLogicalPosition(state.placement);
  await setPositionLogical(target.x, target.y);
  startCountdown();
}

setupStartBtn.addEventListener("click", async () => {
  await startSession();
});

if (setupCloseBtn) {
  setupCloseBtn.addEventListener("mousedown", (event) => {
    event.stopPropagation();
  });

  setupCloseBtn.addEventListener("click", async () => {
    if (appWindow) {
      await appWindow.close();
      return;
    }
    window.close();
  });
}

setupMinutesInput.addEventListener("beforeinput", (event) => {
  if (!event.data) {
    return;
  }
  if (!/^\d+$/.test(event.data)) {
    event.preventDefault();
  }
});

setupMinutesInput.addEventListener("input", () => {
  sanitizeMinutesInput();
});

setupMinutesInput.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    await startSession();
  }
});

lcdStrip.addEventListener("click", () => {
  if (state.mode !== "running") {
    return;
  }
  openCommandInput();
});

lcdTrack.addEventListener("click", () => {
  if (state.mode !== "running") {
    return;
  }
  openCommandInput();
});

commandInput.addEventListener("keydown", async (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    closeCommandInput();
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    await runCommand(commandInput.value);
    return;
  }

  requestAnimationFrame(updateCommandCursor);
});

commandInput.addEventListener("blur", () => {
  closeCommandInput();
});

commandInput.addEventListener("input", () => {
  const caret = commandInput.selectionStart;
  commandInput.value = commandInput.value.toUpperCase();
  if (Number.isInteger(caret)) {
    commandInput.setSelectionRange(caret, caret);
  }

  if (commandInput.value.trim().length > 0) {
    commandInput.placeholder = "";
  } else {
    commandInput.placeholder = commandHints[commandHintIndex];
  }
  updateCommandCursor();
});

commandInput.addEventListener("click", () => {
  updateCommandCursor();
});

commandInput.addEventListener("focus", () => {
  updateCommandCursor();
});

window.addEventListener("DOMContentLoaded", async () => {
  showCompletionNote(false);
  setupDragging();
  setPlacement(placementInput?.value || "bottom-right");

  if (placementGrid) {
    placementGrid.addEventListener("click", (event) => {
      const btn = event.target.closest(".placement-btn");
      if (!btn) {
        return;
      }
      setPlacement(btn.dataset.placement);
    });
  }

  if (helperCard && helperToggleBtn) {
    helperToggleBtn.addEventListener("click", async () => {
      const expanded = helperToggleBtn.getAttribute("aria-expanded") !== "false";
      helperToggleBtn.setAttribute("aria-expanded", expanded ? "false" : "true");
      helperCard.classList.toggle("compact", expanded);

      // Re-fit immediately and once more after paint to avoid clipping.
      await fitSetupWindowToContent();
      setTimeout(() => {
        fitSetupWindowToContent();
      }, 80);
    });
  }

  if (state.mode === "running") {
    let task = "";
    let minutes = 0;

    try {
      const pendingRaw = localStorage.getItem("pendingSession");
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw);
        task = typeof pending.task === "string" ? pending.task : "";
        minutes = Number.parseInt(String(pending.minutes ?? "0"), 10);
        setPlacement(pending.placement || "bottom-right");
      }
    } catch {
      // ignore parse issues
    } finally {
      localStorage.removeItem("pendingSession");
    }

    showRunningMode();
    setTaskText(task);
    showCompletionNote(false);
    state.initialDuration = Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : 0;
    state.timeRemaining = state.initialDuration;
    render();
    await setWindowForRunningMode();
    const target = getPlacementLogicalPosition(state.placement);
    await setPositionLogical(target.x, target.y);
    startCountdown();
  } else {
    showSetupMode();
    setTaskText("");
    render();
    observeSetupContentSize();
    await fitSetupWindowToContent();
  }

  if (appWindow) {
    try {
      await appWindow.setAlwaysOnTop(true);
    } catch {
      // no-op
    }
  }
});
