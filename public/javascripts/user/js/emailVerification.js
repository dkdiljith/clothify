document.addEventListener("DOMContentLoaded", function () {
    const emailVerificationForm = document.getElementById("emailVerificationForm");
    const verificationCodeInput = document.getElementById("verificationCode");
    const verificationCodeErrorDiv = document.getElementById("verificationCodeError");
    const verifyButton = document.getElementById("verifyButton");

    const resendButton = document.getElementById("resendButton");
    const resendTimer = document.getElementById("resendTimer");
    const csrfToken = emailVerificationForm.querySelector('input[name="_csrf"]').value;
    const serverVerificationTime = document.getElementById("serverVerificationTime").value;



    let timerInterval;

    function startResendTimer(remainingSeconds) {
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

    function calculateRemainingTime() {
      const serverTime = new Date(serverVerificationTime).getTime();
      const now = Date.now();
      const remainingMillis = serverTime - now;
      return Math.max(Math.floor(remainingMillis / 1000), 0);
    }

    // Start timer based on backend time
    startResendTimer(calculateRemainingTime());

    resendButton.addEventListener("click", async () => {
      try {
        const response = await fetch('/user/resend-verification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          }
        });

        const data = await response.json();
        if (data.success) {
            location.reload();
          const newTime = new Date(data.newVerificationTimer).getTime();
          const now = Date.now();
          const remainingSeconds = Math.max(Math.floor((newTime - now) / 1000), 60);
          startResendTimer(remainingSeconds);
          
        } else {
          alert('Error resending code: ' + data.error);
        }
      } catch (error) {
        console.error("Error resending verification code:", error);
      }
    });

    emailVerificationForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const verificationCode = verificationCodeInput.value.trim();

      verificationCodeErrorDiv.textContent = "";
      verificationCodeErrorDiv.classList.remove("visible");

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
          verificationCodeErrorDiv.textContent = data.error;
          verificationCodeErrorDiv.classList.add("visible");
        }
      })
      .catch(error => {
        console.error("Error verifying email:", error);
        verificationCodeErrorDiv.textContent = "An unexpected error occurred. Please try again.";
        verificationCodeErrorDiv.classList.add("visible");
      });
    });
  });