document.addEventListener('DOMContentLoaded', function () {

    // =========================================================================
    // 1. DYNAMIC CLEANER LOOP (Removes expired buttons anywhere on the page)
    // =========================================================================
    function cleanUpExpiredButtons() {
        const retryButtons = document.querySelectorAll(".btn-retry-payment");
        const currentTime = Date.now();

        retryButtons.forEach(button => {
            const expiresAtRaw = button.getAttribute("data-expires-at");
            const expiresTime = new Date(expiresAtRaw).getTime();
            const attemptsCount = Number(button.getAttribute("data-attempts-count"));

            // 1. If it fails validation, remove it immediately 
            if (!expiresTime || isNaN(expiresTime) || expiresTime < currentTime || attemptsCount >= 5) {
                button.remove();
            } else {
                // 2. If it is fully valid, show it cleanly without flickering
                button.classList.add("is-valid");
            }
        });
    }


    // Run clean up immediately when page finishes rendering
    cleanUpExpiredButtons();

    // Recheck limits every 10 seconds for idle screen activity
    setInterval(cleanUpExpiredButtons, 10000);


    // =========================================================================
    // 2. GLOBAL EVENT DELEGATION LISTENER (Replaces the broken getElementById)
    // =========================================================================
    document.addEventListener("click", async function (event) {
        // Target the element by its structural CSS class rather than an ID
        const retryBtn = event.target.closest(".btn-retry-payment");
        if (!retryBtn) return; // Exit if the clicked element isn't a retry button

        event.preventDefault();

        const expiresAtRaw = retryBtn.getAttribute("data-expires-at");
        const expiresTime = new Date(expiresAtRaw).getTime();
        const attemptsCount = Number(retryBtn.getAttribute("data-attempts-count"));
        const currentTime = Date.now();

        // Exact millisecond verification checkpoint right when clicked
        if (!expiresTime || isNaN(expiresTime) || expiresTime < currentTime || attemptsCount >= 6) {
            showPopupMessage("This payment session has expired.", "error");
            retryBtn.remove();
            return;
        }

        const orderId = retryBtn.getAttribute("data-order-id");
        if (orderId) {
            await startRazorpayPayment(orderId);
        }
    });


    // =========================================================================
    // 3. RAZORPAY MASTER ROUTINE
    // =========================================================================
    async function startRazorpayPayment(orderId) {
        try {
            // 1. Create the order on your server
            const response = await fetch(`/user/payment/razorpay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId })
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
                                orderId
                            })
                        });

                        const result = await verifyRes.json();
                        if (result.success) {
                            window.location.href = `/user/orderSuccess?orderId=${result.orderId}`;
                        } else {
                            showPopupMessage("Verification failed: " + result.message, "error");
                        }
                    } catch {
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
                },
                modal: {
                    ondismiss: function () {
                    },
                    escape: true
                }
            };

            const rzp = new Razorpay(options);

            // 4. Handle Explicit Payment Failures
            rzp.on('payment.failed', async function (response) {

                try {
                    const failureRes = await fetch('/user/payment/failure', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpayOrderId: order.id,
                            reason: response.error.description,
                            errorCode: response.error.code,
                            paymentId: response.error.metadata.payment_id,
                            orderId,
                        })
                    });

                    const result = await failureRes.json();

                    if (result.success) {
                       window.location.href = `/user/orderFailure?orderId=${result.orderId}`;
                    } else {

                        const rzpIframe = document.querySelector('.razorpay-container');
                        if (rzpIframe) {
                            rzpIframe.remove();
                        }

                        document.body.style.overflow = 'auto';
                        showPopupMessage("Could not save progress: " + result.message, "error");

                        setTimeout(function () {
                            window.location.reload();
                        }, 3000);
                    }

                } catch (err) {
                    showPopupMessage("Connection error: " + err.message, "error");
                }
            });

            // 5. Open the Razorpay Modal
            rzp.open();

        } catch  {
            showPopupMessage("Payment failed to initialize", "error");
        }
    }
});
