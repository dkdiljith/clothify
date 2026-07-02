document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('resetPasswordForm');
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordStrengthBar = document.getElementById('passwordStrengthBar');
    const passwordStrengthText = document.getElementById('passwordStrengthText');
    const submitBtn = document.getElementById('submitBtn');
    const submitSpinner = document.getElementById('submitSpinner');
    const submitIcon = document.getElementById('submitIcon');
    const tokenInput = document.getElementById('token');
    const toastContainer = document.getElementById('toastContainer');
    const currentPasswordError = document.getElementById('currentPasswordError')
    const newPasswordError = document.getElementById('newPasswordError')
    const conformPasswordError = document.getElementById('conformPasswordError')

    // Password requirement elements
    const reqLength = document.getElementById('req-length');
    const reqUppercase = document.getElementById('req-uppercase');
    const reqNumber = document.getElementById('req-number');
    const reqSpecial = document.getElementById('req-special');

    const passwordToggles = document.querySelectorAll('.password-toggle');

    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function () {
            const inputField = this.previousElementSibling;

            if (!inputField) return;

            if (inputField.type === 'password') {
                inputField.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                inputField.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    });



    // Toggle password visibility
    function togglePassword(id, icon) {
        const input = document.getElementById(id);
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    }

    // Calculate password strength
    function calculatePasswordStrength(password) {
        let strength = 0;
        let messages = [];

        // Length
        if (password.length >= 8) strength += 25;
        if (password.length >= 12) strength += 15;

        // Complexity
        if (/[A-Z]/.test(password)) strength += 20;
        if (/[0-9]/.test(password)) strength += 20;
        if (/[^A-Za-z0-9]/.test(password)) strength += 20;

        // Update requirement indicators
        reqLength.classList.toggle('valid', password.length >= 8);
        reqUppercase.classList.toggle('valid', /[A-Z]/.test(password));
        reqNumber.classList.toggle('valid', /[0-9]/.test(password));
        reqSpecial.classList.toggle('valid', /[^A-Za-z0-9]/.test(password));

        return Math.min(strength, 100);
    }

    // Update password strength meter
    newPasswordInput.addEventListener('input', function () {
        const strength = calculatePasswordStrength(this.value);
        passwordStrengthBar.style.width = `${strength}%`;

        // Update color and text based on strength
        if (strength < 40) {
            passwordStrengthBar.style.backgroundColor = 'var(--accent-color)';
            passwordStrengthText.textContent = 'Weak';
        } else if (strength < 70) {
            passwordStrengthBar.style.backgroundColor = '#ffc107';
            passwordStrengthText.textContent = 'Medium';
        } else {
            passwordStrengthBar.style.backgroundColor = 'var(--success-color)';
            passwordStrengthText.textContent = 'Strong';
        }
    });

    // Validate current password
    function validateCurrentPassword() {
        const password = currentPasswordInput.value;
        let isValid = true;

        if (!password) {
            showPopupMessage('Current password is required', 'error');
            isValid = false;
        }

        return isValid;
    }

    // Validate new password
    function validateNewPassword() {
        const password = newPasswordInput.value;
        let isValid = true;

        if (!password) {
            showPopupMessage('New password is required', 'error');
            isValid = false;
        } else if (password.length < 8) {
            showPopupMessage('Password must be at least 8 characters', 'error');
            isValid = false;
        } else if (!/[A-Z]/.test(password)) {
            showPopupMessage('Password must contain at least one uppercase letter', 'error');
            isValid = false;
        } else if (!/[0-9]/.test(password)) {
            showPopupMessage('Password must contain at least one number', 'error');
            isValid = false;
        } else if (!/[^A-Za-z0-9]/.test(password)) {
            showPopupMessage('Password must contain at least one special character', 'error');
            isValid = false;
        }

        return isValid;
    }

    // Validate password confirmation
    function validateConfirmPassword() {
        const password = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        let isValid = true;

        if (!confirmPassword) {
            showPopupMessage('Please confirm your password', 'error');
            isValid = false;
        } else if (password !== confirmPassword) {
            showPopupMessage('Passwords do not match', 'error');
            isValid = false;
        }

        return isValid;
    }

    // Form submission handler
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const isCurrentValid = validateCurrentPassword();
        const isNewValid = validateNewPassword();
        const isConfirmValid = validateConfirmPassword();

        if (!isCurrentValid || !isNewValid || !isConfirmValid) {
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        submitSpinner.style.display = 'inline-block';
        submitIcon.style.display = 'none';

        try {
            const response = await fetch('/user/resetpassword', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    oldPassword: currentPasswordInput.value,
                    newPassword: newPasswordInput.value,
                    confirmPassword: confirmPasswordInput.value,
                    token: tokenInput.value
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to reset password');
            }

            // Show success message
            showPopupMessage('Password updated successfully!', 'success');

            // Reset form
            form.reset();
            passwordStrengthBar.style.width = '0';
            passwordStrengthText.textContent = '';

            // Reset requirement indicators
            [reqLength, reqUppercase, reqNumber, reqSpecial].forEach(el => {
                el.classList.remove('valid');
            });

        } catch (error) {
            showPopupMessage(error.message, 'error');
            console.error('Password reset error:', error);
        } finally {
            // Reset loading state
            submitBtn.disabled = false;
            submitSpinner.style.display = 'none';
            submitIcon.style.display = 'inline-block';
        }
    });

});