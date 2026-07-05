document.addEventListener("DOMContentLoaded", function () {
    // Elements
    const cancelButton = document.getElementById("cancel-order-button");
    const returnButton = document.getElementById("return-order-button");
    const returnAllButton = document.getElementById("returnAll-order-button");
    let activeReturnContext = null;
    let returnAll = false;

    const cancelModal = document.getElementById("cancel-order-modal");
    const returnModal = document.getElementById("return-order-modal");
    const successMessage = document.getElementById("success-message");

    const orderStatus = cancelButton ? cancelButton.dataset.orderStatus : "";
    const completionDate = returnButton ? new Date(returnButton.dataset.completionDate) : null;

    const retryPaymentBtn = document.getElementById("retryPayment");

    if (retryPaymentBtn) {
        retryPaymentBtn.addEventListener("click", function () {
            const orderId = this.dataset.orderId;

            if (orderId) {
                startRazorpayPayment(orderId);
            } else {
                console.error("Order ID is missing from the button attributes.");
            }
        });
    }

    // Cancel Button Logic
    if (cancelButton) {
        if (orderStatus !== "Pending") {
            cancelButton.disabled = true;
        } else {
            cancelButton.addEventListener("click", function () {
                cancelModal.style.display = "flex";
            });
        }
    }

    // Close Cancel Modal
    document.querySelector("#cancel-order-modal .close-modal")?.addEventListener("click", function () {
        cancelModal.style.display = "none";
    });

    document.getElementById("cancel-modal-button")?.addEventListener("click", function () {
        cancelModal.style.display = "none";
    });

    // Submit Cancellation
    // Submit Cancellation
    document.getElementById("submit-cancellation")?.addEventListener("click", async function () {
        const reason = document.getElementById("cancellation-reason").value.trim();

        // 1. Check validation first
        if (!reason) {
            // Hide the reason modal immediately so the alert is completely clean
            if (typeof cancelModal !== 'undefined') cancelModal.style.display = "none";

            await showCustomConfirm("Reason Required", "Please provide a reason for cancellation.", "warning");

            // Re-open it if they need to fix their mistake
            if (typeof cancelModal !== 'undefined') cancelModal.style.display = "flex";
            return;
        }

        const cancelBtn = document.getElementById("cancel-order-button");
        if (!cancelBtn) {
            if (typeof cancelModal !== 'undefined') cancelModal.style.display = "none";
            await showCustomConfirm("System Error", "Error: Cancel button context not found.", "danger");
            return;
        }

        // 2. CLOSE THE REASON MODAL HERE (Before the confirmation await pause!)
        if (typeof cancelModal !== 'undefined') cancelModal.style.display = "none";

        // 3. Now fire the confirmation alert over a clean screen
        const dynamicProceedConfirm = await showCustomConfirm(
            "Confirm Cancellation",
            "Are you absolutely sure you want to request cancellation for this item?\nThis choice cannot be undone.",
            "danger"
        );

        // If they click "Cancel" on your alert, re-open the reason modal so they don't lose their text
        if (!dynamicProceedConfirm) {
            if (typeof cancelModal !== 'undefined') cancelModal.style.display = "flex";
            return;
        }

        // 4. Proceed with Network Fetch safely...
        const data = {
            orderId: cancelBtn.dataset.orderId,
            itemId: cancelBtn.dataset.itemId,
            variationIndex: cancelBtn.dataset.variationIndex,
            reason: reason
        };

        try {
            const response = await fetch("/user/cancel-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                await showCustomConfirm("Request Submitted", "Your cancellation request has been successfully processed.", "success");
            } else {
                const errorData = await response.json();
                await showCustomConfirm("Request Rejected", errorData.message || "Failed to cancel order.", "warning");
            }
        } catch (error) {
            console.error("Error:", error);
            await showCustomConfirm("Network Error", "An unexpected error occurred. Please try again.", "danger");
        }
    });


    // Download Invoice
    document.getElementById("download-invoice-button")?.addEventListener("click", async function () {
        const orderId = this.dataset.orderId;

        if (!orderId) {
            showPopupMessage("Order reference missing", "error");
            return;
        }

        try {
            const response = await fetch("/user/download-invoice", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ orderId: orderId })
            });

            if (!response.ok) {
                showPopupMessage("Invoice generation failed", "error");
                return;
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `invoice-${orderId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            showPopupMessage("Invoice could not be generated", "error");
        }
    });


    //  Return Button Initialization Logic
    if (orderStatus === "Completed" && completionDate && !isNaN(completionDate)) {
        const currentDate = new Date();
        const returnEndDate = new Date(completionDate);
        returnEndDate.setDate(returnEndDate.getDate() + 7);

        if (currentDate > returnEndDate) {
            if (returnButton) returnButton.disabled = true;
            if (returnAllButton) returnAllButton.disabled = true;
        } else {
            returnButton?.addEventListener("click", function () {
                returnAll = false; // FIX: Reset state flag for single items explicitly
                returnModal.style.display = "flex";
            });
            returnAllButton?.addEventListener("click", function () {
                returnAll = true; // Set state flag for full returns
                returnModal.style.display = "flex";
            });
        }
    } else {
        // If item status is already modified, fallback lets user press button or disables gracefully
        returnButton?.addEventListener("click", function () {
            returnAll = false;
            returnModal.style.display = "flex";
        });
        returnAllButton?.addEventListener("click", function () {
            returnAll = true;
            returnModal.style.display = "flex";
        });
    }

    // Close Return Modal
    document.querySelector("#return-order-modal .close-modal")?.addEventListener("click", function () {
        returnAll = false;
        returnModal.style.display = "none";
    });

    document.getElementById("cancel-return-modal-button")?.addEventListener("click", function () {
        returnAll = false;
        returnModal.style.display = "none";
    });


    // Track opening via "Return Item" button
    document.getElementById("return-order-button")?.addEventListener("click", function () {
        activeReturnContext = this.dataset;
    });

    // Track opening via "Return All" button
    document.getElementById("returnAll-order-button")?.addEventListener("click", function () {
        activeReturnContext = this.dataset;
    });

    // Submit Return Listener
    // Submit Return Listener
    document.getElementById("submit-return")?.addEventListener("click", async function () {
        const reason = document.getElementById("return-reason").value.trim();
        const errorElement = document.getElementById("return-reason-error");

        // 1. Local DOM validation error handling (Keeps the modal open)
        if (!reason) {
            if (errorElement) errorElement.style.display = "block";
            return;
        }

        if (errorElement) errorElement.style.display = "none";

        // 2. Validate state variables
        if (!activeReturnContext) {
            // Clear the typing modal out of the way before firing the custom alert
            if (typeof returnModal !== 'undefined') returnModal.style.display = "none";

            await showCustomConfirm(
                "Return Context Missing",
                "We couldn't retrieve the reference for this item.\nPlease reload the page and try again.",
                "danger"
            );
            return;
        }

        // 3. CLOSE THE RETURN TYPING MODAL HERE (Before the confirmation await pause!)
        if (typeof returnModal !== 'undefined') returnModal.style.display = "none";

        // 4. Now display the clear screen custom confirmation prompt safely
        const confirmReturn = await showCustomConfirm(
            "Confirm Return Request",
            "Are you sure you want to initiate a return request for this order?\nOur team will review your reason for approval.",
            "warning"
        );

        // User opted out or canceled the choice -> Re-open the typing modal cleanly
        if (!confirmReturn) {
            if (typeof returnModal !== 'undefined') returnModal.style.display = "flex";
            return;
        }

        // Map your payload cleanly using dataset variables
        const data = {
            orderId: activeReturnContext.orderId,
            itemId: activeReturnContext.itemId,
            returnAll: activeReturnContext.returnAll === "true",
            reason: reason
        };

        try {
            const response = await fetch("/user/return-order", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                // Typing modal was already hidden earlier, show clean success state
                await showCustomConfirm(
                    "Return Initiated",
                    "Your return request has been submitted successfully.\nCheck your email or dashboard updates for status changes.",
                    "success"
                );
            } else {
                const errorData = await response.json();

                // Rejection processing alert
                await showCustomConfirm(
                    "Submission Refused",
                    errorData.message || "Failed to process order return. Please try again.",
                    "warning"
                );

                // Re-open the input window so they don't lose their data on network refusal
                if (typeof returnModal !== 'undefined') returnModal.style.display = "flex";
            }
        } catch (error) {
            console.error("Error:", error);

            // Critical exception alert
            await showCustomConfirm(
                "Network Connection Timeout",
                "An unexpected infrastructure error occurred.\nPlease verify link status and try again.",
                "danger"
            );

            // Re-open the window on hard breakdown drops as a defensive measure
            if (typeof returnModal !== 'undefined') returnModal.style.display = "flex";
        }
    });

    // Close Success Message
    document.getElementById("close-success-message")?.addEventListener("click", function () {
        successMessage.style.display = "none";
        window.location.reload();
    });

    // Close modals when clicking outside
    window.addEventListener("click", function (event) {
        if (event.target === cancelModal) {
            cancelModal.style.display = "none";
        }
        if (event.target === returnModal) {
            returnModal.style.display = "none";
            returnAll = false;
        }
    });

    // Razorpay Specific Logic
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
                },
                modal: {
                    ondismiss: function () {
                        console.log("Checkout form closed by user");
                    },
                    escape: true
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
                            razorpayOrderId: order.id, // Razorpay order ID
                            reason: response.error.description,
                            errorCode: response.error.code,
                            paymentId: response.error.metadata.payment_id,
                            orderId,
                        })
                    });

                    const result = await failureRes.json();

                    if (result.success) {
                        window.location.href = `/user/orderFailure`;
                    } else {

                        const rzpIframe = document.querySelector('.razorpay-container');
                        if (rzpIframe) {
                            rzpIframe.remove();
                        }
                        // Restore page scrolling if Razorpay locked it
                        document.body.style.overflow = 'auto';
                        showPopupMessage("Could not save progress: " + result.message, "error");

                        setTimeout(function () {
                            window.location.reload();
                        }, 3000);

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
});










document.addEventListener("DOMContentLoaded", function () {

    // FUNCTION TO CHECK AND REMOVE EXPIRED BUTTONS
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


    // STEP 1: Run immediately when the page finishes loading
    cleanUpExpiredButtons();

    // Optional: Check every 10 seconds in case a user is sitting idle on the page
    setInterval(cleanUpExpiredButtons, 10000);

    // STEP 2: The Click Event Listener (Your existing working logic)
    document.addEventListener("click", async function (event) {
        const retryBtn = event.target.closest("#retryPayment");
        if (!retryBtn) return;

        event.preventDefault();

        const expiresAtRaw = retryBtn.getAttribute("data-expires-at");
        const expiresTime = new Date(expiresAtRaw).getTime();
        const attemptsCount = Number(retryBtn.getAttribute("data-attempts-count"));
        const currentTime = Date.now();

        // Double-check logic at the exact millisecond of clicking
        if (!expiresTime || isNaN(expiresTime) || expiresTime < currentTime || attemptsCount >= 6) {
            showPopupMessage("This payment session has expired.", "error");
            retryBtn.remove(); // Remove it immediately upon failed click
            return;
        }

        // Proceed to Razorpay if completely valid
        const orderId = retryBtn.getAttribute("data-order-id");
        await startRazorpayPayment(orderId);
    });
});
