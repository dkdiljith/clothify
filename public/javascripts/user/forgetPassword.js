document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('forgotPasswordForm');
  const emailInput = document.getElementById('email');
  const emailError = document.getElementById('emailError');
  const sendButton = document.getElementById('sendButton');
  const sentMessage = document.getElementById('sentMessage');
  const resendText = document.getElementById('resendText');
  const serverTimer = document.getElementById('serverResetTimer');
  let timerInterval;

  // Initialize timer if exists
  if (serverTimer) {
    startCountdown(calculateRemainingTime(serverTimer.value));
  }

  function calculateRemainingTime(serverTime) {
    const serverTimeMs = new Date(serverTime).getTime();
    const now = Date.now();
    const remainingMillis = serverTimeMs - now;
    return Math.max(Math.floor(remainingMillis / 1000), 0);
  }

  function startCountdown(seconds) {
    form.style.display = 'none';
    sentMessage.style.display = 'block';
    
    let remaining = seconds;
    updateResendText(remaining);
    
    timerInterval = setInterval(() => {
      remaining--;
      updateResendText(remaining);
      
      if (remaining <= 0) {
        clearInterval(timerInterval);
        resendText.style.color = '#007bff';
        resendText.addEventListener('click', handleResend);
      }
    }, 1000);
  }

  function updateResendText(seconds) {
    resendText.textContent = seconds;
    resendText.style.color = seconds > 0 ? '#595959' : '#007bff';
  }

  function validateEmail() {
    const email = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
      emailError.textContent = 'Email is required';
      return false;
    } else if (!emailRegex.test(email)) {
      emailError.textContent = 'Please enter a valid email address';
      return false;
    } else {
      emailError.textContent = '';
      return true;
    }
  }

  async function handleResend() {
    if (!validateEmail()) return;
    
    try {
      sendButton.disabled = true;
      sendButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
      
      const response = await fetch('/user/resend-reset-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('input[name="_csrf"]').value
        },
        body: JSON.stringify({ email: emailInput.value.trim() })
      });
      
      const data = await response.json();
      if (data.success) {
        startCountdown(calculateRemainingTime(data.newResetTimer));
      } else {
        emailError.textContent = data.error || 'Failed to resend email';
      }
    } catch (error) {
      emailError.textContent = 'Network error. Please try again.';
    } finally {
      sendButton.disabled = false;
      sendButton.textContent = 'Send Email';
    }
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!validateEmail()) return;
    
    try {
      sendButton.disabled = true;
      sendButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
      
      const response = await fetch('/user/forgetpassword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('input[name="_csrf"]').value
        },
        body: JSON.stringify({ email: emailInput.value.trim() })
      });
      
      const data = await response.json();
      if (data.success) {
        startCountdown(calculateRemainingTime(data.resetTimer));
      } else {
        emailError.textContent = data.error || 'Failed to send reset email';
      }
    } catch (error) {
      emailError.textContent = 'Network error. Please try again.';
    } finally {
      sendButton.disabled = false;
      sendButton.textContent = 'Send Email';
    }
  });

  emailInput.addEventListener('input', validateEmail);
  emailInput.addEventListener('blur', validateEmail);
});