document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('resetForm');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const togglePassword = document.getElementById('togglePassword');
  const newPasswordError = document.getElementById('newPasswordError');
  const confirmPasswordError = document.getElementById('confirmPasswordError');
  const submitButton = form.querySelector('button[type="submit"]');


  // Toggle password visibility
  togglePassword.addEventListener('click', function() {
    const type = newPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    newPasswordInput.setAttribute('type', type);
    this.classList.toggle('fa-eye-slash');
  });

  // Validate new password
  function validateNewPassword() {
    const password = newPasswordInput.value;
    let isValid = true;
    newPasswordError.textContent = '';
    
    if (!password) {
      newPasswordError.textContent = 'Password is required';
      isValid = false;
    } else if (password.length < 8) {
      newPasswordError.textContent = 'Password must be at least 8 characters';
      isValid = false;
    } else if (!/[A-Z]/.test(password)) {
      newPasswordError.textContent = 'Password must contain at least one uppercase letter';
      isValid = false;
    } else if (!/[0-9]/.test(password)) {
      newPasswordError.textContent = 'Password must contain at least one number';
      isValid = false;
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      newPasswordError.textContent = 'Password must contain at least one special character';
      isValid = false;
    }
    
    return isValid;
  }

  // Validate password confirmation
  function validateConfirmPassword() {
    const password = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    let isValid = true;
    confirmPasswordError.textContent = '';
    
    if (!confirmPassword) {
      confirmPasswordError.textContent = 'Please confirm your password';
      isValid = false;
    } else if (password !== confirmPassword) {
      confirmPasswordError.textContent = 'Passwords do not match';
      isValid = false;
    }
    
    return isValid;
  }

  // Form submission handler
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const isNewPasswordValid = validateNewPassword();
    const isConfirmPasswordValid = validateConfirmPassword();
    
    if (!isNewPasswordValid || !isConfirmPasswordValid) {
      return;
    }

    // Disable submit button during request
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';

    try {
      const response = await fetch(`/user/resetpassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          newPassword: newPasswordInput.value,
          confirmPassword: confirmPasswordInput.value,
          token: token.value,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      // Success - redirect to login with success message
      window.location.href = '/user/login?message=Password reset successfully';
      
    } catch (error) {
      console.error('Password reset error:', error);
      newPasswordError.textContent = error.message;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Reset Password';
    }
  });

  // Real-time validation
  newPasswordInput.addEventListener('input', validateNewPassword);
  newPasswordInput.addEventListener('blur', validateNewPassword);
  confirmPasswordInput.addEventListener('input', validateConfirmPassword);
  confirmPasswordInput.addEventListener('blur', validateConfirmPassword);
});