document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("loginForm");
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");
  
    const usernameError = document.getElementById("usernameError");
    const passwordError = document.getElementById("passwordError");
  
    const usernameMaxLength = 50;
    const passwordMaxLength = 20;
  
    function validateUsername() {
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
  
      username.value = username.value.replace(/\s/g, "");
  
      if (username.value.trim() === "") {
        usernameError.textContent = "This field is required";
        usernameError.style.visibility = "visible";
        return false;
      } else if (!usernameRegex.test(username.value.trim())) {
        usernameError.textContent = "Only letters, numbers, and underscores allowed";
        usernameError.style.visibility = "visible";
        return false;
      } else if (username.value.length > usernameMaxLength) {
        usernameError.textContent = `Username cannot exceed ${usernameMaxLength} characters`;
        usernameError.style.visibility = "visible";
        return false;
      }
      usernameError.style.visibility = "hidden";
      return true;
    }
  
    function validatePassword() {
      password.value = password.value.replace(/\s/g, "");
      const passwordValue = password.value.trim();
  
      if (passwordValue === "") {
        passwordError.textContent = "This field is required";
        passwordError.style.visibility = "visible";
        return false;
      } else if (passwordValue.length > passwordMaxLength) {
        passwordError.textContent = `Password cannot exceed ${passwordMaxLength} characters`;
        passwordError.style.visibility = "visible";
        return false;
      }
      passwordError.style.visibility = "hidden";
      return true;
    }
  
    if (username) username.addEventListener("input", validateUsername);
    if (password) password.addEventListener("input", validatePassword);
  
    if (form) {
      form.addEventListener("submit", function (event) {
        const isUsernameValid = validateUsername();
        const isPasswordValid = validatePassword();
  
        if (!isUsernameValid || !isPasswordValid) {
          event.preventDefault();
        }
      });
    }
  
    if (togglePassword) {
      togglePassword.addEventListener("click", function () {
        const type = password.type === "password" ? "text" : "password";
        password.type = type;
        togglePassword.classList.toggle("fa-eye");
        togglePassword.classList.toggle("fa-eye-slash");
      });
    }
  });
  