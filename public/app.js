"use strict";

/* =========================================================
   HYMA RMC KOKAPET
   Stable Frontend App
========================================================= */

const STORAGE = {
  users: "hyma_users",
  currentUser: "hyma_current_user",
  vehicles: "hyma_vehicles",
  entries: "hyma_entries"
};

const PAGES = {
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
   STORAGE
========================================================= */

function readJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);

    if (!value) {
      return fallback;
    }

    const parsed = JSON.parse(value);

    return parsed ?? fallback;
  } catch (error) {
    console.error("Storage read error:", key, error);
    return fallback;
  }
}


function writeJSON(key, value) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

    return true;
  } catch (error) {
    console.error("Storage write error:", key, error);
    return false;
  }
}


function getUsers() {
  return readJSON(
    STORAGE.users,
    []
  );
}


function getVehicles() {
  return readJSON(
    STORAGE.vehicles,
    []
  );
}


function getEntries() {
  return readJSON(
    STORAGE.entries,
    []
  );
}


function getCurrentUser() {
  return readJSON(
    STORAGE.currentUser,
    null
  );
}


function saveUsers(value) {
  writeJSON(
    STORAGE.users,
    value
  );
}


function saveVehicles(value) {
  writeJSON(
    STORAGE.vehicles,
    value
  );
}


function saveEntries(value) {
  writeJSON(
    STORAGE.entries,
    value
  );
}


function saveCurrentUser(value) {
  writeJSON(
    STORAGE.currentUser,
    value
  );
}


/* =========================================================
   HELPERS
========================================================= */

function $(id) {
  return document.getElementById(id);
}


function go(page) {
  if (!PAGES[page]) {
    console.error("Unknown page:", page);
    return;
  }

  window.location.href = PAGES[page];
}


function today() {
  const d = new Date();

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
}


function id(prefix) {
  return (
    prefix +
    "_" +
    Date.now() +
    "_" +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );
}


function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function duration(entryTime, exitTime) {
  if (!entryTime || !exitTime) {
    return 0;
  }

  const a = entryTime
    .split(":")
    .map(Number);

  const b = exitTime
    .split(":")
    .map(Number);

  let start =
    a[0] * 60 + a[1];

  let end =
    b[0] * 60 + b[1];

  if (end < start) {
    end += 1440;
  }

  return end - start;
}


function durationText(minutes) {
  minutes = Number(minutes) || 0;

  const h =
    Math.floor(minutes / 60);

  const m =
    minutes % 60;

  return `${h}h ${m}m`;
}


function dateText(value) {
  if (!value) {
    return "-";
  }

  const d =
    new Date(value + "T00:00:00");

  return d.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}


function message(element, text, type) {
  if (!element) {
    return;
  }

  element.textContent = text;

  element.className =
    "form-message " +
    (type || "");
}


/* =========================================================
   AUTH
========================================================= */

function isPublicPage() {
  const path =
    window.location.pathname;

  return (
    path === "/" ||
    path === "/index.html" ||
    path === "/pages/login.html" ||
    path === "/pages/register.html"
  );
}


function checkAuth() {
  if (isPublicPage()) {
    return true;
  }

  if (!getCurrentUser()) {
    window.location.replace(
      PAGES.login
    );

    return false;
  }

  return true;
}


/* =========================================================
   HOME / GET STARTED
========================================================= */

function initHome() {
  const button =
    $("startBtn");

  if (!button) {
    return;
  }

  button.addEventListener(
    "click",
    function () {

      const user =
        getCurrentUser();

      if (user) {
        go("dashboard");
      } else {
        go("login");
      }

    }
  );
}


/* =========================================================
   REGISTER
========================================================= */

