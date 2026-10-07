"use strict";

/* =========================================================
   HYMA RMC KOKAPET
   Vehicle Duration Management
========================================================= */

const STORAGE = {
  users: "hyma_users",
  currentUser: "hyma_current_user",
  vehicles: "hyma_vehicles",
  entries: "hyma_entries"
};

const pages = {
  login: "/pages/login.html",
  register: "/pages/register.html",
  dashboard: "/pages/dashboard.html",
  vehicles: "/pages/vehicles.html",
  addEntry: "/pages/add-entry.html",
  calendar: "/pages/calendar.html",
  reports: "/pages/reports.html",
  profile: "/pages/profile.html"
};


/* =========================================================
   BASIC HELPERS
========================================================= */

function getJSON(key, fallback = []) {
  try {
    const value = localStorage.getItem(key);

    if (!value) {
      return fallback;
    }

    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function setJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getUsers() {
  return getJSON(STORAGE.users, []);
}

function saveUsers(users) {
  setJSON(STORAGE.users, users);
}

function getVehicles() {
  return getJSON(STORAGE.vehicles, []);
}

function saveVehicles(vehicles) {
  setJSON(STORAGE.vehicles, vehicles);
}

function getEntries() {
  return getJSON(STORAGE.entries, []);
}

function saveEntries(entries) {
  setJSON(STORAGE.entries, entries);
}

function getCurrentUser() {
  return getJSON(STORAGE.currentUser, null);
}

function saveCurrentUser(user) {
  setJSON(STORAGE.currentUser, user);
}

function removeCurrentUser() {
  localStorage.removeItem(STORAGE.currentUser);
}

function todayString() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function generateId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showMessage(element, message, type = "info") {
  if (!element) return;

  element.textContent = message;
  element.className = `form-message ${type}`;
}

function formatDate(dateString) {
  if (!dateString) return "-";

  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatDuration(minutes) {
  minutes = Number(minutes) || 0;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${hours}h ${mins}m`;
}

function calculateDuration(entryTime, exitTime) {
  if (!entryTime || !exitTime) {
    return 0;
  }

  const [eh, em] = entryTime.split(":").map(Number);
  const [xh, xm] = exitTime.split(":").map(Number);

  let start = eh * 60 + em;
  let end = xh * 60 + xm;

  if (end < start) {
    end += 24 * 60;
  }

  return end - start;
}

function navigate(page) {
  if (pages[page]) {
    window.location.href = pages[page];
  }
}


/* =========================================================
   AUTH CHECK
========================================================= */

function requireLogin() {
  const user = getCurrentUser();
  const path = window.location.pathname;

  const publicPages = [
    "/",
    "/index.html",
    "/pages/login.html",
    "/pages/register.html"
  ];

  if (!user && !publicPages.includes(path)) {
    window.location.href = pages.login;
    return false;
  }

  return true;
}


/* =========================================================
   WELCOME
========================================================= */

function setupWelcome() {
  const startBtn = document.getElementById("startBtn");

  if (!startBtn) return;

  startBtn.addEventListener("click", () => {
    const user = getCurrentUser();

    if (user) {
      navigate("dashboard");
    } else {
      navigate("login");
    }
  });
}


/* =========================================================
   REGISTER
========================================================= */

function setupRegister() {
  const form = document.getElementById("registerForm");

  if (!form) return;

  const message = document.getElementById("registerMessage");

  form.addEventListener("submit", event => {
    event.preventDefault();

    const name = document
      .getElementById("registerName")
      .value
      .trim();

    const email = document
      .getElementById("registerEmail")
      .value
      .trim()
      .toLowerCase();

    const mobile = document
      .getElementById("registerMobile")
      .value
      .trim();

    const company = document
      .getElementById("registerCompany")
      .value
      .trim();

    const role = document
      .getElementById("registerRole")
      .value;

    const password = document
      .getElementById("registerPassword")
      .value;

    const confirmPassword = document
      .getElementById("registerConfirmPassword")
      .value;

    if (password.length < 6) {
      showMessage(
        message,
        "Password should be at least 6 characters.",
        "error"
      );
      return;
    }

    if (password !== confirmPassword) {
      showMessage(
        message,
        "Passwords do not match.",
        "error"
      );
      return;
    }

    const users = getUsers();

    const exists = users.some(
      user =>
        user.email === email ||
        user.mobile === mobile
    );

    if (exists) {
      showMessage(
        message,
        "Email or mobile is already registered.",
        "error"
      );
      return;
    }

    const user = {
      id: generateId("user"),
      name,
      email,
      mobile,
      password,
      company,
      role,
      createdAt: new Date().toISOString()
    };

    users.push(user);

    saveUsers(users);

    showMessage(
      message,
      "Account created successfully. Redirecting...",
      "success"
    );

    setTimeout(() => {
      navigate("login");
    }, 900);
  });
}


/* =========================================================
   LOGIN
========================================================= */

function setupLogin() {
  const form = document.getElementById("loginForm");

  if (!form) return;

  const message = document.getElementById("loginMessage");

  form.addEventListener("submit", event => {
    event.preventDefault();

    const identity = document
      .getElementById("loginEmail")
      .value
      .trim()
      .toLowerCase();

    const password = document
      .getElementById("loginPassword")
      .value;

    const users = getUsers();

    const user = users.find(item =>
      (
        String(item.email || "").toLowerCase() === identity ||
        String(item.mobile || "").toLowerCase() === identity
      ) &&
      item.password === password
    );

    if (!user) {
      showMessage(
        message,
        "Invalid email/mobile or password.",
        "error"
      );
      return;
    }

    saveCurrentUser(user);

    showMessage(
      message,
      "Login successful.",
      "success"
    );

    setTimeout(() => {
      navigate("dashboard");
    }, 400);
  });

  const forgotBtn =
    document.getElementById("forgotPasswordBtn");

  if (forgotBtn) {
    forgotBtn.addEventListener("click", event => {
      event.preventDefault();

      alert(
        "Password recovery will be connected to the backend later. For now, please contact the site administrator."
      );
    });
  }
}


/* =========================================================
   BOTTOM NAVIGATION
========================================================= */

function setupNavigation() {
  document
    .querySelectorAll("[data-page]")
    .forEach(button => {

      button.addEventListener("click", () => {
        const page = button.dataset.page;

        if (page) {
          navigate(page);
        }
      });

    });
}


/* =========================================================
   DASHBOARD
========================================================= */

function setupDashboard() {
  const vehicleCount =
    document.getElementById("dashboardVehicleCount");

  if (!vehicleCount) return;

  const user = getCurrentUser();

  if (user) {
    const welcomeName =
      document.getElementById("welcomeName");

    if (welcomeName) {
      welcomeName.textContent =
        `Welcome, ${user.name}`;
    }
  }

  const dateElement =
    document.getElementById("dashboardDate");

  if (dateElement) {
    dateElement.textContent =
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
  }

  const vehicles = getVehicles();
  const entries = getEntries();
  const today = todayString();

  const todayEntries =
    entries.filter(entry => entry.date === today);

  const completedEntries =
    todayEntries.filter(entry => entry.exitTime);

  const totalMinutes =
    completedEntries.reduce(
      (total, entry) =>
        total + Number(entry.duration || 0),
      0
    );

  const runningCount =
    todayEntries.filter(
      entry => !entry.exitTime
    ).length;

  document.getElementById(
    "dashboardVehicleCount"
  ).textContent = vehicles.length;

  document.getElementById(
    "dashboardRunningCount"
  ).textContent = runningCount;

  document.getElementById(
    "dashboardEntryCount"
  ).textContent = todayEntries.length;

  document.getElementById(
    "dashboardDuration"
  ).textContent = formatDuration(totalMinutes);

  renderDashboardActivity(
    todayEntries,
    vehicles
  );

  const notificationBtn =
    document.getElementById("notificationBtn");

  if (notificationBtn) {
    notificationBtn.addEventListener("click", () => {
      alert(
        runningCount > 0
          ? `${runningCount} vehicle currently running.`
          : "No running vehicle right now."
      );
    });
  }
}

function renderDashboardActivity(entries, vehicles) {
  const list =
    document.getElementById(
      "dashboardActivityList"
    );

  if (!list) return;

  if (!entries.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🚚</div>
        <h3>No Activity Today</h3>
        <p>No vehicle entries have been recorded today.</p>
      </div>
    `;

    return;
  }

  const sorted =
    [...entries].sort(
      (a, b) =>
        String(b.entryTime).localeCompare(
          String(a.entryTime)
        )
    );

  list.innerHTML = sorted
    .slice(0, 10)
    .map(entry => {

      const vehicle =
        vehicles.find(
          item => item.id === entry.vehicleId
        );

      const vehicleNumber =
        vehicle?.vehicleNumber ||
        entry.vehicleNumber ||
        "Unknown Vehicle";

      const running =
        !entry.exitTime;

      return `
        <div class="activity-card">

          <div class="activity-card-top">

            <div>
              <h3>
                ${escapeHtml(vehicleNumber)}
              </h3>

              <p>
                ${escapeHtml(entry.entryTime || "-")}
                →
                ${escapeHtml(entry.exitTime || "Running")}
              </p>

              <p>
                ${escapeHtml(entry.purpose || "Other")}
              </p>
            </div>

            <span class="activity-status ${
              running ? "running" : ""
            }">
              ${
                running
                  ? "Running"
                  : formatDuration(entry.duration)
              }
            </span>

          </div>

        </div>
      `;
    })
    .join("");
}


/* =========================================================
   VEHICLES
========================================================= */

function setupVehicles() {
  const list =
    document.getElementById("vehicleList");

  if (!list) return;

  const modal =
    document.getElementById("vehicleModal");

  const form =
    document.getElementById("vehicleForm");

  const addBtn =
    document.getElementById("addVehicleBtn");

  const emptyAddBtn =
    document.getElementById("emptyAddVehicleBtn");

  const closeBtn =
    document.getElementById("closeVehicleModal");

  const search =
    document.getElementById("vehicleSearch");

  const message =
    document.getElementById(
      "vehicleFormMessage"
    );

  let activeFilter = "all";
  let editingVehicleId = null;

  function openModal(vehicle = null) {
    if (!modal) return;

    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");

    editingVehicleId =
      vehicle ? vehicle.id : null;

    const title =
      modal.querySelector(".modal-header h2");

    const subtitle =
      modal.querySelector(".modal-header p");

    const saveButton =
      form?.querySelector(
        'button[type="submit"]'
      );

    if (vehicle) {
      if (title) {
        title.textContent = "Edit Vehicle";
      }

      if (subtitle) {
        subtitle.textContent =
          "Update vehicle details";
      }

      if (saveButton) {
        saveButton.textContent =
          "Update Vehicle";
      }

      document.getElementById(
        "vehicleNumber"
      ).value =
        vehicle.vehicleNumber || "";

      document.getElementById(
        "vehicleType"
      ).value =
        vehicle.vehicleType || "";

      document.getElementById(
        "vehicleDriver"
      ).value =
        vehicle.driverName || "";

      document.getElementById(
        "vehicleContractor"
      ).value =
        vehicle.contractor || "";

      document.getElementById(
        "vehicleStatus"
      ).value =
        vehicle.status || "Active";

    } else {
      if (title) {
        title.textContent = "Add Vehicle";
      }

      if (subtitle) {
        subtitle.textContent =
          "Enter vehicle details";
      }

      if (saveButton) {
        saveButton.textContent =
          "Save Vehicle";
      }

      form?.reset();
    }

    if (message) {
      message.textContent = "";
      message.className = "form-message";
    }

    setTimeout(() => {
      document
        .getElementById("vehicleNumber")
        ?.focus();
    }, 100);
  }

  function closeModal() {
    if (!modal) return;

    modal.classList.add("hidden");

    document.body.classList.remove(
      "modal-open"
    );

    form?.reset();

    editingVehicleId = null;

    const title =
      modal.querySelector(".modal-header h2");

    const subtitle =
      modal.querySelector(".modal-header p");

    const saveButton =
      form?.querySelector(
        'button[type="submit"]'
      );

    if (title) {
      title.textContent = "Add Vehicle";
    }

    if (subtitle) {
      subtitle.textContent =
        "Enter vehicle details";
    }

    if (saveButton) {
      saveButton.textContent =
        "Save Vehicle";
    }

    if (message) {
      message.textContent = "";
      message.className = "form-message";
    }
  }

  addBtn?.addEventListener(
    "click",
    () => openModal()
  );

  emptyAddBtn?.addEventListener(
    "click",
    () => openModal()
  );

  closeBtn?.addEventListener(
    "click",
    closeModal
  );

  modal?.addEventListener(
    "click",
    event => {
      if (event.target === modal) {
        closeModal();
      }
    }
  );

  document
    .querySelectorAll(".filter-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(".filter-btn")
            .forEach(item =>
              item.classList.remove("active")
            );

          button.classList.add("active");

          activeFilter =
            button.dataset.filter || "all";

          render();
        }
      );

    });

  search?.addEventListener(
    "input",
    render
  );

  form?.addEventListener(
    "submit",
    event => {

      event.preventDefault();

      const vehicleNumber =
        document
          .getElementById("vehicleNumber")
          .value
          .trim()
          .toUpperCase();

      const vehicleType =
        document
          .getElementById("vehicleType")
          .value;

      const driverName =
        document
          .getElementById("vehicleDriver")
          .value
          .trim();

      const contractor =
        document
          .getElementById("vehicleContractor")
          .value
          .trim();

      const status =
        document
          .getElementById("vehicleStatus")
          .value;

      if (!vehicleNumber || !vehicleType) {
        showMessage(
          message,
          "Please enter vehicle number and type.",
          "error"
        );
        return;
      }

      const vehicles = getVehicles();

      const duplicate = vehicles.some(
        vehicle =>
          vehicle.id !== editingVehicleId &&
          String(vehicle.vehicleNumber || "")
            .toUpperCase() === vehicleNumber
      );

      if (duplicate) {
        showMessage(
          message,
          "This vehicle already exists.",
          "error"
        );
        return;
      }

      if (editingVehicleId) {

        const index =
          vehicles.findIndex(
            vehicle =>
              vehicle.id === editingVehicleId
          );

        if (index === -1) {
          showMessage(
            message,
            "Vehicle could not be found.",
            "error"
          );
          return;
        }

        vehicles[index] = {
          ...vehicles[index],
          vehicleNumber,
          vehicleType,
          driverName,
          contractor,
          status,
          updatedAt:
            new Date().toISOString()
        };

        saveVehicles(vehicles);

        showMessage(
          message,
          "Vehicle updated successfully.",
          "success"
        );

      } else {

        vehicles.push({
          id: generateId("vehicle"),
          vehicleNumber,
          vehicleType,
          driverName,
          contractor,
          status,
          createdAt:
            new Date().toISOString()
        });

        saveVehicles(vehicles);

        showMessage(
          message,
          "Vehicle saved successfully.",
          "success"
        );
      }

      render();

      setTimeout(() => {
        closeModal();
      }, 500);
    }
  );

  function getVehicleStats(vehicleId) {
    const entries =
      getEntries().filter(
        entry =>
          entry.vehicleId === vehicleId
      );

    const totalDuration =
      entries.reduce(
        (total, entry) =>
          total + Number(entry.duration || 0),
        0
      );

    const running =
      entries.filter(
        entry => !entry.exitTime
      ).length;

    return {
      entries,
      totalDuration,
      running
    };
  }

  function openHistory(vehicleId) {
    const vehicle =
      getVehicles().find(
        item => item.id === vehicleId
      );

    if (!vehicle) return;

    const stats =
      getVehicleStats(vehicleId);

    const existing =
      document.getElementById(
        "vehicleHistoryModal"
      );

    if (existing) {
      existing.remove();
    }

    const historyModal =
      document.createElement("div");

    historyModal.id =
      "vehicleHistoryModal";

    historyModal.className =
      "modal-overlay";

    const sortedEntries =
      [...stats.entries].sort(
        (a, b) =>
          `${b.date}${b.entryTime}`
            .localeCompare(
              `${a.date}${a.entryTime}`
            )
      );

    historyModal.innerHTML = `
      <div class="modal-card vehicle-history-modal">

        <div class="modal-header">

          <div>
            <h2>Vehicle History</h2>
            <p>
              ${escapeHtml(vehicle.vehicleNumber)}
            </p>
          </div>

          <button
            class="modal-close"
            id="closeHistoryModal"
            type="button"
          >
            ×
          </button>

        </div>

        <div class="vehicle-history-summary">

          <div>
            <strong>${stats.entries.length}</strong>
            <span>Entries</span>
          </div>

          <div>
            <strong>
              ${formatDuration(stats.totalDuration)}
            </strong>
            <span>Total Duration</span>
          </div>

          <div>
            <strong>${stats.running}</strong>
            <span>Running</span>
          </div>

        </div>

        <div class="vehicle-history-info">

          <div>
            <span>Vehicle Type</span>
            <strong>
              ${escapeHtml(vehicle.vehicleType || "-")}
            </strong>
          </div>

          <div>
            <span>Driver</span>
            <strong>
              ${escapeHtml(vehicle.driverName || "-")}
            </strong>
          </div>

          <div>
            <span>Contractor</span>
            <strong>
              ${escapeHtml(vehicle.contractor || "-")}
            </strong>
          </div>

          <div>
            <span>Status</span>
            <strong>
              ${escapeHtml(vehicle.status || "-")}
            </strong>
          </div>

        </div>

        <div class="vehicle-history-list">

          ${
            sortedEntries.length
              ? sortedEntries.map(entry => `
                <div class="vehicle-history-entry">

                  <div>
                    <strong>
                      ${escapeHtml(
                        formatDate(entry.date)
                      )}
                    </strong>

                    <span>
                      ${escapeHtml(
                        entry.entryTime || "-"
                      )}
                      →
                      ${escapeHtml(
                        entry.exitTime ||
                        "Running"
                      )}
                    </span>

                    <small>
                      ${escapeHtml(
                        entry.purpose || "Other"
                      )}
                    </small>

                  </div>

                  <strong class="${
                    !entry.exitTime
                      ? "history-running"
                      : ""
                  }">
                    ${
                      entry.exitTime
                        ? formatDuration(
                            entry.duration
                          )
                        : "Running"
                    }
                  </strong>

                </div>
              `).join("")
              : `
                <div class="empty-state">
                  <div class="empty-icon">📋</div>
                  <h3>No History</h3>
                  <p>
                    No entries have been recorded
                    for this vehicle.
                  </p>
                </div>
              `
          }

        </div>

      </div>
    `;

    document.body.appendChild(historyModal);

    document.body.classList.add(
      "modal-open"
    );

    document
      .getElementById("closeHistoryModal")
      ?.addEventListener(
        "click",
        () => {
          historyModal.remove();
          document.body.classList.remove(
            "modal-open"
          );
        }
      );

    historyModal.addEventListener(
      "click",
      event => {
        if (event.target === historyModal) {
          historyModal.remove();
          document.body.classList.remove(
            "modal-open"
          );
        }
      }
    );
  }

  function deleteVehicle(vehicleId) {
    const vehicle =
      getVehicles().find(
        item => item.id === vehicleId
      );

    if (!vehicle) return;

    const entries =
      getEntries().filter(
        entry =>
          entry.vehicleId === vehicleId
      );

    let messageText =
      `Delete ${vehicle.vehicleNumber}?`;

    if (entries.length) {
      messageText +=
        `\n\nThis vehicle has ${entries.length} recorded ${
          entries.length === 1
            ? "entry"
            : "entries"
        }. The history will also be deleted.`;
    }

    const confirmed =
      confirm(messageText);

    if (!confirmed) return;

    const updatedVehicles =
      getVehicles().filter(
        item =>
          item.id !== vehicleId
      );

    saveVehicles(updatedVehicles);

    const updatedEntries =
      getEntries().filter(
        entry =>
          entry.vehicleId !== vehicleId
      );

    saveEntries(updatedEntries);

    render();
  }

  function render() {
    const vehicles = getVehicles();

    const searchValue =
      search?.value
        .trim()
        .toLowerCase() || "";

    const filtered =
      vehicles.filter(vehicle => {

        const number =
          String(
            vehicle.vehicleNumber || ""
          ).toLowerCase();

        const driver =
          String(
            vehicle.driverName || ""
          ).toLowerCase();

        const contractor =
          String(
            vehicle.contractor || ""
          ).toLowerCase();

        const type =
          String(
            vehicle.vehicleType || ""
          ).toLowerCase();

        const matchesSearch =
          !searchValue ||
          number.includes(searchValue) ||
          driver.includes(searchValue) ||
          contractor.includes(searchValue) ||
          type.includes(searchValue);

        let matchesFilter = true;

        if (activeFilter === "tm") {
          matchesFilter =
            vehicle.vehicleType === "TM";
        }

        if (activeFilter === "truck") {
          matchesFilter =
            vehicle.vehicleType === "Truck";
        }

        if (activeFilter === "dumper") {
          matchesFilter =
            vehicle.vehicleType === "Dumper";
        }

        if (activeFilter === "other") {
          matchesFilter =
            ![
              "TM",
              "Truck",
              "Dumper"
            ].includes(vehicle.vehicleType);
        }

        return (
          matchesSearch &&
          matchesFilter
        );
      });

    const count =
      document.getElementById(
        "vehicleCount"
      );

    const activeCount =
      document.getElementById(
        "activeVehicleCount"
      );

    if (count) {
      count.textContent =
        vehicles.length;
    }

    if (activeCount) {
      activeCount.textContent =
        vehicles.filter(
          vehicle =>
            vehicle.status === "Active"
        ).length;
    }

    const empty =
      document.getElementById(
        "vehicleEmpty"
      );

    if (!filtered.length) {

      list.innerHTML = "";

      if (empty) {
        empty.classList.remove("hidden");

        const emptyTitle =
          empty.querySelector("h3");

        const emptyText =
          empty.querySelector("p");

        if (searchValue || activeFilter !== "all") {

          if (emptyTitle) {
            emptyTitle.textContent =
              "No Vehicles Found";
          }

          if (emptyText) {
            emptyText.textContent =
              "Try another search or filter.";
          }

        } else {

          if (emptyTitle) {
            emptyTitle.textContent =
              "No Vehicles Yet";
          }

          if (emptyText) {
            emptyText.textContent =
              "Add your first vehicle to start tracking duration.";
          }
        }
      }

      return;
    }

    if (empty) {
      empty.classList.add("hidden");
    }

    list.innerHTML =
      filtered.map(vehicle => {

        const stats =
          getVehicleStats(vehicle.id);

        return `

          <article class="vehicle-card">

            <div class="vehicle-card-top">

              <div class="vehicle-icon">
                🚚
              </div>

              <div class="vehicle-main">

                <h3>
                  ${escapeHtml(
                    vehicle.vehicleNumber
                  )}
                </h3>

                <p>
                  ${escapeHtml(
                    vehicle.vehicleType
                  )}
                </p>

              </div>

              <span class="vehicle-status ${
                vehicle.status === "Active"
                  ? "active"
                  : "inactive"
              }">
                ${escapeHtml(
                  vehicle.status || "Inactive"
                )}
              </span>

            </div>

            <div class="vehicle-details">

              <div>
                <span>Driver</span>
                <strong>
                  ${escapeHtml(
                    vehicle.driverName || "-"
                  )}
                </strong>
              </div>

              <div>
                <span>Contractor</span>
                <strong>
                  ${escapeHtml(
                    vehicle.contractor || "-"
                  )}
                </strong>
              </div>

            </div>

            <div class="vehicle-mini-stats">

              <div>
                <strong>
                  ${stats.entries.length}
                </strong>
                <span>Entries</span>
              </div>

              <div>
                <strong>
                  ${formatDuration(
                    stats.totalDuration
                  )}
                </strong>
                <span>Duration</span>
              </div>

              <div>
                <strong>
                  ${stats.running}
                </strong>
                <span>Running</span>
              </div>

            </div>

            <div class="vehicle-actions">

              <button
                class="vehicle-history-btn"
                data-history-vehicle="${vehicle.id}"
                type="button"
              >
                📋 History
              </button>

              <button
                class="vehicle-edit-btn"
                data-edit-vehicle="${vehicle.id}"
                type="button"
              >
                ✏️ Edit
              </button>

              <button
                class="vehicle-delete-btn"
                data-delete-vehicle="${vehicle.id}"
                type="button"
              >
                🗑️ Delete
              </button>

            </div>

          </article>

        `;
      }).join("");

    list
      .querySelectorAll(
        "[data-history-vehicle]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {
            openHistory(
              button.dataset.historyVehicle
            );
          }
        );

      });

    list
      .querySelectorAll(
        "[data-edit-vehicle]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const vehicle =
              getVehicles().find(
                item =>
                  item.id ===
                  button.dataset.editVehicle
              );

            if (vehicle) {
              openModal(vehicle);
            }
          }
        );

      });

    list
      .querySelectorAll(
        "[data-delete-vehicle]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {
            deleteVehicle(
              button.dataset.deleteVehicle
            );
          }
        );

      });
  }

  render();
}


