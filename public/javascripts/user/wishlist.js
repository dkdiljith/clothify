// =========================================================
// INITIALIZE
// =========================================================

document.addEventListener("DOMContentLoaded", () => {

    initializeWishlist();

});



// =========================================================
// INITIALIZE
// =========================================================

function initializeWishlist() {

    initializeCardNavigation();

    initializeRemoveButtons();

    initializeAddToCartButtons();

}



// =========================================================
// CARD NAVIGATION
// =========================================================

function initializeCardNavigation() {

    const cards = document.querySelectorAll(".wishlist-product-card");

    cards.forEach(card => {

        card.addEventListener("click", () => {

            window.location.href = card.dataset.url;

        });

    });

}



// =========================================================
// REMOVE BUTTONS
// =========================================================

function initializeRemoveButtons() {

    const buttons = document.querySelectorAll(".remove-from-wishlist");

    buttons.forEach(button => {

        button.addEventListener("click", async (event) => {

            event.preventDefault();
            event.stopPropagation();

            const productId = button.dataset.productId;

            await removeFromWishlist(productId);

               showPopupMessage("Product removed from wishlist successfully!", "success");

        });

    });

}



// =========================================================
// ADD TO CART BUTTONS
// =========================================================

function initializeAddToCartButtons() {

    const buttons = document.querySelectorAll(".wishlist-add-cart");

    buttons.forEach(button => {

        button.addEventListener("click", async (event) => {

            event.preventDefault();
            event.stopPropagation();

            const productId = button.dataset.productId;

            await addToCart(
                productId,
            );

               showPopupMessage("Product added to cart successfully!", "success");

        });

    });

}



// =========================================================
// REMOVE FROM WISHLIST
// =========================================================

async function removeFromWishlist(productId) {

    try {

        const response = await fetch(

            `/user/removeFromWishlist/${productId}`,

            {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json"
                }
            }

        );

        const data = await response.json();

        if (!data.success) return;

        const card = document.querySelector(

            `.wishlist-product-card[data-product-id="${productId}"]`

        );

        if (card) {

            card.remove();

        }

        updateWishlistCount();

    }

    catch (error) {

        console.error(error);

        showPopupMessage(
            "Something went wrong.",
            "error"
        );

    }

}


// =========================================================
// ADD TO CART FROM WISHLIST
// =========================================================

async function addToCart(productId) {

    try {

        const response = await fetch(

            `/user/cart/wishlist/${productId}`,

            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            }

        );

        const data = await response.json();


        if (!data.success) return;

        if (data.cartCount) {

            updateCartCount(data.cartCount);

        }

        await removeFromWishlist(productId);

    }

    catch (error) {

        console.error("Wishlist Add To Cart Error:", error);

        showPopupMessage(
            "Something went wrong.",
            "error"
        );

    }

}



// =========================================================
// UPDATE WISHLIST COUNT
// =========================================================

function updateWishlistCount() {

    const cards = document.querySelectorAll(".wishlist-product-card");

    const countElement = document.querySelector(".wishlist-count");

    if (countElement) {

        countElement.textContent = `${cards.length} items`;

    }

    if (cards.length !== 0) return;

}



// =========================================================
// UPDATE CART COUNT
// =========================================================

function updateCartCount(count) {

    const cartCount = document.getElementById("cart-count");

    if (!cartCount) return;

    cartCount.textContent = count;

    cartCount.style.transform = "scale(1.3)";

    setTimeout(() => {

        cartCount.style.transform = "scale(1)";

    }, 250);

}