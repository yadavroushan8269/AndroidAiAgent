/* =========================================
   HYMA RMC KOKAPET
   Vehicle Duration Management System
   ========================================= */

"use strict";


/* =========================================
   APP ELEMENT
   ========================================= */

const app = document.getElementById("app");


/* =========================================
   GET STARTED
   ========================================= */

function showLoginScreen() {

  app.innerHTML = `
    <main class="auth-screen">

      <div class="auth-header">

        <button
          class="back-btn"
          id="backToWelcome"
          type="button"
          aria-label="Go back"
        >
          ←
        </button>

        <div class="small-logo">
          🚧
        </div>

        <h1>Welcome Back</h1>

        <p>
          Login to Hyma RMC Kokapet
        </p>

      </div>


      <form
        id="loginForm"
        class="auth-form"
      >

        <div class="form-group">

          <label for="loginEmail">
            Email or Mobile
          </label>

          <input
            id="loginEmail"
            type="text"
            placeholder="Enter email or mobile"
            autocomplete="username"
            required
          >

        </div>


        <div class="form-group">

          <label for="loginPassword">
            Password
          </label>

          <div class="password-box">

            <input
              id="loginPassword"
              type="password"
              placeholder="Enter password"
              autocomplete="current-password"
              required
            >

            <button
              type="button"
              class="password-toggle"
              id="togglePassword"
              aria-label="Show password"
            >
              👁
            </button>

          </div>

        </div>


        <button
          type="button"
          class="forgot-btn"
          id="forgotPassword"
        >
          Forgot Password?
        </button>


        <button
          type="submit"
          class="primary-btn auth-submit"
        >
          Login
        </button>

      </form>


      <div class="register-area">

        <span>
          Don't have an account?
        </span>

        <button
          type="button"
          class="register-btn"
          id="registerBtn"
        >
          Register
        </button>

      </div>

    </main>
  `;


  addAuthStyles();

  setupLoginEvents();
}


/* =========================================
   LOGIN EVENTS
   ========================================= */

function setupLoginEvents() {

  const backButton =
    document.getElementById("backToWelcome");

  const loginForm =
    document.getElementById("loginForm");

  const togglePassword =
    document.getElementById("togglePassword");

  const passwordInput =
    document.getElementById("loginPassword");

  const forgotPassword =
    document.getElementById("forgotPassword");

  const registerButton =
    document.getElementById("registerBtn");


  /* Back */

  backButton.addEventListener("click", () => {
    showWelcomeScreen();
  });


  /* Password visibility */

  togglePassword.addEventListener("click", () => {

    if (passwordInput.type === "password") {

      passwordInput.type = "text";

      togglePassword.textContent = "🙈";

    } else {

      passwordInput.type = "password";

      togglePassword.textContent = "👁";

    }

  });


  /* Login */

  loginForm.addEventListener("submit", (event) => {

    event.preventDefault();

    showMessage(
      "Login system database se connect hone ke baad active hoga."
    );

  });


  /* Forgot password */

  forgotPassword.addEventListener("click", () => {

    showMessage(
      "Password recovery next step me add ki jayegi."
    );

  });


  /* Register */

  registerButton.addEventListener("click", () => {

    showRegisterScreen();

  });

}


/* =========================================
   REGISTER SCREEN
   ========================================= */

function showRegisterScreen() {

  app.innerHTML = `
    <main class="auth-screen">

      <div class="auth-header">

        <button
          class="back-btn"
          id="backToLogin"
          type="button"
        >
          ←
        </button>

        <div class="small-logo">
          🚧
        </div>

        <h1>Create Account</h1>

        <p>
          Register for Hyma RMC Kokapet
        </p>

      </div>


      <form
        id="registerForm"
        class="auth-form"
      >

        <div class="form-group">

          <label for="registerName">
            Full Name
          </label>

          <input
            id="registerName"
            type="text"
            placeholder="Enter your name"
            required
          >

        </div>


        <div class="form-group">

          <label for="registerMobile">
            Mobile Number
          </label>

          <input
            id="registerMobile"
            type="tel"
            placeholder="Enter mobile number"
            inputmode="numeric"
            required
          >

        </div>


        <div class="form-group">

          <label for="registerEmail">
            Email
          </label>

          <input
            id="registerEmail"
            type="email"
            placeholder="Enter email"
          >

        </div>


        <div class="form-group">

          <label for="registerPassword">
            Password
          </label>

          <input
            id="registerPassword"
            type="password"
            placeholder="Create password"
            required
          >

        </div>


        <div class="form-group">

          <label for="registerRole">
            Role
          </label>

          <select
            id="registerRole"
            required
          >

            <option value="">
              Select Role
            </option>

            <option value="security">
              Security Guard
            </option>

            <option value="admin">
              Admin
            </option>

          </select>

        </div>


        <button
          type="submit"
          class="primary-btn auth-submit"
        >
          Create Account
        </button>

      </form>


      <div class="register-area">

        <span>
          Already have an account?
        </span>

        <button
          type="button"
          class="register-btn"
          id="loginBtn"
        >
          Login
        </button>

      </div>

    </main>
  `;


  addAuthStyles();


  document
    .getElementById("backToLogin")
    .addEventListener("click", showLoginScreen);


  document
    .getElementById("loginBtn")
    .addEventListener("click", showLoginScreen);


  document
    .getElementById("registerForm")
    .addEventListener("submit", (event) => {

      event.preventDefault();

      showMessage(
        "Registration database se connect hone ke baad active hogi."
      );

    });

}


