document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const modal = document.getElementById('addressModal');
    const addAddressBtn = document.getElementById('addAddressBtn') || document.getElementById('addAddressBtnEmpty');
    const continueBtn = document.getElementById('continueBtn');
    const addressForm = document.getElementById('addressForm');
    const modalTitle = document.getElementById('modalTitle');
    const addressIdInput = document.getElementById('addressId');
    const closeBtn = document.querySelector('.close');
    const cancelBtn = document.getElementById('cancelBtn');

    // Address selection
    const addressRadios = document.querySelectorAll('input[name="selectedAddress"]');

    // Edit buttons
    const editButtons = document.querySelectorAll('.btn-edit');

    // Current action (add or edit)
    let currentAction = 'add';
    let editAddressId = null;

    // Show modal for adding new address
    addAddressBtn.addEventListener('click', function () {
        currentAction = 'add';
        modalTitle.textContent = 'Add New Address';
        addressForm.reset();
        addressIdInput.value = '';
        document.getElementById('country').value = 'India'; // Set default country
        document.getElementById('isDefault').checked = false;
        clearAllErrors();
        modal.style.display = 'block';
    });

    // Show modal for editing address
    editButtons.forEach(button => {
        button.addEventListener('click', function () {
            currentAction = 'edit';
            editAddressId = this.getAttribute('data-address-id');
            modalTitle.textContent = 'Edit Address';
            clearAllErrors();

            // Fetch address details from backend
            fetch(`/user/address/${editAddressId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.address) {
                        const address = data.address;

                        // Populate form fields
                        addressIdInput.value = address._id;
                        document.getElementById('name').value = address.name;
                        document.getElementById('streetAddress').value = address.streetAddress;
                        document.getElementById('landmark').value = address.landmark || '';
                        document.getElementById('city').value = address.city;
                        document.getElementById('state').value = address.state;
                        document.getElementById('zip').value = address.zip;
                        document.getElementById('country').value = address.country || 'India';
                        document.getElementById('phone').value = address.phone;
                        document.getElementById('isDefault').checked = address.isDefault || false;

                        // Show modal
                        modal.style.display = 'block';
                    } else {
                        showPopupMessage(data.message || 'Failed to load address', 'error');
                    }
                })
                .catch(() => {
                    showPopupMessage('Failed to load address details', 'error');
                });
        });
    });

    // Close modal
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    window.addEventListener('click', function (event) {
        if (event.target === modal) {
            closeModal();
        }
    });

    function closeModal() {
        modal.style.display = 'none';
    }

    // Clear all error messages
    function clearAllErrors() {
        document.querySelectorAll('.error-message').forEach(el => {
            el.style.display = 'none';
        });
    }

    // Form validation
    addressForm.addEventListener('submit', function (e) {
        e.preventDefault();
        clearAllErrors();

        // Validate form
        if (validateForm()) {
            // Form is valid - submit it
            submitAddressForm();
        }
    });

    function validateForm() {
        let isValid = true;

        // Validate name
        if (!document.getElementById('name').value.trim()) {
            showError('nameError', 'Please enter a name for this address');
            isValid = false;
        }

        // Validate street address
        if (!document.getElementById('streetAddress').value.trim()) {
            showError('streetAddressError', 'Please enter your street address');
            isValid = false;
        }

        // Validate city
        if (!document.getElementById('city').value) {
            showError('cityError', 'Please select your city');
            isValid = false;
        }

        // Validate state
        if (!document.getElementById('state').value) {
            showError('stateError', 'Please select your state');
            isValid = false;
        }

        // Validate zip
        const zip = document.getElementById('zip').value;
        if (!zip || !/^\d{6}$/.test(zip)) {
            showError('zipError', 'Please enter a valid 6-digit zip code');
            isValid = false;
        }

        // Validate country
        if (!document.getElementById('country').value) {
            showError('countryError', 'Please select your country');
            isValid = false;
        }

        // Validate phone
        const phone = document.getElementById('phone').value;
        if (!phone || !/^\d{10}$/.test(phone)) {
            showError('phoneError', 'Please enter a valid 10-digit phone number');
            isValid = false;
        }

        return isValid;
    }

    function showError(elementId, message) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.style.display = 'block';
    }

    // Form submission
    function submitAddressForm() {
        const formData = new FormData(addressForm);
        const data = Object.fromEntries(formData.entries());

        // Convert isDefault checkbox to boolean
        data.isDefault = data.isDefault === 'on';

        // Determine the endpoint based on action
        const endpoint = currentAction === 'add'
            ? '/user/postAddressInCart'
            : `/user/editaddress/${editAddressId}`;

        const method = currentAction === 'add' ? 'POST' : 'PUT';

        fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => Promise.reject(err));
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    showPopupMessage(
                        currentAction === 'add'
                            ? 'Address added successfully!'
                            : 'Address updated successfully!',
                        'success'
                    );
                    closeModal();
                    // Refresh the page to show changes
                    setTimeout(() => location.reload(), 1500);
                } else {
                    // Handle field-specific errors
                    if (data.errors) {
                        Object.entries(data.errors).forEach(([field, message]) => {
                            const errorElement = document.getElementById(`${field}Error`);
                            if (errorElement) {
                                errorElement.textContent = message;
                                errorElement.style.display = 'block';
                            }
                        });
                    }
                    showPopupMessage(data.message || 'An error occurred', 'error');
                }
            })
            .catch(() => {
                showPopupMessage('Failed to save address. Please try again.', 'error');
            });
    }

    // Address selection
    addressRadios.forEach(radio => {
        radio.addEventListener('change', function () {
            // Enable continue button when an address is selected
            continueBtn.disabled = false;

            // Highlight selected address
            document.querySelectorAll('.address-card').forEach(card => {
                card.classList.remove('selected');
            });
            this.closest('.address-card').classList.add('selected');

            // Store selected address in localStorage
            localStorage.setItem('selectedAddressId', this.value);
        });
    });

    // Check if an address is already selected (from localStorage or default)
    const selectedRadio = document.querySelector('input[name="selectedAddress"]:checked');
    if (selectedRadio) {
        continueBtn.disabled = false;
        selectedRadio.closest('.address-card').classList.add('selected');
    }

    // Continue button click
    continueBtn.addEventListener('click', function () {
        const selectedAddressId = document.querySelector('input[name="selectedAddress"]:checked')?.value;
        if (selectedAddressId) {
            window.location.href = `/user/payment?selectedAddressId=${selectedAddressId}`;
        }
    });

    // Remove address buttons
    document.querySelectorAll('.btn-remove').forEach(button => {
        button.addEventListener('click', function () {
            const addressId = this.getAttribute('data-address-id');
            if (confirm('Are you sure you want to remove this address?')) {
                fetch(`/user/address/${addressId}`, {
                    method: 'DELETE'
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            showPopupMessage('Address removed successfully', 'success');
                            // Refresh the page to show changes
                            setTimeout(() => location.reload(), 1500);
                        } else {
                            showPopupMessage(data.message || 'Failed to remove address', 'error');
                        }
                    })
                    .catch(() => {
                        showPopupMessage('Failed to remove address. Please try again.', 'error');
                    });
            }
        });
    });
});