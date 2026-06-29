document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('addressForm');
    const inputs = form.querySelectorAll('input, select');

    // Real-time validation
    inputs.forEach(input => {
        input.addEventListener('input', function () {
            validateField(this);
        });

        input.addEventListener('blur', function () {
            validateField(this);
        });
    });

    // Form submission
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        let isValid = true;
        inputs.forEach(input => {
            if (!validateField(input)) {
                isValid = false;
            }
        });

        if (isValid) {
            // Submit the form if all fields are valid
            form.submit();
        }
    });

    // Field validation function
    function validateField(field) {
        const errorElement = document.getElementById(`${field.id}Error`);

        if (field.required && !field.value.trim()) {
            field.classList.add('invalid');
            field.classList.remove('valid');
            errorElement.style.display = 'block';
            errorElement.textContent = `${field.labels[0].textContent.replace(':', '')} is required`;
            return false;
        }

        // Specific validations
        if (field.id === 'zip' && field.value.trim() && !/^\d{6}$/.test(field.value.trim())) {
            field.classList.add('invalid');
            field.classList.remove('valid');
            errorElement.style.display = 'block';
            errorElement.textContent = 'Please enter a valid 6-digit postal code';
            return false;
        }

        if (field.id === 'phone' && field.value.trim() && !/^\d{10}$/.test(field.value.trim())) {
            field.classList.add('invalid');
            field.classList.remove('valid');
            errorElement.style.display = 'block';
            errorElement.textContent = 'Please enter a valid 10-digit phone number';
            return false;
        }

        // If field is valid
        field.classList.remove('invalid');
        field.classList.add('valid');
        errorElement.style.display = 'none';
        return true;
    }
});