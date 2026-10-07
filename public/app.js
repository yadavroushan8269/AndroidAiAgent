const pages = {
  login: "pages/login.html",
  register: "pages/register.html",
  dashboard: "pages/dashboard.html",
  vehicles: "pages/vehicles.html",
  "add-entry": "pages/add-entry.html",
  calendar: "pages/calendar.html",
  reports: "pages/reports.html",
  profile: "pages/profile.html"
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

/* =========================
   WELCOME PAGE
========================= */

function setupWelcome() {
  const startBtn = document.getElementById("startBtn");

  if (!startBtn) return;

  startBtn.addEventListener("click", () => {
    goTo("login");
  });
}


/* =========================
   LOGIN PAGE
========================= */

function setupLogin() {
  const loginForm = document.getElementById("loginForm");
  const registerBtn = document.getElementById("registerBtn");
  const forgotPasswordBtn =
    document.getElementById("forgotPasswordBtn");

  const backBtn = document.getElementById("backBtn");

  const password =
    document.getElementById("loginPassword");

  const togglePassword =
    document.getElementById("toggleLoginPassword");

  const message =
    document.getElementById("loginMessage");

  if (registerBtn) {
    registerBtn.addEventListener("click", () => {
      goTo("register");
    });
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "../index.html";
    });
  }

  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener("click", () => {
      showMessage(
        message,
        "Password recovery will be connected later.",
        "info"
      );
    });
  }

  if (togglePassword && password) {
    togglePassword.addEventListener("click", () => {

      const isPassword =
        password.type === "password";

      password.type =
        isPassword ? "text" : "password";

      togglePassword.textContent =
        isPassword ? "🙈" : "👁️";

    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {

      event.preventDefault();

      const user =
        document.getElementById("loginUser")?.value.trim();

      const pass =
        document.getElementById("loginPassword")?.value;

      if (!user || !pass) {
        showMessage(
          message,
          "Please enter email/mobile and password.",
          "error"
        );
        return;
      }

      /*
       * Temporary frontend login.
       * Real database authentication will be added later.
       */

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
    });
  }
}


/* =========================
   REGISTER PAGE
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
    document.getElementById("registerPassword");

  const confirmPassword =
    document.getElementById("confirmPassword");

  const togglePassword =
    document.getElementById("toggleRegisterPassword");

  const toggleConfirm =
    document.getElementById("toggleConfirmPassword");

  const message =
    document.getElementById("registerMessage");


  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      goTo("login");
    });
  }


  if (backBtn) {
    backBtn.addEventListener("click", () => {
      goTo("login");
    });
  }


  if (togglePassword && password) {

    togglePassword.addEventListener("click", () => {

      const isPassword =
        password.type === "password";

      password.type =
        isPassword ? "text" : "password";

      togglePassword.textContent =
        isPassword ? "🙈" : "👁️";

    });

  }


  if (toggleConfirm && confirmPassword) {

    toggleConfirm.addEventListener("click", () => {

      const isPassword =
        confirmPassword.type === "password";

      confirmPassword.type =
        isPassword ? "text" : "password";

      toggleConfirm.textContent =
        isPassword ? "🙈" : "👁️";

    });

  }


  form.addEventListener("submit", (event) => {

    event.preventDefault();

    const name =
      document.getElementById("registerName")?.value.trim();

    const contact =
      document.getElementById("registerContact")?.value.trim();

    const company =
      document.getElementById("registerCompany")?.value.trim();

    const role =
      document.getElementById("registerRole")?.value;

    const pass =
      document.getElementById("registerPassword")?.value;

    const confirm =
      document.getElementById("confirmPassword")?.value;


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


    setTimeout(() => {
      goTo("dashboard");
    }, 700);

  });

}


/* =========================
   DASHBOARD
========================= */

function setupDashboard() {

  const todayDate =
    document.getElementById("todayDate");

  if (!todayDate) return;


  const now = new Date();

  todayDate.textContent =
    now.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });


  const quickAdd =
    document.getElementById("quickAddBtn");

  if (quickAdd) {
    quickAdd.addEventListener("click", () => {
      goTo("add-entry");
    });
  }


  const viewAll =
    document.getElementById("viewAllBtn");

  if (viewAll) {
    viewAll.addEventListener("click", () => {
      goTo("calendar");
    });
  }

}


