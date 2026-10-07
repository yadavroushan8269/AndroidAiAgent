const pages = {
  login: "/pages/login.html",
  register: "/pages/register.html",
  dashboard: "/pages/dashboard.html",
  vehicles: "/pages/vehicles.html",
  "add-entry": "/pages/add-entry.html",
  calendar: "/pages/calendar.html",
  reports: "/pages/reports.html",
  profile: "/pages/profile.html"
};

/* =========================
   NAVIGATION
========================= */

function goTo(page) {
  if (pages[page]) {
    window.location.href = pages[page];
  }
}


/* =========================
   MESSAGE
========================= */

function showMessage(element, message, type = "info") {
  if (!element) return;

  element.textContent = message;
  element.className = `auth-message ${type}`;

  setTimeout(() => {
    element.textContent = "";
  }, 3500);
}


/* =========================
   SAFE HTML
========================= */

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================
   STORAGE HELPERS
========================= */

function getVehicles() {
  try {
    return JSON.parse(
      localStorage.getItem("hymaVehicles")
    ) || [];
  } catch {
    return [];
  }
}

function saveVehicles(vehicles) {
  localStorage.setItem(
    "hymaVehicles",
    JSON.stringify(vehicles)
  );
}

function getEntries() {
  try {
    return JSON.parse(
      localStorage.getItem("hymaEntries")
    ) || [];
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(
    "hymaEntries",
    JSON.stringify(entries)
  );
}


/* =========================
   WELCOME
========================= */

function setupWelcome() {
  const startBtn =
    document.getElementById("startBtn");

  if (!startBtn) return;

  startBtn.addEventListener("click", () => {
    goTo("login");
  });
}


/* =========================
   LOGIN
========================= */

function setupLogin() {
  const loginForm =
    document.getElementById("loginForm");

  if (!loginForm) return;

  const registerBtn =
    document.getElementById("registerBtn");

  const forgotPasswordBtn =
    document.getElementById("forgotPasswordBtn");

  const backBtn =
    document.getElementById("backBtn");

  const password =
    document.getElementById("loginPassword");

  const togglePassword =
    document.getElementById(
      "toggleLoginPassword"
    );

  const message =
    document.getElementById("loginMessage");

  registerBtn?.addEventListener(
    "click",
    () => goTo("register")
  );

  backBtn?.addEventListener(
    "click",
    () => {
      window.location.href = "/";
    }
  );

  forgotPasswordBtn?.addEventListener(
    "click",
    () => {
      showMessage(
        message,
        "Password recovery will be connected later.",
        "info"
      );
    }
  );

  togglePassword?.addEventListener(
    "click",
    () => {

      if (!password) return;

      const isPassword =
        password.type === "password";

      password.type =
        isPassword ? "text" : "password";

      togglePassword.textContent =
        isPassword ? "🙈" : "👁️";
    }
  );

  loginForm.addEventListener(
    "submit",
    (event) => {

      event.preventDefault();

      const user =
        document.getElementById(
          "loginUser"
        )?.value.trim();

      const pass =
        document.getElementById(
          "loginPassword"
        )?.value;

      if (!user || !pass) {

        showMessage(
          message,
          "Please enter email/mobile and password.",
          "error"
        );

        return;
      }

      localStorage.setItem(
        "hymaLoggedIn",
        "true"
      );

      localStorage.setItem(
        "hymaUser",
        JSON.stringify({
          name: "User",
          contact: user,
          role: "Security Guard",
          company: "Hyma RMC Kokapet"
        })
      );

      goTo("dashboard");
    }
  );
}


/* =========================
   REGISTER
========================= */

function setupRegister() {
  const form =
    document.getElementById("registerForm");

  if (!form) return;

  const loginBtn =
    document.getElementById("loginBtn");

  const backBtn =
    document.getElementById("backBtn");

  const password =
    document.getElementById(
      "registerPassword"
    );

  const confirmPassword =
    document.getElementById(
      "confirmPassword"
    );

  const togglePassword =
    document.getElementById(
      "toggleRegisterPassword"
    );

  const toggleConfirm =
    document.getElementById(
      "toggleConfirmPassword"
    );

  const message =
    document.getElementById(
      "registerMessage"
    );

  loginBtn?.addEventListener(
    "click",
    () => goTo("login")
  );

  backBtn?.addEventListener(
    "click",
    () => goTo("login")
  );

  togglePassword?.addEventListener(
    "click",
    () => {

      const isPassword =
        password.type === "password";

      password.type =
        isPassword ? "text" : "password";

      togglePassword.textContent =
        isPassword ? "🙈" : "👁️";
    }
  );

  toggleConfirm?.addEventListener(
    "click",
    () => {

      const isPassword =
        confirmPassword.type === "password";

      confirmPassword.type =
        isPassword ? "text" : "password";

      toggleConfirm.textContent =
        isPassword ? "🙈" : "👁️";
    }
  );

  form.addEventListener(
    "submit",
    (event) => {

      event.preventDefault();

      const name =
        document.getElementById(
          "registerName"
        )?.value.trim();

      const contact =
        document.getElementById(
          "registerContact"
        )?.value.trim();

      const company =
        document.getElementById(
          "registerCompany"
        )?.value.trim();

      const role =
        document.getElementById(
          "registerRole"
        )?.value;

      const pass =
        document.getElementById(
          "registerPassword"
        )?.value;

      const confirm =
        document.getElementById(
          "confirmPassword"
        )?.value;

      if (
        !name ||
        !contact ||
        !company ||
        !role ||
        !pass
      ) {

        showMessage(
          message,
          "Please fill all required fields.",
          "error"
        );

        return;
      }

      if (pass !== confirm) {

        showMessage(
          message,
          "Passwords do not match.",
          "error"
        );

        return;
      }

      localStorage.setItem(
        "hymaUser",
        JSON.stringify({
          name,
          contact,
          role:
            role === "admin"
              ? "Admin"
              : "Security Guard",
          company
        })
      );

      localStorage.setItem(
        "hymaLoggedIn",
        "true"
      );

      showMessage(
        message,
        "Account created successfully.",
        "success"
      );

      setTimeout(
        () => goTo("dashboard"),
        700
      );
    }
  );
}


/* =========================
   DASHBOARD
========================= */

function setupDashboard() {
  const todayDate =
    document.getElementById(
      "todayDate"
    );

  if (!todayDate) return;

  const now = new Date();

  todayDate.textContent =
    now.toLocaleDateString(
      "en-IN",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    );

  function updateStats() {

    const vehicles =
      getVehicles();

    const entries =
      getEntries();

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    const todayEntries =
      entries.filter(
        entry => entry.date === today
      );

    let totalMinutes = 0;

    todayEntries.forEach(
      entry => {
        totalMinutes +=
          Number(
            entry.durationMinutes
          ) || 0;
      }
    );

    const hours =
      Math.floor(
        totalMinutes / 60
      );

    const minutes =
      totalMinutes % 60;

    const totalVehicles =
      document.getElementById(
        "totalVehicles"
      );

    const runningVehicles =
      document.getElementById(
        "runningVehicles"
      );

    const totalDuration =
      document.getElementById(
        "totalDuration"
      );

    const todayEntriesElement =
      document.getElementById(
        "todayEntries"
      );

    if (totalVehicles) {
      totalVehicles.textContent =
        vehicles.length;
    }

    if (runningVehicles) {
      runningVehicles.textContent =
        vehicles.filter(
          v => v.status === "Active"
        ).length;
    }

    if (totalDuration) {
      totalDuration.textContent =
        `${hours}h ${minutes}m`;
    }

    if (todayEntriesElement) {
      todayEntriesElement.textContent =
        todayEntries.length;
    }

    renderTodayActivity(
      todayEntries
    );
  }

  function renderTodayActivity(
    entries
  ) {

    const list =
      document.getElementById(
        "activityList"
      );

    if (!list) return;

    if (entries.length === 0) {

      list.innerHTML = `
        <div class="activity-empty">
          <div>📋</div>
          <p>No vehicle activity today.</p>
          <small>
            Add an entry to see it here.
          </small>
        </div>
      `;

      return;
    }

    list.innerHTML =
      entries
        .slice()
        .reverse()
        .slice(0, 10)
        .map(entry => {

          const total =
            Number(
              entry.durationMinutes
            ) || 0;

          const hours =
            Math.floor(
              total / 60
            );

          const minutes =
            total % 60;

          return `
            <div class="activity-item">

              <div class="activity-icon">
                🚚
              </div>

              <div class="activity-info">

                <strong>
                  ${escapeHtml(
                    entry.vehicleNumber
                  )}
                </strong>

                <span>
                  ${escapeHtml(
                    entry.vehicleType
                  )}
                </span>

              </div>

              <div class="activity-duration">

                <strong>
                  ${hours}h ${minutes}m
                </strong>

                <span>
                  ${escapeHtml(
                    entry.entryTime
                  )}
                  -
                  ${escapeHtml(
                    entry.exitTime ||
                    "Running"
                  )}
                </span>

              </div>

            </div>
          `;
        })
        .join("");
  }

  document.getElementById(
    "quickAddBtn"
  )?.addEventListener(
    "click",
    () => goTo("add-entry")
  );

  document.getElementById(
    "viewAllBtn"
  )?.addEventListener(
    "click",
    () => goTo("calendar")
  );

  updateStats();
}


/* =========================
   VEHICLES
========================= */

function setupVehicles() {

  const search =
    document.getElementById(
      "vehicleSearch"
    );

  if (!search) return;

  const list =
    document.getElementById(
      "vehicleList"
    );

  const empty =
    document.getElementById(
      "vehicleEmpty"
    );

  const count =
    document.getElementById(
      "vehicleCount"
    );

  const activeCount =
    document.getElementById(
      "activeVehicleCount"
    );

  const modal =
    document.getElementById(
      "vehicleModal"
    );

  const form =
    document.getElementById(
      "vehicleForm"
    );

  const message =
    document.getElementById(
      "vehicleFormMessage"
    );

  let currentFilter = "all";

  function openModal() {

    modal?.classList.remove(
      "hidden"
    );

    document.body.classList.add(
      "modal-open"
    );

    document.getElementById(
      "vehicleNumber"
    )?.focus();
  }

  function closeModal() {

    modal?.classList.add(
      "hidden"
    );

    document.body.classList.remove(
      "modal-open"
    );

    form?.reset();

    if (message) {
      message.textContent = "";
    }
  }

  function render() {

    const vehicles =
      getVehicles();

    const searchText =
      search.value
        .trim()
        .toLowerCase();

    const filtered =
      vehicles.filter(vehicle => {

        const matchesSearch =
          !searchText ||
          vehicle.vehicleNumber
            .toLowerCase()
            .includes(searchText) ||
          (vehicle.driver || "")
            .toLowerCase()
            .includes(searchText) ||
          (vehicle.contractor || "")
            .toLowerCase()
            .includes(searchText);

        let matchesFilter = true;

        if (
          currentFilter === "tm"
        ) {
          matchesFilter =
            vehicle.type === "TM";
        }

        if (
          currentFilter === "truck"
        ) {
          matchesFilter =
            vehicle.type === "Truck";
        }

        if (
          currentFilter === "dumper"
        ) {
          matchesFilter =
            vehicle.type === "Dumper";
        }

        if (
          currentFilter === "other"
        ) {
          matchesFilter =
            ![
              "TM",
              "Truck",
              "Dumper"
            ].includes(
              vehicle.type
            );
        }

        return (
          matchesSearch &&
          matchesFilter
        );
      });

    if (count) {
      count.textContent =
        vehicles.length;
    }

    if (activeCount) {
      activeCount.textContent =
        vehicles.filter(
          v => v.status === "Active"
        ).length;
    }

    if (!list || !empty) return;

    if (filtered.length === 0) {

      list.innerHTML = "";

      empty.style.display =
        "block";

      return;
    }

    empty.style.display =
      "none";

    list.innerHTML =
      filtered.map(
        vehicle => `
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
                    vehicle.type
                  )}
                </p>

              </div>

              <span
                class="vehicle-status ${
                  vehicle.status === "Active"
                    ? "active"
                    : "inactive"
                }"
              >
                ${escapeHtml(
                  vehicle.status
                )}
              </span>

            </div>

            <div class="vehicle-details">

              <div>
                <span>Driver</span>

                <strong>
                  ${escapeHtml(
                    vehicle.driver ||
                    "Not added"
                  )}
                </strong>
              </div>

              <div>
                <span>Contractor</span>

                <strong>
                  ${escapeHtml(
                    vehicle.contractor ||
                    "Not added"
                  )}
                </strong>
              </div>

            </div>

            <button
              class="vehicle-delete-btn"
              data-id="${vehicle.id}"
              type="button"
            >
              Delete
            </button>

          </article>
        `
      ).join("");

    document
      .querySelectorAll(
        ".vehicle-delete-btn"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            if (
              !confirm(
                "Delete this vehicle?"
              )
            ) {
              return;
            }

            const updated =
              getVehicles()
                .filter(
                  vehicle =>
                    vehicle.id !==
                    button.dataset.id
                );

            saveVehicles(updated);

            render();
          }
        );
      });
  }

  document.getElementById(
    "addVehicleBtn"
  )?.addEventListener(
    "click",
    openModal
  );

  document.getElementById(
    "emptyAddVehicleBtn"
  )?.addEventListener(
    "click",
    openModal
  );

  document.getElementById(
    "closeVehicleModal"
  )?.addEventListener(
    "click",
    closeModal
  );

  modal?.addEventListener(
    "click",
    event => {

      if (
        event.target === modal
      ) {
        closeModal();
      }
    }
  );

  form?.addEventListener(
    "submit",
    event => {

      event.preventDefault();

      const vehicleNumber =
        document.getElementById(
          "vehicleNumber"
        )?.value
          .trim()
          .toUpperCase();

      const type =
        document.getElementById(
          "vehicleType"
        )?.value;

      const driver =
        document.getElementById(
          "vehicleDriver"
        )?.value.trim();

      const contractor =
        document.getElementById(
          "vehicleContractor"
        )?.value.trim();

      const status =
        document.getElementById(
          "vehicleStatus"
        )?.value ||
        "Active";

      if (!vehicleNumber || !type) {

        if (message) {
          message.textContent =
            "Vehicle number and type are required.";
        }

        return;
      }

      const vehicles =
        getVehicles();

      if (
        vehicles.some(
          v =>
            v.vehicleNumber ===
            vehicleNumber
        )
      ) {

        if (message) {
          message.textContent =
            "This vehicle is already added.";
        }

        return;
      }

      vehicles.push({

        id:
          Date.now().toString() +
          Math.random()
            .toString(36)
            .slice(2),

        vehicleNumber,

        type,

        driver,

        contractor,

        status,

        createdAt:
          new Date().toISOString()

      });

      saveVehicles(
        vehicles
      );

      closeModal();

      render();
    }
  );

  search.addEventListener(
    "input",
    render
  );

  document
    .querySelectorAll(
      ".filter-btn"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(
              ".filter-btn"
            )
            .forEach(
              item =>
                item.classList.remove(
                  "active"
                )
            );

          button.classList.add(
            "active"
          );

          currentFilter =
            button.dataset.filter ||
            "all";

          render();
        }
      );
    });

  render();
}