function initRegister() {
  const form =
    $("registerForm");

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    function (event) {

      event.preventDefault();

      const name =
        $("registerName")?.value.trim() || "";

      const email =
        $("registerEmail")?.value.trim().toLowerCase() || "";

      const mobile =
        $("registerMobile")?.value.trim() || "";

      const company =
        $("registerCompany")?.value.trim() || "";

      const role =
        $("registerRole")?.value || "";

      const password =
        $("registerPassword")?.value || "";

      const confirmPassword =
        $("registerConfirmPassword")?.value || "";

      const output =
        $("registerMessage");


      /* REQUIRED CHECK */

      if (
        !name ||
        !email ||
        !mobile ||
        !company ||
        !role ||
        !password ||
        !confirmPassword
      ) {

        message(
          output,
          "Please fill all required fields.",
          "error"
        );

        return;
      }


      /* EMAIL */

      if (
        !email.includes("@") ||
        !email.includes(".")
      ) {

        message(
          output,
          "Please enter a valid email.",
          "error"
        );

        return;
      }


      /* MOBILE */

      const cleanMobile =
        mobile.replace(
          /\D/g,
          ""
        );

      if (
        cleanMobile.length < 10
      ) {

        message(
          output,
          "Please enter a valid mobile number.",
          "error"
        );

        return;
      }


      /* PASSWORD */

      if (
        password.length < 6
      ) {

        message(
          output,
          "Password must be at least 6 characters.",
          "error"
        );

        return;
      }


      if (
        password !==
        confirmPassword
      ) {

        message(
          output,
          "Passwords do not match.",
          "error"
        );

        return;
      }


      const users =
        getUsers();


      const exists =
        users.some(
          user =>
            String(user.email || "")
              .toLowerCase() === email ||
            String(user.mobile || "")
              .replace(/\D/g, "") ===
              cleanMobile
        );


      if (exists) {

        message(
          output,
          "Email or mobile is already registered.",
          "error"
        );

        return;
      }


      const user = {
        id: id("user"),
        name,
        email,
        mobile: cleanMobile,
        company,
        role,
        password,
        createdAt:
          new Date().toISOString()
      };


      users.push(user);

      saveUsers(users);

      saveCurrentUser(user);


      message(
        output,
        "Account created successfully. Opening dashboard...",
        "success"
      );


      setTimeout(
        function () {
          go("dashboard");
        },
        500
      );

    }
  );
}


/* =========================================================
   LOGIN
========================================================= */

function initLogin() {
  const form =
    $("loginForm");

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    function (event) {

      event.preventDefault();

      const identity =
        $("loginEmail")?.value.trim().toLowerCase() || "";

      const password =
        $("loginPassword")?.value || "";

      const output =
        $("loginMessage");


      if (
        !identity ||
        !password
      ) {

        message(
          output,
          "Please enter email/mobile and password.",
          "error"
        );

        return;
      }


      const users =
        getUsers();


      const user =
        users.find(
          item => {

            const email =
              String(
                item.email || ""
              ).toLowerCase();

            const mobile =
              String(
                item.mobile || ""
              ).replace(
                /\D/g,
                ""
              );

            const inputMobile =
              identity.replace(
                /\D/g,
                ""
              );

            return (
              (
                email ===
                identity
              ) ||
              (
                mobile &&
                mobile ===
                inputMobile
              )
            ) &&
            item.password ===
            password;
          }
        );


      if (!user) {

        message(
          output,
          "Invalid email/mobile or password.",
          "error"
        );

        return;
      }


      saveCurrentUser(user);


      message(
        output,
        "Login successful.",
        "success"
      );


      setTimeout(
        function () {
          go("dashboard");
        },
        300
      );

    }
  );


  const forgot =
    $("forgotPasswordBtn");


  forgot?.addEventListener(
    "click",
    function (event) {

      event.preventDefault();

      alert(
        "Password recovery will be connected to the backend later."
      );

    }
  );
}


/* =========================================================
   NAVIGATION
========================================================= */

function initNavigation() {
  document
    .querySelectorAll(
      "[data-page]"
    )
    .forEach(
      function (button) {

        button.addEventListener(
          "click",
          function () {

            const page =
              button.dataset.page;

            if (page) {
              go(page);
            }

          }
        );

      }
    );
}


/* =========================================================
   DASHBOARD
========================================================= */

function initDashboard() {
  if (!$("dashboardVehicleCount")) {
    return;
  }

  const user =
    getCurrentUser();

  if (user && $("welcomeName")) {
    $("welcomeName").textContent =
      "Welcome, " + user.name;
  }


  if ($("dashboardDate")) {
    $("dashboardDate").textContent =
      new Date().toLocaleDateString(
        "en-IN",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        }
      );
  }


  const vehicles =
    getVehicles();

  const entries =
    getEntries();

  const todayEntries =
    entries.filter(
      item =>
        item.date === today()
    );


  const running =
    todayEntries.filter(
      item =>
        !item.exitTime
    ).length;


  const total =
    todayEntries.reduce(
      (sum, item) =>
        sum +
        Number(item.duration || 0),
      0
    );


  $("dashboardVehicleCount").textContent =
    vehicles.length;

  $("dashboardRunningCount").textContent =
    running;

  $("dashboardEntryCount").textContent =
    todayEntries.length;

  $("dashboardDuration").textContent =
    durationText(total);


  renderDashboardActivity(
    todayEntries,
    vehicles
  );


  $("notificationBtn")?.addEventListener(
    "click",
    function () {

      alert(
        running
          ? `${running} vehicle currently running.`
          : "No vehicle is currently running."
      );

    }
  );
}


