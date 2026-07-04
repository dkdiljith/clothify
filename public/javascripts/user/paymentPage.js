document.addEventListener('DOMContentLoaded', () => {
    
    const paymentForm = document.getElementById('payment-form');
    const paymentMethods = document.querySelectorAll('.payment-method');
    const placeOrderBtn = document.getElementById('placeOrderBtn');

    // Get Total Amount (Removing the ₹ symbol and parsing as float)
    const totalAmountText = document.getElementById('amount').innerText;
    const totalAmount = parseFloat(totalAmountText.replace(/[^\d.]/g, ''));

    let paymentMethod = 'razorpay';

    // --- Wallet Validation Logic ---
    const walletMethod = document.querySelector('.payment-method[data-method="wallet"]');
    if (walletMethod) {
        const walletBalance = parseFloat(walletMethod.dataset.walletBalance);
        const insufficientLabel = walletMethod.querySelector('.insufficient-balance');

        if (walletBalance < totalAmount) {
            walletMethod.classList.add('disabled-method'); // Add a CSS class for styling
            walletMethod.style.opacity = '0.5';
            walletMethod.style.cursor = 'not-allowed';
            if (insufficientLabel) insufficientLabel.style.display = 'block';

            // If wallet was somehow the default, switch it to Razorpay
            if (paymentMethod === 'wallet') paymentMethod = 'razorpay';
        }
    }

    // Initialize default selection UI
    const defaultMethod = document.querySelector(`.payment-method[data-method="${paymentMethod}"]`);
    if (defaultMethod && !defaultMethod.classList.contains('disabled-method')) {
        defaultMethod.classList.add('selected');
        placeOrderBtn.disabled = false;
        placeOrderBtn.style.cursor = "pointer";
    }

    // Handle payment method selection
    paymentMethods.forEach(method => {
        method.addEventListener('click', () => {
            // Prevent selection if method is disabled
            if (method.classList.contains('disabled-method')) {
                return;
            }

            paymentMethods.forEach(item => item.classList.remove('selected'));
            method.classList.add('selected');
            paymentMethod = method.dataset.method;

            if (paymentMethod != null) {
                placeOrderBtn.disabled = false;
                placeOrderBtn.style.cursor = "pointer";
            }
        });
    });

    // Razorpay Specific Logic
    async function startRazorpayPayment(addressId) {
        try {
            // 1. Create the order on your server
            const response = await fetch('/user/payment/razorpay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addressId })
            });

            const order = await response.json();

            if (!order.success) {
                showPopupMessage(order.message || "Failed to initiate Razorpay", "error");
                return;
            }

            // 2. Configure Razorpay options
            const options = {
                key: "rzp_test_TVFPFUZdUa9wz4",
                amount: order.amount, // Amount in paise
                currency: "INR",
                name: "Clothify",
                description: "Order Payment",
                order_id: order.id, // The ID returned from your server
                handler: async function (response) {
                    // This block runs ONLY on payment success
                    try {
                        const verifyRes = await fetch('/user/payment/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                addressId: addressId
                            })
                        });

                        const result = await verifyRes.json();
                        if (result.success) {
                            window.location.href = '/user/orderSuccess';
                        } else {
                            showPopupMessage("Verification failed: " + result.message, "error");
                        }
                    } catch (verifyErr) {
                        console.error("Verification Error:", verifyErr);
                        showPopupMessage("Something went wrong during verification", "error");
                    }
                },
                "prefill": {
                    "name": "{{user.name}}",
                    "email": "{{user.email}}",
                    "contact": "{{user.phone}}"
                },
                theme: {
                    color: "#3399cc"
                }
            };

            // 3. Initialize Razorpay
            const rzp = new Razorpay(options);

            // 4. Handle Explicit Payment Failures (e.g., Bank decline, wrong OTP)
            rzp.on('payment.failed', async function (response) {
                console.log("Payment Failed Event Triggered");

                try {
                    const failureRes = await fetch('/user/payment/failure', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            addressId: addressId,
                            razorpayOrderId: order.id, // Razorpay order ID
                            reason: response.error.description,
                            errorCode: response.error.code,
                            paymentId: response.error.metadata.payment_id
                        })
                    });

                    const result = await failureRes.json();

                    if (result.success) {
                        window.location.href = `/user/orderFailure`;
                    } else {
                        showPopupMessage("Could not save progress: " + result.message, "error");
                    }

                } catch (err) {
                    console.error("Error logging payment failure:", err);
                    showPopupMessage("Connection error: " + err.message, "error");
                }
            });

            // 5. Open the Razorpay Modal
            rzp.open();

        } catch (error) {
            console.error("Razorpay Error:", error);
            showPopupMessage("Payment failed to initialize", "error");
        }
    }

    // Form Submission Logic
    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!paymentMethod) {
            showPopupMessage("Select any payment method", "error");
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const addressId = urlParams.get('selectedAddressId');

        if (!addressId) {
            showPopupMessage("Address not selected", "error");
            return;
        }

        if (paymentMethod === 'razorpay') {
            await startRazorpayPayment(addressId);
        } else {
            try {
                const response = await fetch('/user/placeorder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paymentMethod, addressId })
                });

                const result = await response.json();
                if (result.success) {
                    window.location.href = '/user/orderSuccess';
                } else {
                    showPopupMessage(result.message, 'error');
                }
            } catch (error) {
                showPopupMessage("Something went wrong. Please try again.", "error");
            }
        }
    });
});