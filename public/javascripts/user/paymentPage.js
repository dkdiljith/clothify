
document.addEventListener("DOMContentLoaded", () => {
    const paymentForm = document.getElementById("payment-form");
    const paymentMethods = document.querySelectorAll(".payment-method");
    const placeOrderBtn = document.getElementById("placeOrderBtn");
    // Hidden inputs
    const paymentMethodInput = document.getElementById("paymentMethodInput");
    const addressIdInput = document.getElementById("addressIdInput");
    // Get Total Amount
    const totalAmountText = document.getElementById("amount").innerText;
    const totalAmount = parseFloat(totalAmountText.replace(/[^\d.]/g, ""));
    // Default payment method
    let paymentMethod = "razorpay";
    // ------------------------------
    // Wallet Validation
    // ------------------------------
    const walletMethod = document.querySelector(
        '.payment-method[data-method="wallet"]',
    );
    if (walletMethod) {
        const walletBalance = parseFloat(walletMethod.dataset.walletBalance);
        const insufficientLabel = walletMethod.querySelector(
            ".insufficient-balance",
        );
        if (walletBalance < totalAmount) {
            walletMethod.classList.add("disabled-method");
            walletMethod.style.opacity = "0.5";
            walletMethod.style.cursor = "not-allowed";
            if (insufficientLabel) {
                insufficientLabel.style.display = "block";
            }
            if (paymentMethod === "wallet") {
                paymentMethod = "razorpay";
            }
        }
    }
    // ------------------------------
    // Default Selection
    // ------------------------------
    const defaultMethod = document.querySelector(
        `.payment-method[data-method="${paymentMethod}"]`,
    );
    if (defaultMethod && !defaultMethod.classList.contains("disabled-method")) {
        defaultMethod.classList.add("selected");
        placeOrderBtn.disabled = false;
        placeOrderBtn.style.cursor = "pointer";
    }
    // ------------------------------
    // Payment Method Selection
    // ------------------------------
    paymentMethods.forEach((method) => {
        method.addEventListener("click", () => {
            if (method.classList.contains("disabled-method")) {
                return;
            }
            paymentMethods.forEach((item) => {
                item.classList.remove("selected");
            });
            method.classList.add("selected");
            paymentMethod = method.dataset.method;
            placeOrderBtn.disabled = false;
            placeOrderBtn.style.cursor = "pointer";
        });
    });
    // ------------------------------
    // Form Submission
    // ------------------------------
    paymentForm.addEventListener("submit", (e) => {
        if (!paymentMethod) {
            e.preventDefault();
            showPopupMessage("Select any payment method", "error");
            return;
        }
        const urlParams = new URLSearchParams(window.location.search);
        const addressId = urlParams.get("selectedAddressId");
        if (!addressId) {
            e.preventDefault();
            showPopupMessage("Address not selected", "error");
            return;
        }
        // Set hidden inputs
        paymentMethodInput.value = paymentMethod;
        addressIdInput.value = addressId;
    });
});
