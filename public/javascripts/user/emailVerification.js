document.addEventListener("DOMContentLoaded", () => {
  /* =====================================================
       Elements
    ===================================================== */
  const form = document.getElementById("emailVerificationForm");
  const otpInput = document.getElementById("verificationCode");
  const otpError = document.getElementById("verificationCodeError");
  const verifyButton = document.getElementById("verifyButton");
  const resendButton = document.getElementById("resendButton");
  const resendTimer = document.getElementById("resendTimer");
  const verificationCountdown = document.getElementById(
    "verificationCountdown",
  );
  const verificationTimerInput = document.getElementById(
    "verificationTimerValue",
  );
  const resendTimerInput = document.getElementById("resendTimerValue");
  /* =====================================================
       State
    ===================================================== */
  let verificationTimerValue = verificationTimerInput.value;
  let resendTimerValue = resendTimerInput.value;
  let verificationInterval = null;
  let resendInterval = null;
  let verifyInProgress = false;
  let resendInProgress = false;
  /* =====================================================
       Helpers
    ===================================================== */
  function showError(message) {
    otpError.textContent = message;
    otpError.classList.remove("hidden");
    otpError.classList.add("visible");
  }
  function clearError() {
    otpError.textContent = "";
    otpError.classList.remove("visible");
    otpError.classList.add("hidden");
  }
  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  }
  function getRemainingSeconds(targetIso) {
    if (!targetIso) return 0;
    const targetTime = new Date(targetIso).getTime();
    return Math.max(Math.floor((targetTime - Date.now()) / 1000), 0);
  }
  /* =====================================================
       Verification Countdown
    ===================================================== */
  function startVerificationCountdown() {
    clearInterval(verificationInterval);
    let remaining = getRemainingSeconds(verificationTimerValue);
    verificationCountdown.textContent = formatTime(remaining);
    verificationInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(verificationInterval);
        verificationCountdown.textContent = "Expired";
        otpInput.disabled = true;
        verifyButton.disabled = true;
        showError("Your verification code has expired.");
        return;
      }
      verificationCountdown.textContent = formatTime(remaining);
    }, 1000);
  }
  /* =====================================================
       Resend Countdown
    ===================================================== */
  function startResendCountdown() {
    clearInterval(resendInterval);
    let remaining = getRemainingSeconds(resendTimerValue);
    if (remaining <= 0) {
      resendButton.disabled = false;
      resendTimer.textContent = "";
      return;
    }
    resendButton.disabled = true;
    resendTimer.textContent = `Available in ${remaining}s`;
    resendInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(resendInterval);
        resendButton.disabled = false;
        resendTimer.textContent = "";
        return;
      }
      resendTimer.textContent = `Available in ${remaining}s`;
    }, 1000);
  }
  /* =====================================================
       Update Timers
    ===================================================== */
  function updateTimers(newVerificationTimer, newResendTimer) {
    verificationTimerValue = newVerificationTimer;
    resendTimerValue = newResendTimer;
    verificationTimerInput.value = verificationTimerValue;
    resendTimerInput.value = resendTimerValue;
    otpInput.disabled = false;
    verifyButton.disabled = false;
    startVerificationCountdown();
    startResendCountdown();
  }
  /* =====================================================
       OTP Input
    ===================================================== */
  otpInput.addEventListener("input", () => {
    clearError();
    otpInput.value = otpInput.value.replace(/\D/g, "").slice(0, 6);
  });
  /* =====================================================
       Button Helpers
    ===================================================== */
  function lockVerifyButton() {
    verifyButton.disabled = true;
    verifyButton.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2"></span>
            Verifying...
        `;
  }
  function unlockVerifyButton() {
    verifyButton.disabled = false;
    verifyButton.textContent = "Verify Email";
  }
  function lockResendButton() {
    resendButton.disabled = true;
    resendButton.textContent = "Sending...";
  }
  /* =====================================================
       Initialize
    ===================================================== */
  startVerificationCountdown();
  startResendCountdown();
  /* =====================================================
       OTP Validation
    ===================================================== */
  function validateOtp() {
    clearError();
    const otp = otpInput.value.trim();
    if (!otp) {
      showError("Please enter the verification code.");
      return false;
    }
    if (!/^\d{6}$/.test(otp)) {
      showError("Verification code must contain exactly 6 digits.");
      return false;
    }
    return true;
  }
  /* =====================================================
       Verify Email
    ===================================================== */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (verifyInProgress) return;
    if (!validateOtp()) return;
    verifyInProgress = true;
    lockVerifyButton();
    try {
      const response = await fetch("/user/emailverification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          verificationCode: otpInput.value.trim(),
        }),
      });
      const data = await response.json();
      if (data.success) {
        showPopupMessage("Email verified successfully!", "success");
        window.location.href = "/user/home?welcome=true";
        return;
      }
      showError(data.error || "Invalid verification code.");
    } catch {
      showError("Unable to verify your email. Please try again.");
    } finally {
      verifyInProgress = false;
      unlockVerifyButton();
    }
  });
  /* =====================================================
       Submit with Enter
    ===================================================== */
  otpInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    form.requestSubmit();
  });
  /* =====================================================
       Resend Verification Code
    ===================================================== */
  resendButton.addEventListener("click", async () => {
    if (resendInProgress) return;
    resendInProgress = true;
    lockResendButton();
    clearError();
    try {
      const response = await fetch("/user/resend-email-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        showError(data.error || "Unable to resend verification code.");
        resendButton.textContent = "Resend Verification Code";
        return;
      }
      /* ==========================================
               Update Timers
            ========================================== */
      updateTimers(data.verificationTimer, data.resendTimer);
      /* ==========================================
               Reset OTP Field
            ========================================== */
      otpInput.value = "";
      otpInput.focus();
      clearError();
      showPopupMessage(
        data.message || "A new verification code has been sent.",
        "success",
      );
      resendButton.textContent = "Resend Verification Code";

    } catch {
      showError("Unable to connect to the server.");
    } finally {
      resendInProgress = false;
    }
  });
});
