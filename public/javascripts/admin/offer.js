 document.addEventListener('DOMContentLoaded', () => {
            // Initialize Select2
            $('#discountType').select2({
                minimumResultsForSearch: Infinity,
                width: '100%'
            });

            // Toggle coupon form visibility
            const toggleFormBtn = document.getElementById('toggleCouponForm');
            const addCouponOverlay = document.getElementById('addCouponOverlay');
            const closeFormBtn = document.getElementById('closeFormBtn');

            // Edit button click handler
            document.querySelectorAll('.btn-edit').forEach(button => {
                button.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const couponId = button.dataset.couponId;
                    await openEditModal(couponId);
                });
            });

            toggleFormBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                addCouponOverlay.classList.add('active');
            });

            closeFormBtn.addEventListener('click', () => {
                addCouponOverlay.classList.remove('active');
            });

            addCouponOverlay.addEventListener('click', (e) => {
                if (e.target === addCouponOverlay) {
                    addCouponOverlay.classList.remove('active');
                }
            });

            const form = document.getElementById('couponForm');
            const offerCodeInput = document.getElementById('offerCode');
            const offerTypeInput = document.getElementById('offerType')
            const discountTypeInput = document.getElementById('discountType');
            const discountValueInput = document.getElementById('discountValue');
            const startDateInput = document.getElementById('startDate');
            const endDateInput = document.getElementById('endDate');

            // ✅ Automatically convert coupon code to uppercase while typing
            offerCodeInput.addEventListener('input', () => {
                offerCodeInput.value = offerCodeInput.value.toUpperCase();
            });

            // ✅ Notification function
            const showNotification = (type, message) => {
                const container = document.getElementById('notification-container') || createNotificationContainer();
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

            const createNotificationContainer = () => {
                const container = document.createElement('div');
                container.id = 'notification-container';
                document.body.appendChild(container);
                return container;
            };

            // ✅ Validation functions
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

                // ✅ Coupon Code Validation
                const codeRegex = /^[A-Z0-9]{6}$/;
                if (!codeRegex.test(offerCodeInput.value)) {
                    showError(offerCodeInput, 'Code must be 6 uppercase alphanumeric characters.');
                    isValid = false;
                } else {
                    clearError(offerCodeInput);
                }

                // ✅ Discount Type Validation
                if (!discountTypeInput.value) {
                    // Target the parent container instead of the Select2 element
                    const select2Container = document.querySelector('.select2-container');
                    select2Container.style.border = '1px solid red';
                    document.getElementById('type-error').textContent = 'Please select a discount type.';
                    isValid = false;
                } else {
                    document.querySelector('.select2-container').style.border = '';
                    document.getElementById('type-error').textContent = '';
                }

                // ✅ Discount Value Validation
                const discountValue = parseFloat(discountValueInput.value);
                const discountValueStr = discountValueInput.value.trim();

                // Check for empty field
                if (!discountValue) {
                    showError(discountValueInput, 'Discount value is required');
                    isValid = false;
                }
                // Check if valid number
                else if (isNaN(discountValueStr)) {
                    showError(discountValueInput, 'Please enter a valid number');
                    isValid = false;
                }
                else {
                    const discountValue = parseFloat(discountValueStr);

                    // Check for negative values
                    if (discountValue < 0) {
                        showError(discountValueInput, 'Value cannot be negative');
                        isValid = false;
                    }
                    // Percentage validation
                    else if (discountTypeInput.value === 'percentage') {
                        if (discountValue === 0) {
                            showError(discountValueInput, 'Percentage must be greater than 0%');
                            isValid = false;
                        } else if (discountValue > 100) {
                            showError(discountValueInput, 'Percentage cannot exceed 100%');
                            isValid = false;
                        } else {
                            clearError(discountValueInput);
                        }
                    }
                    // Fixed amount validation
                    else if (discountTypeInput.value === 'price') {
                        if (discountValue < 10) {
                            showError(discountValueInput, 'Minimum discount is ₹10');
                            isValid = false;
                        } else if (discountValue > 10000) {
                            showError(discountValueInput, 'Maximum discount is ₹10,000');
                            isValid = false;
                        } else {
                            clearError(discountValueInput);
                        }
                    }
                }

                // ✅ Date Validation
                 
                //startDate doesnt required future validation , while editing it can make several issues

                if (endDateInput.value <= today) {
                    showError(endDateInput, 'End date must be in the future.');
                    isValid = false;
                } else {
                    clearError(endDateInput);
                }

                return isValid;
            };

            // ✅ Real-time validation event listeners
            [offerCodeInput,offerTypeInput, discountTypeInput, discountValueInput,startDateInput, endDateInput].forEach(input => {
                input.addEventListener('input', validateForm);
                input.addEventListener('blur', validateForm);
            });

            //function to reset selection field
            function cleanupSelect2() {
                const select = $('#discountType');
                select.val(null).trigger('change');
                select.select2('destroy');
                select.select2({
                    minimumResultsForSearch: Infinity,
                    width: '100%'
                });
            }

            //FUNCTION TO CLOSE MODAL
            function closeModal() {
                cleanupSelect2();
                // Reset the form
                document.getElementById('couponForm').reset();

                document.getElementById('couponModalTitle').textContent = 'Create New Coupon';

                // Clear the edit ID
                document.getElementById('editCouponId').value = '';

                // Clear all validation errors
                document.querySelectorAll('.error-message').forEach(el => {
                    el.textContent = '';
                });

                // Hide the modal
                document.getElementById('addCouponOverlay').classList.remove('active');
            }

            // Update all close handlers to use this function:
            document.getElementById('closeFormBtn').addEventListener('click', closeModal);
            addCouponOverlay.addEventListener('click', (e) => {
                if (e.target === addCouponOverlay) {
                    closeModal();
                }
            });

            // Function to open modal in EDIT FORM
            async function openEditModal(couponId) {
                try {
                    // Show loading state
                    document.getElementById('couponModalTitle').textContent = 'Loading...';
                    document.getElementById('addCouponOverlay').classList.add('active');

                    // Fetch coupon data
                    const response = await fetch(`/admin/offer/${couponId}`);
                    const offer = await response.json();

                    // Populate form
                    document.getElementById('editCouponId').value = offer._id;
                    document.getElementById('couponModalTitle').textContent = 'Edit Offer';
                    document.getElementById('offerCode').value = offer.offerCode;
                    document.getElementById('offerType').value = offer.offerType;
                    document.getElementById('discountType').value = offer.discountType;
                    document.getElementById('discountValue').value = offer.discountValue;
                    document.getElementById('startDate').value = offer.startDate.split('T')[0];
                    document.getElementById('endDate').value = offer.endDate.split('T')[0];

                    // Trigger Select2 update if using it
                    $('#discountType').trigger('change');

                } catch (error) {
                    console.error('Error loading coupon:', error);
                    showNotification('error', 'Failed to load offer data');
                    closeModal();
                }
            }

            // ✅ Form Submission with notifications
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                if (!validateForm()) return;

                const formData = new FormData(form);
                const data = Object.fromEntries(formData);
                const couponId = document.getElementById('editCouponId').value;

                try {
                    const url = couponId ? `/admin/offer/${couponId}` : '/admin/offer/addOffer';
                    const method = couponId ? 'PUT' : 'POST';

                    const response = await fetch(url, {
                        method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });

                    const result = await response.json();
                    if (result.success) {
                        showNotification('success', result.message);
                        form.reset();
                        addCouponOverlay.classList.remove('active');
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

            // ✅ DELETE COUPON FUNCTIONALITY with notifications
            function setupDeleteButtons() {
                document.querySelectorAll('.btn-delete').forEach(button => {
                    button.addEventListener('click', async (e) => {
                        e.preventDefault();
                        const couponId = button.dataset.couponId;

                        if (confirm('Are you sure you want to delete this coupon?')) {
                            try {
                                const response = await fetch(`/admin/offer/${couponId}`, {
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
                                showNotification('error', 'Failed to delete the coupon.');
                            }
                        }
                    });
                });
            }

            // Initialize delete buttons
            setupDeleteButtons();
        });