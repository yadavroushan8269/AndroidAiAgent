const API_BASE = "/api";

const AUTH_TOKEN_KEY = "hyma_auth_token";
const CURRENT_USER_KEY = "hyma_current_user";

// ============================================================
// BASIC HELPERS
// ============================================================

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

function getCurrentUser() {
  try {
    return JSON.parse(
      localStorage.getItem(CURRENT_USER_KEY) || "null"
    );
  } catch {
    return null;
  }
}

function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(
      CURRENT_USER_KEY,
      JSON.stringify(user)
    );
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

function isLoggedIn() {
  return Boolean(getAuthToken());
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

// ============================================================
// API REQUEST
// ============================================================

async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();

  const headers = {
    ...(options.headers || {}),
  };

  if (!headers["Content-Type"] && options.body) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new Error(
      "Unable to connect to the server. Please check your internet connection."
    );
  }

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (response.status === 401) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);

    const currentPath = window.location.pathname;

    if (
      !currentPath.endsWith("/login.html") &&
      !currentPath.endsWith("/register.html") &&
      !currentPath.endsWith("/")
    ) {
      window.location.href = "/pages/login.html";
    }

    throw new Error(
      data.message || "Session expired. Please login again."
    );
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

// ============================================================
// AUTH
// ============================================================

async function registerUser(userData) {
  const data = await apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });

  if (data.token) {
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
  }

  if (data.user) {
    setCurrentUser(data.user);
  }

  return data;
}

async function loginUser(email, password) {
  const data = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if (data.token) {
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
  }

  if (data.user) {
    setCurrentUser(data.user);
  }

  return data;
}

async function getMe() {
  const data = await apiRequest("/me");

  if (data.user) {
    setCurrentUser(data.user);
  }

  return data.user;
}

async function updateProfile(profileData) {
  const data = await apiRequest("/me", {
    method: "PUT",
    body: JSON.stringify(profileData),
  });

  if (data.user) {
    setCurrentUser(data.user);
  }

  return data;
}

async function changePassword(currentPassword, newPassword) {
  return apiRequest("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });
}

function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);

  window.location.href = "/pages/login.html";
}

// ============================================================
// VEHICLES
// ============================================================

async function getVehicles() {
  const data = await apiRequest("/vehicles");
  return data.vehicles || [];
}

async function createVehicle(vehicleData) {
  return apiRequest("/vehicles", {
    method: "POST",
    body: JSON.stringify(vehicleData),
  });
}

async function updateVehicle(id, vehicleData) {
  return apiRequest(`/vehicles/${id}`, {
    method: "PUT",
    body: JSON.stringify(vehicleData),
  });
}

async function deleteVehicle(id) {
  return apiRequest(`/vehicles/${id}`, {
    method: "DELETE",
  });
}

// ============================================================
// ENTRIES
// ============================================================

async function getEntries(filters = {}) {
  const params = new URLSearchParams();

  if (filters.date) {
    params.set("date", filters.date);
  }

  if (filters.vehicle_id) {
    params.set("vehicle_id", filters.vehicle_id);
  }

  if (filters.from) {
    params.set("from", filters.from);
  }

  if (filters.to) {
    params.set("to", filters.to);
  }

  const query = params.toString();

  const data = await apiRequest(
    `/entries${query ? `?${query}` : ""}`
  );

  return data.entries || [];
}

async function createEntry(entryData) {
  return apiRequest("/entries", {
    method: "POST",
    body: JSON.stringify(entryData),
  });
}

async function deleteEntry(id) {
  return apiRequest(`/entries/${id}`, {
    method: "DELETE",
  });
}

// ============================================================
// NOTIFICATIONS - BACKEND
// ============================================================

async function getNotifications() {
  const data = await apiRequest("/notifications");

  return data.notifications || [];
}

async function getUnreadNotificationCount() {
  const data = await apiRequest(
    "/notifications/unread-count"
  );

  return Number(data.count || 0);
}

async function createNotification(notificationData) {
  return apiRequest("/notifications", {
    method: "POST",
    body: JSON.stringify(notificationData),
  });
}

async function sendAdminNotification(notificationData) {
  return apiRequest("/admin/notifications", {
    method: "POST",
    body: JSON.stringify(notificationData),
  });
}

