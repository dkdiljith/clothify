document.addEventListener("DOMContentLoaded", () => {
  /* ==========================================
       Elements
    ========================================== */
  const form = document.getElementById("forgotPasswordForm");
  const emailInput = document.getElementById("email");
  const emailError = document.getElementById("emailError");
  const sendButton = document.getElementById("sendButton");
  /* ==========================================
       State
    ========================================== */
  let requestInProgress = false;
  /* ==========================================
       Helpers
    ========================================== */
  function showError(message) {
    emailError.textContent = message;
    emailError.classList.remove("hidden");
    emailError.classList.add("visible");
  }
  function clearError() {
    emailError.textContent = "";
    emailError.classList.remove("visible");
    emailError.classList.add("hidden");
  }
  function validateEmail() {
    clearError();
    emailInput.value = emailInput.value.trim().toLowerCase();
    const email = emailInput.value;
    if (!email) {
      showError("Please enter your email address.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError("Please enter a valid email address.");
      return false;
    }
    return true;
  }
  /* ==========================================
       Button Helpers
    ========================================== */
  function lockButton() {
    sendButton.disabled = true;
    sendButton.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2"></span>
            Sending...
        `;
  }
  function unlockButton() {
    sendButton.disabled = false;
    sendButton.textContent = "Send Verification Code";
  }
  /* ==========================================
       Live Validation
    ========================================== */
  emailInput.addEventListener("input", () => {
    clearError();
    emailInput.value = emailInput.value.replace(/\s/g, "").toLowerCase();
  });
  emailInput.addEventListener("blur", validateEmail);
  /* ==========================================
       Submit
    ========================================== */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (requestInProgress) return;
    if (!validateEmail()) return;
    requestInProgress = true;
    lockButton();
    try {
      const response = await fetch("/user/forgetPassword", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailInput.value,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        showError(data.error || "Unable to send verification code.");
        return;
      }
      showPopupMessage(data.message, "success");

      setTimeout(() => {
        location.reload();
      }, 3000);
    } catch (error) {
      console.error(error);
      showError("Unable to connect to the server.");
    } finally {
      requestInProgress = false;
      unlockButton();
    }
  });
  const errorCode = document.getElementById("errorCode")?.value;
  if (errorCode) {
    const errors = {
      sessionExpired:
        "Your password reset session has expired. Please try again.",
      invalidLink:
        "This password reset link is invalid.",
      otpExpired:
        "Your password reset link has expired. Please request another one.",
      maxAttempts:
        "Maximum verification attempts reached. Please request another reset email.",
      userNotFound:
        "User account not found.",
      serverError:
        "Something went wrong. Please try again."
    };
    showError(errors[errorCode] || "Something went wrong.");
  }
  /* ==========================================
       Submit with Enter
    ========================================== */
  emailInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    form.requestSubmit();
  });
});
