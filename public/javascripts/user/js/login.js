
      document.addEventListener("DOMContentLoaded", function () {
        const form = document.getElementById("loginForm");
        const email = document.getElementById("email");
        const password = document.getElementById("password");

        const emailError = document.getElementById("emailError");
        const passwordError = document.getElementById("passwordError");

        // Set maximum lengths
        const emailMaxLength = 50; // Set maximum length for email
        const passwordMaxLength = 20; // Set maximum length for password

        // Validation functions
        function validateEmail() {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

          // Ensure no spaces and convert to lowercase
          email.value = email.value.toLowerCase().replace(/\s/g, "");

          // Set the maximum length for the email
          if (email.value.length > emailMaxLength) {
            email.value = email.value.substring(0, emailMaxLength);
          }

          if (email.value.trim() === "") {
            emailError.textContent = "This field is required";
            emailError.style.visibility = "visible";
            return false;
          } else if (!emailRegex.test(email.value.trim())) {
            emailError.textContent = "Invalid email address";
            emailError.style.visibility = "visible";
            return false;
          }
          emailError.style.visibility = "hidden";
          return true;
        }

        function validatePassword() {
          const passwordValue = password.value.trim();

          // Remove spaces while typing
          password.value = password.value.replace(/\s/g, "");

          // Check for empty password
          if (password.value === "") {
            passwordError.textContent = "This field is required";
            passwordError.style.visibility = "visible";
            return false;
          }

          // Limit password length and show error when limit is reached
          if (password.value.length > passwordMaxLength) {
            password.value = password.value.substring(0, passwordMaxLength);
            passwordError.textContent = `Password Exceeds maximum length`;
            passwordError.style.visibility = "visible";
            return false;
          }

          passwordError.style.visibility = "hidden";
          return true;
        }

        // Attach event listeners for validation
        email.addEventListener("input", validateEmail);
        password.addEventListener("input", validatePassword);

        form.addEventListener("submit", function (event) {
          const isEmailValid = validateEmail();
          const isPasswordValid = validatePassword();

          if (!isEmailValid || !isPasswordValid) {
            event.preventDefault(); // Prevent form submission if validation fails
          }
        });

        // Eye toggle functionality
        const togglePassword = document.getElementById("togglePassword");
        togglePassword.addEventListener("click", function () {
          const type = password.type === "password" ? "text" : "password";
          password.type = type;
          togglePassword.classList.toggle("fa-eye");
          togglePassword.classList.toggle("fa-eye-slash");
        });
      });