/* =========================
   ADD ENTRY
========================= */

function setupAddEntry() {

  const form =
    document.getElementById(
      "entryForm"
    );

  if (!form) return;

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

  const message =
    document.getElementById(
      "entryMessage"
    );

  const noVehicleMessage =
    document.getElementById(
      "noVehicleMessage"
    );

  const entryTime =
    document.getElementById(
      "entryTime"
    );

  const exitTime =
    document.getElementById(
      "exitTime"
    );

  const duration =
    document.getElementById(
      "calculatedDuration"
    );

  const dateInput =
    document.getElementById(
      "entryDate"
    );

  function loadVehicles() {

    if (!vehicleSelect) return;

    const vehicles =
      getVehicles();

    vehicleSelect.innerHTML =
      `<option value="">
        Select vehicle
      </option>`;

    vehicles.forEach(
      vehicle => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          vehicle.id;

        option.textContent =
          `${vehicle.vehicleNumber} — ${vehicle.type}`;

        vehicleSelect.appendChild(
          option
        );
      }
    );

    if (noVehicleMessage) {

      noVehicleMessage.textContent =
        vehicles.length === 0
          ? "No vehicles added yet. Add a vehicle first."
          : "";
    }
  }

  function updateVehicle() {

    const vehicle =
      getVehicles().find(
        v =>
          v.id ===
          vehicleSelect.value
      );

    if (!vehicle) {

      if (vehicleType) {
        vehicleType.value = "";
      }

      if (driverName) {
        driverName.value = "";
      }

      return;
    }

    if (vehicleType) {
      vehicleType.value =
        vehicle.type || "";
    }

    if (driverName) {
      driverName.value =
        vehicle.driver || "";
    }
  }

  function calculateDuration() {

    if (
      !entryTime?.value ||
      !exitTime?.value
    ) {

      if (duration) {
        duration.textContent =
          "0h 0m";
      }

      return;
    }

    const [
      entryHour,
      entryMinute
    ] =
      entryTime.value
        .split(":")
        .map(Number);

    const [
      exitHour,
      exitMinute
    ] =
      exitTime.value
        .split(":")
        .map(Number);

    let start =
      entryHour * 60 +
      entryMinute;

    let end =
      exitHour * 60 +
      exitMinute;

    if (end < start) {
      end += 1440;
    }

    const total =
      end - start;

    const hours =
      Math.floor(
        total / 60
      );

    const minutes =
      total % 60;

    if (duration) {
      duration.textContent =
        `${hours}h ${minutes}m`;
    }
  }

  if (dateInput) {

    dateInput.value =
      new Date()
        .toISOString()
        .split("T")[0];
  }

  vehicleSelect?.addEventListener(
    "change",
    updateVehicle
  );

  entryTime?.addEventListener(
    "change",
    calculateDuration
  );

  exitTime?.addEventListener(
    "change",
    calculateDuration
  );

  form.addEventListener(
    "submit",
    event => {

      event.preventDefault();

      const vehicle =
        getVehicles().find(
          v =>
            v.id ===
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

      if (!entryTime.value) {

        showMessage(
          message,
          "Please enter entry time.",
          "error"
        );

        return;
      }

      let durationMinutes = 0;

      if (exitTime.value) {

        const [
          eh,
          em
        ] =
          entryTime.value
            .split(":")
            .map(Number);

        const [
          xh,
          xm
        ] =
          exitTime.value
            .split(":")
            .map(Number);

        let start =
          eh * 60 + em;

        let end =
          xh * 60 + xm;

        if (end < start) {
          end += 1440;
        }

        durationMinutes =
          end - start;
      }

      const entry = {

        id:
          Date.now().toString() +
          Math.random()
            .toString(36)
            .slice(2),

        date:
          dateInput.value,

        vehicleId:
          vehicle.id,

        vehicleNumber:
          vehicle.vehicleNumber,

        vehicleType:
          vehicle.type,

        driver:
          vehicle.driver || "",

        entryTime:
          entryTime.value,

        exitTime:
          exitTime.value,

        durationMinutes,

        purpose:
          document.getElementById(
            "entryPurpose"
          )?.value || "",

        notes:
          document.getElementById(
            "entryNotes"
          )?.value.trim() || "",

        createdAt:
          new Date().toISOString()
      };

      const entries =
        getEntries();

      entries.push(entry);

      saveEntries(entries);

      showMessage(
        message,
        "Vehicle entry saved successfully.",
        "success"
      );

      setTimeout(
        () => goTo("dashboard"),
        700
      );
    }
  );

  document.getElementById(
    "closeEntryBtn"
  )?.addEventListener(
    "click",
    () => goTo("dashboard")
  );

  document.getElementById(
    "cancelEntryBtn"
  )?.addEventListener(
    "click",
    () => goTo("dashboard")
  );

  loadVehicles();
}


