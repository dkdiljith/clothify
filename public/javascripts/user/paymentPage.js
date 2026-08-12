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
    // URL Parameter Checking (COD Limit Alert)
    // ------------------------------
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("error") === "cod_limit") {
        showPopupMessage(
            "Cash on Delivery is not available for orders above ₹1000",
            "error"
        );
    }

      if (urlParams.get("error") === "payment_limit") {
        showPopupMessage(
            "Cannot Create an order of 25,000 or more,Please reduce your cart total",
            "error"
        );
    }
    // ------------------------------
    // COD Validation
    // ------------------------------
    const codMethod = document.querySelector(
        '.payment-method[data-method="cod"]'
    );
    if (codMethod && totalAmount > 1000) {
        codMethod.classList.add("disabled-method");
        codMethod.style.opacity = "0.5";
        codMethod.style.cursor = "not-allowed";
        const codLimitLabel = codMethod.querySelector(".cod-limit");
        if (codLimitLabel) {
            codLimitLabel.style.display = "block";
        }
        if (paymentMethod === "cod") {
            paymentMethod = "razorpay";
        }
    }
    // ------------------------------
    // Wallet Validation
    // ------------------------------
    const walletMethod = document.querySelector(
        '.payment-method[data-method="wallet"]'
    );
    if (walletMethod) {
        const walletBalance = parseFloat(
            walletMethod.dataset.walletBalance
        );
        const insufficientLabel = walletMethod.querySelector(
            ".insufficient-balance"
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
        `.payment-method[data-method="${paymentMethod}"]`
    );
    if (
        defaultMethod &&
        !defaultMethod.classList.contains("disabled-method")
    ) {
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
            showPopupMessage(
                "Select any payment method",
                "error"
            );
            return;
        }
        const currentUrlParams = new URLSearchParams(
            window.location.search
        );
        const addressId = currentUrlParams.get(
            "selectedAddressId"
        );
        if (!addressId) {
            e.preventDefault();
            showPopupMessage(
                "Address not selected",
                "error"
            );
            return;
        }
        paymentMethodInput.value = paymentMethod;
        addressIdInput.value = addressId;
    });
});