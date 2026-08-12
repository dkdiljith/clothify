document.addEventListener("DOMContentLoaded", () => {
    /* ==========================================
                      ELEMENTS
      ========================================== */
    const form = document.getElementById("registerForm");
    const name = document.getElementById("name");
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");
    const nameError = document.getElementById("nameError");
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");
    const confirmPasswordError = document.getElementById("confirmPasswordError");
    const registerButton = document.getElementById("registerButton");
    const registerButtonText = document.getElementById("registerButtonText");
    const registerSpinner = document.getElementById("registerSpinner");
    let registerInProgress = false;
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
                  NAME VALIDATION
      ========================================== */
    function validateName() {
        const value = name.value.trim();
        const regex = /^[A-Za-z ]+$/;
        if (!value) {
            showError(nameError, name, "Full name is required.");
            return false;
        }
        if (value.length < 3) {
            showError(nameError, name, "Minimum 3 characters required.");
            return false;
        }
        if (value.length > 50) {
            showError(nameError, name, "Maximum 50 characters allowed.");
            return false;
        }
        if (!regex.test(value)) {
            showError(nameError, name, "Only letters and spaces are allowed.");
            return false;
        }
        clearError(nameError, name);
        return true;
    }
    /* ==========================================
                  EMAIL VALIDATION
      ========================================== */
    function validateEmail() {
        const value = email.value.trim();
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value) {
            showError(emailError, email, "Email address is required.");
            return false;
        }
        if (!regex.test(value)) {
            showError(emailError, email, "Enter a valid email address.");
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
        if (!value) {
            showError(passwordError, password, "Password is required.");
            return false;
        }
        if (value.length < 8) {
            showError(passwordError, password, "Minimum 8 characters required.");
            return false;
        }
        if (!/[A-Z]/.test(value)) {
            showError(passwordError, password, "Must contain an uppercase letter.");
            return false;
        }
        if (!/[a-z]/.test(value)) {
            showError(passwordError, password, "Must contain a lowercase letter.");
            return false;
        }
        if (!/\d/.test(value)) {
            showError(passwordError, password, "Must contain a number.");
            return false;
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
            showError(passwordError, password, "Must contain a special character.");
            return false;
        }
        clearError(passwordError, password);
        return true;
    }
    /* ==========================================
          CONFIRM PASSWORD VALIDATION
      ========================================== */
    function validateConfirmPassword() {
        const value = confirmPassword.value;
        if (!value) {
            showError(
                confirmPasswordError,
                confirmPassword,
                "Please confirm your password.",
            );
            return false;
        }
        if (value !== password.value) {
            showError(
                confirmPasswordError,
                confirmPassword,
                "Passwords do not match.",
            );
            return false;
        }
        clearError(confirmPasswordError, confirmPassword);
        return true;
    }
    /* ==========================================
                  LIVE VALIDATION
      ========================================== */
    name.addEventListener("input", () => {
        if (!name.value) {
            resetValidation(nameError, name);
            return;
        }
        validateName();
    });
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
        if (confirmPassword.value) {
            validateConfirmPassword();
        }
    });
    confirmPassword.addEventListener("input", () => {
        if (!confirmPassword.value) {
            resetValidation(confirmPasswordError, confirmPassword);
            return;
        }
        validateConfirmPassword();
    });
    /* ==========================================
              PASSWORD TOGGLE
      ========================================== */
    document.querySelectorAll(".password-toggle").forEach((toggle) => {
        toggle.addEventListener("click", () => {
            const target = document.getElementById(toggle.dataset.target);
            if (target.type === "password") {
                target.type = "text";
                toggle.classList.remove("fa-eye");
                toggle.classList.add("fa-eye-slash");
            } else {
                target.type = "password";
                toggle.classList.remove("fa-eye-slash");
                toggle.classList.add("fa-eye");
            }
        });
    });
    /* ==========================================
              BACKEND ERRORS
      ========================================== */
    const query = new URLSearchParams(window.location.search);
    switch (query.get("error")) {

        case "missingFields":
            showError(nameError, name, "Required.");
            showError(emailError, email, "Required.");
            showError(passwordError, password, "Required.");
            showError(confirmPasswordError, confirmPassword, "Required.");
            break;

        case "invalidName":
            showError(nameError, name, "Enter a valid full name.");
            break;

        case "invalidEmail":
            showError(emailError, email, "Enter a valid email address.");
            break;

        case "emailExists":
            showError(
                emailError,
                email,
                "An administrator with this email already exists."
            );
            break;

        case "passwordMismatch":
            showError(
                confirmPasswordError,
                confirmPassword,
                "Passwords do not match."
            );
            break;

        case "weakPassword":
            showError(
                passwordError,
                password,
                "Password must contain uppercase, lowercase, number and special character."
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
        registerButton.disabled = true;
        registerSpinner.classList.remove("d-none");
        registerButtonText.textContent = "Creating...";
    }
    /* ==========================================
                      SUBMIT
      ========================================== */
    form.addEventListener("submit", (e) => {
        if (registerInProgress) {
            e.preventDefault();
            return;
        }
        const validName = validateName();
        const validEmail = validateEmail();
        const validPassword = validatePassword();
        const validConfirm = validateConfirmPassword();
        if (!validName || !validEmail || !validPassword || !validConfirm) {
            e.preventDefault();
            return;
        }
        registerInProgress = true;
        lockButton();
    });
});