/* =========================================================
   ADD ENTRY
========================================================= */

function setupAddEntry() {
  const form =
    document.getElementById("entryForm");

  if (!form) return;

  const dateInput =
    document.getElementById("entryDate");

  const vehicleSelect =
    document.getElementById(
      "entryVehicle"
    );

  const vehicleType =
    document.getElementById(
      "vehicleType"
    );

  const driverName =
    document.getElementById(
      "driverName"
    );

  const entryTime =
    document.getElementById(
      "entryTime"
    );

  const exitTime =
    document.getElementById(
      "exitTime"
    );

  const durationOutput =
    document.getElementById(
      "calculatedDuration"
    );

  const message =
    document.getElementById(
      "entryMessage"
    );

  const noVehicleMessage =
    document.getElementById(
      "noVehicleMessage"
    );

  dateInput.value =
    todayString();

  function loadVehicles() {
    const vehicles = getVehicles();

    vehicleSelect.innerHTML =
      `<option value="">Select vehicle</option>`;

    vehicles.forEach(vehicle => {

      const option =
        document.createElement("option");

      option.value =
        vehicle.id;

      option.textContent =
        `${vehicle.vehicleNumber} — ${vehicle.vehicleType}`;

      vehicleSelect.appendChild(
        option
      );
    });

    if (!vehicles.length) {

      showMessage(
        noVehicleMessage,
        "No vehicles available. Add a vehicle first.",
        "error"
      );

    } else {

      noVehicleMessage.textContent = "";
    }
  }

  function updateVehicleInfo() {

    const vehicles =
      getVehicles();

    const vehicle =
      vehicles.find(
        item =>
          item.id ===
          vehicleSelect.value
      );

    vehicleType.value =
      vehicle?.vehicleType || "";

    driverName.value =
      vehicle?.driverName || "";
  }

  function updateDuration() {

    if (
      !entryTime.value ||
      !exitTime.value
    ) {

      durationOutput.textContent =
        exitTime.value
          ? "0h 0m"
          : "Running";

      return;
    }

    const duration =
      calculateDuration(
        entryTime.value,
        exitTime.value
      );

    durationOutput.textContent =
      formatDuration(duration);
  }

  vehicleSelect.addEventListener(
    "change",
    updateVehicleInfo
  );

  entryTime.addEventListener(
    "input",
    updateDuration
  );

  exitTime.addEventListener(
    "input",
    updateDuration
  );

  form.addEventListener(
    "submit",
    event => {

      event.preventDefault();

      const vehicles =
        getVehicles();

      const vehicle =
        vehicles.find(
          item =>
            item.id ===
            vehicleSelect.value
        );

      if (!vehicle) {
        showMessage(
          message,
          "Please select a vehicle.",
          "error"
        );
        return;
      }

      const date =
        dateInput.value;

      const entry =
        entryTime.value;

      const exit =
        exitTime.value;

      const purpose =
        document
          .getElementById(
            "entryPurpose"
          )
          .value;

      const notes =
        document
          .getElementById(
            "entryNotes"
          )
          .value
          .trim();

      const duration =
        calculateDuration(
          entry,
          exit
        );

      const entries =
        getEntries();

      entries.push({
        id: generateId("entry"),
        vehicleId: vehicle.id,
        vehicleNumber:
          vehicle.vehicleNumber,
        vehicleType:
          vehicle.vehicleType,
        driverName:
          vehicle.driverName,
        date,
        entryTime: entry,
        exitTime: exit,
        duration,
        purpose,
        notes,
        createdAt:
          new Date().toISOString()
      });

      saveEntries(entries);

      showMessage(
        message,
        "Entry saved successfully.",
        "success"
      );

      setTimeout(() => {
        navigate("dashboard");
      }, 600);
    }
  );

  document
    .getElementById("cancelEntryBtn")
    ?.addEventListener(
      "click",
      () => navigate("dashboard")
    );

  document
    .getElementById("closeEntryBtn")
    ?.addEventListener(
      "click",
      () => navigate("dashboard")
    );

  loadVehicles();
}


