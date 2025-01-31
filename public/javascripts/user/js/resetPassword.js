document.addEventListener("DOMContentLoaded", function () {
    const resetForm = document.getElementById("resetForm");
    const newPassword = document.getElementById("newPassword");
    const confirmPassword = document.getElementById("confirmPassword");
    const newPasswordError = document.getElementById("newPasswordError");
    const confirmPasswordError = document.getElementById("confirmPasswordError");

    const passwordMinLength = 8; // Set the minimum length limit for the password
    const passwordMaxLength = 20; // Set the maximum length limit for the password

    // Validation for the new password
    function validateNewPassword() {
      const passwordValue = newPassword.value.trim();

      // Remove spaces while typing
      newPassword.value = newPassword.value.replace(/\s/g, "");

      // Check if password is empty
      if (passwordValue === "") {
        newPasswordError.textContent = "This field is required";
        newPasswordError.style.visibility = "visible";
        return false;
      }

      // Check for minimum password length
      if (passwordValue.length < passwordMinLength) {
        newPasswordError.textContent = `Password must be at least ${passwordMinLength} characters long`;
        newPasswordError.style.visibility = "visible";
        return false;
      }

      // Limit password length and show error when limit is reached
      if (passwordValue.length > passwordMaxLength) {
        newPassword.value = passwordValue.substring(0, passwordMaxLength); // Cut the excess characters
        newPasswordError.textContent = `Password exceeds maximum length of ${passwordMaxLength} characters`;
        newPasswordError.style.visibility = "visible";
        return false;
      }

      // Check for mix of uppercase, lowercase, numbers, and symbols
      const passwordRegex =
        /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,20}$/;

      if (
        !/[A-Z]/.test(passwordValue) ||
        !/[a-z]/.test(passwordValue) ||
        !/[0-9]/.test(passwordValue) ||
        !/[!@#$%^&*]/.test(passwordValue)
      ) {
        newPasswordError.textContent =
          "Use a mix of letters, numbers & symbols";
        newPasswordError.style.visibility = "visible";
        return false;
      }

      newPasswordError.style.visibility = "hidden";
      return true;
    }

    // Validation for the confirm password field
    function validateConfirmPassword() {
      if (confirmPassword.value.trim() === "") {
        confirmPasswordError.textContent = "This field is required.";
        confirmPasswordError.style.visibility = "visible";
        return false;
      } else if (confirmPassword.value !== newPassword.value) {
        confirmPasswordError.textContent = "Passwords do not match.";
        confirmPasswordError.style.visibility = "visible";
        return false;
      }

      // Limit confirm password length and show error when limit is reached
      const confirmPasswordValue = confirmPassword.value.trim();
      if (confirmPasswordValue.length > passwordMaxLength) {
        confirmPassword.value = confirmPasswordValue.substring(0, passwordMaxLength); // Cut the excess characters
        confirmPasswordError.textContent = `Password exceeds maximum length of ${passwordMaxLength} characters`;
        confirmPasswordError.style.visibility = "visible";
        return false;
      }

      confirmPasswordError.textContent = "";
      confirmPasswordError.style.visibility = "hidden";
      return true;
    }

    // Attach event listeners to validate input fields
    newPassword.addEventListener("input", validateNewPassword);
    confirmPassword.addEventListener("input", validateConfirmPassword);

    // Prevent form submission if validation fails
    resetForm.addEventListener("submit", function (event) {
      const isNewPasswordValid = validateNewPassword();
      const isConfirmPasswordValid = validateConfirmPassword();
      if (!isNewPasswordValid || !isConfirmPasswordValid) {
        event.preventDefault();
      }
    });

     // Eye toggle functionality
  const togglePassword = document.getElementById("togglePassword");
  togglePassword.addEventListener("click", function () {
    const type = newPassword.type === "password" ? "text" : "password";
    newPassword.type = type;
    togglePassword.classList.toggle("fa-eye");
    togglePassword.classList.toggle("fa-eye-slash");
  });

  });