/* =========================================
   WELCOME SCREEN
   ========================================= */

function showWelcomeScreen() {

  app.innerHTML = `

    <main class="welcome-screen">

      <div class="app-logo">
        🚧
      </div>

      <h1>
        Hyma RMC Kokapet
      </h1>

      <p class="subtitle">
        Vehicle Duration Management
      </p>

      <button
        id="startBtn"
        class="primary-btn"
        type="button"
      >
        Get Started
      </button>

    </main>

  `;


  document
    .getElementById("startBtn")
    .addEventListener("click", showLoginScreen);

}


/* =========================================
   AUTH CSS
   ========================================= */

function addAuthStyles() {

  if (document.getElementById("authStyles")) {
    return;
  }


  const style =
    document.createElement("style");

  style.id = "authStyles";


  style.textContent = `

    .auth-screen {
      min-height: 100vh;

      padding: 28px 22px;

      background: var(--background);
    }


    .auth-header {
      position: relative;

      text-align: center;

      padding-top: 18px;

      margin-bottom: 30px;
    }


    .back-btn {
      position: absolute;

      top: 0;
      left: 0;

      width: 42px;
      height: 42px;

      border-radius: 12px;

      background: var(--white);

      color: var(--text);

      font-size: 24px;

      box-shadow:
        0 5px 18px rgba(0, 0, 0, 0.06);

      cursor: pointer;
    }


    .small-logo {
      width: 66px;
      height: 66px;

      margin: 0 auto 18px;

      display: flex;
      align-items: center;
      justify-content: center;

      background: var(--white);

      border-radius: 18px;

      font-size: 34px;

      box-shadow:
        0 8px 25px rgba(0, 0, 0, 0.07);
    }


    .auth-header h1 {
      font-size: 27px;

      margin-bottom: 8px;
    }


    .auth-header p {
      color: var(--muted);

      font-size: 14px;
    }


    .auth-form {
      width: 100%;
      max-width: 430px;

      margin: 0 auto;
    }


    .form-group {
      margin-bottom: 18px;
    }


    .form-group label {
      display: block;

      margin-bottom: 8px;

      font-size: 14px;

      font-weight: 700;
    }


    .form-group input,
    .form-group select {
      width: 100%;

      height: 52px;

      padding: 0 15px;

      border: 1px solid var(--border);

      border-radius: 13px;

      background: var(--white);

      color: var(--text);

      font-size: 15px;

      outline: none;
    }


    .form-group input:focus,
    .form-group select:focus {
      border-color: var(--primary);
    }


    .password-box {
      position: relative;
    }


    .password-box input {
      padding-right: 55px;
    }


    .password-toggle {
      position: absolute;

      right: 6px;
      top: 6px;

      width: 40px;
      height: 40px;

      border-radius: 10px;

      background: transparent;

      font-size: 18px;

      cursor: pointer;
    }


    .forgot-btn {
      display: block;

      margin: 2px 0 20px auto;

      background: transparent;

      color: var(--primary-dark);

      font-size: 14px;

      font-weight: 700;

      cursor: pointer;
    }


    .auth-submit {
      max-width: none;

      margin-top: 4px;
    }


    .register-area {
      margin-top: 26px;

      text-align: center;

      color: var(--muted);

      font-size: 14px;
    }


    .register-btn {
      margin-left: 5px;

      background: transparent;

      color: var(--primary-dark);

      font-weight: 700;

      cursor: pointer;
    }


    @media (min-width: 900px) {

      .auth-screen {
        min-height: 100vh;

        padding-top: 60px;
        padding-bottom: 60px;
      }

    }

  `;


  document.head.appendChild(style);
}


/* =========================================
   MESSAGE
   ========================================= */

function showMessage(message) {

  const oldMessage =
    document.querySelector(".app-message");

  if (oldMessage) {
    oldMessage.remove();
  }


  const box =
    document.createElement("div");

  box.className = "app-message";


  box.textContent = message;


  box.style.cssText = `
    position: fixed;
    left: 50%;
    bottom: 25px;
    transform: translateX(-50%);

    width: calc(100% - 40px);
    max-width: 420px;

    padding: 14px 16px;

    background: #202124;
    color: #ffffff;

    border-radius: 12px;

    font-size: 14px;
    line-height: 1.4;

    text-align: center;

    z-index: 9999;

    box-shadow:
      0 10px 30px rgba(0,0,0,0.2);
  `;


  document.body.appendChild(box);


  setTimeout(() => {

    box.remove();

  }, 3000);
}


/* =========================================
   INITIALIZE APP
   ========================================= */

const startButton =
  document.getElementById("startBtn");


if (startButton) {

  startButton.addEventListener(
    "click",
    showLoginScreen
  );

}
