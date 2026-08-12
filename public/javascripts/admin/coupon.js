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
    const codeInput = document.getElementById('couponCode');
    const minPurchaseInput = document.getElementById('minimumPurchaseAmount');
    const maxPurchaseInput = document.getElementById('maximumPurchaseAmount');
    const discountTypeInput = document.getElementById('discountType');
    const discountValueInput = document.getElementById('discountValue');
    const endDateInput = document.getElementById('endDate');
    const startDateInput = document.getElementById('startDate');

    // ✅ Automatically convert coupon code to uppercase while typing
    codeInput.addEventListener('input', () => {
        codeInput.value = codeInput.value.toUpperCase();
    });


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
        if (!codeRegex.test(codeInput.value)) {
            showError(codeInput, 'Code must be 6 uppercase alphanumeric characters.');
            isValid = false;
        } else {
            clearError(codeInput);
        }

        // Discount Type Validation
        if (!discountTypeInput.value) {
            document.querySelector('.select2-container').style.border = '1px solid red';
            const errorBox = document.getElementById('type-error');
            errorBox.textContent = 'Please select a discount type.';
            errorBox.classList.add('show');
            isValid = false;
        } else {
            document.querySelector('.select2-container').style.border = '';
            const errorBox = document.getElementById('type-error');
            errorBox.textContent = '';
            errorBox.classList.remove('show');
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

        // ✅ Minimum Purchase Validation
        const minPurchase = parseFloat(minPurchaseInput.value);
        if (isNaN(minPurchase) || minPurchase < 100 || minPurchase > 10000) {
            showError(minPurchaseInput, 'Min purchase must be ₹100-₹10,000.');
            isValid = false;
        } else {
            clearError(minPurchaseInput);
        }

        // Maximum Purchase Validation
        const maxPurchase = parseFloat(maxPurchaseInput.value);

        if (isNaN(maxPurchase) || maxPurchase < 100 || maxPurchase > 10000) {
            showError(maxPurchaseInput, 'Max purchase must be ₹100-₹10,000.');
            isValid = false;
        } else if (maxPurchase < minPurchase) {
            showError(maxPurchaseInput, 'Maximum purchase amount should be greater than minimum purchase amount.');
            isValid = false;
        } else {
            clearError(maxPurchaseInput);
        }


        // ✅ Date Validation
        if (!startDateInput.value) {
            showError(startDateInput, 'Select a date as start date.');
            isValid = false;
        } else {
            clearError(startDateInput);
        }

        if (endDateInput.value <= today) {
            showError(endDateInput, 'End date must be in the future.');
            isValid = false;
        } else {
            clearError(endDateInput);
        }

        return isValid;
    };

    // ✅ Real-time validation event listeners
    [codeInput, minPurchaseInput, maxPurchaseInput, discountTypeInput, discountValueInput, endDateInput, startDateInput].forEach(input => {
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

        // reset form
        document.getElementById("couponForm").reset();

        document.getElementById("couponModalTitle").textContent =
            "Create New Coupon";

        // clear edit id
        document.getElementById("editCouponId").value = "";

        // clear all error messages
        document.querySelectorAll(".error-message").forEach((el) => {
            el.textContent = "";
            el.classList.remove("show");
            el.style.display = "";
        });

        // remove invalid classes
        document.querySelectorAll(".is-invalid").forEach((el) => {
            el.classList.remove("is-invalid");
        });

        // clear borders from inputs/selects
        document.querySelectorAll(".form-control").forEach((el) => {
            el.style.borderColor = "";
            el.style.border = "";
        });

        // reset select2 visual border
        const select2Container =
            document.querySelector(".select2-container");

        if (select2Container) {
            select2Container.style.border = "";
        }

        // hide modal
        document.getElementById("addCouponOverlay")
            .classList.remove("active");
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
            const response = await fetch(`/admin/coupon/${couponId}`);
            const coupon = await response.json();

            // Populate form
            document.getElementById('editCouponId').value = coupon._id;
            document.getElementById('couponModalTitle').textContent = 'Edit Coupon';
            document.getElementById('couponCode').value = coupon.couponCode;
            document.getElementById('discountType').value = coupon.discountType;
            document.getElementById('minimumPurchaseAmount').value = coupon.minimumPurchaseAmount;
            document.getElementById('maximumPurchaseAmount').value = coupon.maximumPurchaseAmount;
            document.getElementById('discountValue').value = coupon.discountValue;
            document.getElementById('startDate').value = coupon.startDate.split('T')[0];
            document.getElementById('endDate').value = coupon.endDate.split('T')[0];

            // Trigger Select2 update if using it
            $('#discountType').trigger('change');

        } catch {
            showPopupMessage('Failed to load coupon data', 'error')
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
            const url = couponId ? `/admin/coupon/${couponId}` : '/admin/coupon/addCoupon';
            const method = couponId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.success) {
                showPopupMessage(result.message, 'success')
                form.reset();
                addCouponOverlay.classList.remove('active');
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showPopupMessage(result.message, 'error')
            }

        } catch {
            showPopupMessage('Something went wrong!', 'error')
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
                        const response = await fetch(`/admin/coupon/${couponId}`, {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        });

                        const result = await response.json();

                        if (result.success) {
                            showPopupMessage(result.message, 'success')
                            setTimeout(() => {
                                window.location.reload();
                            }, 1500);
                        } else {
                            showPopupMessage(result.message, 'error')
                        }
                    } catch  {
                        showPopupMessage('Failed to delete the coupon.', 'error')
                    }
                }
            });
        });
    }

    // Initialize delete buttons
    setupDeleteButtons();
});