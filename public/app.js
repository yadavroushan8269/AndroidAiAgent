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

function goTo(page) {
  if (pages[page]) {
    window.location.href = pages[page];
  }
}

function showMessage(element, message, type = "info") {
  if (!element) return;

  element.textContent = message;
  element.className = `auth-message ${type}`;

  setTimeout(() => {
    element.textContent = "";
  }, 3500);
}

function setupWelcome() {
  const startBtn = document.getElementById("startBtn");

  if (!startBtn) return;

  startBtn.addEventListener("click", () => {
    goTo("login");
  });
}

function setupLogin() {
  const loginForm = document.getElementById("loginForm");
  const registerBtn = document.getElementById("registerBtn");
  const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
  const backBtn = document.getElementById("backBtn");
  const password = document.getElementById("loginPassword");
  const togglePassword = document.getElementById("toggleLoginPassword");
  const message = document.getElementById("loginMessage");

  registerBtn?.addEventListener("click", () => {
    goTo("register");
  });

  backBtn?.addEventListener("click", () => {
    window.location.href = "/";
  });

  forgotPasswordBtn?.addEventListener("click", () => {
    showMessage(
      message,
      "Password recovery will be connected later.",
      "info"
    );
  });

  togglePassword?.addEventListener("click", () => {
    if (!password) return;

    const isPassword = password.type === "password";

    password.type = isPassword ? "text" : "password";
    togglePassword.textContent = isPassword ? "🙈" : "👁️";
  });

  loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const user = document.getElementById("loginUser")?.value.trim();
    const pass = document.getElementById("loginPassword")?.value;

    if (!user || !pass) {
      showMessage(
        message,
        "Please enter email/mobile and password.",
        "error"
      );
      return;
    }

    localStorage.setItem("hymaLoggedIn", "true");

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
  });
}

function setupRegister() {
  const form = document.getElementById("registerForm");

  if (!form) return;

  const loginBtn = document.getElementById("loginBtn");
  const backBtn = document.getElementById("backBtn");
  const password = document.getElementById("registerPassword");
  const confirmPassword = document.getElementById("confirmPassword");
  const togglePassword = document.getElementById("toggleRegisterPassword");
  const toggleConfirm = document.getElementById("toggleConfirmPassword");
  const message = document.getElementById("registerMessage");

  loginBtn?.addEventListener("click", () => {
    goTo("login");
  });

  backBtn?.addEventListener("click", () => {
    goTo("login");
  });

  togglePassword?.addEventListener("click", () => {
    if (!password) return;

    const isPassword = password.type === "password";

    password.type = isPassword ? "text" : "password";
    togglePassword.textContent = isPassword ? "🙈" : "👁️";
  });

  toggleConfirm?.addEventListener("click", () => {
    if (!confirmPassword) return;

    const isPassword = confirmPassword.type === "password";

    confirmPassword.type = isPassword ? "text" : "password";
    toggleConfirm.textContent = isPassword ? "🙈" : "👁️";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = document.getElementById("registerName")?.value.trim();
    const contact = document.getElementById("registerContact")?.value.trim();
    const company = document.getElementById("registerCompany")?.value.trim();
    const role = document.getElementById("registerRole")?.value;
    const pass = document.getElementById("registerPassword")?.value;
    const confirm = document.getElementById("confirmPassword")?.value;

    if (!name || !contact || !company || !role || !pass) {
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
        role: role === "admin" ? "Admin" : "Security Guard",
        company
      })
    );

    localStorage.setItem("hymaLoggedIn", "true");

    showMessage(
      message,
      "Account created successfully.",
      "success"
    );

    setTimeout(() => {
      goTo("dashboard");
    }, 700);
  });
}

function setupDashboard() {
  const todayDate = document.getElementById("todayDate");

  if (!todayDate) return;

  const now = new Date();

  todayDate.textContent = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  document.getElementById("quickAddBtn")?.addEventListener(
    "click",
    () => goTo("add-entry")
  );

  document.getElementById("viewAllBtn")?.addEventListener(
    "click",
    () => goTo("calendar")
  );
}

