document.addEventListener("DOMContentLoaded", function () {

    const removeButtons = document.querySelectorAll('.btn-remove-coupon');
    const applyButtons = document.querySelectorAll('.btn-submit-coupon');

    removeButtons.forEach(button => {
        button.addEventListener('click', () => { removeCoupon(); });
    });

    applyButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const couponId = event.currentTarget.getAttribute('data-id');
            applyCoupon(couponId);
        });
    });

    // =========================================================
    // QUANTITY ADJUSTMENT BUTTONS (REFRESH-FREE WORKFLOW)
    // =========================================================
    document.querySelectorAll(".btn-quantity").forEach((button) => {
        button.addEventListener("click", async function () {
            const productId = this.getAttribute("data-product-id");
            const variationIndex = this.getAttribute("data-variation-index");
            const isIncrement = this.classList.contains("increment-quantity");
            const quantityChange = isIncrement ? 1 : -1;

            const itemRow = this.closest(".cart-item");
            const quantityInput = itemRow ? itemRow.querySelector(".quantity-input") : null;
            const itemTotalElement = itemRow ? itemRow.querySelector(".total-price") : null;
            const decrementButton = itemRow ? itemRow.querySelector(".decrement-quantity") : null;

            try {
                const response = await fetch(`/user/cart/${productId}/${variationIndex}/${quantityChange}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ quantity: quantityChange }),
                });
                const data = await response.json();

                if (data.success) {
                    if (quantityInput && data.newQuantity !== undefined) {
                        quantityInput.value = data.newQuantity;

                        if (decrementButton) {
                            if (parseInt(data.newQuantity) <= 1) {
                                decrementButton.setAttribute("disabled", "true");
                            } else {
                                decrementButton.removeAttribute("disabled");
                            }
                        }
                    }

                    if (itemTotalElement && data.itemTotal !== undefined) {
                        itemTotalElement.innerHTML = `Total: ₹${parseFloat(data.itemTotal).toFixed(2)}`;
                    }

                    updateCartSummaryUI(data);
                    showPopupMessage(data.message || "Cart updated successfully", "success");
                } else {
                    showPopupMessage(data.message || "Operation failed", "error");
                }
            } catch (error) {
                console.error("Request failed:", error);
                showPopupMessage("Something went wrong. Please try again.", "error");
            }
        });
    });

    // =========================================================
    // BULLETPROOF REMOVE ITEM EVENT DELEGATION
    // =========================================================
    document.addEventListener("click", async function (event) {
        // Catch any click on the remove button or anything nested inside it (like the trash icon)
        const removeBtn = event.target.closest(".remove-item, .btn-remove");
        if (!removeBtn) return;

        event.preventDefault();

        const productId = removeBtn.getAttribute("data-product-id");
        const variationIndex = removeBtn.getAttribute("data-variation-index");
        const itemRow = removeBtn.closest(".cart-item");

        const confirmed = await showCustomConfirm(
            "Remove Item?",
            "Are you sure you want to completely remove this product from your shopping cart?",
            "danger"
        );
        if (!confirmed) return;

        try {
            const response = await fetch(`/user/cart/${productId}/${variationIndex}`, { method: "DELETE" });
            const data = await response.json();

            if (data.success) {
                if (itemRow) {
                    // Run slide-out animation transitions
                    itemRow.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
                    itemRow.style.opacity = "0";
                    itemRow.style.transform = "translate3d(-20px, 0, 0)";

                    setTimeout(() => {
                        itemRow.remove();

                        const remainingItems = document.querySelectorAll(".cart-item");
                        if (remainingItems.length === 0) {
                            location.reload(); // Reload cleanly to handle full empty screens
                        } else {
                            // Update financial rows with fresh data payload values
                            updateCartSummaryUI(data);

                            // Scan the screen for any remaining unavailable product items
                            const remainingUnavailable = document.querySelectorAll(".unavailable-item-card");

                            if (remainingUnavailable.length === 0) {
                                // 1. Remove the server-rendered error message banner from the viewport
                                const errorBanner = document.querySelector(".cart-error-banner");
                                if (errorBanner) errorBanner.remove();

                                // 2. Restore checkout controls from disabled status
                                const checkoutBtn = document.querySelector(".btn-checkout");
                                if (checkoutBtn) {
                                    checkoutBtn.removeAttribute("disabled");
                                    checkoutBtn.removeAttribute("title");
                                    checkoutBtn.style.backgroundColor = "";
                                    checkoutBtn.style.cursor = "";
                                    checkoutBtn.innerHTML = `<i class="fas fa-lock"></i> Proceed to Checkout`;

                                    // Bind navigation route path target action click trigger back on
                                    checkoutBtn.onclick = function () {
                                        location.href = '/user/addressInCart';
                                    };
                                }
                            }
                        }
                    }, 300);
                }
                showPopupMessage("Item removed from cart.", "info");
            } else {
                showPopupMessage(data.message || "Failed to remove item", "error");
            }
        } catch (error) {
            console.error("Request failed:", error);
            showPopupMessage("Failed to remove item. Please try again.", "error");
        }
    });

})



// =========================================================
// INTERNALS: CART TOTAL SUMMARY UI NODE REWRITER
// =========================================================
function updateCartSummaryUI(data) {
    const summarySection = document.querySelector(".cart-summary-section");
    if (!summarySection || !data) return;

    if (data.cartSubtotal !== undefined) window.currentCartSubtotal = parseFloat(data.cartSubtotal);

    const itemsCountLabel = summarySection.querySelector(".summary-item:nth-of-type(1) span:nth-of-type(1)");
    const subtotalPriceLabel = summarySection.querySelector(".summary-item:nth-of-type(1) span:nth-of-type(2)");
    const shippingFeeLabel = summarySection.querySelector(".summary-item:nth-of-type(2) span:nth-of-type(2)");
    const taxPriceLabel = summarySection.querySelector(".summary-item:nth-of-type(3) span:nth-of-type(2)");
    const totalAmountLabel = summarySection.querySelector(".summary-item.total span:nth-of-type(2)");

    if (itemsCountLabel && data.cartTotalItems !== undefined) itemsCountLabel.textContent = `Subtotal (${data.cartTotalItems} items)`;
    if (subtotalPriceLabel && data.cartSubtotal !== undefined) subtotalPriceLabel.textContent = `₹${parseFloat(data.cartSubtotal).toFixed(2)}`;
    if (taxPriceLabel && data.tax !== undefined) taxPriceLabel.textContent = `₹${parseFloat(data.tax).toFixed(2)}`;
    if (totalAmountLabel && data.totalAmount !== undefined) totalAmountLabel.textContent = `₹${parseFloat(data.totalAmount).toFixed(2)}`;

    if (shippingFeeLabel && data.shippingFee !== undefined) {
        if (parseFloat(data.shippingFee) === 0) {
            shippingFeeLabel.textContent = "Free";
            shippingFeeLabel.style.color = "var(--success-color)";
        } else {
            shippingFeeLabel.textContent = `₹${parseFloat(data.shippingFee).toFixed(2)}`;
            shippingFeeLabel.style.color = "inherit";
        }
    }

    // Dynamic Coupon and Offer row handling
    let summaryContainer = summarySection.querySelector(".price-summary");
    let totalRow = summarySection.querySelector(".summary-item.total");

    let couponRow = summarySection.querySelector(".coupon-discount-row");
    if (data.couponDiscount > 0) {
        if (!couponRow) {
            couponRow = document.createElement("div");
            couponRow.className = "summary-item coupon-discount-row";
            couponRow.innerHTML = `<span>Coupon Discount</span><span style="color: var(--success-color);">-₹${parseFloat(data.couponDiscount).toFixed(2)}</span>`;
            summaryContainer.insertBefore(couponRow, totalRow);
        } else {
            couponRow.querySelector("span:nth-of-type(2)").textContent = `-₹${parseFloat(data.couponDiscount).toFixed(2)}`;
        }
    } else if (couponRow) {
        couponRow.remove();
    }

    let offerRow = summarySection.querySelector(".offer-discount-row");
    if (data.offerDiscount > 0) {
        if (!offerRow) {
            offerRow = document.createElement("div");
            offerRow.className = "summary-item offer-discount-row";
            offerRow.innerHTML = `<span>Discount For You</span><span style="color: var(--success-color);">-₹${parseFloat(data.offerDiscount).toFixed(2)}</span>`;
            summaryContainer.insertBefore(offerRow, totalRow);
        } else {
            offerRow.querySelector("span:nth-of-type(2)").textContent = `-₹${parseFloat(data.offerDiscount).toFixed(2)}`;
        }
    } else if (offerRow) {
        offerRow.remove();
    }
}

// =========================================================
// COUPONS CONTROL CHANNELS
// =========================================================
async function applyCoupon(couponId) {
    const couponCard = document.querySelector(`.coupon-card button[data-id="${couponId}"]`).closest('.coupon-card');
    const minPurchase = parseFloat(couponCard.querySelector('.coupon-min-purchase').textContent.replace('Min. purchase: ₹', ''));

    const subtotalEl = document.querySelector(".cart-summary-section .summary-item:nth-of-type(1) span:nth-of-type(2)");
    const currentSubtotal = window.currentCartSubtotal || (subtotalEl ? parseFloat(subtotalEl.textContent.replace('₹', '')) : 0);

    if (currentSubtotal < minPurchase) {
        showPopupMessage(`This coupon requires a minimum purchase of ₹${minPurchase}`, "error");
        return;
    }

    const confirmed = await showCustomConfirm(
        'Apply Coupon?',
        `Are you sure you want to apply this coupon?\n\nCode: ${couponCard.querySelector('.coupon-code').textContent}\n${couponCard.querySelector('.coupon-discount').textContent}\n\nYour active checkout deduction records will refresh.`,
        'info'
    );

    if (!confirmed) return;

    try {
        const response = await fetch('/user/cart/apply-coupon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ couponId: couponId })
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
    const confirmed = await showCustomConfirm(
        'Remove Coupon?',
        'Are you sure you want to release the active coupon balance configurations from this transaction?',
        'warning'
    );

    if (!confirmed) return;

    try {
        const response = await fetch('/user/cart/remove-coupon', { method: 'DELETE' });
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
