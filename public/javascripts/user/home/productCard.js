document.addEventListener('DOMContentLoaded', () => {

    /* =========================================
       CARD CLICK NAVIGATION
    ========================================= */

    document.querySelectorAll('.product-card').forEach(card => {

        card.addEventListener('click', (e) => {

            // prevent redirect on wishlist click
            if (e.target.closest('.wishlist-btn')) return;

            const url = card.dataset.url;

            if (url) {
                window.location.assign(url);
            }

        });

    });



    /* =========================================
       WISHLIST TOGGLE
    ========================================= */

    document.querySelectorAll('.wishlist-btn').forEach(button => {

        button.addEventListener('click', async (e) => {

            e.preventDefault();

            const productId =
                button.dataset.productId;

            const variationIndex =
                button.dataset.variationIndex || 0;

            const isCurrentlyActive =
                button.classList.contains('active');


            // optimistic UI
            button.classList.toggle('active');


            try {

                let response;


                /* =========================
                   REMOVE FROM WISHLIST
                ========================= */

                if (isCurrentlyActive) {

                    response = await fetch(
                        `/user/removeFromWishlist/${productId}`,
                        {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                }


                /* =========================
                   ADD TO WISHLIST
                ========================= */

                else {

                    response = await fetch(
                        `/user/addtowishlist/${productId}/${variationIndex}`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                }


                const data = await response.json();


                /* =========================
                   REQUEST FAILED
                ========================= */

                if (!data.success) {

                    // rollback UI
                    button.classList.toggle('active');

                    showPopupMessage(
                        data.message || 'Something went wrong',
                        'error'
                    );

                    return;

                }


                /* =========================
                   SUCCESS POPUP
                ========================= */

                // showPopupMessage(
                //     data.message,
                //     'success'
                // );


                /* =========================
                   UPDATE HEADER BADGE
                ========================= */

                if (
                    typeof updateWishlistIcon ===
                    'function'
                ) {

                    updateWishlistIcon();

                }


                /* =========================
                   WISHLIST PAGE REMOVE
                ========================= */

                const wishlistPage =
                    document.querySelector(
                        '.wishlist-page'
                    );


                if (
                    wishlistPage &&
                    isCurrentlyActive
                ) {

                    const card =
                        button.closest(
                            '.wishlist-product-wrapper'
                        );


                    if (card) {

                        card.style.transition =
                            'all 0.25s ease';

                        card.style.opacity = '0';

                        card.style.transform =
                            'scale(0.95)';


                        setTimeout(() => {

                            card.remove();


                            const remainingCards =
                                document.querySelectorAll(
                                    '.wishlist-product-wrapper'
                                );


                            const countElement =
                                document.querySelector(
                                    '.wishlist-count'
                                );


                            if (countElement) {

                                countElement.textContent =
                                    `${remainingCards.length} items`;

                            }


                            /* =========================
                               EMPTY WISHLIST
                            ========================= */

                            if (
                                remainingCards.length === 0
                            ) {

                                const wishlistContent =
                                    document.querySelector(
                                        '.wishlist-content'
                                    );


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
                                            </p>

                                            <a href="/user/home" class="btn-shop">
                                                <i class="fas fa-arrow-left"></i>
                                                Continue Shopping
                                            </a>

                                        </div>
                                    `;

                                }

                            }

                        }, 220);

                    }

                }

            }

            catch (error) {

                console.error(
                    'Wishlist Error:',
                    error
                );

                // rollback UI
                button.classList.toggle('active');

                showPopupMessage(
                    'Something went wrong. Please try again.',
                    'error'
                );

            }

        });

    });

});