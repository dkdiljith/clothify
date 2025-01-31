document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("forgotPasswordForm");
    const email = document.getElementById("email");
    const emailError = document.getElementById("emailError");
    const sendButton = document.getElementById("sendButton");
    const sentMessage = document.getElementById("sentMessage");
    const resendText = document.getElementById("resendText");

    let countdownInterval;
    let countdownValue = 5;
    let resendLimit = 5; // Max resend attempts
    let resendCount = 0; // Tracks resend attempts

    // Email validation function
    function validateEmail() {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      // Ensure no spaces and convert to lowercase
      email.value = email.value.toLowerCase().replace(/\s/g, "");

      // Empty input validation
      if (email.value.trim() === "") {
        emailError.textContent = "This field is required";
        emailError.style.visibility = "visible";
        return false;
      }

      // Invalid email format validation
      if (!emailRegex.test(email.value.trim())) {
        emailError.textContent = "Invalid email address";
        emailError.style.visibility = "visible";
        return false;
      }

      // Hide error message if the input is valid
      emailError.style.visibility = "hidden";
      return true;
    }

    // Show the sent message with the timer
    function showSentMessage() {
      sentMessage.style.display = "block";
      resetTimer(); // Reset the timer
      startTimer();
      sendButton.classList.add("btn-disabled");
      sendButton.classList.remove("btn-primary");
      sendButton.textContent = "Resend Email";
    }

    // Timer function for countdown
    function startTimer() {
      resendText.style.display = "inline"; // Show timer when countdown starts
      countdownInterval = setInterval(function () {
        if (countdownValue <= 0) {
          clearInterval(countdownInterval);
          sentMessage.style.display = "none"; // Hide timer when countdown ends
          sendButton.classList.remove("btn-disabled");
          sendButton.classList.add("btn-primary");
        } else {
          resendText.textContent = countdownValue;
          countdownValue--;
        }
      }, 1000); // Update every 1 second
    }

    // Reset the timer
    function resetTimer() {
      clearInterval(countdownInterval); // Clear any existing interval
      countdownValue = 59; // Reset the countdown value
      resendText.textContent = countdownValue;
    }

    // Real-time email validation
    email.addEventListener("input", function () {
      validateEmail();
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!validateEmail()) {
        return; // Prevent form submission if validation fails
      }

      if (resendCount >= resendLimit) {
        emailError.textContent = "You have reached the maximum resend attempts.";
        emailError.style.visibility = "visible";
        return; // Prevent further resends
      }

      resendCount++; // Increment resend count
      emailError.style.visibility = "hidden"; // Hide any previous error
      showSentMessage();
    });
  });