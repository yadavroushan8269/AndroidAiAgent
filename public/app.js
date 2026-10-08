/* =========================================================
   MY HOME GROUP
   Central Frontend Application
========================================================= */

(() => {
  "use strict";

  const API_BASE = "/api";

  const STORAGE_TOKEN = "my_home_group_auth_token";
  const STORAGE_USER = "my_home_group_current_user";

  /* =======================================================
     BASIC HELPERS
  ======================================================= */

  function qs(selector, parent = document) {
    return parent.querySelector(selector);
  }

  function qsa(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getToken() {
    return localStorage.getItem(STORAGE_TOKEN) || "";
  }

  function getStoredUser() {
    try {
      const raw = localStorage.getItem(STORAGE_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveAuth(token, user) {
    if (token) {
      localStorage.setItem(STORAGE_TOKEN, token);
    }

    if (user) {
      localStorage.setItem(
        STORAGE_USER,
        JSON.stringify(user)
      );
    }
  }

  function clearAuth() {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
  }

  function isLoggedIn() {
    return Boolean(getToken());
  }

  function getCurrentUser() {
    return getStoredUser();
  }

  /* =======================================================
     API
  ======================================================= */

  async function apiRequest(
    endpoint,
    options = {}
  ) {
    const config = {
      method: options.method || "GET",
      headers: {
        ...(options.headers || {})
      }
    };

    if (options.body !== undefined) {
      config.headers["Content-Type"] =
        "application/json";

      config.body =
        typeof options.body === "string"
          ? options.body
          : JSON.stringify(options.body);
    }

    const token = getToken();

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    let response;

    try {
      response = await fetch(
        `${API_BASE}${endpoint}`,
        config
      );
    } catch (error) {
      throw new Error(
        "Unable to connect to server. Please check your internet connection."
      );
    }

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (response.status === 401) {
      clearAuth();

      const path =
        window.location.pathname || "";

      const protectedPage =
        path.includes("/pages/") &&
        !path.endsWith("/login.html") &&
        !path.endsWith("/register.html");

      if (protectedPage) {
        window.location.href =
          "/pages/login.html";
      }
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
        `Request failed (${response.status})`
      );
    }

    return data;
  }

  /* =======================================================
     AUTH
  ======================================================= */

  async function registerUser(payload) {
    const data = await apiRequest(
      "/auth/register",
      {
        method: "POST",
        body: payload
      }
    );

    if (data.token) {
      saveAuth(
        data.token,
        data.user
      );
    }

    return data;
  }

  async function loginUser(login, password) {
    const data = await apiRequest(
      "/auth/login",
      {
        method: "POST",
        body: {
          login,
          password
        }
      }
    );

    if (data.token) {
      saveAuth(
        data.token,
        data.user
      );
    }

    return data;
  }

  async function getMe() {
    const data = await apiRequest(
      "/me"
    );

    if (data.user) {
      localStorage.setItem(
        STORAGE_USER,
        JSON.stringify(data.user)
      );
    }

    return data.user;
  }

  async function updateProfile(payload) {
    const data = await apiRequest(
      "/me",
      {
        method: "PUT",
        body: payload
      }
    );

    if (data.user) {
      localStorage.setItem(
        STORAGE_USER,
        JSON.stringify(data.user)
      );
    }

    return data;
  }

  async function changePassword(
    currentPassword,
    newPassword
  ) {
    return apiRequest(
      "/auth/change-password",
      {
        method: "POST",
        body: {
          currentPassword,
          newPassword
        }
      }
    );
  }

  function logout(
    redirect = true
  ) {
    clearAuth();

    if (redirect) {
      window.location.href =
        "/pages/login.html";
    }
  }

  /* =======================================================
     VEHICLES
  ======================================================= */

  async function getVehicles() {
    const data = await apiRequest(
      "/vehicles"
    );

    return data.vehicles || [];
  }

  async function createVehicle(payload) {
    return apiRequest(
      "/vehicles",
      {
        method: "POST",
        body: payload
      }
    );
  }

  async function updateVehicle(
    id,
    payload
  ) {
    return apiRequest(
      `/vehicles/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: payload
      }
    );
  }

  async function deleteVehicle(id) {
    return apiRequest(
      `/vehicles/${encodeURIComponent(id)}`,
      {
        method: "DELETE"
      }
    );
  }

  /* =======================================================
     ENTRIES
  ======================================================= */

  async function getEntries(params = {}) {
    const query = new URLSearchParams();

    Object.entries(params).forEach(
      ([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          value !== ""
        ) {
          query.set(
            key,
            value
          );
        }
      }
    );

    const queryString =
      query.toString();

    const endpoint =
      queryString
        ? `/entries?${queryString}`
        : "/entries";

    const data =
      await apiRequest(endpoint);

    return data.entries || [];
  }

  async function createEntry(payload) {
    return apiRequest(
      "/entries",
      {
        method: "POST",
        body: payload
      }
    );
  }

  async function deleteEntry(id) {
    return apiRequest(
      `/entries/${encodeURIComponent(id)}`,
      {
        method: "DELETE"
      }
    );
  }

  /* =======================================================
     NOTIFICATIONS
  ======================================================= */

  async function getNotifications() {
    const data =
      await apiRequest(
        "/notifications"
      );

    return data.notifications || [];
  }

  async function getUnreadNotificationCount() {
    const data =
      await apiRequest(
        "/notifications/unread-count"
      );

    return Number(data.count || 0);
  }

  async function createNotification(payload) {
    return apiRequest(
      "/notifications",
      {
        method: "POST",
        body: payload
      }
    );
  }

  async function sendAdminNotification(
    payload
  ) {
    return apiRequest(
      "/admin/notifications",
      {
        method: "POST",
        body: payload
      }
    );
  }

  async function markNotificationRead(id) {
    return apiRequest(
      `/notifications/${encodeURIComponent(id)}/read`,
      {
        method: "PUT"
      }
    );
  }

  async function markAllNotificationsRead() {
    return apiRequest(
      "/notifications/read-all",
      {
        method: "PUT"
      }
    );
  }

  async function deleteNotification(id) {
    return apiRequest(
      `/notifications/${encodeURIComponent(id)}`,
      {
        method: "DELETE"
      }
    );
  }

  async function clearNotifications() {
    return apiRequest(
      "/notifications",
      {
        method: "DELETE"
      }
    );
  }

  /* =======================================================
     ADMIN
  ======================================================= */

  async function getAdminUsers() {
    const data =
      await apiRequest(
        "/admin/users"
      );

    return data.users || [];
  }

  /* =======================================================
     DATE HELPERS
  ======================================================= */

  function pad(number) {
    return String(number)
      .padStart(2, "0");
  }

  function todayString() {
    const now = new Date();

    return [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate())
    ].join("-");
  }

  function formatDate(
    dateValue
  ) {
    if (!dateValue) {
      return "-";
    }

    const date =
      new Date(`${dateValue}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }

    return date.toLocaleDateString(
      undefined,
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    );
  }

  function formatTime(timeValue) {
    if (!timeValue) {
      return "-";
    }

    const value =
      String(timeValue)
        .slice(0, 5);

    const parts =
      value.split(":");

    if (parts.length < 2) {
      return value;
    }

    let hour =
      Number(parts[0]);

    const minute =
      parts[1];

    const suffix =
      hour >= 12 ? "PM" : "AM";

    hour =
      hour % 12 || 12;

    return `${hour}:${minute} ${suffix}`;
  }

  function minutesToDuration(minutes) {
    const total =
      Math.max(
        0,
        Number(minutes) || 0
      );

    const hours =
      Math.floor(total / 60);

    const mins =
      total % 60;

    if (hours === 0) {
      return `${mins}m`;
    }

    if (mins === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${mins}m`;
  }

  function calculateDuration(
    entryTime,
    exitTime
  ) {
    if (
      !entryTime ||
      !exitTime
    ) {
      return 0;
    }

    const start =
      parseTimeToMinutes(
        entryTime
      );

    const end =
      parseTimeToMinutes(
        exitTime
      );

    if (
      start === null ||
      end === null
    ) {
      return 0;
    }

    let difference =
      end - start;

    if (difference < 0) {
      difference += 24 * 60;
    }

    return difference;
  }

  function parseTimeToMinutes(
    value
  ) {
    const match =
      String(value)
        .match(
          /^(\d{1,2}):(\d{2})/
        );

    if (!match) {
      return null;
    }

    const hours =
      Number(match[1]);

    const minutes =
      Number(match[2]);

    if (
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

    return (
      hours * 60 +
      minutes
    );
  }

  function getDateDaysAgo(days) {
    const date =
      new Date();

    date.setDate(
      date.getDate() - days
    );

    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join("-");
  }

  function getMonthStart() {
    const date =
      new Date();

    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      "01"
    ].join("-");
  }

  function getWeekStart() {
    const date =
      new Date();

    const day =
      date.getDay();

    const diff =
      day === 0
        ? -6
        : 1 - day;

    date.setDate(
      date.getDate() + diff
    );

    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join("-");
  }

  /* =======================================================
     USER HELPERS
  ======================================================= */

  function getInitials(name) {
    const text =
      String(name || "")
        .trim();

    if (!text) {
      return "U";
    }

    const parts =
      text.split(/\s+/);

    if (parts.length === 1) {
      return parts[0]
        .slice(0, 2)
        .toUpperCase();
    }

    return (
      parts[0][0] +
      parts[parts.length - 1][0]
    ).toUpperCase();
  }

  function userDisplayName() {
    const user =
      getCurrentUser();

    return (
      user?.name ||
      "User"
    );
  }

  function userRole() {
    const user =
      getCurrentUser();

    return (
      user?.role ||
      "Security Guard"
    );
  }

  /* =======================================================
     TOAST
  ======================================================= */

  function ensureToastContainer() {
    let container =
      qs(".toast-container");

    if (container) {
      return container;
    }

    container =
      document.createElement("div");

    container.className =
      "toast-container";

    document.body.appendChild(
      container
    );

    return container;
  }

  function showToast(
    message,
    type = "success"
  ) {
    const container =
      ensureToastContainer();

    const toast =
      document.createElement("div");

    toast.className =
      `toast ${type}`;

    const icon =
      type === "error"
        ? "⚠️"
        : type === "warning"
          ? "⚠️"
          : "✓";

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-message">
        ${escapeHtml(message)}
      </div>
    `;

    container.appendChild(
      toast
    );

    window.setTimeout(() => {
      toast.remove();
    }, 3500);
  }

  /* =======================================================
     FORM HELPERS
  ======================================================= */

  function setButtonLoading(
    button,
    loading,
    loadingText = "Please wait..."
  ) {
    if (!button) {
      return;
    }

    if (loading) {
      if (
        !button.dataset.originalText
      ) {
        button.dataset.originalText =
          button.innerHTML;
      }

      button.disabled = true;

      button.innerHTML = `
        <span class="spinner"
              style="
                width:16px;
                height:16px;
                border-width:2px;
              ">
        </span>
        ${escapeHtml(loadingText)}
      `;
    } else {
      button.disabled = false;

      if (
        button.dataset.originalText
      ) {
        button.innerHTML =
          button.dataset.originalText;

        delete button.dataset
          .originalText;
      }
    }
  }

  function setFormMessage(
    element,
    message,
    type = "error"
  ) {
    if (!element) {
      return;
    }

    if (!message) {
      element.innerHTML = "";
      element.className = "";
      return;
    }

    element.className =
      `alert alert-${type}`;

    element.textContent =
      message;
  }

  /* =======================================================
     AUTH PROTECTION
  ======================================================= */

  function isPublicPage() {
    const path =
      window.location.pathname;

    return (
      path === "/" ||
      path.endsWith("/index.html") ||
      path.endsWith("/login.html") ||
      path.endsWith("/register.html")
    );
  }

  function protectPage() {
    if (
      !isPublicPage() &&
      !isLoggedIn()
    ) {
      window.location.href =
        "/pages/login.html";
    }
  }

  function redirectLoggedInUser() {
    if (
      !isLoggedIn()
    ) {
      return;
    }

    const path =
      window.location.pathname;

    if (
      path.endsWith("/login.html") ||
      path.endsWith("/register.html")
    ) {
      window.location.href =
        "/pages/dashboard.html";
    }
  }

  /* =======================================================
     DISPLAY USER
  ======================================================= */

  function updateUserDisplay() {
    const user =
      getCurrentUser();

    if (!user) {
      return;
    }

    qsa(
      "[data-user-name]"
    ).forEach(
      element => {
        element.textContent =
          user.name || "User";
      }
    );

    qsa(
      "[data-user-email]"
    ).forEach(
      element => {
        element.textContent =
          user.email ||
          user.mobile ||
          "";
      }
    );

    qsa(
      "[data-user-mobile]"
    ).forEach(
      element => {
        element.textContent =
          user.mobile || "-";
      }
    );

    qsa(
      "[data-user-role]"
    ).forEach(
      element => {
        element.textContent =
          user.role ||
          "Security Guard";
      }
    );

    qsa(
      "[data-user-company]"
    ).forEach(
      element => {
        element.textContent =
          user.company || "-";
      }
    );

    qsa(
      "[data-user-initials]"
    ).forEach(
      element => {
        element.textContent =
          getInitials(
            user.name
          );
      }
    );
  }

  /* =======================================================
     NOTIFICATION BADGE
  ======================================================= */

  async function updateNotificationBadge() {
    if (!isLoggedIn()) {
      return;
    }

    try {
      const count =
        await getUnreadNotificationCount();

      qsa(
        "[data-notification-count]"
      ).forEach(
        element => {
          if (count > 0) {
            element.textContent =
              count > 99
                ? "99+"
                : String(count);

            element.classList.remove(
              "hidden"
            );
          } else {
            element.textContent = "";
            element.classList.add(
              "hidden"
            );
          }
        }
      );
    } catch {
      /* Do not break page if notification
         request fails. */
    }
  }

  /* =======================================================
     LOGOUT BUTTONS
  ======================================================= */

  function bindLogoutButtons() {
    qsa(
      "[data-logout], .logout-btn"
    ).forEach(
      button => {
        if (
          button.dataset.logoutBound
        ) {
          return;
        }

        button.dataset.logoutBound =
          "true";

        button.addEventListener(
          "click",
          event => {
            event.preventDefault();

            logout(true);
          }
        );
      }
    );
  }

  /* =======================================================
     MOBILE NAV
  ======================================================= */

  function setupMobileNav() {
    const currentPath =
      window.location.pathname;

    qsa(
      ".mobile-nav-item[data-page]"
    ).forEach(
      item => {
        const page =
          item.dataset.page;

        if (
          page &&
          currentPath.includes(page)
        ) {
          item.classList.add(
            "active"
          );
        }
      }
    );
  }

  /* =======================================================
     DATE / TIME DEFAULTS
  ======================================================= */

  function setTodayDefaults() {
    qsa(
      'input[type="date"][data-today]'
    ).forEach(
      input => {
        if (!input.value) {
          input.value =
            todayString();
        }
      }
    );

    const now =
      new Date();

    const currentTime =
      `${pad(now.getHours())}:${pad(
        now.getMinutes()
      )}`;

    qsa(
      'input[type="time"][data-current-time]'
    ).forEach(
      input => {
        if (!input.value) {
          input.value =
            currentTime;
        }
      }
    );
  }

  /* =======================================================
     DURATION CALCULATOR
  ======================================================= */

  function setupDurationCalculators() {
    qsa(
      "[data-duration-calculator]"
    ).forEach(
      calculator => {
        const entryInput =
          qs(
            '[data-duration-entry]',
            calculator
          );

        const exitInput =
          qs(
            '[data-duration-exit]',
            calculator
          );

        const result =
          qs(
            '[data-duration-result]',
            calculator
          );

        if (
          !entryInput ||
          !exitInput ||
          !result
        ) {
          return;
        }

        const calculate = () => {
          if (
            !entryInput.value ||
            !exitInput.value
          ) {
            result.textContent =
              "0m";
            return;
          }

          const minutes =
            calculateDuration(
              entryInput.value,
              exitInput.value
            );

          result.textContent =
            minutesToDuration(
              minutes
            );
        };

        entryInput.addEventListener(
          "input",
          calculate
        );

        exitInput.addEventListener(
          "input",
          calculate
        );
      }
    );
  }

  /* =======================================================
     GLOBAL ERROR HANDLING
  ======================================================= */

  window.addEventListener(
    "unhandledrejection",
    event => {
      if (
        event.reason instanceof Error
      ) {
        console.error(
          "Unhandled promise rejection:",
          event.reason
        );
      }
    }
  );

  /* =======================================================
     INITIALIZATION
  ======================================================= */

  async function initialize() {
    protectPage();

    redirectLoggedInUser();

    updateUserDisplay();

    bindLogoutButtons();

    setupMobileNav();

    setTodayDefaults();

    setupDurationCalculators();

    if (isLoggedIn()) {
      updateNotificationBadge();
    }
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  window.MyHomeGroup = {
    API_BASE,

    apiRequest,

    getToken,
    getCurrentUser,
    isLoggedIn,

    saveAuth,
    clearAuth,

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

    getNotifications,
    getUnreadNotificationCount,
    createNotification,
    sendAdminNotification,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearNotifications,

    getAdminUsers,

    todayString,
    formatDate,
    formatTime,

    calculateDuration,
    minutesToDuration,
    parseTimeToMinutes,

    getDateDaysAgo,
    getMonthStart,
    getWeekStart,

    getInitials,
    userDisplayName,
    userRole,

    escapeHtml,

    showToast,
    setButtonLoading,
    setFormMessage,

    updateUserDisplay,
    updateNotificationBadge,

    protectPage
  };

  /* =======================================================
     BACKWARD-COMPATIBILITY GLOBALS
  ======================================================= */

  window.apiRequest =
    apiRequest;

  window.getVehicles =
    getVehicles;

  window.getEntries =
    getEntries;

  window.createVehicle =
    createVehicle;

  window.updateVehicle =
    updateVehicle;

  window.deleteVehicle =
    deleteVehicle;

  window.createEntry =
    createEntry;

  window.deleteEntry =
    deleteEntry;

  window.getNotifications =
    getNotifications;

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

  window.showToast =
    showToast;

  window.logout =
    logout;

  /* =======================================================
     START
  ======================================================= */

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initialize
    );
  } else {
    initialize();
  }

})();
