document.addEventListener("DOMContentLoaded", function () {
  const emailVerificationForm = document.getElementById("emailVerificationForm");
  const verificationCodeInput = document.getElementById("verificationCode");
  const verificationCodeErrorDiv = document.getElementById("verificationCodeError");
  const verifyButton = document.getElementById("verifyButton");

  const resendButton = document.getElementById("resendButton");
  const resendTimer = document.getElementById("resendTimer");
  const csrfToken = emailVerificationForm.querySelector('input[name="_csrf"]').value;
  const serverVerificationTimeInput = document.getElementById("serverVerificationTime");

  let timerInterval;

  function startResendTimer(remainingSeconds) {
    // Clear any active intervals to prevent overlapping multiple intervals
    clearInterval(timerInterval); 
    
    resendButton.disabled = true;
    resendTimer.style.display = "inline";

    timerInterval = setInterval(() => {
      if (remainingSeconds <= 0) {
        clearInterval(timerInterval);
        resendButton.disabled = false;
        resendTimer.style.display = "none";
      } else {
        resendTimer.textContent = `(${remainingSeconds}s)`;
        remainingSeconds--;
      }
    }, 1000);
  }

  function calculateRemainingTime(targetTimeIsoString) {
    if (!targetTimeIsoString) return 0;
    const serverTime = new Date(targetTimeIsoString).getTime();
    const now = Date.now();
    const remainingMillis = serverTime - now;
    return Math.max(Math.floor(remainingMillis / 1000), 0);
  }

  // Initial startup execution based on template variable data
  startResendTimer(calculateRemainingTime(serverVerificationTimeInput.value));

  // Resend code logic
  resendButton.addEventListener("click", async () => {
    try {
      resendButton.disabled = true; // Avoid double submission clicks

      const response = await fetch('/user/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        }
      });

      const data = await response.json();
      
      if (data.success) {
        // Fix 1 & 2: Update field storage and read the matched field signature name
        serverVerificationTimeInput.value = data.newTimer; 
        
        const remainingSeconds = calculateRemainingTime(data.newTimer);
        // Fallback protection guarantees fallback layout if clock drifts
        startResendTimer(remainingSeconds > 0 ? remainingSeconds : 60);
      } else {
        alert('Error resending code: ' + data.error);
        resendButton.disabled = false;
      }
    } catch (error) {
      console.error("Error resending verification code:", error);
      resendButton.disabled = false;
    }
  });

  // Verify form submission logic
  emailVerificationForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const verificationCode = verificationCodeInput.value.trim();

    verificationCodeErrorDiv.textContent = "";
    verificationCodeErrorDiv.classList.remove("visible");
    
    // Fix 3: Lock down UI button targets while network transmission executes
    verifyButton.disabled = true;

    fetch('/user/emailverification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({ verificationCode: verificationCode })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        window.location.href = '/user/home';
      } else {
        verifyButton.disabled = false; // Release input hold state lock
        verificationCodeErrorDiv.textContent = data.error;
        verificationCodeErrorDiv.classList.add("visible");
      }
    })
    .catch(error => {
      console.error("Error verifying email:", error);
      verifyButton.disabled = false;
      verificationCodeErrorDiv.textContent = "An unexpected error occurred. Please try again.";
      verificationCodeErrorDiv.classList.add("visible");
    });
  });
});