function renderDashboardActivity(
  entries,
  vehicles
) {
  const list =
    $("dashboardActivityList");

  if (!list) {
    return;
  }


  if (!entries.length) {

    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🚚</div>
        <h3>No Activity Today</h3>
        <p>No vehicle entries recorded today.</p>
      </div>
    `;

    return;
  }


  list.innerHTML =
    entries
      .slice()
      .reverse()
      .slice(0, 10)
      .map(
        function (entry) {

          const vehicle =
            vehicles.find(
              v =>
                v.id ===
                entry.vehicleId
            );


          return `
            <div class="activity-card">

              <div class="activity-card-top">

                <div>

                  <h3>
                    ${escapeHTML(
                      vehicle?.vehicleNumber ||
                      entry.vehicleNumber ||
                      "Vehicle"
                    )}
                  </h3>

                  <p>
                    ${escapeHTML(
                      entry.entryTime || "-"
                    )}
                    →
                    ${escapeHTML(
                      entry.exitTime ||
                      "Running"
                    )}
                  </p>

                  <p>
                    ${escapeHTML(
                      entry.purpose || "-"
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
                      ? durationText(
                          entry.duration
                        )
                      : "Running"
                  }
                </span>

              </div>

            </div>
          `;
        }
      )
      .join("");
}


/* =========================================================
   VEHICLES
========================================================= */

function initVehicles() {
  if (!$("vehicleList")) {
    return;
  }


  let filter =
    "all";

  let editing =
    null;


  const modal =
    $("vehicleModal");

  const form =
    $("vehicleForm");


  function openAdd() {

    editing = null;

    form?.reset();

    $("vehicleModalTitle").textContent =
      "Add Vehicle";

    $("vehicleModalSubtitle").textContent =
      "Enter vehicle details";

    $("vehicleSaveBtn").textContent =
      "Save Vehicle";

    $("vehicleCancelEditBtn")
      ?.classList.add("hidden");


    modal?.classList.remove(
      "hidden"
    );

  }


  function openEdit(vehicle) {

    editing =
      vehicle.id;


    $("vehicleNumber").value =
      vehicle.vehicleNumber || "";

    $("vehicleType").value =
      vehicle.vehicleType || "";

    $("vehicleDriver").value =
      vehicle.driverName || "";

    $("vehicleContractor").value =
      vehicle.contractor || "";

    $("vehicleStatus").value =
      vehicle.status || "Active";


    $("vehicleModalTitle").textContent =
      "Edit Vehicle";

    $("vehicleModalSubtitle").textContent =
      "Update vehicle details";

    $("vehicleSaveBtn").textContent =
      "Update Vehicle";

    $("vehicleCancelEditBtn")
      ?.classList.remove("hidden");


    modal?.classList.remove(
      "hidden"
    );

  }


  function close() {

    modal?.classList.add(
      "hidden"
    );

    editing = null;

    form?.reset();

  }


  $("addVehicleBtn")
    ?.addEventListener(
      "click",
      openAdd
    );


  $("emptyAddVehicleBtn")
    ?.addEventListener(
      "click",
      openAdd
    );


  $("closeVehicleModal")
    ?.addEventListener(
      "click",
      close
    );


  $("vehicleCancelEditBtn")
    ?.addEventListener(
      "click",
      close
    );


  form?.addEventListener(
    "submit",
    function (event) {

      event.preventDefault();


      const number =
        $("vehicleNumber")
          .value
          .trim()
          .toUpperCase();

      const type =
        $("vehicleType").value;

      const driver =
        $("vehicleDriver")
          .value
          .trim();

      const contractor =
        $("vehicleContractor")
          .value
          .trim();

      const status =
        $("vehicleStatus").value;

      const output =
        $("vehicleFormMessage");


      if (!number || !type) {

        message(
          output,
          "Please fill vehicle number and type.",
          "error"
        );

        return;
      }


      const vehicles =
        getVehicles();


      const duplicate =
        vehicles.some(
          vehicle =>
            vehicle.vehicleNumber
              .toUpperCase() ===
              number &&
            vehicle.id !==
              editing
        );


      if (duplicate) {

        message(
          output,
          "This vehicle already exists.",
          "error"
        );

        return;
      }


      if (editing) {

        const index =
          vehicles.findIndex(
            v =>
              v.id ===
              editing
          );


        if (index !== -1) {

          vehicles[index] = {
            ...vehicles[index],
            vehicleNumber: number,
            vehicleType: type,
            driverName: driver,
            contractor,
            status,
            updatedAt:
              new Date().toISOString()
          };

        }

      } else {

        vehicles.push({
          id: id("vehicle"),
          vehicleNumber: number,
          vehicleType: type,
          driverName: driver,
          contractor,
          status,
          createdAt:
            new Date().toISOString()
        });

      }


      saveVehicles(
        vehicles
      );


      render();


      message(
        output,
        editing
          ? "Vehicle updated successfully."
          : "Vehicle added successfully.",
        "success"
      );


      setTimeout(
        close,
        400
      );

    }
  );


  document
    .querySelectorAll(
      ".filter-btn"
    )
    .forEach(
      function (button) {

        button.addEventListener(
          "click",
          function () {

            document
              .querySelectorAll(
                ".filter-btn"
              )
              .forEach(
                b =>
                  b.classList.remove(
                    "active"
                  )
              );


            button.classList.add(
              "active"
            );


            filter =
              button.dataset.filter ||
              "all";


            render();

          }
        );

      }
    );


  $("vehicleSearch")
    ?.addEventListener(
      "input",
      render
    );


  function render() {

    const all =
      getVehicles();

    const search =
      (
        $("vehicleSearch")
          ?.value || ""
      )
        .trim()
        .toLowerCase();


    const filtered =
      all.filter(
        function (vehicle) {

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


          const searchOK =
            !search ||
            number.includes(search) ||
            driver.includes(search) ||
            contractor.includes(search);


          let filterOK =
            true;


          if (filter === "tm") {
            filterOK =
              vehicle.vehicleType === "TM";
          }


          if (filter === "truck") {
            filterOK =
              vehicle.vehicleType === "Truck";
          }


          if (filter === "dumper") {
            filterOK =
              vehicle.vehicleType === "Dumper";
          }


          if (filter === "other") {
            filterOK =
              ![
                "TM",
                "Truck",
                "Dumper"
              ].includes(
                vehicle.vehicleType
              );
          }


          return (
            searchOK &&
            filterOK
          );

        }
      );


    if ($("vehicleCount")) {
      $("vehicleCount").textContent =
        all.length;
    }


    if ($("activeVehicleCount")) {
      $("activeVehicleCount").textContent =
        all.filter(
          v =>
            v.status ===
            "Active"
        ).length;
    }


    const empty =
      $("vehicleEmpty");


    if (!filtered.length) {

      $("vehicleList").innerHTML =
        "";

      empty?.classList.remove(
        "hidden"
      );

      return;
    }


    empty?.classList.add(
      "hidden"
    );


    $("vehicleList").innerHTML =
      filtered
        .map(
          function (vehicle) {

            const entries =
              getEntries().filter(
                e =>
                  e.vehicleId ===
                  vehicle.id
              );


            const total =
              entries.reduce(
                (sum, e) =>
                  sum +
                  Number(
                    e.duration || 0
                  ),
                0
              );


            const running =
              entries.some(
                e =>
                  !e.exitTime
              );


            return `
              <article class="vehicle-card">

                <div class="vehicle-card-top">

                  <div class="vehicle-icon">
                    🚚
                  </div>

                  <div class="vehicle-main">

                    <h3>
                      ${escapeHTML(
                        vehicle.vehicleNumber
                      )}
                    </h3>

                    <p>
                      ${escapeHTML(
                        vehicle.vehicleType
                      )}
                    </p>

                  </div>

                  <span class="vehicle-status ${
                    vehicle.status === "Active"
                      ? "active"
                      : "inactive"
                  }">
                    ${escapeHTML(
                      vehicle.status
                    )}
                  </span>

                </div>


                <div class="vehicle-details">

                  <div>
                    <span>Driver</span>
                    <strong>
                      ${escapeHTML(
                        vehicle.driverName || "-"
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Contractor</span>
                    <strong>
                      ${escapeHTML(
                        vehicle.contractor || "-"
                      )}
                    </strong>
                  </div>

                </div>


                <div class="vehicle-details">

                  <div>
                    <span>Entries</span>
                    <strong>
                      ${entries.length}
                    </strong>
                  </div>

                  <div>
                    <span>Duration</span>
                    <strong>
                      ${durationText(total)}
                    </strong>
                  </div>

                </div>


                ${
                  running
                    ? `
                      <div class="activity-status running">
                        Currently Running
                      </div>
                    `
                    : ""
                }


                <div class="vehicle-actions">

                  <button
                    class="secondary-btn"
                    type="button"
                    data-history="${vehicle.id}"
                  >
                    📋 History
                  </button>

                  <button
                    class="secondary-btn"
                    type="button"
                    data-edit="${vehicle.id}"
                  >
                    ✏️ Edit
                  </button>

                  <button
                    class="vehicle-delete-btn"
                    type="button"
                    data-delete="${vehicle.id}"
                  >
                    🗑️ Delete
                  </button>

                </div>

              </article>
            `;

          }
        )
        .join("");


    document
      .querySelectorAll(
        "[data-edit]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            function () {

              const vehicle =
                getVehicles().find(
                  v =>
                    v.id ===
                    button.dataset.edit
                );

              if (vehicle) {
                openEdit(vehicle);
              }

            }
          );

        }
      );


    document
      .querySelectorAll(
        "[data-delete]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            function () {

              const vehicle =
                getVehicles().find(
                  v =>
                    v.id ===
                    button.dataset.delete
                );

              if (!vehicle) {
                return;
              }


              if (
                !confirm(
                  `Delete ${vehicle.vehicleNumber}?`
                )
              ) {
                return;
              }


              saveVehicles(
                getVehicles().filter(
                  v =>
                    v.id !==
                    vehicle.id
                )
              );


              saveEntries(
                getEntries().filter(
                  e =>
                    e.vehicleId !==
                    vehicle.id
                )
              );


              render();

            }
          );

        }
      );


    document
      .querySelectorAll(
        "[data-history]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            function () {

              showHistory(
                button.dataset.history
              );

            }
          );

        }
      );

  }


  function showHistory(
    vehicleId
  ) {

    const vehicle =
      getVehicles().find(
        v =>
          v.id ===
          vehicleId
      );


    if (!vehicle) {
      return;
    }


    const entries =
      getEntries()
        .filter(
          e =>
            e.vehicleId ===
            vehicleId
        )
        .sort(
          (a, b) =>
            String(
              b.date +
              b.entryTime
            ).localeCompare(
              String(
                a.date +
                a.entryTime
              )
            )
        );


    $("vehicleHistorySubtitle").textContent =
      `${vehicle.vehicleNumber} • ${vehicle.vehicleType}`;


    $("historyTotalEntries").textContent =
      entries.length;


    $("historyCompletedEntries").textContent =
      entries.filter(
        e =>
          e.exitTime
      ).length;


    $("historyTotalDuration").textContent =
      durationText(
        entries.reduce(
          (sum, e) =>
            sum +
            Number(
              e.duration || 0
            ),
          0
        )
      );


    if (!entries.length) {

      $("vehicleHistoryList").innerHTML =
        "";

      $("vehicleHistoryEmpty")
        ?.classList.remove(
          "hidden"
        );

    } else {

      $("vehicleHistoryEmpty")
        ?.classList.add(
          "hidden"
        );


      $("vehicleHistoryList").innerHTML =
        entries
          .map(
            e => `
              <div class="activity-card">

                <div class="activity-card-top">

                  <div>

                    <h3>
                      ${escapeHTML(
                        dateText(e.date)
                      )}
                    </h3>

                    <p>
                      ${escapeHTML(
                        e.entryTime || "-"
                      )}
                      →
                      ${escapeHTML(
                        e.exitTime ||
                        "Running"
                      )}
                    </p>

                    <p>
                      ${escapeHTML(
                        e.purpose || "-"
                      )}
                    </p>

                  </div>

                  <span class="activity-status ${
                    !e.exitTime
                      ? "running"
                      : ""
                  }">
                    ${
                      e.exitTime
                        ? durationText(
                            e.duration
                          )
                        : "Running"
                    }
                  </span>

                </div>

              </div>
            `
          )
          .join("");

    }


    $("vehicleHistoryModal")
      ?.classList.remove(
        "hidden"
      );

  }


  $("closeVehicleHistoryModal")
    ?.addEventListener(
      "click",
      function () {
        $("vehicleHistoryModal")
          ?.classList.add(
            "hidden"
          );
      }
    );


  $("vehicleHistoryDoneBtn")
    ?.addEventListener(
      "click",
      function () {
        $("vehicleHistoryModal")
          ?.classList.add(
            "hidden"
          );
      }
    );


  render();
}


/* =========================================================
   ADD ENTRY
========================================================= */

function initEntry() {
  const form =
    $("entryForm");

  if (!form) {
    return;
  }


  $("entryDate").value =
    today();


  function loadVehicles() {

    const select =
      $("entryVehicle");

    const vehicles =
      getVehicles();


    select.innerHTML =
      `<option value="">Select vehicle</option>`;


    vehicles.forEach(
      vehicle => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          vehicle.id;

        option.textContent =
          `${vehicle.vehicleNumber} — ${vehicle.vehicleType}`;

        select.appendChild(
          option
        );

      }
    );


    if (!vehicles.length) {

      message(
        $("noVehicleMessage"),
        "No vehicles available. Add a vehicle first.",
        "error"
      );

    }

  }


  $("entryVehicle")
    ?.addEventListener(
      "change",
      function () {

        const vehicle =
          getVehicles().find(
            v =>
              v.id ===
              this.value
          );


        $("vehicleType").value =
          vehicle?.vehicleType || "";

        $("driverName").value =
          vehicle?.driverName || "";

      }
    );


  function updateDuration() {

    const entry =
      $("entryTime").value;

    const exit =
      $("exitTime").value;


    $("calculatedDuration").textContent =
      exit
        ? durationText(
            duration(
              entry,
              exit
            )
          )
        : "Running";

  }


  $("entryTime")
    ?.addEventListener(
      "input",
      updateDuration
    );


  $("exitTime")
    ?.addEventListener(
      "input",
      updateDuration
    );


  form.addEventListener(
    "submit",
    function (event) {

      event.preventDefault();


      const vehicle =
        getVehicles().find(
          v =>
            v.id ===
            $("entryVehicle").value
        );


      if (!vehicle) {

        message(
          $("entryMessage"),
          "Please select a vehicle.",
          "error"
        );

        return;
      }


      const entryTime =
        $("entryTime").value;

      const exitTime =
        $("exitTime").value;


      if (!entryTime) {

        message(
          $("entryMessage"),
          "Please enter entry time.",
          "error"
        );

        return;
      }


      const entry = {
        id: id("entry"),
        vehicleId: vehicle.id,
        vehicleNumber:
          vehicle.vehicleNumber,
        vehicleType:
          vehicle.vehicleType,
        driverName:
          vehicle.driverName,
        date:
          $("entryDate").value,
        entryTime,
        exitTime,
        duration:
          duration(
            entryTime,
            exitTime
          ),
        purpose:
          $("entryPurpose").value,
        notes:
          $("entryNotes").value.trim(),
        createdAt:
          new Date().toISOString()
      };


      const entries =
        getEntries();

      entries.push(entry);

      saveEntries(entries);


      message(
        $("entryMessage"),
        "Entry saved successfully.",
        "success"
      );


      setTimeout(
        function () {
          go("dashboard");
        },
        500
      );

    }
  );


  $("cancelEntryBtn")
    ?.addEventListener(
      "click",
      () => go("dashboard")
    );


  $("closeEntryBtn")
    ?.addEventListener(
      "click",
      () => go("dashboard")
    );


  loadVehicles();
}


/* =========================================================
   CALENDAR
========================================================= */

function initCalendar() {
  if (!$("calendarGrid")) {
    return;
  }


  let current =
    new Date();

  let selected =
    today();


  function render() {

    const year =
      current.getFullYear();

    const month =
      current.getMonth();


    $("currentMonth").textContent =
      current.toLocaleDateString(
        "en-IN",
        {
          month: "long",
          year: "numeric"
        }
      );


    const first =
      new Date(
        year,
        month,
        1
      ).getDay();


    const days =
      new Date(
        year,
        month + 1,
        0
      ).getDate();


    const activity =
      new Set(
        getEntries().map(
          e =>
            e.date
        )
      );


    const grid =
      $("calendarGrid");


    grid.innerHTML =
      "";


    for (
      let i = 0;
      i < first;
      i++
    ) {

      const blank =
        document.createElement(
          "div"
        );

      blank.className =
        "calendar-day empty";

      grid.appendChild(
        blank
      );

    }


    for (
      let day = 1;
      day <= days;
      day++
    ) {

      const value =
        `${year}-${String(
          month + 1
        ).padStart(2, "0")}-${String(
          day
        ).padStart(2, "0")}`;


      const button =
        document.createElement(
          "button"
        );


      button.type =
        "button";

      button.className =
        "calendar-day";


      if (
        value ===
        today()
      ) {
        button.classList.add(
          "today"
        );
      }


      if (
        value ===
        selected
      ) {
        button.classList.add(
          "selected"
        );
      }


      if (
        activity.has(
          value
        )
      ) {
        button.classList.add(
          "has-activity"
        );
      }


      button.textContent =
        day;


      button.addEventListener(
        "click",
        function () {

          selected =
            value;

          render();

        }
      );


      grid.appendChild(
        button
      );

    }


    renderSelected();

  }


  function renderSelected() {

    const entries =
      getEntries().filter(
        e =>
          e.date ===
          selected
      );


    const vehicles =
      new Set(
        entries.map(
          e =>
            e.vehicleId
        )
      );


    const total =
      entries.reduce(
        (sum, e) =>
          sum +
          Number(
            e.duration || 0
          ),
        0
      );


    $("activityDateText").textContent =
      dateText(selected);

    $("calendarVehicleCount").textContent =
      vehicles.size;

    $("calendarEntryCount").textContent =
      entries.length;

    $("calendarDuration").textContent =
      durationText(total);


    if (!entries.length) {

      $("calendarEntryList").innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <h3>No Activity</h3>
          <p>No vehicle entries on this date.</p>
        </div>
      `;

      return;
    }


    $("calendarEntryList").innerHTML =
      entries
        .map(
          e => `
            <div class="activity-card">

              <div class="activity-card-top">

                <div>

                  <h3>
                    ${escapeHTML(
                      e.vehicleNumber || "Vehicle"
                    )}
                  </h3>

                  <p>
                    ${escapeHTML(
                      e.entryTime || "-"
                    )}
                    →
                    ${escapeHTML(
                      e.exitTime ||
                      "Running"
                    )}
                  </p>

                  <p>
                    ${escapeHTML(
                      e.purpose || "-"
                    )}
                  </p>

                </div>

                <span class="activity-status ${
                  !e.exitTime
                    ? "running"
                    : ""
                }">
                  ${
                    e.exitTime
                      ? durationText(
                          e.duration
                        )
                      : "Running"
                  }
                </span>

              </div>

            </div>
          `
        )
        .join("");

  }


  $("previousMonthBtn")
    ?.addEventListener(
      "click",
      function () {

        current.setMonth(
          current.getMonth() - 1
        );

        render();

      }
    );


  $("nextMonthBtn")
    ?.addEventListener(
      "click",
      function () {

        current.setMonth(
          current.getMonth() + 1
        );

        render();

      }
    );


  $("calendarTodayBtn")
    ?.addEventListener(
      "click",
      function () {

        current =
          new Date();

        selected =
          today();

        render();

      }
    );


  render();
}


