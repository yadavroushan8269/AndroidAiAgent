"use strict";

/* =========================================================
   MY HOME GROUP - FRONTEND APP
========================================================= */

const API = "/api";

/* =========================================================
   AUTH
========================================================= */

function getToken() {
  return localStorage.getItem("mhg_token");
}

function setToken(token) {
  localStorage.setItem("mhg_token", token);
}

function clearAuth() {
  localStorage.removeItem("mhg_token");
  localStorage.removeItem("mhg_user");
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("mhg_user") || "null");
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  localStorage.setItem("mhg_user", JSON.stringify(user));
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = "/login";
    return false;
  }

  return true;
}

function logout() {
  clearAuth();
  window.location.href = "/login";
}

/* =========================================================
   API
========================================================= */

async function apiFetch(url, options = {}) {
  const headers = {
    ...(options.headers || {})
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API}${url}`, {
    ...options,
    headers
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (response.status === 401) {
    clearAuth();

    if (!window.location.pathname.endsWith("login.html")) {
      window.location.href = "/login";
    }

    throw new Error(data.message || "Authentication required.");
  }

  if (!response.ok) {
    throw new Error(
      data.message || "Something went wrong."
    );
  }

  return data;
}

/* =========================================================
   UTILITIES
========================================================= */

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMinutes(minutes) {
  if (minutes === null || minutes === undefined) {
    return "—";
  }

  const value = Number(minutes);

  if (Number.isNaN(value)) {
    return "—";
  }

  const hours = Math.floor(value / 60);
  const mins = value % 60;

  return `${hours}h ${mins}m`;
}

function formatDate(dateString) {
  if (!dateString) {
    return "—";
  }

  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function todayISO() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTodayLong() {
  return new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function formatTime(time) {
  if (!time) {
    return "—";
  }

  const parts = String(time).split(":");

  if (parts.length < 2) {
    return time;
  }

  const date = new Date();

  date.setHours(
    Number(parts[0]),
    Number(parts[1]),
    0,
    0
  );

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/* =========================================================
   TOAST
========================================================= */

function showToast(message, type = "success") {
  let container =
    document.querySelector(".toast-container");

  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");

  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}

/* =========================================================
   COMMON HEADER
========================================================= */

function setupCommonHeader() {
  const logoutButtons =
    document.querySelectorAll("[data-logout]");

  logoutButtons.forEach((button) => {
    button.addEventListener("click", logout);
  });

  const user = getStoredUser();

  document
    .querySelectorAll("[data-user-name]")
    .forEach((element) => {
      element.textContent =
        user?.name || "User";
    });

  document
    .querySelectorAll("[data-user-email]")
    .forEach((element) => {
      element.textContent =
        user?.email || "—";
    });
}

/* =========================================================
   LOGIN
========================================================= */

function setupLoginPage() {
  const form =
    document.getElementById("loginForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const loginValue =
      document.getElementById("loginValue").value.trim();

    const password =
      document.getElementById("loginPassword").value;

    const button =
      document.getElementById("loginButton");

    if (!loginValue || !password) {
      showToast(
        "Mobile/email and password are required.",
        "error"
      );
      return;
    }

    button.disabled = true;
    button.textContent = "Logging in...";

    try {
      const payload =
        loginValue.includes("@")
          ? {
              email: loginValue,
              password
            }
          : {
              mobile: loginValue,
              password
            };

      const data = await apiFetch(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify(payload)
        }
      );

      setToken(data.token);
      setStoredUser(data.user);

      window.location.href = "/dashboard";
    } catch (error) {
      showToast(error.message, "error");

      button.disabled = false;
      button.textContent = "Login";
    }
  });
}

/* =========================================================
   REGISTER
========================================================= */

function setupRegisterPage() {
  const form =
    document.getElementById("registerForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name =
      document.getElementById("registerName").value.trim();

    const mobile =
      document.getElementById("registerMobile").value.trim();

    const email =
      document.getElementById("registerEmail").value.trim();

    const password =
      document.getElementById("registerPassword").value;

    const company =
      document.getElementById("registerCompany").value.trim();

    const button =
      document.getElementById("registerButton");

    if (!name || !email || !password) {
      showToast(
        "Please fill all required fields.",
        "error"
      );
      return;
    }

    button.disabled = true;
    button.textContent = "Creating account...";

    try {
      const data = await apiFetch(
        "/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            name,
            mobile,
            email,
            password,
            company
          })
        }
      );

      setToken(data.token);
      setStoredUser(data.user);

      window.location.href = "/dashboard";
    } catch (error) {
      showToast(error.message, "error");

      button.disabled = false;
      button.textContent = "Create Account";
    }
  });
}

/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {
  if (!requireAuth()) {
    return;
  }

  const dateElement =
    document.getElementById("dashboardDate");

  if (dateElement) {
    dateElement.textContent =
      formatTodayLong();
  }

  try {
    const data =
      await apiFetch("/dashboard");

    const statistics =
      data.statistics || {};

    document.getElementById(
      "totalVehicles"
    ).textContent =
      statistics.vehicles ?? 0;

    document.getElementById(
      "runningVehicles"
    ).textContent =
      statistics.running ?? 0;

    document.getElementById(
      "totalVehicleDuration"
    ).textContent =
      statistics.total_duration || "0h 0m";

    renderTodayActivity(
      data.today_activity || []
    );
  } catch (error) {
    showToast(error.message, "error");
  }
}

function renderTodayActivity(entries) {
  const container =
    document.getElementById("todayActivity");

  if (!container) {
    return;
  }

  if (!entries.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🚚</div>
        <h3>No activity today</h3>
        <p>No vehicle entries have been recorded today.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = entries
    .map((entry) => {
      const timeText =
        `${formatTime(entry.entry_time)} → ${
          entry.exit_time
            ? formatTime(entry.exit_time)
            : "Running"
        }`;

      return `
        <div class="activity-item">
          <div class="activity-main">
            <strong>
              ${escapeHtml(entry.vehicle_number)}
            </strong>

            <span>
              ${escapeHtml(entry.vehicle_type)}
              • ${timeText}
            </span>
          </div>

          <div class="activity-duration">
            ${
              entry.duration_formatted ||
              "Running"
            }
          </div>
        </div>
      `;
    })
    .join("");
}

/* =========================================================
   PERSONAL DURATION
========================================================= */

function setupPersonalDuration() {
  const calculateButton = document.getElementById("calculatePersonal");
  const resetButton = document.getElementById("resetPersonal");
  const inHour = document.getElementById("personalInHour");
  const inMinute = document.getElementById("personalInMinute");
  const outHour = document.getElementById("personalOutHour");
  const outMinute = document.getElementById("personalOutMinute");
  const result = document.getElementById("personalResult");

  if (!calculateButton || !inHour || !inMinute || !outHour || !outMinute || !result) return;

  // Exactly two digits per field; after HH reaches two digits, focus moves to MM.
  const hourFields = [inHour, outHour];
  const minuteFields = [inMinute, outMinute];
  [...hourFields, ...minuteFields].forEach((field) => {
    field.type = "text";
    field.inputMode = "numeric";
    field.maxLength = 2;
    field.autocomplete = "off";
    field.addEventListener("input", () => {
      const clean = field.value.replace(/\D/g, "").slice(0, 2);
      if (field.value !== clean) field.value = clean;
      if (field === inHour && clean.length === 2) inMinute.focus();
      if (field === inMinute && clean.length === 2) outHour.focus();
      if (field === outHour && clean.length === 2) outMinute.focus();
    });
  });

  calculateButton.addEventListener("click", () => {
    const values = [inHour.value, inMinute.value, outHour.value, outMinute.value];
    if (values.some((v) => v.length !== 2)) {
      showToast("In aur Out time mein HH aur MM ke dono boxes bharo.", "error");
      return;
    }
    const [ih, im, oh, om] = values.map(Number);
    if (ih > 23 || oh > 23 || im > 59 || om > 59) {
      showToast("Valid time enter karo: HH 00–23, MM 00–59.", "error");
      return;
    }
    const start = ih * 60 + im;
    let end = oh * 60 + om;
    if (end < start) end += 24 * 60;
    result.textContent = formatMinutes(end - start);
  });

  resetButton?.addEventListener("click", () => {
    [inHour, inMinute, outHour, outMinute].forEach((field) => { field.value = ""; });
    result.textContent = "0h 0m";
    inHour.focus();
  });
}

/* Cyber-style keyboard/click audio; starts only after a user interaction. */
function setupCyberSounds() {
  // Apply the same cyber-black / neon-green appearance across every page using app.js.
  if (!document.getElementById("globalCyberTheme")) {
    const cyberStyle = document.createElement("style");
    cyberStyle.id = "globalCyberTheme";
    cyberStyle.textContent = `
      :root { color-scheme: dark; --cyber-green:#39ff14; --cyber-black:#030705; }
      html, body { background:var(--cyber-black)!important; color:#d8ffe0!important; }
      body, main, .page, .page-content, .app-shell, .content, .container { background-color:var(--cyber-black)!important; color:#d8ffe0!important; }
      header, .app-header, .app-header-inner, nav, .bottom-nav, aside, .sidebar { background:#050b08!important; border-color:rgba(57,255,20,.3)!important; }
      .card, .stat-card, .panel, .modal-content, .form-card, .vehicle-card, .entry-card, .calendar-card, .greeting, .quick-actions { background:#08120d!important; color:#d8ffe0!important; border-color:rgba(57,255,20,.32)!important; box-shadow:0 0 14px rgba(57,255,20,.06), inset 0 0 12px rgba(57,255,20,.025)!important; }
      h1,h2,h3,h4,label,.card-title,.stat-value,p,small { color:#d8ffe0; }
      input,textarea,select,.form-control { background:#030906!important; color:#c8ffc4!important; border:1px solid rgba(57,255,20,.45)!important; caret-color:var(--cyber-green)!important; }
      input:focus,textarea:focus,select:focus { outline:2px solid rgba(57,255,20,.5)!important; box-shadow:0 0 12px rgba(57,255,20,.22)!important; }
      button,.btn-primary,.entry-button { background:var(--cyber-green)!important; color:#031006!important; border-color:var(--cyber-green)!important; }
      .btn-secondary,.icon-btn,.quick-action { background:#0b1910!important; color:#baffb1!important; border:1px solid rgba(57,255,20,.3)!important; }
      a { color:#a8ff9e!important; } ::selection { background:var(--cyber-green); color:#001800; }
    `;
    document.head.appendChild(cyberStyle);
  }
  let audioContext;
  const playTone = (frequency = 760, duration = 0.025, volume = 0.5) => {
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (_) { /* Audio may be unavailable or blocked by browser. */ }
  };
  document.addEventListener("keydown", (event) => {
    if (event.key.length === 1 || event.key === "Backspace" || event.key === "Enter") {
      playTone(650 + Math.random() * 350, 0.022, 0.5);
playTone(520, 0.305, 0.5);
    }
  });
}

/* =========================================================
   VEHICLES
========================================================= */

async function loadVehicleTypes(selectId) {
  const select =
    document.getElementById(selectId);

  if (!select) {
    return;
  }

  try {
    const data =
      await apiFetch("/vehicles/types");

    select.innerHTML = `
      <option value="">
        Select Vehicle Type
      </option>
    `;

    data.vehicleTypes.forEach((type) => {
      const option =
        document.createElement("option");

      option.value = type;
      option.textContent = type;

      select.appendChild(option);
    });
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function loadVehicles() {
  if (!requireAuth()) {
    return;
  }

  const container =
    document.getElementById("vehicleList");

  if (!container) {
    return;
  }

  container.innerHTML =
    `<div class="loading">Loading vehicles...</div>`;

  try {
    const data =
      await apiFetch("/vehicles");

    renderVehicles(data.vehicles || []);
  } catch (error) {
    container.innerHTML = "";
    showToast(error.message, "error");
  }
}

function renderVehicles(vehicles) {
  const container =
    document.getElementById("vehicleList");

  if (!vehicles.length) {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="empty-state-icon">🚚</div>
          <h3>No vehicles yet</h3>
          <p>Add your first vehicle to get started.</p>

          <a
            href="/pages/vehicles.html#add"
            class="btn btn-primary"
          >
            + Add Vehicle
          </a>
        </div>
      </div>
    `;

    return;
  }

  container.innerHTML = vehicles
    .map((vehicle) => {
      const running =
        vehicle.status === "Running";

      return `
        <article class="vehicle-card">

          <div class="vehicle-top">
            <div>
              <div class="vehicle-number">
                ${escapeHtml(
                  vehicle.vehicle_number
                )}
              </div>

              <div class="vehicle-type">
                ${escapeHtml(
                  vehicle.vehicle_type
                )}
              </div>
            </div>

            <span
              class="status ${
                running
                  ? "running"
                  : "available"
              }"
            >
              ${
                running
                  ? "RUNNING"
                  : "AVAILABLE"
              }
            </span>
          </div>

          <div class="vehicle-info">

            <div class="vehicle-info-row">
              <span>Driver</span>
              <strong>
                ${
                  escapeHtml(
                    vehicle.driver_name ||
                    "—"
                  )
                }
              </strong>
            </div>

            <div class="vehicle-info-row">
              <span>Contractor</span>
              <strong>
                ${
                  escapeHtml(
                    vehicle.contractor ||
                    "—"
                  )
                }
              </strong>
            </div>

          </div>

          <div class="vehicle-actions">

            <button
              class="btn btn-secondary"
              onclick="editVehicle(${vehicle.id})"
            >
              Edit
            </button>

            <button
              class="btn btn-danger"
              onclick="deleteVehicle(${vehicle.id})"
            >
              Delete
            </button>

          </div>

        </article>
      `;
    })
    .join("");
}

async function addVehicle() {
  const number =
    document.getElementById("vehicleNumber")
      .value
      .trim();

  const type =
    document.getElementById("vehicleType")
      .value;

  const driver =
    document.getElementById("vehicleDriver")
      .value
      .trim();

  const contractor =
    document.getElementById("vehicleContractor")
      .value
      .trim();

  if (!number || !type) {
    showToast(
      "Vehicle number and type are required.",
      "error"
    );
    return;
  }

  try {
    await apiFetch("/vehicles", {
      method: "POST",
      body: JSON.stringify({
        vehicle_number: number,
        vehicle_type: type,
        driver_name: driver,
        contractor
      })
    });

    showToast(
      "Vehicle added successfully."
    );

    document.getElementById(
      "vehicleForm"
    ).reset();

    loadVehicles();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function deleteVehicle(id) {
  const confirmed =
    confirm(
      "Are you sure you want to delete this vehicle?"
    );

  if (!confirmed) {
    return;
  }

  try {
    await apiFetch(
      `/vehicles/${id}`,
      {
        method: "DELETE"
      }
    );

    showToast(
      "Vehicle deleted successfully."
    );

    loadVehicles();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function editVehicle(id) {
  try {
    const data =
      await apiFetch(`/vehicles/${id}`);

    const vehicle = data.vehicle;

    const number =
      prompt(
        "Vehicle Number:",
        vehicle.vehicle_number
      );

    if (number === null) {
      return;
    }

    const driver =
      prompt(
        "Driver Name:",
        vehicle.driver_name || ""
      );

    if (driver === null) {
      return;
    }

    const contractor =
      prompt(
        "Contractor:",
        vehicle.contractor || ""
      );

    if (contractor === null) {
      return;
    }

    await apiFetch(
      `/vehicles/${id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          vehicle_number: number,
          vehicle_type: vehicle.vehicle_type,
          driver_name: driver,
          contractor,
          status: vehicle.status
        })
      }
    );

    showToast(
      "Vehicle updated successfully."
    );

    loadVehicles();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/* =========================================================
   ADD ENTRY
========================================================= */

async function loadVehicleDropdown(
  selectId = "entryVehicle"
) {
  const select =
    document.getElementById(selectId);

  if (!select) {
    return;
  }

  try {
    const data =
      await apiFetch("/vehicles");

    select.innerHTML = `
      <option value="">
        Select Vehicle
      </option>
    `;

    data.vehicles.forEach((vehicle) => {
      const option =
        document.createElement("option");

      option.value = vehicle.id;

      option.textContent =
        `${vehicle.vehicle_number} — ${vehicle.vehicle_type}`;

      option.dataset.driver =
        vehicle.driver_name || "";

      option.dataset.contractor =
        vehicle.contractor || "";

      select.appendChild(option);
    });
  } catch (error) {
    showToast(error.message, "error");
  }
}

function calculateEntryDuration() {
  const entryTime =
    document.getElementById("entryTime")?.value;

  const exitTime =
    document.getElementById("exitTime")?.value;

  const result =
    document.getElementById("entryDuration");

  if (!result) {
    return;
  }

  if (!entryTime || !exitTime) {
    result.textContent =
      exitTime
        ? "—"
        : "Running";

    return;
  }

  const [inH, inM] =
    entryTime.split(":").map(Number);

  const [outH, outM] =
    exitTime.split(":").map(Number);

  let start =
    inH * 60 + inM;

  let end =
    outH * 60 + outM;

  if (end < start) {
    end += 24 * 60;
  }

  result.textContent =
    formatMinutes(end - start);
}

function setupEntryPage() {
  const form =
    document.getElementById("entryForm");

  if (!form) {
    return;
  }

  const dateInput =
    document.getElementById("entryDate");

  const entryTime =
    document.getElementById("entryTime");

  const exitTime =
    document.getElementById("exitTime");

  dateInput.value = todayISO();

  entryTime.addEventListener(
    "input",
    calculateEntryDuration
  );

  exitTime.addEventListener(
    "input",
    calculateEntryDuration
  );

  document
    .getElementById("entryVehicle")
    .addEventListener("change", (event) => {
      const option =
        event.target.selectedOptions[0];

      if (!option) {
        return;
      }

      document.getElementById(
        "entryDriver"
      ).value =
        option.dataset.driver || "";

      document.getElementById(
        "entryContractor"
      ).value =
        option.dataset.contractor || "";
    });

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const vehicleId =
        document.getElementById(
          "entryVehicle"
        ).value;

      const driver =
        document.getElementById(
          "entryDriver"
        ).value.trim();

      const contractor =
        document.getElementById(
          "entryContractor"
        ).value.trim();

      const date =
        document.getElementById(
          "entryDate"
        ).value;

      const entry =
        document.getElementById(
          "entryTime"
        ).value;

      const exit =
        document.getElementById(
          "exitTime"
        ).value;

      const purpose =
        document.getElementById(
          "entryPurpose"
        ).value.trim();

      const notes =
        document.getElementById(
          "entryNotes"
        ).value.trim();

      const button =
        document.getElementById(
          "saveEntryButton"
        );

      if (!vehicleId || !date || !entry) {
        showToast(
          "Vehicle, date and entry time are required.",
          "error"
        );
        return;
      }

      button.disabled = true;
      button.textContent = "Saving...";

      try {
        await apiFetch(
          "/entries",
          {
            method: "POST",
            body: JSON.stringify({
              vehicle_id: Number(vehicleId),
              driver_name: driver,
              contractor,
              entry_date: date,
              entry_time: entry,
              exit_time: exit || null,
              purpose,
              notes
            })
          }
        );

        showToast(
          "Vehicle entry saved successfully."
        );

        form.reset();

        dateInput.value = todayISO();

        document.getElementById(
          "entryDuration"
        ).textContent = "—";

        await loadVehicleDropdown();
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        button.disabled = false;
        button.textContent = "SAVE ENTRY";
      }
    }
  );

  loadVehicleDropdown();
}

/* =========================================================
   CALENDAR
========================================================= */

let calendarDate =
  new Date();

let selectedCalendarDate =
  todayISO();

async function loadCalendar() {
  if (!requireAuth()) {
    return;
  }

  renderCalendar();

  await loadCalendarEntries(
    selectedCalendarDate
  );
}

function renderCalendar() {
  const year =
    calendarDate.getFullYear();

  const month =
    calendarDate.getMonth();

  const title =
    document.getElementById(
      "calendarMonth"
    );

  if (title) {
    title.textContent =
      calendarDate.toLocaleDateString(
        "en-IN",
        {
          month: "long",
          year: "numeric"
        }
      );
  }

  const daysContainer =
    document.getElementById(
      "calendarDays"
    );

  if (!daysContainer) {
    return;
  }

  const firstDay =
    new Date(
      year,
      month,
      1
    ).getDay();

  const mondayOffset =
    firstDay === 0
      ? 6
      : firstDay - 1;

  const daysInMonth =
    new Date(
      year,
      month + 1,
      0
    ).getDate();

  const daysInPreviousMonth =
    new Date(
      year,
      month,
      0
    ).getDate();

  let html = "";

  for (
    let i = mondayOffset - 1;
    i >= 0;
    i--
  ) {
    const day =
      daysInPreviousMonth - i;

    html += `
      <div class="calendar-day other-month">
        ${day}
      </div>
    `;
  }

  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {
    const date =
      `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const selected =
      date === selectedCalendarDate;

    html += `
      <button
        type="button"
        class="calendar-day ${
          selected ? "selected" : ""
        }"
        onclick="selectCalendarDate('${date}')"
      >
        ${day}
      </button>
    `;
  }

  const totalCells =
    mondayOffset + daysInMonth;

  const remaining =
    totalCells % 7 === 0
      ? 0
      : 7 - (totalCells % 7);

  for (
    let day = 1;
    day <= remaining;
    day++
  ) {
    html += `
      <div class="calendar-day other-month">
        ${day}
      </div>
    `;
  }

  daysContainer.innerHTML = html;
}

async function selectCalendarDate(date) {
  selectedCalendarDate = date;

  renderCalendar();

  await loadCalendarEntries(date);
}

async function loadCalendarEntries(date) {
  const container =
    document.getElementById(
      "calendarEntries"
    );

  if (!container) {
    return;
  }

  document.getElementById(
    "selectedCalendarDate"
  ).textContent =
    formatDate(date);

  container.innerHTML =
    `<div class="loading">Loading...</div>`;

  try {
    const data =
      await apiFetch(
        `/calendar/${date}`
      );

    renderCalendarEntries(
      data.entries || [],
      data.total_duration || "0h 0m"
    );
  } catch (error) {
    showToast(error.message, "error");
  }
}

function renderCalendarEntries(
  entries,
  total
) {
  const container =
    document.getElementById(
      "calendarEntries"
    );

  if (!entries.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📅</div>
        <h3>No vehicles</h3>
        <p>No vehicle activity was recorded on this date.</p>
      </div>
    `;

    document.getElementById(
      "calendarTotal"
    ).textContent = "0h 0m";

    return;
  }

  container.innerHTML =
    entries
      .map(
        (entry) => `
          <div class="activity-item">

            <div class="activity-main">
              <strong>
                ${escapeHtml(
                  entry.vehicle_type
                )}
                —
                ${escapeHtml(
                  entry.vehicle_number
                )}
              </strong>

              <span>
                ${formatTime(
                  entry.entry_time
                )}
                →
                ${
                  entry.exit_time
                    ? formatTime(
                        entry.exit_time
                      )
                    : "Running"
                }
              </span>
            </div>

            <div class="activity-duration">
              ${
                entry.duration_formatted ||
                "Running"
              }
            </div>

          </div>
        `
      )
      .join("");

  document.getElementById(
    "calendarTotal"
  ).textContent = total;
}

function previousMonth() {
  calendarDate.setMonth(
    calendarDate.getMonth() - 1
  );

  renderCalendar();
}

function nextMonth() {
  calendarDate.setMonth(
    calendarDate.getMonth() + 1
  );

  renderCalendar();
}

/* =========================================================
   REPORTS
========================================================= */

async function loadReportFilters() {
  const vehicleSelect =
    document.getElementById(
      "reportVehicle"
    );

  if (!vehicleSelect) {
    return;
  }

  try {
    const data =
      await apiFetch("/vehicles");

    vehicleSelect.innerHTML = `
      <option value="">All</option>
    `;

    data.vehicles.forEach((vehicle) => {
      const option =
        document.createElement("option");

      option.value = vehicle.id;

      option.textContent =
        `${vehicle.vehicle_number} — ${vehicle.vehicle_type}`;

      vehicleSelect.appendChild(option);
    });

    const drivers =
      [
        ...new Set(
          data.vehicles
            .map(
              (vehicle) =>
                vehicle.driver_name
            )
            .filter(Boolean)
        )
      ];

    const contractors =
      [
        ...new Set(
          data.vehicles
            .map(
              (vehicle) =>
                vehicle.contractor
            )
            .filter(Boolean)
        )
      ];

    const driverSelect =
      document.getElementById(
        "reportDriver"
      );

    const contractorSelect =
      document.getElementById(
        "reportContractor"
      );

    driverSelect.innerHTML =
      `<option value="">All</option>`;

    contractorSelect.innerHTML =
      `<option value="">All</option>`;

    drivers.forEach((driver) => {
      driverSelect.innerHTML += `
        <option value="${escapeHtml(driver)}">
          ${escapeHtml(driver)}
        </option>
      `;
    });

    contractors.forEach((contractor) => {
      contractorSelect.innerHTML += `
        <option value="${escapeHtml(contractor)}">
          ${escapeHtml(contractor)}
        </option>
      `;
    });
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function generateReport() {
  const params =
    new URLSearchParams();

  const from =
    document.getElementById(
      "reportFrom"
    ).value;

  const to =
    document.getElementById(
      "reportTo"
    ).value;

  const vehicle =
    document.getElementById(
      "reportVehicle"
    ).value;

  const driver =
    document.getElementById(
      "reportDriver"
    ).value;

  const contractor =
    document.getElementById(
      "reportContractor"
    ).value;

  if (from) {
    params.set("from", from);
  }

  if (to) {
    params.set("to", to);
  }

  if (vehicle) {
    params.set(
      "vehicle_id",
      vehicle
    );
  }

  if (driver) {
    params.set(
      "driver",
      driver
    );
  }

  if (contractor) {
    params.set(
      "contractor",
      contractor
    );
  }

  try {
    const data =
      await apiFetch(
        `/reports?${params.toString()}`
      );

    renderReport(
      data.summary,
      data.entries
    );
  } catch (error) {
    showToast(error.message, "error");
  }
}

function renderReport(
  summary,
  entries
) {
  document.getElementById(
    "reportVehicles"
  ).textContent =
    summary.total_vehicles;

  document.getElementById(
    "reportEntries"
  ).textContent =
    summary.total_entries;

  document.getElementById(
    "reportDuration"
  ).textContent =
    summary.total_duration ||
    "0h 0m";

  const tableBody =
    document.getElementById(
      "reportTableBody"
    );

  if (!entries.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            No report data found.
          </div>
        </td>
      </tr>
    `;

    return;
  }

  tableBody.innerHTML =
    entries
      .map(
        (entry) => `
          <tr>
            <td>
              ${formatDate(
                entry.entry_date
              )}
            </td>

            <td>
              ${escapeHtml(
                entry.vehicle_number
              )}
            </td>

            <td>
              ${escapeHtml(
                entry.vehicle_type
              )}
            </td>

            <td>
              ${escapeHtml(
                entry.driver_name ||
                "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                entry.contractor ||
                "—"
              )}
            </td>

            <td>
              ${formatTime(
                entry.entry_time
              )}
            </td>

            <td>
              ${
                entry.exit_time
                  ? formatTime(
                      entry.exit_time
                    )
                  : "Running"
              }
            </td>

            <td>
              ${
                entry.duration_formatted ||
                "Running"
              }
            </td>
          </tr>
        `
      )
      .join("");
}

/* =========================================================
   REPORT EXPORT
========================================================= */

function exportReportCSV() {
  const rows =
    [
      [
        "Date",
        "Vehicle",
        "Type",
        "Driver",
        "Contractor",
        "Entry",
        "Exit",
        "Duration"
      ]
    ];

  document
    .querySelectorAll(
      "#reportTableBody tr"
    )
    .forEach((row) => {
      const cells =
        [...row.children]
          .map(
            (cell) =>
              cell.textContent
                .trim()
                .replaceAll(",", " ")
          );

      if (cells.length === 8) {
        rows.push(cells);
      }
    });

  if (rows.length === 1) {
    showToast(
      "No report data to export.",
      "error"
    );

    return;
  }

  const csv =
    rows
      .map(
        (row) =>
          row
            .map(
              (value) =>
                `"${value.replaceAll(
                  '"',
                  '""'
                )}"`
            )
            .join(",")
      )
      .join("\n");

  const blob =
    new Blob(
      [csv],
      {
        type: "text/csv;charset=utf-8;"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download =
    `my-home-group-report-${todayISO()}.csv`;

  link.click();

  URL.revokeObjectURL(url);
}

/* =========================================================
   PROFILE
========================================================= */

async function loadProfile() {
  if (!requireAuth()) {
    return;
  }

  try {
    const data =
      await apiFetch(
        "/auth/profile"
      );

    const user =
      data.user;

    setStoredUser(user);

    const fields = {
      profileName:
        user.name,
      profileEmail:
        user.email,
      profileMobile:
        user.mobile || "XXXXXXXXXX",
      profileRole:
        user.role || "—",
      profileCompany:
        user.company || "—"
    };

    Object.entries(fields)
      .forEach(
        ([id, value]) => {
          const element =
            document.getElementById(id);

          if (element) {
            element.textContent =
              value;
          }
        }
      );
  } catch (error) {
    showToast(error.message, "error");
  }
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

async function loadNotifications() {
  if (!requireAuth()) {
    return;
  }

  const container =
    document.getElementById(
      "notificationList"
    );

  if (!container) {
    return;
  }

  try {
    const data =
      await apiFetch(
        "/notifications"
      );

    renderNotifications(
      data.notifications || []
    );

    updateNotificationBadge(
      data.notifications || []
    );
  } catch (error) {
    showToast(error.message, "error");
  }
}

function renderNotifications(
  notifications
) {
  const container =
    document.getElementById(
      "notificationList"
    );

  if (!notifications.length) {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="empty-state-icon">🔔</div>
          <h3>No notifications</h3>
          <p>You are all caught up.</p>
        </div>
      </div>
    `;

    return;
  }

  container.innerHTML =
    notifications
      .map(
        (notification) => `
          <article
            class="notification-item ${
              notification.is_read
                ? ""
                : "unread"
            }"
          >

            <div class="notification-content">

              <div class="notification-icon">
                🔔
              </div>

              <div>
                <h3>
                  ${escapeHtml(
                    notification.title
                  )}
                </h3>

                <p>
                  ${escapeHtml(
                    notification.message
                  )}
                </p>

                <div class="notification-time">
                  ${formatDateTime(
                    notification.created_at
                  )}
                </div>
              </div>

            </div>

            <div class="notification-actions">

              ${
                !notification.is_read
                  ? `
                    <button
                      class="btn btn-secondary"
                      onclick="markNotificationRead(${notification.id})"
                    >
                      Mark Read
                    </button>
                  `
                  : ""
              }

              <button
                class="btn btn-danger"
                onclick="deleteNotification(${notification.id})"
              >
                Delete
              </button>

            </div>

          </article>
        `
      )
      .join("");
}

function updateNotificationBadge(
  notifications
) {
  const unread =
    notifications.filter(
      (item) =>
        !item.is_read
    ).length;

  document
    .querySelectorAll(
      ".notification-badge"
    )
    .forEach((badge) => {
      badge.textContent =
        unread > 99
          ? "99+"
          : unread;

      badge.classList.toggle(
        "hidden",
        unread === 0
      );
    });
}

async function markNotificationRead(
  id
) {
  try {
    await apiFetch(
      `/notifications/${id}/read`,
      {
        method: "PATCH"
      }
    );

    loadNotifications();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function markAllNotificationsRead() {
  try {
    await apiFetch(
      "/notifications/read-all",
      {
        method: "PATCH"
      }
    );

    showToast(
      "All notifications marked as read."
    );

    loadNotifications();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function deleteNotification(
  id
) {
  try {
    await apiFetch(
      `/notifications/${id}`,
      {
        method: "DELETE"
      }
    );

    loadNotifications();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function clearAllNotifications() {
  const confirmed =
    confirm(
      "Clear all notifications?"
    );

  if (!confirmed) {
    return;
  }

  try {
    await apiFetch(
      "/notifications",
      {
        method: "DELETE"
      }
    );

    showToast(
      "All notifications cleared."
    );

    loadNotifications();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/* =========================================================
   NOTIFICATION BADGE - HEADER
========================================================= */

async function loadNotificationBadge() {
  if (!getToken()) {
    return;
  }

  try {
    const data =
      await apiFetch(
        "/notifications"
      );

    updateNotificationBadge(
      data.notifications || []
    );
  } catch {
    // Do not show errors on every page.
  }
}

/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupCommonHeader();

    setupLoginPage();

    setupRegisterPage();

    setupPersonalDuration();
    setupCyberSounds();

    setupEntryPage();

    if (
      document.getElementById(
        "dashboardPage"
      )
    ) {
      loadDashboard();
    }

    if (
      document.getElementById(
        "vehicleList"
      )
    ) {
      loadVehicleTypes(
        "vehicleType"
      );

      loadVehicles();
    }

    if (
      document.getElementById(
        "calendarDays"
      )
    ) {
      loadCalendar();
    }

    if (
      document.getElementById(
        "reportTableBody"
      )
    ) {
      loadReportFilters();

      const today =
        todayISO();

      document.getElementById(
        "reportFrom"
      ).value = today;

      document.getElementById(
        "reportTo"
      ).value = today;

      generateReport();
    }

    if (
      document.getElementById(
        "profileName"
      )
    ) {
      loadProfile();
    }

    if (
      document.getElementById(
        "notificationList"
      )
    ) {
      loadNotifications();
    }

    loadNotificationBadge();
  }
);
