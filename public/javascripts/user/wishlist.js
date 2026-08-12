document.addEventListener("DOMContentLoaded", () => {
    /* ==========================================================
         REMOVE FROM WISHLIST
      ========================================================== */
    document.querySelectorAll(".remove-from-wishlist").forEach((button) => {
        button.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const productId = button.dataset.productId;
            try {
                const response = await fetch(`/user/removeFromWishlist/${productId}`, {
                    method: "DELETE",
                });
                const data = await response.json();
                if (!data.success) {
                    return showPopupMessage(data.message, "error");
                }
                const card = button.closest(".wishlist-product-wrapper");
                if (card) {
                    card.style.transition = "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)";
                    card.style.opacity = "0";
                    card.style.transform = "scale(0.95)";
                    setTimeout(() => {
                        card.remove();
                        const remainingCards = document.querySelectorAll(
                            ".wishlist-product-wrapper",
                        );
                        // Update page count
                        const countElement = document.querySelector(".wishlist-count");
                        if (countElement) {
                            countElement.textContent = `${remainingCards.length} ${remainingCards.length === 1 ? "item" : "items"}`;
                        }
                        // Render empty wishlist if no items remain
                        if (remainingCards.length === 0) {
                            const wishlistContent =
                                document.querySelector(".wishlist-content");
                            if (wishlistContent) {
                                wishlistContent.innerHTML = `
                    <div class="empty-wishlist">
                        <div class="empty-wishlist-icon">
                            <i class="far fa-heart"></i>
                        </div>
                        <h3 class="empty-wishlist-title">
                            Your Wishlist is Empty
                        </h3>
                        <p class="empty-wishlist-text">
                            You haven't added any products to your wishlist yet.
                            Start shopping and save your favourites.
                        </p>
                        <a href="/user/products" class="btn-shop">
                            <i class="fas fa-arrow-left"></i>
                            Continue Shopping
                        </a>
                    </div>
                `;
                            }
                        }
                    }, 250);
                }
                ClothifyCounterManager.update("wishlist", "decrement");
                showPopupMessage(data.message, "info");
            } catch {
                showPopupMessage("Something went wrong. Please try again.", "error");
            }
        });
    });
    /* ==========================================================
         ADD TO CART FROM WISHLIST
      ========================================================== */
    document.querySelectorAll(".wishlist-add-cart").forEach((button) => {
        button.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const productId = button.dataset.productId;
            const card = button.closest(".wishlist-product-wrapper");
            try {
                const response = await fetch(`/user/cart/wishlist/${productId}`, {
                    method: "POST",
                });
                const data = await response.json();
                // ACCEPTANCE GATE: Runs for both brand new additions and existing adjustments
                if (data.success || data.info) {
                    // 1. Remove the item card from the wishlist view grid with a smooth fade
                    if (card) {
                        card.style.transition = "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)";
                        card.style.opacity = "0";
                        card.style.transform = "scale(0.95)";
                        setTimeout(() => {
                            card.remove();
                            // Check if the wishlist grid is completely empty now
                            const remainingCards = document.querySelectorAll(
                                ".wishlist-product-wrapper",
                            );
                            // Update text layout if available
                            const countElement = document.querySelector(".wishlist-count");
                            if (countElement) {
                                countElement.textContent = `${remainingCards.length} ${remainingCards.length === 1 ? "item" : "items"}`;
                            }
                            // If wishlist drops to empty, render the empty-state layout block
                            if (remainingCards.length === 0) {
                                const wishlistContent =
                                    document.querySelector(".wishlist-content");
                                if (wishlistContent) {
                                    wishlistContent.innerHTML = `
                                    <div class="empty-wishlist">
                                        <div class="empty-wishlist-icon"><i class="far fa-heart"></i></div>
                                        <h3 class="empty-wishlist-title">Your Wishlist is Empty</h3>
                                        <p class="empty-wishlist-text">You haven't added any products to your wishlist yet.</p>
                                        <a href="/user/home" class="btn-shop"><i class="fas fa-arrow-left"></i> Continue Shopping</a>
                                    </div>`;
                                }
                            }
                        }, 250);
                    }
                    if (data.success) {
                        ClothifyCounterManager.update("cart", "increment");
                    }
                    ClothifyCounterManager.update("wishlist", "decrement");
                    if (data.info) {
                        showPopupMessage(data.message || "Moved to shopping bag.", "info");
                    } else {
                        showPopupMessage(
                            data.message || "Moved to shopping bag.",
                            "success",
                        );
                    }
                } else {
                    showPopupMessage(data.message || "Action restricted", "error");
                }
            } catch {
                showPopupMessage("Something went wrong. Please try again.", "error");
            }
        });
    });
});
