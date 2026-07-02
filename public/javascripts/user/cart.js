document.addEventListener("DOMContentLoaded", function () {

    const removeButtons = document.querySelectorAll('.btn-remove-coupon');
    const applyButtons = document.querySelectorAll('.btn-submit-coupon');

    removeButtons.forEach(button => {
        button.addEventListener('click', () => {
            removeCoupon();
        });
    });

    applyButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const couponId = event.currentTarget.getAttribute('data-id');
            applyCoupon(couponId);
        });
    });


    // Quantity adjustment buttons
    document.querySelectorAll(".btn-quantity").forEach((button) => {
        button.addEventListener("click", async function () {
            const productId = this.getAttribute("data-product-id");
            const variationIndex = this.getAttribute("data-variation-index");
            const isIncrement = this.classList.contains("increment-quantity");

            const quantityChange = isIncrement ? 1 : -1;

            try {
                const response = await fetch(`/user/cart/${productId}/${variationIndex}/${quantityChange}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ quantity: quantityChange }),
                });

                const data = await response.json();

                if (data.success) {
                    location.reload();
                } else {
                    showPopupMessage(data.message || "Operation failed", "error");
                }
            } catch (error) {
                console.error("Request failed:", error);
                showPopupMessage("Something went wrong. Please try again.", "error");
            }
        });
    });

    // Remove item buttons
    document.querySelectorAll(".btn-remove").forEach((button) => {
        button.addEventListener("click", async function () {
            const productId = this.getAttribute("data-product-id");
            const variationIndex = this.getAttribute("data-variation-index");

            try {
                const response = await fetch(`/user/cart/${productId}/${variationIndex}`, {
                    method: "DELETE"
                });

                const data = await response.json();

                if (data.success) {
                    location.reload();
                } else {
                    showPopupMessage(data.message || "Failed to remove item", "error");
                }
            } catch (error) {
                console.error("Request failed:", error);
                showPopupMessage("Failed to remove item. Please try again.", "error");
            }
        });
    });
});

async function applyCoupon(couponId) {
    const couponCard = document.querySelector(`.coupon-card button[data-id="${couponId}"]`).closest('.coupon-card');
    const minPurchase = parseFloat(couponCard.querySelector('.coupon-min-purchase').textContent.replace('Min. purchase: ₹', ''));
    const currentSubtotal = parseFloat('{{subtotal}}');

    if (currentSubtotal < minPurchase) {
        showPopupMessage(`This coupon requires a minimum purchase of ₹${minPurchase}`, "error");
        return;
    }

    const confirmation = await Swal.fire({
        title: 'Apply Coupon?',
        html: `Are you sure you want to apply this coupon?<br><br>
              <strong>${couponCard.querySelector('.coupon-code').textContent}</strong><br>
              ${couponCard.querySelector('.coupon-discount').textContent}<br><br>
              Current discount will be replaced.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, apply it!',
        cancelButtonText: 'Cancel'
    });

    if (!confirmation.isConfirmed) return;

    try {
        const response = await fetch('/user/cart/apply-coupon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                couponId: couponId,
            })
        });

        const data = await response.json();
        if (data.success) {
            location.reload();
        } else {
            showPopupMessage(data.message || 'Failed to apply coupon', 'error');
        }
    } catch (error) {
        console.error('Error applying coupon:', error);
        showPopupMessage('Failed to apply coupon. Please try again.', 'error');
    }
}

async function removeCoupon() {
    const confirmation = await Swal.fire({
        title: 'Remove Coupon?',
        text: 'Are you sure you want to remove the applied coupon?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, remove it!',
        cancelButtonText: 'Cancel'
    });

    if (!confirmation.isConfirmed) return;

    try {
        const response = await fetch('/user/cart/remove-coupon', {
            method: 'DELETE'
        });

        const data = await response.json();
        if (data.success) {
            location.reload();
        } else {
            showPopupMessage(data.message || 'Failed to remove coupon', 'error');
        }
    } catch (error) {
        console.error('Error removing coupon:', error);
        showPopupMessage('Failed to remove coupon. Please try again.', 'error');
    }
}