/* =========================================================
   REPORTS
========================================================= */

function initReports() {
  if (!$("reportFrom")) {
    return;
  }


  function render() {

    const from =
      $("reportFrom").value;

    const to =
      $("reportTo").value;


    const entries =
      getEntries().filter(
        e =>
          (!from || e.date >= from) &&
          (!to || e.date <= to)
      );


    const vehicles =
      new Set(
        entries.map(
          e =>
            e.vehicleId
        )
      );


    const completed =
      entries.filter(
        e =>
          e.exitTime
      );


    const total =
      completed.reduce(
        (sum, e) =>
          sum +
          Number(
            e.duration || 0
          ),
        0
      );


    $("reportVehicleCount").textContent =
      vehicles.size;

    $("reportEntryCount").textContent =
      entries.length;

    $("reportCompletedCount").textContent =
      completed.length;

    $("reportDuration").textContent =
      durationText(total);


    renderReportEntries(
      entries
    );

  }


  function renderReportEntries(
    entries
  ) {

    if (!entries.length) {

      $("vehicleReportList").innerHTML =
        `
          <div class="empty-state">
            <div class="empty-icon">📊</div>
            <h3>No Report Data</h3>
            <p>No entries found.</p>
          </div>
        `;

      $("reportEntryList").innerHTML =
        "";

      return;
    }


    const groups = {};


    entries.forEach(
      e => {

        if (!groups[e.vehicleId]) {

          groups[e.vehicleId] = {
            number:
              e.vehicleNumber ||
              "Vehicle",
            count: 0,
            duration: 0
          };

        }


        groups[e.vehicleId].count++;

        groups[e.vehicleId].duration +=
          Number(
            e.duration || 0
          );

      }
    );


    $("vehicleReportList").innerHTML =
      Object.values(groups)
        .map(
          item => `
            <div class="activity-card">

              <div class="activity-card-top">

                <div>

                  <h3>
                    ${escapeHTML(
                      item.number
                    )}
                  </h3>

                  <p>
                    ${item.count}
                    ${item.count === 1 ? "entry" : "entries"}
                  </p>

                </div>

                <span class="activity-status">
                  ${durationText(
                    item.duration
                  )}
                </span>

              </div>

            </div>
          `
        )
        .join("");


    $("reportEntryList").innerHTML =
      entries
        .slice()
        .reverse()
        .map(
          e => `
            <div class="activity-card">

              <div class="activity-card-top">

                <div>

                  <h3>
                    ${escapeHTML(
                      e.vehicleNumber ||
                      "Vehicle"
                    )}
                  </h3>

                  <p>
                    ${escapeHTML(
                      dateText(e.date)
                    )}
                  </p>

                  <p>
                    ${escapeHTML(
                      e.entryTime || "-"
                    )}
                    →
                    ${escapeHTML(
                      e.exitTime ||
                      "Running"
                    )}
                  </p>

                  <p>
                    ${escapeHTML(
                      e.purpose || "-"
                    )}
                  </p>

                </div>

                <span class="activity-status ${
                  !e.exitTime
                    ? "running"
                    : ""
                }">
                  ${
                    e.exitTime
                      ? durationText(
                          e.duration
                        )
                      : "Running"
                  }
                </span>

              </div>

            </div>
          `
        )
        .join("");

  }


  function todayReport() {

    const d =
      today();

    $("reportFrom").value =
      d;

    $("reportTo").value =
      d;

    render();

  }


  $("reportFrom")
    .addEventListener(
      "change",
      render
    );


  $("reportTo")
    .addEventListener(
      "change",
      render
    );


  $("reportTodayBtn")
    ?.addEventListener(
      "click",
      todayReport
    );


  todayReport();
}


