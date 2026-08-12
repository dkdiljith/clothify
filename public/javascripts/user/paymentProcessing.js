document.addEventListener("DOMContentLoaded", () => {
    const paymentMethod = document.getElementById("paymentMethod").value;
    const addressId = document.getElementById("addressId").value;
    const userName = document.getElementById("userName").value;
    const userEmail = document.getElementById("userEmail").value;
    const userPhone = document.getElementById("userPhone").value;
    switch (paymentMethod) {
        case "cod":
            processCOD(addressId);
            break;
        case "wallet":
            processWallet(addressId);
            break;
        case "razorpay":
            processRazorpay(addressId, userName, userEmail, userPhone);
            break;
        default:
            showPopupMessage("Invalid payment method", "error");
            break;
    }
});
async function processRazorpay(addressId, userName, userEmail, userPhone) {
    await startRazorpayPayment(addressId, userName, userEmail, userPhone);
}
// Razorpay Payment
async function startRazorpayPayment(addressId, userName, userEmail, userPhone) {
    try {
        const response = await fetch("/user/payment/razorpay", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                addressId,
            }),
        });
        const order = await response.json();
        if (!order.success) {
            showPopupMessage(order.message || "Failed to initiate Razorpay", "error");
            return;
        }
        const options = {
            key: "rzp_test_TVFPFUZdUa9wz4",
            amount: order.amount,
            currency: "INR",
            name: "Clothify",
            description: "Order Payment",
            order_id: order.id,
            handler: async function (response) {
                try {
                    const verifyRes = await fetch("/user/payment/verify", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            addressId,
                        }),
                    });
                    const result = await verifyRes.json();
                    if (result.success) {
                        window.location.href = `/user/orderSuccess?orderId=${result.orderId}`;
                    } else {
                        showPopupMessage("Verification failed: " + result.message, "error");
                    }
                } catch  {
                    showPopupMessage("Something went wrong during verification", "error");
                }
            },
            prefill: {
                name: userName,
                email: userEmail,
                contact: userPhone,
            },
            theme: {
                color: "#3399cc",
            },
        };
        const rzp = new Razorpay(options);
        rzp.on("payment.failed", async function (response) {
            try {
                const failureRes = await fetch("/user/payment/failure", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        addressId,
                        razorpayOrderId: order.id,
                        reason: response.error.description,
                        errorCode: response.error.code,
                        paymentId: response.error.metadata.payment_id,
                    }),
                });
                const result = await failureRes.json();
                if (result.success) {
                    window.location.href = `/user/orderFailure?orderId=${result.orderId}`;
                } else {
                    showPopupMessage(
                        "Could not save progress: " + result.message,
                        "error",
                    );
                }
            } catch (err) {
                showPopupMessage("Connection error: " + err.message, "error");
            }
        });
        rzp.open();
    } catch {
        showPopupMessage("Payment failed to initialize", "error");
    }
}
// Wallet Payment
async function processWallet(addressId) {
    try {
        const response = await fetch("/user/placeorder", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                paymentMethod: "wallet",
                addressId,
            }),
        });
        const result = await response.json();
        if (result.success) {
            window.location.href = `/user/orderSuccess?orderId=${result.orderId}`;
        } else {
            showPopupMessage(result.message, "error");
        }
    } catch {
        showPopupMessage("Something went wrong. Please try again.", "error");
    }
}
// COD Payment
async function processCOD(addressId) {
    try {
        const response = await fetch("/user/placeorder", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                paymentMethod: "cod",
                addressId,
            }),
        });
        const result = await response.json();
        if (result.success) {
            window.location.href = `/user/orderSuccess?orderId=${result.orderId}`;
        } else {
            showPopupMessage(result.message, "error");
        }
    } catch {
        showPopupMessage("Something went wrong. Please try again.", "error");
    }
}
