/* =========================================================
   MY HOME GROUP
   CENTRAL FRONTEND APP
   Backend API + Authentication
========================================================= */

"use strict";


/* =========================================================
   CONFIG
========================================================= */

const API_BASE = "/api";

const PAGES = {
  login: "/pages/login.html",
  register: "/pages/register.html",
  dashboard: "/pages/dashboard.html",
  vehicles: "/pages/vehicles.html",
  addEntry: "/pages/add-entry.html",
  calendar: "/pages/calendar.html",
  reports: "/pages/reports.html",
  profile: "/pages/profile.html",
  notifications: "/pages/notifications.html"
};

const STORAGE = {
  token: "hyma_auth_token",
  user: "hyma_current_user"
};


/* =========================================================
   BASIC HELPERS
========================================================= */

function getToken() {
  return localStorage.getItem(
    STORAGE.token
  );
}


function getCurrentUser() {

  try {

    return JSON.parse(
      localStorage.getItem(
        STORAGE.user
      ) || "null"
    );

  } catch (error) {

    return null;

  }

}


function saveCurrentUser(user) {

  if (!user) {
    localStorage.removeItem(
      STORAGE.user
    );
    return;
  }

  localStorage.setItem(
    STORAGE.user,
    JSON.stringify(user)
  );

}


function clearSession() {

  localStorage.removeItem(
    STORAGE.token
  );

  localStorage.removeItem(
    STORAGE.user
  );

}


function go(page) {

  if (
    PAGES[page]
  ) {

    window.location.href =
      PAGES[page];

  }

}


function today() {

  const date =
    new Date();

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;

}


function id() {

  return (
    Date.now().toString(36) +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );

}


function escapeHTML(value) {

  const div =
    document.createElement(
      "div"
    );

  div.textContent =
    value == null
      ? ""
      : String(value);

  return div.innerHTML;

}


/* =========================================================
   API REQUEST HELPER
========================================================= */

async function apiRequest(
  endpoint,
  options = {}
) {

  const headers = {
    ...(options.headers || {})
  };


  if (
    options.body &&
    !headers["Content-Type"]
  ) {

    headers["Content-Type"] =
      "application/json";

  }


  const token =
    getToken();


  if (token) {

    headers.Authorization =
      `Bearer ${token}`;

  }


  let response;


  try {

    response =
      await fetch(
        API_BASE + endpoint,
        {
          ...options,
          headers
        }
      );

  } catch (error) {

    throw new Error(
      "Unable to connect to server."
    );

  }


  let data = null;


  try {

    data =
      await response.json();

  } catch (error) {

    data = null;

  }


  if (
    response.status === 401
  ) {

    clearSession();

    /*
      Do not redirect while already
      on login/register pages.
    */

    const path =
      window.location.pathname;


    if (
      !path.endsWith(
        "/login.html"
      ) &&
      !path.endsWith(
        "/register.html"
      )
    ) {

      window.location.href =
        PAGES.login;

    }

  }


  if (!response.ok) {

    const message =
      data &&
      data.message
        ? data.message
        : `Request failed (${response.status})`;

    const error =
      new Error(message);

    error.status =
      response.status;

    error.data =
      data;

    throw error;

  }


  return data;

}


/* =========================================================
   AUTH API
========================================================= */

async function registerUser(
  userData
) {

  const data =
    await apiRequest(
      "/auth/register",
      {
        method: "POST",
        body:
          JSON.stringify(
            userData
          )
      }
    );


  if (data.token) {

    localStorage.setItem(
      STORAGE.token,
      data.token
    );

  }


  if (data.user) {

    saveCurrentUser(
      data.user
    );

  }


  return data;

}


async function loginUser(
  login,
  password
) {

  const data =
    await apiRequest(
      "/auth/login",
      {
        method: "POST",
        body:
          JSON.stringify({
            login,
            password
          })
      }
    );


  if (data.token) {

    localStorage.setItem(
      STORAGE.token,
      data.token
    );

  }


  if (data.user) {

    saveCurrentUser(
      data.user
    );

  }


  return data;

}


async function getMe() {

  const data =
    await apiRequest(
      "/me"
    );


  if (data.user) {

    saveCurrentUser(
      data.user
    );

  }


  return data.user;

}


async function updateProfile(
  profile
) {

  const data =
    await apiRequest(
      "/me",
      {
        method: "PUT",
        body:
          JSON.stringify(
            profile
          )
      }
    );


  if (data.user) {

    saveCurrentUser(
      data.user
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
      body:
        JSON.stringify({
          currentPassword,
          newPassword
        })
    }
  );

}