/* =========================================================
   CALENDAR
========================================================= */

function setupCalendar() {
  const grid =
    document.getElementById(
      "calendarGrid"
    );

  if (!grid) return;

  const monthTitle =
    document.getElementById(
      "currentMonth"
    );

  const selectedDateText =
    document.getElementById(
      "activityDateText"
    );

  const entryList =
    document.getElementById(
      "calendarEntryList"
    );

  const vehicleCount =
    document.getElementById(
      "calendarVehicleCount"
    );

  const entryCount =
    document.getElementById(
      "calendarEntryCount"
    );

  const durationText =
    document.getElementById(
      "calendarDuration"
    );

  const todayBtn =
    document.getElementById(
      "calendarTodayBtn"
    );

  let currentMonth =
    new Date();

  let selectedDate =
    todayString();

  function renderCalendar() {

    const year =
      currentMonth.getFullYear();

    const month =
      currentMonth.getMonth();

    monthTitle.textContent =
      currentMonth.toLocaleDateString(
        "en-IN",
        {
          month: "long",
          year: "numeric"
        }
      );

    const firstDay =
      new Date(
        year,
        month,
        1
      ).getDay();

    const daysInMonth =
      new Date(
        year,
        month + 1,
        0
      ).getDate();

    const entries =
      getEntries();

    const activityDates =
      new Set(
        entries.map(
          entry => entry.date
        )
      );

    grid.innerHTML = "";

    for (
      let i = 0;
      i < firstDay;
      i++
    ) {

      const empty =
        document.createElement(
          "div"
        );

      empty.className =
        "calendar-day empty";

      grid.appendChild(empty);
    }

    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {

      const date =
        `${year}-${String(
          month + 1
        ).padStart(2, "0")}-${String(
          day
        ).padStart(2, "0")}`;

      const button =
        document.createElement(
          "button"
        );

      button.type = "button";

      button.className =
        "calendar-day";

      if (
        date ===
        todayString()
      ) {
        button.classList.add(
          "today"
        );
      }

      if (
        date ===
        selectedDate
      ) {
        button.classList.add(
          "selected"
        );
      }

      if (
        activityDates.has(date)
      ) {
        button.classList.add(
          "has-activity"
        );
      }

      button.textContent =
        day;

      button.addEventListener(
        "click",
        () => {

          selectedDate =
            date;

          renderCalendar();
          renderSelectedDate();
        }
      );

      grid.appendChild(
        button
      );
    }

    renderSelectedDate();
  }

  function renderSelectedDate() {

    selectedDateText.textContent =
      formatDate(
        selectedDate
      );

    const entries =
      getEntries().filter(
        entry =>
          entry.date ===
          selectedDate
      );

    const uniqueVehicles =
      new Set(
        entries.map(
          entry =>
            entry.vehicleId
        )
      );

    const duration =
      entries.reduce(
        (total, entry) =>
          total +
          Number(
            entry.duration || 0
          ),
        0
      );

    vehicleCount.textContent =
      uniqueVehicles.size;

    entryCount.textContent =
      entries.length;

    durationText.textContent =
      formatDuration(
        duration
      );

    if (!entries.length) {

      entryList.innerHTML = `
        <div class="empty-state">

          <div class="empty-icon">
            📅
          </div>

          <h3>No Activity</h3>

          <p>
            No vehicle entries were recorded
            on this date.
          </p>

        </div>
      `;

      return;
    }

    entryList.innerHTML =
      entries.map(entry => `

        <div class="activity-card">

          <div class="activity-card-top">

            <div>

              <h3>
                ${escapeHtml(
                  entry.vehicleNumber ||
                  "Vehicle"
                )}
              </h3>

              <p>
                ${escapeHtml(
                  entry.entryTime ||
                  "-"
                )}
                →
                ${escapeHtml(
                  entry.exitTime ||
                  "Running"
                )}
              </p>

              <p>
                ${escapeHtml(
                  entry.purpose ||
                  "-"
                )}
              </p>

            </div>

            <span class="activity-status ${
              !entry.exitTime
                ? "running"
                : ""
            }">

              ${
                entry.exitTime
                  ? formatDuration(
                      entry.duration
                    )
                  : "Running"
              }

            </span>

          </div>

        </div>

      `).join("");
  }

  document
    .getElementById(
      "previousMonthBtn"
    )
    ?.addEventListener(
      "click",
      () => {

        currentMonth.setMonth(
          currentMonth.getMonth() -
          1
        );

        renderCalendar();
      }
    );

  document
    .getElementById(
      "nextMonthBtn"
    )
    ?.addEventListener(
      "click",
      () => {

        currentMonth.setMonth(
          currentMonth.getMonth() +
          1
        );

        renderCalendar();
      }
    );

  todayBtn?.addEventListener(
    "click",
    () => {

      const today =
        new Date();

      currentMonth =
        new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );

      selectedDate =
        todayString();

      renderCalendar();
    }
  );

  renderCalendar();
}


