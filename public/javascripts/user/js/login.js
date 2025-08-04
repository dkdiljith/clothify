document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("loginForm");
  const email = document.getElementById("email");
  const password = document.getElementById("password");

  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const userControllerErrorMessage = document.querySelector(".userController-error-message");

  // Set maximum lengths
  const emailMaxLength = 50;
  const passwordMaxLength = 20;

  // Validation functions
  function validateEmail() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    email.value = email.value.toLowerCase().replace(/\s/g, "");

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
    password.value = password.value.replace(/\s/g, "");

    if (password.value === "") {
      passwordError.textContent = "This field is required";
      passwordError.style.visibility = "visible";
      return false;
    }

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

  // Submit form using AJAX
  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();

    if (!isEmailValid || !isPasswordValid) {
      return; // Stop if validation fails
    }

    try {
      const response = await fetch("/user/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.value,
          password: password.value
        })
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = "/user/home"; // Redirect to home page
      } else {
        userControllerErrorMessage.textContent = data.error || "Something went wrong!";
      }
    } catch (error) {
      console.error(error);
      userControllerErrorMessage.textContent = "An error occurred. Please try again.";
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

  // Google Sign In
  function onSignIn(googleUser) {
    var id_token = googleUser.getAuthResponse().id_token;

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/google-sign-in');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      if (xhr.status === 200) {
        console.log('Logged in successfully');
        window.location.href = "/dashboard"; // Redirect after Google login
      }
    };
    xhr.send(JSON.stringify({ token: id_token }));
  }

  function renderGoogleButton() {
    gapi.signin2.render('googleSignInBtn', {
      'scope': 'profile email',
      'width': 240,
      'height': 50,
      'longtitle': true,
      'theme': 'light',
      'onsuccess': onSignIn,
      'onfailure': function (error) {
        console.log(error);
      }
    });
  }

  gapi.load('auth2', renderGoogleButton);
});
