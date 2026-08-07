document.addEventListener('DOMContentLoaded', () => {
    /* ==========================================================
       PRODUCT CARD NAVIGATION
    ========================================================== */
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Ignore clicks coming from interactive elements
            if (
                e.target.closest('.wishlist-btn') ||
                e.target.closest('button') ||
                e.target.closest('a')
            ) {
                return;
            }
            const url = card.dataset.url;
            if (url) {
                window.location.href = url;
            }
        });
    });
    /* ==========================================================
       HELPER : SEND WISHLIST REQUEST
    ========================================================== */
    async function sendWishlistRequest(url, method) {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return response.json();
    }
    /* ==========================================================
       HELPER : UPDATE WISHLIST BUTTON
    ========================================================== */
    function setWishlistButtonState(button, isActive) {
        button.classList.toggle('active', isActive);
    }
    /* ==========================================================
       WISHLIST BUTTONS
    ========================================================== */
    document.querySelectorAll('.wishlist-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            /* ==================================================
               PREVENT MULTIPLE CLICKS
            ================================================== */
            if (button.disabled) return;
            button.disabled = true;
            const productId =
                button.dataset.productId;
            const variationIndex =
                button.dataset.variationIndex || 0;
            const wasWishlisted =
                button.classList.contains('active');
            // Optimistic UI
            setWishlistButtonState(
                button,
                !wasWishlisted
            );
            try {
                let data;
                                /* ==============================================
                   REMOVE FROM WISHLIST
                ============================================== */
                if (wasWishlisted) {
                    data = await sendWishlistRequest(
                        `/user/removeFromWishlist/${productId}`,
                        'DELETE'
                    );
                }
                /* ==============================================
                   ADD TO WISHLIST
                ============================================== */
                else {
                    data = await sendWishlistRequest(
                        `/user/addtowishlist/${productId}/${variationIndex}`,
                        'POST'
                    );
                }
                /* ==============================================
                   REQUEST FAILED
                ============================================== */
                if (!data.success) {
                    // Rollback optimistic UI
                    setWishlistButtonState(
                        button,
                        wasWishlisted
                    );
                    showPopupMessage(
                        data.message || 'Something went wrong.',
                        'error'
                    );
                    return;
                }
                /* ==============================================
                   UPDATE HEADER COUNTER
                ============================================== */
                if (wasWishlisted) {
                    ClothifyCounterManager.update(
                        'wishlist',
                        'decrement'
                    );
                }
                else {
                    ClothifyCounterManager.update(
                        'wishlist',
                        'increment'
                    );
                }
                /* ==============================================
                   SUCCESS POPUP
                ============================================== */
                showPopupMessage(
                    data.message,
                    'success'
                );
            }
            /* ==================================================
               REQUEST ERROR
            ================================================== */
            catch (error) {
                console.error(
                    'Wishlist Error:',
                    error
                );
                // Restore previous UI state
                setWishlistButtonState(
                    button,
                    wasWishlisted
                );
                showPopupMessage(
                    'Something went wrong. Please try again.',
                    'error'
                );
            }
            /* ==================================================
               ALWAYS RE-ENABLE BUTTON
            ================================================== */
            finally {
                button.disabled = false;
            }
        });
    });
    });