async function markNotificationRead(id) {
  return apiRequest(`/notifications/${id}/read`, {
    method: "PUT",
  });
}

async function markAllNotificationsRead() {
  return apiRequest("/notifications/read-all", {
    method: "PUT",
  });
}

async function deleteNotification(id) {
  return apiRequest(`/notifications/${id}`, {
    method: "DELETE",
  });
}

async function clearNotifications() {
  return apiRequest("/notifications", {
    method: "DELETE",
  });
}

// ============================================================
// DATE HELPERS
// ============================================================

function getTodayDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "-";

  const date = new Date(
    `${dateString}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(timeString) {
  if (!timeString) return "-";

  const parts = String(timeString).split(":");

  if (parts.length < 2) {
    return timeString;
  }

  let hour = Number(parts[0]);
  const minute = parts[1];

  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12;

  if (hour === 0) {
    hour = 12;
  }

  return `${hour}:${minute} ${suffix}`;
}

// ============================================================
// DURATION HELPERS
// ============================================================

function calculateDurationMinutes(
  entryTime,
  exitTime
) {
  if (!entryTime || !exitTime) {
    return 0;
  }

  const entryParts = entryTime
    .split(":")
    .map(Number);

  const exitParts = exitTime
    .split(":")
    .map(Number);

  let entryMinutes =
    entryParts[0] * 60 +
    entryParts[1];

  let exitMinutes =
    exitParts[0] * 60 +
    exitParts[1];

  // Handles overnight duration.
  if (exitMinutes < entryMinutes) {
    exitMinutes += 24 * 60;
  }

  return exitMinutes - entryMinutes;
}

function formatDuration(minutes) {
  const total = Number(minutes) || 0;

  const hours = Math.floor(total / 60);
  const mins = total % 60;

  if (hours === 0) {
    return `${mins} min`;
  }

  if (mins === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${mins} min`;
}

// ============================================================
// NOTIFICATION HELPERS
// ============================================================

function notificationTypeClass(type) {
  const allowed = [
    "info",
    "success",
    "warning",
    "error",
  ];

  return allowed.includes(type)
    ? type
    : "info";
}

function notificationIcon(type) {
  switch (type) {
    case "success":
      return "✓";

    case "warning":
      return "⚠";

    case "error":
      return "✕";

    default:
      return "i";
  }
}

function formatNotificationTime(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================
// DASHBOARD NOTIFICATION BADGE
// ============================================================

async function updateNotificationBadges() {
  try {
    if (!isLoggedIn()) {
      return 0;
    }

    const count =
      await getUnreadNotificationCount();

    const badges = document.querySelectorAll(
      "[data-notification-badge]"
    );

    badges.forEach((badge) => {
      badge.textContent =
        count > 99 ? "99+" : String(count);

      badge.style.display =
        count > 0 ? "inline-flex" : "none";
    });

    const genericBadges =
      document.querySelectorAll(
        ".notification-badge"
      );

    genericBadges.forEach((badge) => {
      badge.textContent =
        count > 99 ? "99+" : String(count);

      badge.style.display =
        count > 0 ? "inline-flex" : "none";
    });

    return count;
  } catch (error) {
    console.warn(
      "Notification badge update failed:",
      error
    );

    return 0;
  }
}

// ============================================================
// AUTH PAGE PROTECTION
// ============================================================

function isPublicPage() {
  const path = window.location.pathname;

  return (
    path.endsWith("/login.html") ||
    path.endsWith("/register.html") ||
    path === "/" ||
    path.endsWith("/index.html")
  );
}

async function protectPrivatePage() {
  if (isPublicPage()) {
    return;
  }

  if (!getAuthToken()) {
    window.location.href = "/pages/login.html";
    return;
  }

  try {
    await getMe();
  } catch (error) {
    console.warn(
      "Authentication check failed:",
      error
    );
  }
}

// ============================================================
// GLOBAL LOGOUT BUTTONS
// ============================================================

function setupLogoutButtons() {
  document
    .querySelectorAll(
      '[data-action="logout"], .logout-btn'
    )
    .forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        logout();
      });
    });
}

// ============================================================
// DISPLAY USER DATA
// ============================================================