/* =========================
   CALENDAR
========================= */

function setupCalendar() {

  const grid =
    document.getElementById(
      "calendarGrid"
    );

  if (!grid) return;

  let currentDate =
    new Date();

  let selectedDate =
    new Date();

  function formatDate(date) {

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

  function renderCalendar() {

    const year =
      currentDate.getFullYear();

    const month =
      currentDate.getMonth();

    const title =
      document.getElementById(
        "currentMonth"
      );

    if (title) {

      title.textContent =
        currentDate.toLocaleDateString(
          "en-IN",
          {
            month: "long",
            year: "numeric"
          }
        );
    }

    grid.innerHTML = "";

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

    for (
      let i = 0;
      i < firstDay;
      i++
    ) {

      const blank =
        document.createElement(
          "div"
        );

      blank.className =
        "calendar-day empty";

      grid.appendChild(blank);
    }

    const entries =
      getEntries();

    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {

      const date =
        new Date(
          year,
          month,
          day
        );

      const dateString =
        formatDate(date);

      const dayEntries =
        entries.filter(
          entry =>
            entry.date ===
            dateString
        );

      const cell =
        document.createElement(
          "button"
        );

      cell.type = "button";

      cell.className =
        "calendar-day";

      if (
        formatDate(
          new Date()
        ) === dateString
      ) {
        cell.classList.add(
          "today"
        );
      }

      if (
        formatDate(
          selectedDate
        ) === dateString
      ) {
        cell.classList.add(
          "selected"
        );
      }

      cell.innerHTML = `
        <span>${day}</span>
        ${
          dayEntries.length
            ? `<small>${dayEntries.length}</small>`
            : ""
        }
      `;

      cell.addEventListener(
        "click",
        () => {

          selectedDate =
            date;

          renderCalendar();

          showSelectedDate(
            dateString
          );
        }
      );

      grid.appendChild(cell);
    }

    showSelectedDate(
      formatDate(selectedDate)
    );
  }

  function showSelectedDate(
    dateString
  ) {

    const entries =
      getEntries().filter(
        entry =>
          entry.date ===
          dateString
      );

    const vehicleCount =
      document.getElementById(
        "calendarVehicleCount"
      );

    const entryCount =
      document.getElementById(
        "calendarEntryCount"
      );

    const duration =
      document.getElementById(
        "calendarDuration"
      );

    const list =
      document.getElementById(
        "calendarEntryList"
      );

    const dateText =
      document.getElementById(
        "activityDateText"
      );

    if (vehicleCount) {

      vehicleCount.textContent =
        new Set(
          entries.map(
            e => e.vehicleId
          )
        ).size;
    }

    if (entryCount) {
      entryCount.textContent =
        entries.length;
    }

    let total = 0;

    entries.forEach(
      entry => {
        total +=
          Number(
            entry.durationMinutes
          ) || 0;
      }
    );

    if (duration) {

      duration.textContent =
        `${Math.floor(total / 60)}h ${
          total % 60
        }m`;
    }

    if (dateText) {

      dateText.textContent =
        new Date(
          `${dateString}T00:00:00`
        ).toLocaleDateString(
          "en-IN",
          {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
          }
        );
    }

    if (!list) return;

    if (entries.length === 0) {

      list.innerHTML = `
        <div class="activity-empty">
          <div>📅</div>
          <p>No entries for this date.</p>
        </div>
      `;

      return;
    }

    list.innerHTML =
      entries.map(
        entry => {

          const total =
            Number(
              entry.durationMinutes
            ) || 0;

          return `
            <div class="activity-item">

              <div class="activity-icon">
                🚚
              </div>

              <div class="activity-info">

                <strong>
                  ${escapeHtml(
                    entry.vehicleNumber
                  )}
                </strong>

                <span>
                  ${escapeHtml(
                    entry.driver ||
                    "Driver not added"
                  )}
                </span>

              </div>

              <div class="activity-duration">

                <strong>
                  ${Math.floor(
                    total / 60
                  )}h ${total % 60}m
                </strong>

                <span>
                  ${escapeHtml(
                    entry.entryTime
                  )}
                  -
                  ${escapeHtml(
                    entry.exitTime ||
                    "Running"
                  )}
                </span>

              </div>

            </div>
          `;
        }
      ).join("");
  }

  document.getElementById(
    "previousMonthBtn"
  )?.addEventListener(
    "click",
    () => {

      currentDate.setMonth(
        currentDate.getMonth() - 1
      );

      renderCalendar();
    }
  );

  document.getElementById(
    "nextMonthBtn"
  )?.addEventListener(
    "click",
    () => {

      currentDate.setMonth(
        currentDate.getMonth() + 1
      );

      renderCalendar();
    }
  );

  document.getElementById(
    "calendarTodayBtn"
  )?.addEventListener(
    "click",
    () => {

      currentDate =
        new Date();

      selectedDate =
        new Date();

      renderCalendar();
    }
  );

  renderCalendar();
}


/* =========================
   PROFILE
========================= */

function setupProfile() {

  const profileName =
    document.getElementById(
      "profileName"
    );

  if (!profileName) return;

  let user = null;

  try {

    user =
      JSON.parse(
        localStorage.getItem(
          "hymaUser"
        )
      );

  } catch {

    user = null;
  }

  if (user) {

    profileName.textContent =
      user.name || "User";

    const contact =
      document.getElementById(
        "profileContact"
      );

    const role =
      document.getElementById(
        "profileRole"
      );

    const company =
      document.getElementById(
        "profileCompany"
      );

    const avatar =
      document.getElementById(
        "profileAvatar"
      );

    if (contact) {
      contact.textContent =
        user.contact ||
        "Not added";
    }

    if (role) {
      role.textContent =
        user.role ||
        "Security Guard";
    }

    if (company) {
      company.textContent =
        user.company ||
        "Hyma RMC Kokapet";
    }

    if (avatar) {

      avatar.textContent =
        (
          user.name ||
          "U"
        )
          .charAt(0)
          .toUpperCase();
    }
  }

  document.getElementById(
    "logoutBtn"
  )?.addEventListener(
    "click",
    () => {

      localStorage.removeItem(
        "hymaLoggedIn"
      );

      localStorage.removeItem(
        "hymaUser"
      );

      window.location.href = "/";
    }
  );
}


/* =========================
   NAVIGATION BUTTONS
========================= */

function setupNavigation() {

  document
    .querySelectorAll(
      ".bottom-nav .nav-item"
    )
    .forEach(item => {

      item.addEventListener(
        "click",
        () => {

          const page =
            item.dataset.page;

          if (page) {
            goTo(page);
          }
        }
      );
    });
}


/* =========================
   APP START
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupWelcome();

    setupLogin();

    setupRegister();

    setupDashboard();

    setupVehicles();

    setupAddEntry();

    setupCalendar();

    setupProfile();

    setupNavigation();

  }
);