/* =========================================================
   REPORTS
========================================================= */

function setupReports() {
  const fromInput =
    document.getElementById(
      "reportFrom"
    );

  if (!fromInput) return;

  const toInput =
    document.getElementById(
      "reportTo"
    );

  const todayBtn =
    document.getElementById(
      "reportTodayBtn"
    );

  function setToday() {

    const today =
      todayString();

    fromInput.value =
      today;

    toInput.value =
      today;

    renderReports();
  }

  function renderReports() {

    const from =
      fromInput.value;

    const to =
      toInput.value;

    const entries =
      getEntries();

    const vehicles =
      getVehicles();

    const filtered =
      entries.filter(entry => {

        if (
          from &&
          entry.date < from
        ) {
          return false;
        }

        if (
          to &&
          entry.date > to
        ) {
          return false;
        }

        return true;
      });

    const uniqueVehicles =
      new Set(
        filtered.map(
          entry =>
            entry.vehicleId
        )
      );

    const completed =
      filtered.filter(
        entry =>
          entry.exitTime
      );

    const totalDuration =
      completed.reduce(
        (total, entry) =>
          total +
          Number(
            entry.duration || 0
          ),
        0
      );

    document.getElementById(
      "reportVehicleCount"
    ).textContent =
      uniqueVehicles.size;

    document.getElementById(
      "reportEntryCount"
    ).textContent =
      filtered.length;

    document.getElementById(
      "reportCompletedCount"
    ).textContent =
      completed.length;

    document.getElementById(
      "reportDuration"
    ).textContent =
      formatDuration(
        totalDuration
      );

    renderVehicleReport(
      filtered,
      vehicles
    );

    renderEntryReport(
      filtered
    );
  }

  function renderVehicleReport(
    entries,
    vehicles
  ) {

    const list =
      document.getElementById(
        "vehicleReportList"
      );

    if (!list) return;

    if (!entries.length) {

      list.innerHTML = `
        <div class="empty-state">

          <div class="empty-icon">
            📊
          </div>

          <h3>No Report Data</h3>

          <p>
            No entries found for this period.
          </p>

        </div>
      `;

      return;
    }

    const grouped = {};

    entries.forEach(entry => {

      if (
        !grouped[
          entry.vehicleId
        ]
      ) {

        grouped[
          entry.vehicleId
        ] = {
          count: 0,
          duration: 0,
          vehicleNumber:
            entry.vehicleNumber ||
            "Unknown"
        };
      }

      grouped[
        entry.vehicleId
      ].count++;

      grouped[
        entry.vehicleId
      ].duration +=
        Number(
          entry.duration || 0
        );
    });

    list.innerHTML =
      Object.values(grouped)
        .map(item => `

          <div class="activity-card">

            <div class="activity-card-top">

              <div>

                <h3>
                  ${escapeHtml(
                    item.vehicleNumber
                  )}
                </h3>

                <p>
                  ${item.count}
                  entr${
                    item.count === 1
                      ? "y"
                      : "ies"
                  }
                </p>

              </div>

              <span class="activity-status">
                ${formatDuration(
                  item.duration
                )}
              </span>

            </div>

          </div>

        `)
        .join("");
  }

  function renderEntryReport(
    entries
  ) {

    const list =
      document.getElementById(
        "reportEntryList"
      );

    if (!list) return;

    if (!entries.length) {
      list.innerHTML = "";
      return;
    }

    const sorted =
      [...entries].sort(
        (a, b) =>
          `${b.date}${b.entryTime}`
            .localeCompare(
              `${a.date}${a.entryTime}`
            )
      );

    list.innerHTML =
      sorted.map(entry => `

        <div class="activity-card">

          <div class="activity-card-top">

            <div>

              <h3>
                ${escapeHtml(
                  entry.vehicleNumber ||
                  "Vehicle"
                )}
              </h3>

              <p>
                ${escapeHtml(
                  formatDate(
                    entry.date
                  )
                )}
              </p>

              <p>
                ${escapeHtml(
                  entry.entryTime ||
                  "-"
                )}
                →
                ${escapeHtml(
                  entry.exitTime ||
                  "Running"
                )}
              </p>

              <p>
                ${escapeHtml(
                  entry.purpose ||
                  "-"
                )}
              </p>

            </div>

            <span class="activity-status ${
              !entry.exitTime
                ? "running"
                : ""
            }">

              ${
                entry.exitTime
                  ? formatDuration(
                      entry.duration
                    )
                  : "Running"
              }

            </span>

          </div>

        </div>

      `).join("");
  }

  fromInput.addEventListener(
    "change",
    renderReports
  );

  toInput.addEventListener(
    "change",
    renderReports
  );

  todayBtn?.addEventListener(
    "click",
    setToday
  );

  setToday();
}


