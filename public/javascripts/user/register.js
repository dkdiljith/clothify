document.addEventListener("DOMContentLoaded", () => {
  /* =====================================================
       Elements
    ===================================================== */
  const form = document.getElementById("registrationForm");
  const name = document.getElementById("name");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");
  const nameError = document.getElementById("nameError");
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const confirmPasswordError = document.getElementById("confirmPasswordError");
  const togglePassword = document.getElementById("togglePassword");
  /* =====================================================
       Helpers
    ===================================================== */
  function showError(element, message) {
    element.textContent = message;
    element.classList.remove("hidden");
    element.classList.add("visible");
  }
  function hideError(element) {
    element.textContent = "";
    element.classList.remove("visible");
    element.classList.add("hidden");
  }
  /* =====================================================
       Name Validation
    ===================================================== */
  function validateName() {
    const value = name.value.trim();
    if (!value) {
      showError(nameError, "Full name is required.");
      return false;
    }
    if (value.length < 5 || value.length > 20) {
      showError(nameError, "Name must be between 5 and 20 characters.");
      return false;
    }
    if (!/^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/.test(value)) {
      showError(
        nameError,
        "Only letters, spaces, hyphens and apostrophes are allowed.",
      );
      return false;
    }
    if (/\s{2,}/.test(value)) {
      showError(nameError, "Multiple spaces are not allowed.");
      return false;
    }
    if (/(.)\1{5,}/.test(value)) {
      showError(nameError, "Too many repeated characters.");
      return false;
    }
    hideError(nameError);
    return true;
  }
  /* =====================================================
       Email Validation
    ===================================================== */
  function validateEmail() {
    const value = email.value.trim().toLowerCase();
    if (!value) {
      showError(emailError, "Email address is required.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      showError(emailError, "Please enter a valid email address.");
      return false;
    }
    if (value.includes("..") || value.startsWith(".") || value.endsWith(".")) {
      showError(emailError, "Please enter a valid email address.");
      return false;
    }
    hideError(emailError);
    return true;
  }
  /* =====================================================
       Password Validation
    ===================================================== */
  function validatePassword() {
    const value = password.value;
    if (!value) {
      showError(passwordError, "Password is required.");
      return false;
    }
    if (/\s/.test(value)) {
      showError(passwordError, "Password cannot contain spaces.");
      return false;
    }
    if (value.length < 8 || value.length > 20) {
      showError(passwordError, "Password must be 8 to 20 characters.");
      return false;
    }
    if (!/[A-Z]/.test(value)) {
      showError(passwordError, "Include at least one uppercase letter.");
      return false;
    }
    if (!/[a-z]/.test(value)) {
      showError(passwordError, "Include at least one lowercase letter.");
      return false;
    }
    if (!/\d/.test(value)) {
      showError(passwordError, "Include at least one number.");
      return false;
    }
    if (!/[!@#$%^&*]/.test(value)) {
      showError(passwordError, "Include at least one special character.");
      return false;
    }
    hideError(passwordError);
    if (confirmPassword.value.length > 0) {
      validateConfirmPassword();
    }
    return true;
  }
  /* =====================================================
       Confirm Password Validation
    ===================================================== */
  function validateConfirmPassword() {
    if (!confirmPassword.value) {
      showError(confirmPasswordError, "Please confirm your password.");
      return false;
    }
    if (password.value !== confirmPassword.value) {
      showError(confirmPasswordError, "Passwords do not match.");
      return false;
    }
    hideError(confirmPasswordError);
    return true;
  }
  /* =====================================================
       Events
    ===================================================== */
  [
    [name, validateName],
    [email, validateEmail],
    [password, validatePassword],
    [confirmPassword, validateConfirmPassword],
  ].forEach(([input, validator]) => {
    input.addEventListener("input", validator);
    input.addEventListener("blur", validator);
  });
  /* =====================================================
       Submit
    ===================================================== */
  form.addEventListener("submit", function (e) {
    const isValid =
      validateName() &&
      validateEmail() &&
      validatePassword() &&
      validateConfirmPassword();
    if (!isValid) {
      e.preventDefault();
      return;
    }
    const submitButton = form.querySelector("button[type='submit']");
    if (submitButton.disabled) {
      e.preventDefault();
      return;
    }
    submitButton.disabled = true;
    submitButton.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2"></span>
        Sending OTP...
    `;
  });
  /* =====================================================
       Password Toggle
    ===================================================== */
  function togglePasswordVisibility(button, input) {
    button.addEventListener("click", () => {
      const hidden = input.type === "password";
      input.type = hidden ? "text" : "password";
      button.classList.toggle("fa-eye");
      button.classList.toggle("fa-eye-slash");
    });
  }
  togglePasswordVisibility(togglePassword, password);
});
