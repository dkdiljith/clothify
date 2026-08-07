document.addEventListener("DOMContentLoaded", () => {
    /* ==========================================
         ELEMENTS
      ========================================== */
    const retryForm = document.getElementById("retry-payment-form");
    const invoiceBtn = document.getElementById("download-invoice-button");
    const cancelModal = document.getElementById("cancel-order-modal");
    const returnModal = document.getElementById("return-order-modal");
    const successPopup = document.getElementById("success-message");
    let activeItem = null;
    /* ==========================================
         REFUND DETAIS TOGGLE
      ========================================== */
    const refundToggle = document.querySelector(".refund-toggle");
    const refundContent = document.querySelector(".refund-content");
    const refundArrow = document.querySelector(".refund-arrow");
    refundToggle?.addEventListener("click", () => {
        refundContent.classList.toggle("open");
        refundArrow.classList.toggle("rotate");
    });
    /* ==========================================
      RETRY PAYMENT
   ========================================== */
    function cleanUpExpiredButtons() {
        const retryButtons = document.querySelectorAll(".btn-retry-payment");
        const currentTime = Date.now();
        retryButtons.forEach(button => {
            const expiresAtRaw = button.dataset.expiresAt;
            const expiresTime = new Date(expiresAtRaw).getTime();
            const attemptsCount = Number(button.dataset.attemptsCount);
            if (
                !expiresTime ||
                isNaN(expiresTime) ||
                expiresTime < currentTime ||
                attemptsCount >= 6
            ) {
                button.remove();
            } else {
                button.classList.add("is-valid");
            }
        });
    }
    // Initial validation
    cleanUpExpiredButtons();
    // Recheck every 10 seconds
    setInterval(cleanUpExpiredButtons, 10000);
    // Retry Payment Click
    document.addEventListener("click", async function (event) {
        const retryBtn = event.target.closest(".btn-retry-payment");
        if (!retryBtn) return;
        event.preventDefault();
        event.stopPropagation();
        const expiresAtRaw = retryBtn.dataset.expiresAt;
        const expiresTime = new Date(expiresAtRaw).getTime();
        const attemptsCount = Number(retryBtn.dataset.attemptsCount);
        const currentTime = Date.now();
        if (
            !expiresTime ||
            isNaN(expiresTime) ||
            expiresTime < currentTime ||
            attemptsCount >= 6
        ) {
            showPopupMessage("This payment session has expired.", "error");
            retryBtn.remove();
            return;
        }
        const orderId = retryBtn.dataset.orderId;
        if (!orderId) {
            console.error("Order ID not found.");
            return;
        }
        await startRazorpayPayment(orderId);
    });
    /* ==========================================
         DOWNLOAD INVOICE
      ========================================== */
    invoiceBtn?.addEventListener("click", async function () {
        if (this.disabled) return;
        try {
            const response = await fetch("/user/download-invoice", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    orderId: this.dataset.orderId,
                }),
            });
            if (!response.ok) {
                throw new Error();
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "invoice.pdf";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            showPopupMessage("Unable to download invoice.", "error");
        }
    });
    /* ==========================================
         CANCEL ITEM
      ========================================== */
    document.querySelectorAll(".cancel-item-btn").forEach((button) => {
        button.addEventListener("click", function () {
            activeItem = {
                orderId: this.dataset.orderId,
                itemId: this.dataset.itemId,
                variationIndex: this.dataset.variationIndex,
            };
            cancelModal.style.display = "flex";
        });
    });
    document
        .getElementById("submit-cancellation")
        ?.addEventListener("click", async function () {
            const reason = document
                .getElementById("cancellation-reason")
                .value.trim();
            if (!reason) {
                showPopupMessage("Please enter a cancellation reason.", "error");
                return;
            }
            try {
                const response = await fetch("/user/order/cancel-item", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        orderId: activeItem.orderId,
                        itemId: activeItem.itemId,
                        variationIndex: activeItem.variationIndex,
                        reason,
                    }),
                });
                const result = await response.json();
                if (result.success) {
                    showSuccessPopup("Item cancelled successfully.");
                    setTimeout(() => {
                        location.reload();
                    }, 1200);
                } else {
                    showPopupMessage(result.message, "error");
                }
            } catch (err) {
                console.error(err);
                showPopupMessage("Unable to cancel item.", "error");
            }
        });
    /* ==========================================
         RETURN ITEM
      ========================================== */
    document.querySelectorAll(".return-item-btn").forEach((button) => {
        button.addEventListener("click", function () {
            activeItem = {
                orderId: this.dataset.orderId,
                itemId: this.dataset.itemId,
            };
            returnModal.style.display = "flex";
        });
    });
    document
        .getElementById("submit-return")
        ?.addEventListener("click", async function () {
            const reason = document.getElementById("return-reason").value.trim();
            const error = document.getElementById("return-reason-error");
            if (!reason) {
                error.style.display = "block";
                return;
            }
            error.style.display = "none";
            try {
                const response = await fetch("/user/order/return-item", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        orderId: activeItem.orderId,
                        itemId: activeItem.itemId,
                        reason,
                    }),
                });
                const result = await response.json();
                if (result.success) {
                    showSuccessPopup("Return request submitted.");
                    setTimeout(() => {
                        location.reload();
                    }, 1200);
                } else {
                    showPopupMessage(result.message, "error");
                }
            } catch (err) {
                console.error(err);
                showPopupMessage("Unable to submit return request.", "error");
            }
        });
    /* ==========================================
         MODAL HELPERS
      ========================================== */
    document.querySelectorAll(".close-modal").forEach((button) => {
        button.addEventListener("click", closeAllModals);
    });
    document
        .getElementById("cancel-modal-button")
        ?.addEventListener("click", closeAllModals);
    document
        .getElementById("cancel-return-modal-button")
        ?.addEventListener("click", closeAllModals);
    function closeAllModals() {
        cancelModal.style.display = "none";
        returnModal.style.display = "none";
    }
    window.addEventListener("click", function (e) {
        if (e.target === cancelModal) {
            closeAllModals();
        }
        if (e.target === returnModal) {
            closeAllModals();
        }
    });
    /* ==========================================
         SUCCESS POPUP
      ========================================== */
    function showSuccessPopup(message) {
        successPopup.querySelector(".success-text").innerText = message;
        successPopup.style.display = "block";
    }
    document
        .getElementById("close-success-message")
        ?.addEventListener("click", function () {
            successPopup.style.display = "none";
        });
    /* ==========================================
         ESC KEY SUPPORT
      ========================================== */
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            closeAllModals();
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

            const rzp = new Razorpay(options);

            // 4. Handle Explicit Payment Failures
            rzp.on('payment.failed', async function (response) {
                console.log("Payment Failed Event Triggered");

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
})
