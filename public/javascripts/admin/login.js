document.addEventListener("DOMContentLoaded", () => {
  /* ==========================================
                    ELEMENTS
    ========================================== */
  const form = document.getElementById("loginForm");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const togglePassword = document.getElementById("togglePassword");
  const loginButton = document.getElementById("loginButton");
  const loginButtonText = document.getElementById("loginButtonText");
  const loginSpinner = document.getElementById("loginSpinner");
  let loginInProgress = false;
  /* ==========================================
                    HELPERS
    ========================================== */
  function showError(errorElement, input, message) {
    errorElement.textContent = message;
    errorElement.classList.add("show");
    input.classList.add("error");
    input.classList.remove("success");
  }
  function clearError(errorElement, input) {
    errorElement.textContent = "";
    errorElement.classList.remove("show");
    input.classList.remove("error");
    if (input.value.trim()) {
      input.classList.add("success");
    }
  }
  function resetValidation(errorElement, input) {
    errorElement.textContent = "";
    errorElement.classList.remove("show");
    input.classList.remove("error");
    input.classList.remove("success");
  }
  /* ==========================================
                EMAIL VALIDATION
    ========================================== */
  function validateEmail() {
    const value = email.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      showError(emailError, email, "Email address is required.");
      return false;
    }
    if (!emailRegex.test(value)) {
      showError(emailError, email, "Please enter a valid email address.");
      return false;
    }
    clearError(emailError, email);
    return true;
  }
  /* ==========================================
                PASSWORD VALIDATION
    ========================================== */
  function validatePassword() {
    const value = password.value;
    if (!value.trim()) {
      showError(passwordError, password, "Password is required.");
      return false;
    }
    if (value.length > 50) {
      showError(passwordError, password, "Password is too long.");
      return false;
    }
    clearError(passwordError, password);
    return true;
  }
  /* ==========================================
                LIVE VALIDATION
    ========================================== */
  email.addEventListener("input", () => {
    email.value = email.value.trimStart();
    if (!email.value) {
      resetValidation(emailError, email);
      return;
    }
    validateEmail();
  });
  password.addEventListener("input", () => {
    if (!password.value) {
      resetValidation(passwordError, password);
      return;
    }
    validatePassword();
  });
  /* ==========================================
                PASSWORD TOGGLE
    ========================================== */
  togglePassword.addEventListener("click", () => {
    if (password.type === "password") {
      password.type = "text";
      togglePassword.classList.remove("fa-eye");
      togglePassword.classList.add("fa-eye-slash");
    } else {
      password.type = "password";
      togglePassword.classList.remove("fa-eye-slash");
      togglePassword.classList.add("fa-eye");
    }
  });
  /* ==========================================
                BACKEND ERRORS
    ========================================== */
  const query = new URLSearchParams(window.location.search);
  const error = query.get("error");
  switch (error) {
    case "missingFields":
      showError(emailError, email, "Email is required.");
      showError(passwordError, password, "Password is required.");
      break;
    case "adminNotFound":
    showError(
        emailError,
        email,
        "Administrator account not found."
    );
    break;

case "incorrectPassword":
    showError(
        passwordError,
        password,
        "Incorrect password."
    );
    break;
    case "serverError":
      if (typeof showPopupMessage === "function") {
        showPopupMessage("Internal server error.", "error");
      }
      break;
  }
  /* ==========================================
                    LOADING
    ========================================== */
  function lockButton() {
    loginButton.disabled = true;
    loginSpinner.classList.remove("d-none");
    loginButtonText.textContent = "Signing In...";
  }
  /* ==========================================
                    SUBMIT
    ========================================== */
  form.addEventListener("submit", (e) => {
    if (loginInProgress) {
      e.preventDefault();
      return;
    }
    const validEmail = validateEmail();
    const validPassword = validatePassword();
    if (!validEmail || !validPassword) {
      e.preventDefault();
      return;
    }
    loginInProgress = true;
    lockButton();
  });
});