function logout() {

  clearSession();

  window.location.href =
    PAGES.login;

}


/* =========================================================
   VEHICLE API
========================================================= */

async function getVehicles() {

  const data =
    await apiRequest(
      "/vehicles"
    );

  return data.vehicles || [];

}


async function createVehicle(
  vehicle
) {

  const data =
    await apiRequest(
      "/vehicles",
      {
        method: "POST",
        body:
          JSON.stringify(
            vehicle
          )
      }
    );

  return data.vehicle;

}


async function updateVehicle(
  vehicleId,
  vehicle
) {

  const data =
    await apiRequest(
      `/vehicles/${vehicleId}`,
      {
        method: "PUT",
        body:
          JSON.stringify(
            vehicle
          )
      }
    );

  return data.vehicle;

}


async function deleteVehicle(
  vehicleId
) {

  return apiRequest(
    `/vehicles/${vehicleId}`,
    {
      method: "DELETE"
    }
  );

}


/* =========================================================
   ENTRY API
========================================================= */

async function getEntries() {

  const data =
    await apiRequest(
      "/entries"
    );

  return data.entries || [];

}


async function createEntry(
  entry
) {

  const data =
    await apiRequest(
      "/entries",
      {
        method: "POST",
        body:
          JSON.stringify(
            entry
          )
      }
    );

  return data.entry;

}


async function deleteEntry(
  entryId
) {

  return apiRequest(
    `/entries/${entryId}`,
    {
      method: "DELETE"
    }
  );

}


/* =========================================================
   AUTH STATE
========================================================= */

function isLoggedIn() {

  return Boolean(
    getToken()
  );

}


function requireLogin() {

  if (
    !isLoggedIn()
  ) {

    window.location.href =
      PAGES.login;

    return false;

  }

  return true;

}


/* =========================================================
   DURATION HELPERS
========================================================= */

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
    parseTime(
      entryTime
    );

  const end =
    parseTime(
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


  /*
    Support overnight entries.
  */

  if (
    difference < 0
  ) {

    difference +=
      24 * 60;

  }


  return difference;

}


function parseTime(
  value
) {

  const match =
    String(value)
      .match(
        /^(\d{1,2}):(\d{2})$/
      );


  if (!match) {

    return null;

  }


  const hours =
    Number(
      match[1]
    );

  const minutes =
    Number(
      match[2]
    );


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


function durationText(
  minutes
) {

  minutes =
    Number(minutes) || 0;


  const hours =
    Math.floor(
      minutes / 60
    );

  const mins =
    minutes % 60;


  if (
    hours === 0
  ) {

    return `${mins} min`;

  }


  if (
    mins === 0
  ) {

    return `${hours} hr`;

  }


  return `${hours} hr ${mins} min`;

}


/* =========================================================
   DATE HELPERS
========================================================= */

function dateText(
  value
) {

  if (!value) {
    return "-";
  }


  const parts =
    String(value)
      .split("-");


  if (
    parts.length !== 3
  ) {

    return value;

  }


  return (
    `${parts[2]}-${parts[1]}-${parts[0]}`
  );

}


/* =========================================================
   DATA CALCULATIONS
========================================================= */

function totalDuration(
  entries
) {

  return entries.reduce(
    (
      total,
      entry
    ) => {

      return (
        total +
        (
          Number(
            entry.duration
          ) || 0
        )
      );

    },
    0
  );

}


function runningEntries(
  entries
) {

  return entries.filter(
    entry =>
      !entry.exitTime
  );

}


function entriesForDate(
  entries,
  date
) {

  return entries.filter(
    entry =>
      entry.entryDate === date ||
      entry.date === date
  );

}


/* =========================================================
   NOTIFICATION HELPERS
========================================================= */

function getNotifications() {

  try {

    return JSON.parse(
      localStorage.getItem(
        "hyma_notifications"
      ) || "[]"
    );

  } catch (error) {

    return [];

  }

}


function saveNotifications(
  notifications
) {

  localStorage.setItem(
    "hyma_notifications",
    JSON.stringify(
      notifications
    )
  );

}


function unreadNotificationCount() {

  return getNotifications()
    .filter(
      notification =>
        !notification.read
    )
    .length;

}


function markAllNotificationsRead() {

  const notifications =
    getNotifications();


  notifications.forEach(
    notification => {

      notification.read =
        true;

    }
  );


  saveNotifications(
    notifications
  );

}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

  document
    .querySelectorAll(
      "[data-page]"
    )
    .forEach(
      element => {

        element.addEventListener(
          "click",
          event => {

            event.preventDefault();

            const page =
              element.dataset.page;

            go(page);

          }
        );

      }
    );


  document
    .querySelectorAll(
      "[data-logout]"
    )
    .forEach(
      element => {

        element.addEventListener(
          "click",
          event => {

            event.preventDefault();

            logout();

          }
        );

      }
    );

}


