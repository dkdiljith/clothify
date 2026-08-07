document.addEventListener("DOMContentLoaded", () => {
  /* ==========================================================
                                  DOM REFERENCES
          ========================================================== */
  // Buttons
  const changeEmailBtn = document.getElementById("changeEmailBtn");
  const editProfileBtn = document.getElementById("editProfileBtn");
  const verifyPasswordBtn = document.getElementById("verifyPasswordBtn");
  const requestOtpBtn = document.getElementById("requestOtpBtn");
  const verifyOtpBtn = document.getElementById("verifyOtpBtn");
  // Forms
  const profileForm = document.getElementById("profileForm");
  const saveProfileBtn = profileForm.querySelector("button[type='submit']");
  // Modals
  const changeEmailModal = document.getElementById("changeEmailModal");
  const editProfileModal = document.getElementById("editProfileModal");
  const closeButtons = document.querySelectorAll(".close-modal");
  // Email Flow Sections
  const passwordVerifiedMessage = document.getElementById("passwordVerifiedMessage");
  const emailPasswordStep = document.getElementById("emailPasswordStep");
  const emailInputStep = document.getElementById("emailInputStep");
  const emailOtpStep = document.getElementById("emailOtpStep");
  const otpInstructionMessage = document.getElementById("otpInstructionMessage");
  // Inputs
  const currentPassword = document.getElementById("currentPassword");
  const newEmail = document.getElementById("newEmail");
  const emailOtp = document.getElementById("emailOtp");
  const editName = document.getElementById("editName");
  const editPhone = document.getElementById("editPhone");
  const editGender = document.getElementById("editGender");
  const editDob = document.getElementById("editDob");
  /* ==========================================================
                              VALIDATION PATTERNS
          ========================================================== */
  const regex = {
    name: /^[A-Za-z]+(?:\s[A-Za-z]+)*$/,
    phone: /^[6-9]\d{9}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    otp: /^\d{6}$/,
  };
  /* ==========================================================
                                  MODAL
          ========================================================== */
  function openModal(modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("active");
    document.body.style.overflow = "";
    if (modal === changeEmailModal) {
      resetEmailModal();
    }
    if (modal === editProfileModal) {
      resetProfileValidation();
    }
  }
  /* ==========================================================
                      RESET EMAIL MODAL
  ========================================================== */
  function resetEmailModal() {
    currentPassword.value = "";
    newEmail.value = "";
    emailOtp.value = "";
    // Initial UI state
    emailPasswordStep.classList.remove("collapsed");
    passwordVerifiedMessage.classList.add("collapsed");
    emailInputStep.classList.add("collapsed");
    emailOtpStep.classList.add("collapsed");
    //after email verificaton
    requestOtpBtn.classList.remove("collapsed");
    otpInstructionMessage.classList.add("collapsed");
    clearAllErrors();
    removeValidationState();
  }
  /* ==========================================================
                          RESET PROFILE FORM
          ========================================================== */
  function resetProfileValidation() {
    clearAllErrors();
    removeValidationState();
  }
  /* ==========================================================
                          VALIDATION STATES
          ========================================================== */
  function setInvalid(input) {
    input.classList.remove("is-valid");
    input.classList.add("is-invalid");
  }
  function setValid(input) {
    input.classList.remove("is-invalid");
    input.classList.add("is-valid");
  }
  function clearValidation(input) {
    input.classList.remove("is-valid");
    input.classList.remove("is-invalid");
  }
  function removeValidationState() {
    [
      currentPassword,
      newEmail,
      emailOtp,
      editName,
      editPhone,
      editGender,
      editDob,
    ].forEach(clearValidation);
  }
  /* ==========================================================
                              ERROR HANDLING
          ========================================================== */
  function showError(input, errorId, message) {
    const error = document.getElementById(errorId);
    setInvalid(input);
    error.textContent = message;
    error.classList.add("show");
  }
  function invalidate(input, errorId, message) {
    showError(input, errorId, message);
    shakeInput(input);
    return false;
  }
  function clearError(input, errorId) {
    const error = document.getElementById(errorId);
    clearValidation(input);
    error.textContent = "";
    error.classList.remove("show");
  }
  function clearAllErrors() {
    clearError(currentPassword, "passwordError");
    clearError(newEmail, "emailError");
    clearError(emailOtp, "otpError");
    clearError(editName, "nameError");
    clearError(editPhone, "phoneError");
    clearError(editGender, "genderError");
    clearError(editDob, "dobError");
  }
  /* ==========================================================
                              SHAKE INPUT
          ========================================================== */
  function shakeInput(input) {
    input.classList.remove("shake");
    void input.offsetWidth;
    input.classList.add("shake");
  }
  /* ==========================================================
                              LOADING BUTTON
          ========================================================== */
  function setLoading(button, loading = true) {
    if (loading) {
      button.disabled = true;
      button.dataset.originalText = button.innerHTML;
      button.innerHTML = `
                <i class="fas fa-spinner fa-spin"></i>
                Please Wait
            `;
    } else {
      button.disabled = false;
      button.innerHTML = button.dataset.originalText;
    }
  }
  /* ==========================================================
                          VALIDATION HELPERS
          ========================================================== */
  function validatePassword() {
    const password = currentPassword.value.trim();
    clearError(currentPassword, "passwordError");
    if (!password) {
      showError(currentPassword, "passwordError", "Password is required.");
      shakeInput(currentPassword);
      return false;
    }
    if (password.length < 8) {
      showError(
        currentPassword,
        "passwordError",
        "Password must be at least 8 characters.",
      );
      shakeInput(currentPassword);
      return false;
    }
    setValid(currentPassword);
    return true;
  }
  function validateEmail() {
    const email = newEmail.value.trim().toLowerCase();
    clearError(newEmail, "emailError");
    if (!email) {
      showError(newEmail, "emailError", "Email is required.");
      shakeInput(newEmail);
      return false;
    }
    if (!regex.email.test(email)) {
      showError(newEmail, "emailError", "Enter a valid email address.");
      shakeInput(newEmail);
      return false;
    }
    setValid(newEmail);
    return true;
  }
  function validateOtp() {
    const otp = emailOtp.value.trim();
    clearError(emailOtp, "otpError");
    if (!regex.otp.test(otp)) {
      showError(emailOtp, "otpError", "OTP must contain exactly 6 digits.");
      shakeInput(emailOtp);
      return false;
    }
    setValid(emailOtp);
    return true;
  }
  function validateName() {
    const value = editName.value.trim();
    clearError(editName, "nameError");
    if (!value) {
      showError(editName, "nameError", "Name is required.");
      shakeInput(editName);
      return false;
    }
    if (value.length < 3 || value.length > 50) {
      showError(
        editName,
        "nameError",
        "Name must be between 3 and 50 characters.",
      );
      shakeInput(editName);
      return false;
    }
    if (!regex.name.test(value)) {
      showError(
        editName,
        "nameError",
        "Only letters and single spaces are allowed.",
      );
      shakeInput(editName);
      return false;
    }
    setValid(editName);
    return true;
  }
  function validatePhone() {
    const value = editPhone.value.trim();
    clearError(editPhone, "phoneError");
    if (!regex.phone.test(value)) {
      showError(
        editPhone,
        "phoneError",
        "Enter a valid 10-digit mobile number.",
      );
      shakeInput(editPhone);
      return false;
    }
    setValid(editPhone);
    return true;
  }
  /* ==========================================================
                          VALIDATE GENDER
          ========================================================== */
  function validateGender() {
    clearError(editGender, "genderError");
    if (!["Male", "Female", "Other"].includes(editGender.value)) {
      return invalidate(
        editGender,
        "genderError",
        "Please select a valid gender.",
      );
    }
    setValid(editGender);
    return true;
  }
  /* ==========================================================
                              VALIDATE DOB
          ========================================================== */
  function validateDob() {
    clearError(editDob, "dobError");
    if (!editDob.value) {
      return invalidate(editDob, "dobError", "Date of birth is required.");
    }
    const dob = new Date(editDob.value);
    const today = new Date();
    if (dob > today) {
      return invalidate(
        editDob,
        "dobError",
        "Date of birth cannot be in the future.",
      );
    }
    let age = today.getFullYear() - dob.getFullYear();
    const monthDifference = today.getMonth() - dob.getMonth();
    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < dob.getDate())
    ) {
      age--;
    }
    if (age < 13) {
      return invalidate(editDob, "dobError", "Minimum age is 13 years.");
    }
    if (age > 120) {
      return invalidate(
        editDob,
        "dobError",
        "Please enter a valid date of birth.",
      );
    }
    setValid(editDob);
    return true;
  }
  /* ==========================================================
                          OPEN MODALS
          ========================================================== */
  changeEmailBtn.addEventListener("click", () => {
    resetEmailModal();
    openModal(changeEmailModal);
    currentPassword.focus();
  });
  editProfileBtn.addEventListener("click", () => {
    resetProfileValidation();
    openModal(editProfileModal);
    editName.focus();
  });
  /* ==========================================================
                          CLOSE MODALS
          ========================================================== */
  closeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const modal = button.closest(".profile-modal");
      closeModal(modal);
    });
  });
  /* ==========================================================
                      REAL TIME INPUT CLEANUP
          ========================================================== */
  editPhone.addEventListener("input", () => {
    editPhone.value = editPhone.value.replace(/\D/g, "").slice(0, 10);
    clearError(editPhone, "phoneError");
  });
  emailOtp.addEventListener("input", () => {
    emailOtp.value = emailOtp.value.replace(/\D/g, "").slice(0, 6);
    clearError(emailOtp, "otpError");
  });
  editName.addEventListener("input", () => {
    editName.value = editName.value
      .replace(/[^A-Za-z\s]/g, "")
      .replace(/\s{2,}/g, " ");
    clearError(editName, "nameError");
  });
  currentPassword.addEventListener("input", () => {
    clearError(currentPassword, "passwordError");
  });
  newEmail.addEventListener("input", () => {
    clearError(newEmail, "emailError");
  });
  editGender.addEventListener("change", () => {
    clearError(editGender, "genderError");
  });
  editDob.addEventListener("change", () => {
    clearError(editDob, "dobError");
  });
  /* ==========================================================
                      VERIFY PASSWORD
          ========================================================== */
  verifyPasswordBtn.addEventListener("click", async () => {
    if (!validatePassword()) return;
    setLoading(verifyPasswordBtn, true);
    try {
      const response = await fetch("/user/profile/verify-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: currentPassword.value.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return invalidate(
          currentPassword,
          "passwordError",
          data.message || "Incorrect password.",
        );
      }
      setValid(currentPassword);
      emailPasswordStep.classList.add("collapsed");
      passwordVerifiedMessage.classList.remove("collapsed");
      emailInputStep.classList.remove("collapsed");
      newEmail.focus();
      showEmailStep(2);
    } catch (error) {
      console.error(error);
      showPopupMessage("Something went wrong.", "error");
    } finally {
      setLoading(verifyPasswordBtn, false);
    }
  });
  /* ==========================================================
                          REQUEST EMAIL OTP
          ========================================================== */
  requestOtpBtn.addEventListener("click", async () => {
    if (!validateEmail()) return;
    setLoading(requestOtpBtn, true);
    try {
      const response = await fetch("/user/profile/request-email-change", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: newEmail.value.trim().toLowerCase(),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return invalidate(
          newEmail,
          "emailError",
          data.message || "Unable to send OTP.",
        );
      }
      setValid(newEmail);
      requestOtpBtn.style.display = "none";
      otpInstructionMessage.classList.remove("collapsed");
      emailOtpStep.classList.remove("collapsed");
      emailOtp.focus();
      // Lock the email field
      newEmail.readOnly = true;

      // Hide and disable the button
      requestOtpBtn.disabled = true;
      requestOtpBtn.style.display = "none";
      showPopupMessage("OTP sent successfully.", "success");
    } catch (error) {
      console.error(error);
      showPopupMessage("Something went wrong.", "error");
    } finally {
      setLoading(requestOtpBtn, false);
    }
  });
  /* ==========================================================
                          VERIFY EMAIL OTP
          ========================================================== */
  verifyOtpBtn.addEventListener("click", async () => {
    if (!validateOtp()) return;
    setLoading(verifyOtpBtn, true);
    try {
      const response = await fetch("/user/profile/verify-email-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          otp: emailOtp.value.trim(),
          email: newEmail.value.trim().toLowerCase(),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return invalidate(emailOtp, "otpError", data.message || "Invalid OTP.");
      }
      setValid(emailOtp);
      showPopupMessage("Email updated successfully.", "success");
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error) {
      console.error(error);
      showPopupMessage("Something went wrong.", "error");
    } finally {
      setLoading(verifyOtpBtn, false);
    }
  });
  /* ==========================================================
                          UPDATE PROFILE
          ========================================================== */
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const isValid =
      validateName() && validatePhone() && validateGender() && validateDob();
    if (!isValid) return;
    setLoading(saveProfileBtn, true);
    try {
      const response = await fetch("/user/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editName.value.trim(),
          phone: editPhone.value.trim(),
          gender: editGender.value,
          dob: editDob.value,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        showPopupMessage(data.message || "Unable to update profile.", "error");
        return;
      }
      closeModal(editProfileModal);
      showPopupMessage("Profile updated successfully.", "success");
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error) {
      console.error(error);
      showPopupMessage("Something went wrong.", "error");
    } finally {
      setLoading(saveProfileBtn, false);
    }
  });
  /* ==========================================================
                          ENTER KEY SUPPORT
          ========================================================== */
  currentPassword.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      verifyPasswordBtn.click();
    }
  });
  newEmail.addEventListener("keydown", (e) => {

    if (e.key !== "Enter") return;
    if (newEmail.readOnly || requestOtpBtn.disabled) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    requestOtpBtn.click();

  });
  emailOtp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      verifyOtpBtn.click();
    }
  });
  /* ==========================================================
                          ESC KEY CLOSE
          ========================================================== */
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (changeEmailModal.classList.contains("active")) {
      closeModal(changeEmailModal);
    }
    if (editProfileModal.classList.contains("active")) {
      closeModal(editProfileModal);
    }
  });
  /* ==========================================================
                          INPUT RESTRICTIONS
          ========================================================== */
  editDob.max = new Date().toISOString().split("T")[0];
  newEmail.addEventListener("blur", () => {
    newEmail.value = newEmail.value.trim().toLowerCase();
  });
  /* ==========================================================
                          PREVENT DOUBLE REQUESTS
          ========================================================== */
  let isPasswordVerifying = false;
  let isOtpSending = false;
  let isOtpVerifying = false;
  let isProfileUpdating = false;
  /* ==========================================================
                          OPEN/CLOSE HELPERS
          ========================================================== */
  function showEmailStep(step) {
    switch (step) {
      case 1:
        emailInputStep.classList.add("collapsed");
        emailOtpStep.classList.add("collapsed");
        break;
      case 2:
        emailInputStep.classList.remove("collapsed");
        emailOtpStep.classList.add("collapsed");
        newEmail.focus();
        break;
      case 3:
        emailOtpStep.classList.remove("collapsed");
        emailOtp.focus();
        break;
    }
  }
  /* ==========================================================
                          CLEANUP
          ========================================================== */
  function clearEmailFields() {
    currentPassword.value = "";
    newEmail.value = "";
    emailOtp.value = "";
  }
  /* ==========================================================
                          MODAL RESET
          ========================================================== */
  function resetEverything() {
    clearEmailFields();
    clearAllErrors();
    removeValidationState();
    showEmailStep(1);
    isPasswordVerifying = false;
    isOtpSending = false;
    isOtpVerifying = false;
    isProfileUpdating = false;
    verifyPasswordBtn.disabled = false;
    requestOtpBtn.disabled = false;
    verifyOtpBtn.disabled = false;
    currentPassword.readOnly = false;
    newEmail.readOnly = false;
  }
  /* ==========================================================
                          TAB INDEX FIX
          ========================================================== */
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const focusable = modal.querySelectorAll("button,input,select");
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  });
  /* ==========================================================
                          INITIALIZATION
          ========================================================== */
  resetEverything();
});