function setupVehicles() {
  const search = document.getElementById("vehicleSearch");

  if (!search) return;

  const vehicleList = document.getElementById("vehicleList");
  const vehicleEmpty = document.getElementById("vehicleEmpty");
  const vehicleCount = document.getElementById("vehicleCount");
  const activeVehicleCount = document.getElementById("activeVehicleCount");

  const modal = document.getElementById("vehicleModal");
  const form = document.getElementById("vehicleForm");
  const closeModal = document.getElementById("closeVehicleModal");

  const addVehicleBtn = document.getElementById("addVehicleBtn");
  const emptyAddVehicleBtn =
    document.getElementById("emptyAddVehicleBtn");

  const message = document.getElementById("vehicleFormMessage");

  let currentFilter = "all";

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

  function openModal() {
    if (!modal) return;

    modal.classList.remove("hidden");

    document.body.classList.add("modal-open");

    document.getElementById("vehicleNumber")?.focus();
  }

  function closeVehicleModal() {
    if (!modal) return;

    modal.classList.add("hidden");

    document.body.classList.remove("modal-open");

    form?.reset();

    if (message) {
      message.textContent = "";
    }
  }

  function renderVehicles() {
    const vehicles = getVehicles();

    const searchText = search.value
      .trim()
      .toLowerCase();

    let filteredVehicles = vehicles.filter((vehicle) => {

      const matchesSearch =
        !searchText ||
        vehicle.vehicleNumber
          .toLowerCase()
          .includes(searchText) ||
        vehicle.driver
          .toLowerCase()
          .includes(searchText) ||
        vehicle.contractor
          .toLowerCase()
          .includes(searchText);

      let matchesFilter = true;

      if (currentFilter === "tm") {
        matchesFilter = vehicle.type === "TM";
      }

      if (currentFilter === "truck") {
        matchesFilter = vehicle.type === "Truck";
      }

      if (currentFilter === "dumper") {
        matchesFilter = vehicle.type === "Dumper";
      }

      if (currentFilter === "other") {
        matchesFilter =
          !["TM", "Truck", "Dumper"].includes(vehicle.type);
      }

      return matchesSearch && matchesFilter;
    });

    if (vehicleCount) {
      vehicleCount.textContent = vehicles.length;
    }

    if (activeVehicleCount) {
      activeVehicleCount.textContent =
        vehicles.filter(
          (vehicle) => vehicle.status === "Active"
        ).length;
    }

    if (!vehicleList || !vehicleEmpty) return;

    if (filteredVehicles.length === 0) {
      vehicleList.innerHTML = "";
      vehicleEmpty.style.display = "block";
      return;
    }

    vehicleEmpty.style.display = "none";

    vehicleList.innerHTML = filteredVehicles
      .map((vehicle) => {

        const statusClass =
          vehicle.status === "Active"
            ? "active"
            : "inactive";

        return `
          <article class="vehicle-card">

            <div class="vehicle-card-top">

              <div class="vehicle-icon">
                🚚
              </div>

              <div class="vehicle-main">

                <h3>
                  ${escapeHtml(vehicle.vehicleNumber)}
                </h3>

                <p>
                  ${escapeHtml(vehicle.type)}
                </p>

              </div>

              <span class="vehicle-status ${statusClass}">
                ${escapeHtml(vehicle.status)}
              </span>

            </div>

            <div class="vehicle-details">

              <div>
                <span>Driver</span>
                <strong>
                  ${escapeHtml(vehicle.driver || "Not added")}
                </strong>
              </div>

              <div>
                <span>Contractor</span>
                <strong>
                  ${escapeHtml(
                    vehicle.contractor || "Not added"
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
        `;
      })
      .join("");

    document
      .querySelectorAll(".vehicle-delete-btn")
      .forEach((button) => {

        button.addEventListener("click", () => {

          const id = button.dataset.id;

          const confirmed = confirm(
            "Delete this vehicle?"
          );

          if (!confirmed) return;

          const updatedVehicles = getVehicles()
            .filter((vehicle) => vehicle.id !== id);

          saveVehicles(updatedVehicles);

          renderVehicles();
        });
      });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  addVehicleBtn?.addEventListener(
    "click",
    openModal
  );

  emptyAddVehicleBtn?.addEventListener(
    "click",
    openModal
  );

  closeModal?.addEventListener(
    "click",
    closeVehicleModal
  );

  modal?.addEventListener("click", (event) => {

    if (event.target === modal) {
      closeVehicleModal();
    }

  });

  form?.addEventListener("submit", (event) => {

    event.preventDefault();

    const vehicleNumber =
      document.getElementById("vehicleNumber")
        ?.value
        .trim()
        .toUpperCase();

    const type =
      document.getElementById("vehicleType")
        ?.value;

    const driver =
      document.getElementById("vehicleDriver")
        ?.value
        .trim();

    const contractor =
      document.getElementById("vehicleContractor")
        ?.value
        .trim();

    const status =
      document.getElementById("vehicleStatus")
        ?.value || "Active";

    if (!vehicleNumber || !type) {

      if (message) {
        message.textContent =
          "Vehicle number and type are required.";
      }

      return;
    }

    const vehicles = getVehicles();

    const alreadyExists = vehicles.some(
      (vehicle) =>
        vehicle.vehicleNumber === vehicleNumber
    );

    if (alreadyExists) {

      if (message) {
        message.textContent =
          "This vehicle is already added.";
      }

      return;
    }

    const newVehicle = {
      id:
        Date.now().toString() +
        Math.random().toString(36).slice(2),

      vehicleNumber,
      type,
      driver,
      contractor,
      status,

      createdAt:
        new Date().toISOString()
    };

    vehicles.push(newVehicle);

    saveVehicles(vehicles);

    closeVehicleModal();

    renderVehicles();
  });

  search.addEventListener(
    "input",
    renderVehicles
  );

  document
    .querySelectorAll(".filter-btn")
    .forEach((button) => {

      button.addEventListener("click", () => {

        document
          .querySelectorAll(".filter-btn")
          .forEach((item) =>
            item.classList.remove("active")
          );

        button.classList.add("active");

        currentFilter =
          button.dataset.filter || "all";

        renderVehicles();
      });
    });

  renderVehicles();
}

function setupAddEntry() {
  const form = document.getElementById("entryForm");

  if (!form) return;

  const entryTime = document.getElementById("entryTime");
  const exitTime = document.getElementById("exitTime");
  const duration = document.getElementById("calculatedDuration");
  const dateInput = document.getElementById("entryDate");

  function calculateDuration() {
    if (!entryTime?.value || !exitTime?.value) {
      if (duration) {
        duration.textContent = "0h 0m";
      }

      return;
    }

    const [eh, em] = entryTime.value.split(":").map(Number);
    const [xh, xm] = exitTime.value.split(":").map(Number);

    let start = eh * 60 + em;
    let end = xh * 60 + xm;

    if (end < start) {
      end += 24 * 60;
    }

    const total = end - start;

    const hours = Math.floor(total / 60);
    const minutes = total % 60;

    if (duration) {
      duration.textContent = `${hours}h ${minutes}m`;
    }
  }

  entryTime?.addEventListener("change", calculateDuration);
  exitTime?.addEventListener("change", calculateDuration);

  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.value = today;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const message = document.getElementById("entryMessage");

    showMessage(
      message,
      "Entry saved locally for now. Database will be connected next.",
      "success"
    );
  });

  document.getElementById("closeEntryBtn")
    ?.addEventListener("click", () => goTo("dashboard"));

  document.getElementById("cancelEntryBtn")
    ?.addEventListener("click", () => goTo("dashboard"));
}