/* =========================================================
   PROFILE
========================================================= */

function initProfile() {
  if (!$("profileName")) {
    return;
  }


  const user =
    getCurrentUser();


  if (!user) {
    go("login");
    return;
  }


  $("profileName").textContent =
    user.name || "User";

  $("profileEmail").textContent =
    user.email || "-";

  $("profileNameValue").textContent =
    user.name || "-";

  $("profileEmailValue").textContent =
    user.email || "-";

  $("profileMobileValue").textContent =
    user.mobile || "-";

  $("profileRoleValue").textContent =
    user.role || "-";

  $("profileCompanyValue").textContent =
    user.company || "-";


  $("logoutBtn")
    ?.addEventListener(
      "click",
      function () {

        if (
          confirm(
            "Are you sure you want to logout?"
          )
        ) {

          localStorage.removeItem(
            STORAGE.currentUser
          );

          go("login");

        }

      }
    );


  $("reportsProfileBtn")
    ?.addEventListener(
      "click",
      function () {
        go("reports");
      }
    );
}


/* =========================================================
   START APP
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    console.log(
      "Hyma RMC Kokapet app loaded"
    );


    /*
      IMPORTANT:
      Authentication check is kept separate
      so the home page can always open.
    */

    if (
      !checkAuth()
    ) {
      return;
    }


    initHome();
    initRegister();
    initLogin();
    initNavigation();
    initDashboard();
    initVehicles();
    initEntry();
    initCalendar();
    initReports();
    initProfile();

  }
);