/* =========================
   VEHICLES
========================= */

function setupVehicles() {

  const search =
    document.getElementById("vehicleSearch");

  if (!search) return;


  const addVehicle =
    document.getElementById("addVehicleBtn");

  const emptyAdd =
    document.getElementById("emptyAddVehicleBtn");


  const addVehicleAction = () => {

    alert(
      "Vehicle management will be connected to the database next."
    );

  };


  if (addVehicle) {
    addVehicle.addEventListener(
      "click",
      addVehicleAction
    );
  }


  if (emptyAdd) {
    emptyAdd.addEventListener(
      "click",
      addVehicleAction
    );
  }

}


/* =========================
   ADD ENTRY
========================= */

function setupAddEntry() {

  const form =
    document.getElementById("entryForm");

  if (!form) return;


  const entryTime =
    document.getElementById("entryTime");

  const exitTime =
    document.getElementById("exitTime");

  const duration =
    document.getElementById("calculatedDuration");


  function calculateDuration() {

    if (!entryTime?.value || !exitTime?.value) {

      if (duration) {
        duration.textContent = "0h 0m";
      }

      return;
    }


    const [eh, em] =
      entryTime.value.split(":").map(Number);

    const [xh, xm] =
      exitTime.value.split(":").map(Number);


    let start =
      eh * 60 + em;

    let end =
      xh * 60 + xm;


    /*
     * Handles an exit after midnight.
     */

    if (end < start) {
      end += 24 * 60;
    }


    const total =
      end - start;

    const hours =
      Math.floor(total / 60);

    const minutes =
      total % 60;


    if (duration) {
      duration.textContent =
        `${hours}h ${minutes}m`;
    }

  }


  entryTime?.addEventListener(
    "change",
    calculateDuration
  );

  exitTime?.addEventListener(
    "change",
    calculateDuration
  );


  const today =
    new Date().toISOString().split("T")[0];

  const dateInput =
    document.getElementById("entryDate");

  if (dateInput) {
    dateInput.value = today;
  }


  form.addEventListener("submit", (event) => {

    event.preventDefault();

    const message =
      document.getElementById("entryMessage");

    showMessage(
      message,
      "Entry saved locally for now. Database will be connected next.",
      "success"
    );

  });


  const closeBtn =
    document.getElementById("closeEntryBtn");

  const cancelBtn =
    document.getElementById("cancelEntryBtn");


  closeBtn?.addEventListener(
    "click",
    () => goTo("dashboard")
  );

  cancelBtn?.addEventListener(
    "click",
    () => goTo("dashboard")
  );

}


/* =========================
   PROFILE
========================= */

function setupProfile() {

  const profileName =
    document.getElementById("profileName");

  if (!profileName) return;


  let user = null;

  try {

    user = JSON.parse(
      localStorage.getItem("hymaUser")
    );

  } catch {
    user = null;
  }


  if (user) {

    profileName.textContent =
      user.name || "User";

    const contact =
      document.getElementById("profileContact");

    if (contact) {
      contact.textContent =
        user.contact || "Not added";
    }


    const role =
      document.getElementById("profileRole");

    if (role) {
      role.textContent =
        user.role || "Security Guard";
    }


    const company =
      document.getElementById("profileCompany");

    if (company) {
      company.textContent =
        user.company || "Hyma RMC Kokapet";
    }


    const avatar =
      document.getElementById("profileAvatar");

    if (avatar) {

      avatar.textContent =
        (user.name || "U")
          .charAt(0)
          .toUpperCase();

    }

  }


  const logout =
    document.getElementById("logoutBtn");

  if (logout) {

    logout.addEventListener("click", () => {

      localStorage.removeItem(
        "hymaLoggedIn"
      );

      localStorage.removeItem(
        "hymaUser"
      );

      window.location.href =
        "../index.html";

    });

  }

}


/* =========================
   BOTTOM NAVIGATION
========================= */

function setupNavigation() {

  const navItems =
    document.querySelectorAll(
      ".bottom-nav .nav-item"
    );


  navItems.forEach((item) => {

    item.addEventListener("click", () => {

      const page =
        item.dataset.page;

      if (page) {
        goTo(page);
      }

    });

  });

}


/* =========================
   START APPLICATION
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
    setupProfile();
    setupNavigation();

  }
);
