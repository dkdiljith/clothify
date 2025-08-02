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
    }).on('select2:opening', function() {
        // Prevent opening if no offer type is selected
        if (!offerTypeInput.value) {
            $(this).select2('close');
            showError(this, 'Please select an offer type first');
            return false;
        }
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

    // Form elements
    const form = document.getElementById('offerForm');
    const codeInput = document.getElementById('offerCode');
    const discountTypeInput = document.getElementById('discountType');
    const discountValueInput = document.getElementById('discountValue');
    const endDateInput = document.getElementById('endDate');
    const offerTypeInput = document.getElementById('offerType');
    const categoryTargetIdsInput = document.getElementById('categoryTargetIds');
    const subcategoryTargetIdsInput = document.getElementById('subcategoryTargetIds');
    const productTargetIdsInput = document.getElementById('productTargetIds');

    // Function to hide all target selectors and their Select2 containers
    const hideAllTargetSelectors = () => {
        [categoryTargetIdsInput, subcategoryTargetIdsInput, productTargetIdsInput].forEach(selector => {
            selector.classList.add('hidden');
            $(selector).val(null).trigger('change');
            $(selector).next('.select2-container').addClass('hidden');
            clearError(selector);
        });
    };

    // Hide all target selectors initially
    hideAllTargetSelectors();

    // Offer type change handler
    offerTypeInput.addEventListener('change', function() {
        hideAllTargetSelectors();
        
        // Show the appropriate selector based on offer type
        switch(this.value) {
            case 'category':
                categoryTargetIdsInput.classList.remove('hidden');
                $(categoryTargetIdsInput).next('.select2-container').removeClass('hidden');
                break;
            case 'subcategory':
                subcategoryTargetIdsInput.classList.remove('hidden');
                $(subcategoryTargetIdsInput).next('.select2-container').removeClass('hidden');
                break;
            case 'product':
                productTargetIdsInput.classList.remove('hidden');
                $(productTargetIdsInput).next('.select2-container').removeClass('hidden');
                break;
        }
    });

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
        errorElement.textContent = '';
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
            clearError(categoryTargetIdsInput);
            clearError(subcategoryTargetIdsInput);
            clearError(productTargetIdsInput);
        }

        // Discount Type Validation
        if (!discountTypeInput.value) {
            showError(discountTypeInput, 'Please select a discount type.');
            isValid = false;
        } else {
            clearError(discountTypeInput);
        }

        // Discount Value Validation
        if (!discountValueInput.value) {
            showError(discountValueInput, 'Discount value is required.');
            isValid = false;
        } else {
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
        }

        // Date Validation
        if (!endDateInput.value) {
            showError(endDateInput, 'Expiry date is required.');
            isValid = false;
        } else if (endDateInput.value <= today) {
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
                hideAllTargetSelectors();
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