function fillUserElements(user = getCurrentUser()) {
  if (!user) return;

  document
    .querySelectorAll("[data-user-name]")
    .forEach((element) => {
      element.textContent = user.name || "User";
    });

  document
    .querySelectorAll("[data-user-email]")
    .forEach((element) => {
      element.textContent = user.email || "";
    });

  document
    .querySelectorAll("[data-user-role]")
    .forEach((element) => {
      element.textContent =
        user.role || "Security Guard";
    });

  document
    .querySelectorAll("[data-user-company]")
    .forEach((element) => {
      element.textContent = user.company || "";
    });

  document
    .querySelectorAll("[data-user-mobile]")
    .forEach((element) => {
      element.textContent = user.mobile || "";
    });
}

// ============================================================
// MOBILE NAVIGATION
// ============================================================

function setupMobileNavigation() {
  document
    .querySelectorAll(
      "[data-nav-link]"
    )
    .forEach((link) => {
      link.addEventListener("click", () => {
        document
          .querySelectorAll(
            "[data-nav-link]"
          )
          .forEach((item) => {
            item.classList.remove("active");
          });

        link.classList.add("active");
      });
    });
}

// ============================================================
// GENERIC TOAST
// ============================================================

function showToast(
  message,
  type = "info"
) {
  let container =
    document.getElementById(
      "global-toast-container"
    );

  if (!container) {
    container =
      document.createElement("div");

    container.id =
      "global-toast-container";

    container.style.position = "fixed";
    container.style.left = "16px";
    container.style.right = "16px";
    container.style.bottom = "80px";
    container.style.zIndex = "99999";
    container.style.pointerEvents =
      "none";

    document.body.appendChild(container);
  }

  const toast =
    document.createElement("div");

  toast.textContent = message;

  toast.style.background =
    type === "error"
      ? "#dc2626"
      : type === "success"
      ? "#16a34a"
      : "#1f2937";

  toast.style.color = "#fff";
  toast.style.padding = "12px 16px";
  toast.style.borderRadius = "10px";
  toast.style.marginTop = "8px";
  toast.style.fontSize = "14px";
  toast.style.boxShadow =
    "0 6px 20px rgba(0,0,0,.2)";
  toast.style.pointerEvents = "auto";

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ============================================================
// GLOBAL EXPORT
// ============================================================

window.MyHomeGroup = {
  API_BASE,

  getAuthToken,
  getCurrentUser,
  setCurrentUser,
  isLoggedIn,

  apiRequest,

  registerUser,
  loginUser,
  getMe,
  updateProfile,
  changePassword,
  logout,

  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,

  getEntries,
  createEntry,
  deleteEntry,

  // Notifications
  getNotifications,
  getUnreadNotificationCount,
  createNotification,
  sendAdminNotification,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearNotifications,
  updateNotificationBadges,

  // Helpers
  escapeHtml,
  getTodayDate,
  formatDate,
  formatTime,
  calculateDurationMinutes,
  formatDuration,
  notificationTypeClass,
  notificationIcon,
  formatNotificationTime,

  showToast,
};

// Compatibility globals
window.getAuthToken = getAuthToken;
window.getCurrentUser = getCurrentUser;
window.isLoggedIn = isLoggedIn;
window.logout = logout;

window.getVehicles = getVehicles;
window.createVehicle = createVehicle;
window.updateVehicle = updateVehicle;
window.deleteVehicle = deleteVehicle;

window.getEntries = getEntries;
window.createEntry = createEntry;
window.deleteEntry = deleteEntry;

window.getNotifications = getNotifications;
window.getUnreadNotificationCount =
  getUnreadNotificationCount;
window.markNotificationRead =
  markNotificationRead;
window.markAllNotificationsRead =
  markAllNotificationsRead;
window.deleteNotification =
  deleteNotification;
window.clearNotifications =
  clearNotifications;

window.showToast = showToast;

// ============================================================
// STARTUP
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    try {
      await protectPrivatePage();

      setupLogoutButtons();
      setupMobileNavigation();

      fillUserElements();

      if (isLoggedIn()) {
        updateNotificationBadges();
      }
    } catch (error) {
      console.error(
        "Application startup error:",
        error
      );
    }
  }
);