function setupProfile() {
  const profileName = document.getElementById("profileName");

  if (!profileName) return;

  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("hymaUser"));
  } catch {
    user = null;
  }

  if (user) {
    profileName.textContent = user.name || "User";

    const contact = document.getElementById("profileContact");
    if (contact) {
      contact.textContent = user.contact || "Not added";
    }

    const role = document.getElementById("profileRole");
    if (role) {
      role.textContent = user.role || "Security Guard";
    }

    const company = document.getElementById("profileCompany");
    if (company) {
      company.textContent = user.company || "Hyma RMC Kokapet";
    }

    const avatar = document.getElementById("profileAvatar");

    if (avatar) {
      avatar.textContent = (user.name || "U")
        .charAt(0)
        .toUpperCase();
    }
  }

  document.getElementById("logoutBtn")
    ?.addEventListener("click", () => {
      localStorage.removeItem("hymaLoggedIn");
      localStorage.removeItem("hymaUser");

      window.location.href = "/";
    });
}

function setupNavigation() {
  const navItems = document.querySelectorAll(
    ".bottom-nav .nav-item"
  );

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const page = item.dataset.page;

      if (page) {
        goTo(page);
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupWelcome();
  setupLogin();
  setupRegister();
  setupDashboard();
  setupVehicles();
  setupAddEntry();
  setupProfile();
  setupNavigation();
});
