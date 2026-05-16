document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("registrationForm");
  const name = document.getElementById("name");
  const phone = document.getElementById("phone");
  const email = document.getElementById("email");
  const password = document.getElementById("password");

  const nameError = document.getElementById("nameError");
  const phoneError = document.getElementById("phoneError");
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");

  // Validation functions
  function validateName() {
    const nameValue = name.value.trim();

    // Check if the name is empty
    if (nameValue === "") {
      nameError.textContent = "This field is required";
      nameError.style.visibility = "visible";
      return false;
    }

    // Check for valid length (5 to 20 characters)
    if (nameValue.length < 5 || nameValue.length > 20) {
      nameError.textContent = "Name must be between 5 and 20 characters";
      nameError.style.visibility = "visible";
      return false;
    }

    // Check if the name contains only alphabets and spaces
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!nameRegex.test(nameValue)) {
      nameError.textContent = "Only letters and spaces are allowed";
      nameError.style.visibility = "visible";
      return false;
    }

    // Check for excessive repetition of characters (e.g., "ssssssssssssss")
    const repeatedCharRegex = /(.)\1{9,}/; // 10 or more repeated characters
    if (repeatedCharRegex.test(nameValue)) {
      nameError.textContent = "Name cannot have repeated characters";
      nameError.style.visibility = "visible";
      return false;
    }

    nameError.style.visibility = "hidden";
    return true;
  }

  function validatePhone() {
    const phoneRegex = /^(?:\+91|91|0)?[6-9][0-9]{9}$/; // Matches +91, 91, 0, or no prefix with exactly 10 digits starting with 6-9
    const phoneValue = phone.value.trim();
  
    // Remove spaces or non-digit characters while typing
    phone.value = phone.value.replace(/\D/g, "");
  
    if (phoneValue === "") {
      phoneError.textContent = "This field is required";
      phoneError.style.visibility = "visible";
      return false;
    } else if (!phoneRegex.test(phoneValue)) {
      phoneError.textContent = "Invalid phone number. Please enter a valid 10-digit number.";
      phoneError.style.visibility = "visible";
      return false;
    }
  
    phoneError.style.visibility = "hidden";
    return true;
  }
  

  function validateEmail() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Ensure no spaces and convert to lowercase
    email.value = email.value.toLowerCase().replace(/\s/g, "");

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
    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,20}$/;

    // Remove spaces while typing
    password.value = password.value.replace(/\s/g, "");

    // Check if password is empty
    if (passwordValue === "") {
      passwordError.textContent = "This field is required";
      passwordError.style.visibility = "visible";
      return false;
    }

    // Check for password length and character requirements
    if (passwordValue.length < 8 || passwordValue.length > 20) {
      passwordError.textContent =
        "Password must be at least 8 characters";
      passwordError.style.visibility = "visible";
      return false;
    }

    // Check for mix of uppercase, lowercase, numbers, and symbols
    if (
      !/[A-Z]/.test(passwordValue) ||
      !/[a-z]/.test(passwordValue) ||
      !/[0-9]/.test(passwordValue) ||
      !/[!@#$%^&*]/.test(passwordValue)
    ) {
      passwordError.textContent =
        "Use a mix of letters, numbers & symbols";
      passwordError.style.visibility = "visible";
      return false;
    }

    passwordError.style.visibility = "hidden";
    return true;
  }

  // Attach event listeners for validation
  name.addEventListener("input", validateName);
  phone.addEventListener("input", validatePhone);
  email.addEventListener("input", validateEmail);
  password.addEventListener("input", validatePassword);

  form.addEventListener("submit", function (event) {
    const isNameValid = validateName();
    const isPhoneValid = validatePhone();
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();

    if (
      !isNameValid ||
      !isPhoneValid ||
      !isEmailValid ||
      !isPasswordValid
    ) {
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