/* =========================================================
   AUTH PAGE PROTECTION
========================================================= */

function protectPage() {

  const path =
    window.location.pathname;


  const publicPages = [
    "/",
    "/index.html",
    "/pages/login.html",
    "/pages/register.html"
  ];


  const isPublic =
    publicPages.includes(
      path
    );


  if (
    !isPublic &&
    !isLoggedIn()
  ) {

    window.location.href =
      PAGES.login;

    return false;

  }


  return true;

}


/* =========================================================
   USER UI
========================================================= */

function updateUserUI() {

  const user =
    getCurrentUser();


  if (!user) {
    return;
  }


  document
    .querySelectorAll(
      "[data-user-name]"
    )
    .forEach(
      element => {

        element.textContent =
          user.name || "";

      }
    );


  document
    .querySelectorAll(
      "[data-user-email]"
    )
    .forEach(
      element => {

        element.textContent =
          user.email || "";

      }
    );


  document
    .querySelectorAll(
      "[data-user-role]"
    )
    .forEach(
      element => {

        element.textContent =
          user.role || "";

      }
    );


  document
    .querySelectorAll(
      "[data-user-company]"
    )
    .forEach(
      element => {

        element.textContent =
          user.company || "";

      }
    );

}


/* =========================================================
   NOTIFICATION BADGE
========================================================= */

function updateNotificationBadge() {

  const count =
    unreadNotificationCount();


  document
    .querySelectorAll(
      "[data-notification-badge]"
    )
    .forEach(
      badge => {

        if (
          count > 0
        ) {

          badge.textContent =
            count > 99
              ? "99+"
              : String(count);

          badge.style.display =
            "";

        } else {

          badge.textContent =
            "";

          badge.style.display =
            "none";

        }

      }
    );

}


/* =========================================================
   STARTUP
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    /*
      Protect private pages.
    */

    if (
      !protectPage()
    ) {

      return;

    }


    setupNavigation();

    updateUserUI();

    updateNotificationBadge();


    /*
      If logged in, quietly verify
      the JWT against the backend.

      This keeps the local user information
      synchronized with PostgreSQL.
    */

    if (
      isLoggedIn()
    ) {

      try {

        await getMe();

        updateUserUI();

      } catch (error) {

        /*
          apiRequest already handles
          expired/invalid JWT.
        */

        console.warn(
          "Session verification:",
          error.message
        );

      }

    }


    /*
      Make logout buttons work even if
      they were added dynamically.
    */

    document.addEventListener(
      "click",
      event => {

        const logoutButton =
          event.target.closest(
            "[data-logout]"
          );


        if (
          logoutButton
        ) {

          event.preventDefault();

          logout();

        }

      }
    );

  }
);


/* =========================================================
   GLOBAL EXPORTS
========================================================= */

window.MyHomeGroup = {

  API_BASE,

  PAGES,

  getToken,

  getCurrentUser,

  saveCurrentUser,

  clearSession,

  go,

  today,

  id,

  escapeHTML,

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

  isLoggedIn,

  requireLogin,

  calculateDuration,

  durationText,

  dateText,

  totalDuration,

  runningEntries,

  entriesForDate,

  getNotifications,

  saveNotifications,

  unreadNotificationCount,

  markAllNotificationsRead

};


/*
  Backward-compatible global functions.
  Existing pages can continue using these names.
*/

window.getToken =
  getToken;

window.getCurrentUser =
  getCurrentUser;

window.logout =
  logout;

window.go =
  go;

window.today =
  today;

window.id =
  id;

window.escapeHTML =
  escapeHTML;

window.getVehicles =
  getVehicles;

window.createVehicle =
  createVehicle;

window.updateVehicle =
  updateVehicle;

window.deleteVehicle =
  deleteVehicle;

window.getEntries =
  getEntries;

window.createEntry =
  createEntry;

window.deleteEntry =
  deleteEntry;

window.calculateDuration =
  calculateDuration;

window.durationText =
  durationText;

window.dateText =
  dateText;

window.requireLogin =
  requireLogin;
