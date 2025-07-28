
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Select2 for all select elements
    $('#offerType, #discountType').select2({
        minimumResultsForSearch: Infinity,
        width: '100%'
    });

    // Initialize Select2 for multi-selects with search
    $('#categoryTargetIds, #subcategoryTargetIds, #productTargetIds').select2({
        width: '100%',
        placeholder: 'Select options',
        closeOnSelect: false
    });

    // Toggle offer form visibility
    const toggleFormBtn = document.getElementById('toggleOfferForm');
    const addOfferOverlay = document.getElementById('addOfferOverlay');
    const closeFormBtn = document.getElementById('closeOfferFormBtn');

    toggleFormBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addOfferOverlay.classList.add('active');
    });

    closeFormBtn.addEventListener('click', () => {
        addOfferOverlay.classList.remove('active');
    });

    addOfferOverlay.addEventListener('click', (e) => {
        if (e.target === addOfferOverlay) {
            addOfferOverlay.classList.remove('active');
        }
    });

    // Offer type change handler
    document.getElementById('offerType').addEventListener('change', function () {
        document.getElementById('categoryTargetIds').classList.add('hidden');
        document.getElementById('subcategoryTargetIds').classList.add('hidden');
        document.getElementById('productTargetIds').classList.add('hidden');

        const selectedValue = this.value;
        if (selectedValue === 'category') {
            document.getElementById('categoryTargetIds').classList.remove('hidden');
        } else if (selectedValue === 'subcategory') {
            document.getElementById('subcategoryTargetIds').classList.remove('hidden');
        } else if (selectedValue === 'product') {
            document.getElementById('productTargetIds').classList.remove('hidden');
        }
    });

    const form = document.getElementById('offerForm');
    const codeInput = document.getElementById('offerCode');
    const discountTypeInput = document.getElementById('discountType');
    const discountValueInput = document.getElementById('discountValue');
    const endDateInput = document.getElementById('endDate');
    const offerTypeInput = document.getElementById('offerType');
    const categoryTargetIdsInput = document.getElementById('categoryTargetIds');
    const subcategoryTargetIdsInput = document.getElementById('subcategoryTargetIds');
    const productTargetIdsInput = document.getElementById('productTargetIds');

    // Automatically convert offer code to uppercase while typing
    codeInput.addEventListener('input', () => {
        codeInput.value = codeInput.value.toUpperCase();
    });

    // Notification function
    const showNotification = (type, message) => {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.classList.add('notification', type);
        notification.innerHTML = `
                    <span>${message}</span>
                    <span class="close-btn">&times;</span>
                `;

        container.appendChild(notification);

        // Remove notification after 4 seconds
        setTimeout(() => {
            notification.remove();
        }, 4000);

        // Close button functionality
        notification.querySelector('.close-btn').addEventListener('click', () => {
            notification.remove();
        });
    };

    // Validation functions
    const showError = (input, message) => {
        const errorElement = input.nextElementSibling;
        errorElement.textContent = message;
        errorElement.classList.add('show');
        input.style.borderColor = 'red';
    };

    const clearError = (input) => {
        const errorElement = input.nextElementSibling;
        errorElement.classList.remove('show');
        input.style.borderColor = '';
    };

    const validateForm = () => {
        let isValid = true;
        const today = new Date().toISOString().split('T')[0];

        // Offer Code Validation
        const codeRegex = /^[A-Z0-9]{6}$/;
        if (!codeRegex.test(codeInput.value)) {
            showError(codeInput, 'Code must be 6 uppercase alphanumeric characters.');
            isValid = false;
        } else {
            clearError(codeInput);
        }

        // Offer Type Validation
        if (!offerTypeInput.value) {
            showError(offerTypeInput, 'Please select an offer type.');
            isValid = false;
        } else {
            clearError(offerTypeInput);
        }

        // Target IDs Validation
        if (offerTypeInput.value === 'category' && $('#categoryTargetIds').val().length === 0) {
            showError(categoryTargetIdsInput, 'Please select at least one category.');
            isValid = false;
        } else if (offerTypeInput.value === 'subcategory' && $('#subcategoryTargetIds').val().length === 0) {
            showError(subcategoryTargetIdsInput, 'Please select at least one subcategory.');
            isValid = false;
        } else if (offerTypeInput.value === 'product' && $('#productTargetIds').val().length === 0) {
            showError(productTargetIdsInput, 'Please select at least one product.');
            isValid = false;
        } else {
            if (offerTypeInput.value === 'category') clearError(categoryTargetIdsInput);
            if (offerTypeInput.value === 'subcategory') clearError(subcategoryTargetIdsInput);
            if (offerTypeInput.value === 'product') clearError(productTargetIdsInput);
        }

        // Discount Type Validation
        if (!discountTypeInput.value) {
            showError(discountTypeInput, 'Please select a discount type.');
            isValid = false;
        } else {
            clearError(discountTypeInput);
        }

        // Discount Value Validation
        const discountValue = parseFloat(discountValueInput.value);

        if (discountTypeInput.value === 'percentage') {
            if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
                showError(discountValueInput, 'For percentage, value must be between 0 and 100.');
                isValid = false;
            } else {
                clearError(discountValueInput);
            }
        } else if (discountTypeInput.value === 'price') {
            if (isNaN(discountValue) || discountValue < 0 || discountValue > 10000) {
                showError(discountValueInput, 'For price, value must be between ₹0 and ₹10,000.');
                isValid = false;
            } else {
                clearError(discountValueInput);
            }
        }

        // Date Validation
        if (endDateInput.value <= today) {
            showError(endDateInput, 'End date must be in the future.');
            isValid = false;
        } else {
            clearError(endDateInput);
        }

        return isValid;
    };

    // Real-time validation event listeners
    [codeInput, discountTypeInput, discountValueInput, endDateInput, offerTypeInput].forEach(input => {
        input.addEventListener('input', validateForm);
        input.addEventListener('blur', validateForm);
    });

    // Form Submission with notifications
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return; // Block submission if validation fails
        }

        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Handle multiple selects
        data.categoryTargetIds = $('#categoryTargetIds').val() || [];
        data.subcategoryTargetIds = $('#subcategoryTargetIds').val() || [];
        data.productTargetIds = $('#productTargetIds').val() || [];

        try {
            const response = await fetch('/admin/offer/addOffer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (result.success) {
                showNotification('success', result.message);
                form.reset();
                addOfferOverlay.classList.remove('active');
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showNotification('error', result.message);
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('error', 'Something went wrong!');
        }
    });

    // DELETE OFFER FUNCTIONALITY with notifications
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            const offerId = button.dataset.offerId;

            if (confirm('Are you sure you want to delete this offer?')) {
                try {
                    const response = await fetch(`/admin/offer/${offerId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    const result = await response.json();

                    if (result.success) {
                        showNotification('success', result.message);
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    } else {
                        showNotification('error', result.message);
                    }
                } catch (error) {
                    console.error('Error:', error);
                    showNotification('error', 'Failed to delete the offer.');
                }
            }
        });
    });
});