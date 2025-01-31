      
      
      document.addEventListener("DOMContentLoaded", function () {
  const verificationForm = document.getElementById("emailVerificationForm");
  const verificationCode = document.getElementById("verificationCode");
  const verificationCodeError = document.getElementById("verificationCodeError");
  const sendButton = document.querySelector(".btn-primary"); // Assuming the resend button has this class
  const resendText = document.getElementById("resendTimer"); // Corrected this line to match the element id
  const resendMessage = document.getElementById("resendMessage")
  let countdownInterval;
  let countdownValue = 60; // Timer for 60 seconds
  let resendCount = 0;
  let resendLimit = 5; // Maximum resend attempts

  const verificationCodeMinLength = 6;

  // Function to validate verification code
  function validateVerificationCode() {
    const codeValue = verificationCode.value.trim();

    // Check if the input is empty
    if (codeValue === "") {
      verificationCodeError.textContent = "This field is required";
      verificationCodeError.classList.add("visible");
      verificationCodeError.classList.remove("hidden");
      return false;
    }

    // Check if the length of the input is less than the required length
    if (codeValue.length < verificationCodeMinLength) {
      verificationCodeError.textContent = `Enter a ${verificationCodeMinLength}-digit verification code`;
      verificationCodeError.classList.add("visible");
      verificationCodeError.classList.remove("hidden");
      return false;
    }

    // If all checks pass, hide the error message
    verificationCodeError.classList.add("hidden");
    verificationCodeError.classList.remove("visible");
    return true;
  }

  // Start timer for resend functionality
  function startTimer() {
    resendMessage.style.display = "block"; // show timer message when countdown starts
    resendText.style.display = "inline"; // Show timer when countdown starts
    countdownInterval = setInterval(function () {
      if (countdownValue <= 0) {
        clearInterval(countdownInterval);
        resendMessage.style.display = "none"; // Hide timer message when countdown ends
        sendButton.classList.remove("btn-disabled");
        sendButton.classList.add("btn-primary");
      } else {
        resendText.textContent = countdownValue;
        countdownValue--;
      }
    }, 1000); // Update every 1 second
  }

  // Reset timer for a fresh start
  function resetTimer() {
    clearInterval(countdownInterval); // Clear any existing interval
    countdownValue = 59; // Reset the countdown value
    resendText.textContent = countdownValue;
  }

  // Real-time verification code validation
  verificationCode.addEventListener("input", function () {
    if (validateVerificationCode()) {
      verificationForm.submit(); // Auto-submit form after validation
    }
  });

  // Send button click handler (to simulate resend logic)
  sendButton.addEventListener("click", function (event) {
    event.preventDefault(); // Prevent form submission if click on resend button

    // If maximum resend attempts are reached
    if (resendCount >= resendLimit) {
      verificationCodeError.textContent = "You have reached the maximum resend attempts.";
      verificationCodeError.classList.add("visible");
      verificationCodeError.classList.remove("hidden");
      return; // Prevent further resends
    }

    resendCount++; // Increment resend count
    verificationCodeError.classList.add("hidden"); // Hide error messages
    resetTimer(); // Reset timer
    startTimer(); // Start the countdown
    sendButton.classList.add("btn-disabled"); // Disable the button
    sendButton.classList.remove("btn-primary");
  });

  // Initially disable the resend button and start the timer
        startTimer();
        sendButton.classList.add("btn-disabled");
        sendButton.classList.remove("btn-primary");
});

