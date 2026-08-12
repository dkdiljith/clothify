document.addEventListener("DOMContentLoaded", () => {
  /* ==========================================
     Elements
  ========================================== */
  const form = document.getElementById("resetPasswordForm");
  const newPasswordInput = document.getElementById("newPassword");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const newPasswordError = document.getElementById("newPasswordError");
  const confirmPasswordError = document.getElementById("confirmPasswordError");
  const toggleNewPassword = document.getElementById("toggleNewPassword");

  const resetButton = document.getElementById("resetButton");
  let resetInProgress = false;
  /* ==========================================
     Helpers
  ========================================== */
  function showError(element, message) {
    element.textContent = message;
    element.classList.remove("hidden");
    element.classList.add("visible");
  }
  function clearError(element) {
    element.textContent = "";
    element.classList.remove("visible");
    element.classList.add("hidden");
  }
  /* ==========================================
     Password Validation
  ========================================== */
  function validatePassword() {
    clearError(newPasswordError);
    newPasswordInput.value = newPasswordInput.value.replace(/\s/g, "");
    const password = newPasswordInput.value;
    if (!password) {
      showError(newPasswordError, "Password is required.");
      return false;
    }
    if (password.length < 8 || password.length > 20) {
      showError(
        newPasswordError,
        "Password must be between 8 and 20 characters.",
      );
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      showError(newPasswordError, "Include at least one uppercase letter.");
      return false;
    }
    if (!/[a-z]/.test(password)) {
      showError(newPasswordError, "Include at least one lowercase letter.");
      return false;
    }
    if (!/[0-9]/.test(password)) {
      showError(newPasswordError, "Include at least one number.");
      return false;
    }
    if (!/[!@#$%^&*]/.test(password)) {
      showError(newPasswordError, "Include at least one special character.");
      return false;
    }
    return true;
  }
  /* ==========================================
     Confirm Password Validation
  ========================================== */
  function validateConfirmPassword() {
    clearError(confirmPasswordError);
    confirmPasswordInput.value = confirmPasswordInput.value.replace(/\s/g, "");
    const confirmPassword = confirmPasswordInput.value;
    if (!confirmPassword) {
      showError(confirmPasswordError, "Please confirm your password.");
      return false;
    }
    if (confirmPassword !== newPasswordInput.value) {
      showError(confirmPasswordError, "Passwords do not match.");
      return false;
    }
    return true;
  }
  /* ==========================================
     Live Validation
  ========================================== */
  newPasswordInput.addEventListener("input", () => {
    validatePassword();
    if (confirmPasswordInput.value) {
      validateConfirmPassword();
    }
  });
  confirmPasswordInput.addEventListener("input", validateConfirmPassword);
  /* ==========================================
   Password Visibility
========================================== */
  function togglePassword(input, icon) {
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    icon.classList.toggle("fa-eye");
    icon.classList.toggle("fa-eye-slash");
  }
  toggleNewPassword.addEventListener("click", () => {
    togglePassword(newPasswordInput, toggleNewPassword);
  });
  /* ==========================================
     Button Helpers
  ========================================== */
  function lockButton() {
    resetButton.disabled = true;
    resetButton.innerHTML = `
      <span class="spinner-border spinner-border-sm me-2"></span>
      Resetting...
    `;
  }
  function unlockButton() {
    resetButton.disabled = false;
    resetButton.textContent = "Reset Password";
  }
  /* ==========================================
     Submit Form
  ========================================== */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (resetInProgress) {
      return;
    }
    const passwordValid = validatePassword();
    const confirmValid = validateConfirmPassword();
    if (!passwordValid || !confirmValid) {
      return;
    }
    resetInProgress = true;
    lockButton();
    clearError(newPasswordError);
    clearError(confirmPasswordError);
    try {
      const response = await fetch("/user/resetpassword", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newPassword: newPasswordInput.value.trim(),
          confirmPassword: confirmPasswordInput.value.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        showError(newPasswordError, data.error || "Unable to reset password.");
        return;
      }
      showPopupMessage(
        data.message || "Password changed successfully.",
        "success",
      );
      setTimeout(() => {
        window.location.href = "/user/login";
      }, 800);
    } catch {
      showError(newPasswordError, "Unable to connect to the server.");
    } finally {
      resetInProgress = false;
      unlockButton();
    }
  });
  /* ==========================================
     Submit Using Enter
  ========================================== */
  newPasswordInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    form.requestSubmit();
  });
  confirmPasswordInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    form.requestSubmit();
  });
});