/* =========================================================
   PROFILE
========================================================= */

function setupProfile() {
  const nameElement =
    document.getElementById(
      "profileName"
    );

  if (!nameElement) return;

  const user =
    getCurrentUser();

  if (!user) {
    navigate("login");
    return;
  }

  document.getElementById(
    "profileName"
  ).textContent =
    user.name || "User";

  document.getElementById(
    "profileEmail"
  ).textContent =
    user.email || "-";

  document.getElementById(
    "profileNameValue"
  ).textContent =
    user.name || "-";

  document.getElementById(
    "profileEmailValue"
  ).textContent =
    user.email || "-";

  document.getElementById(
    "profileMobileValue"
  ).textContent =
    user.mobile || "-";

  document.getElementById(
    "profileRoleValue"
  ).textContent =
    user.role || "-";

  document.getElementById(
    "profileCompanyValue"
  ).textContent =
    user.company || "-";

  document
    .getElementById(
      "logoutBtn"
    )
    ?.addEventListener(
      "click",
      () => {

        const confirmed =
          confirm(
            "Are you sure you want to logout?"
          );

        if (!confirmed) return;

        removeCurrentUser();

        navigate("login");
      }
    );

  document
    .getElementById(
      "reportsProfileBtn"
    )
    ?.addEventListener(
      "click",
      () =>
        navigate("reports")
    );
}


/* =========================================================
   GLOBAL INITIALIZATION
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    requireLogin();

    setupWelcome();
    setupRegister();
    setupLogin();
    setupNavigation();

    setupDashboard();
    setupVehicles();
    setupAddEntry();
    setupCalendar();
    setupReports();
    setupProfile();

  }
);
