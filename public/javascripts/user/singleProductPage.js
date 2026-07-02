document.addEventListener("DOMContentLoaded", function () {

    // Global variables
    let selectedSize = null;
    let selectedQuantity = 1;
    let currentImageIndex = 0;

    // Frequently used DOM elements (global)
    const quantityInput = document.getElementById('quantity');
    const addToWishlistButtons = document.querySelectorAll('.add-to-wishlist');
    const addToCartButton = document.querySelector('.btn-add-to-cart');
    const buyNowButton = document.getElementById('buy-now-btn');
    const selectedPriceEl = document.getElementById('selected-price');
    const originalPriceEl = document.getElementById('original-price');
    const selectedStockEl = document.getElementById('selected-stock');
    const cartCountEl = document.getElementById("cart-count");

    const galleryContainer = document.querySelector('.thumbnail-gallery');
    const mainImg = document.getElementById("main-image");

    const sizeContainer = document.querySelector('.size-options');
    const quantityControl = document.querySelector('.quantity-control');
    const tabsHeader = document.querySelector('.tabs-header');

    const firstSizeOption = document.querySelector('.size-option');

    magnify("main-image", 2);
    if (firstSizeOption) {
        updatePriceAndStock(firstSizeOption);
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    galleryContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('thumbnail')) {
            const clickedThumbnail = event.target;

            const path = clickedThumbnail.getAttribute('src');

            changeMainImage(path, clickedThumbnail);
        }
    });




    sizeContainer.addEventListener('click', (event) => {
        const clickedOption = event.target.closest('.size-option');

        if (clickedOption && !clickedOption.classList.contains('disabled')) {
            updatePriceAndStock(clickedOption);
        }
    });


    quantityControl.addEventListener('click', (event) => {
        const button = event.target.closest('.quantity-btn');

        if (button) {
            const step = parseInt(button.dataset.step, 10);

            adjustQuantity(step);
        }
    });


    tabsHeader.addEventListener('click', (event) => {
        const clickedBtn = event.target.closest('.tab-btn');

        if (clickedBtn) {
            const tabName = clickedBtn.dataset.tab;

            openTab(event, tabName);
        }
    });


    if (addToCartButton) {
        addToCartButton.addEventListener('click', addToCart);
    }

    if (buyNowButton) {
        buyNowButton.addEventListener('click', () => {
            addToCart();

            setTimeout(() => {
                window.location.href = '/user/cart';
            }, 300);
        });
    }

    addToWishlistButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const productId = event.currentTarget.getAttribute('data-product-id');
            const variationIndex = event.currentTarget.getAttribute('data-variation-index');
            addToWishlist(productId, variationIndex);
        });
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Reusable helper function to fetch product-related data
    function getCartDataFromElement(element) {
        return {
            productId: element.getAttribute('data-product-id'),
            productDetailsId: element.getAttribute('data-details-id'),
            price: element.getAttribute('data-price'),

            stock: element.getAttribute('data-quantity'),
        };
    }


    // Update Price and Stock when a size option is clicked
    function updatePriceAndStock(element) {
        document.querySelectorAll('.size-option').forEach(option => {
            option.classList.remove('active');
        });
        element.classList.add('active');

        // 2. DATA EXTRACTION
        const productId = element.getAttribute('data-product-id');
        const detailsId = element.getAttribute('data-details-id');
        const size = element.getAttribute('data-size');
        const price = parseFloat(element.getAttribute('data-price'));
        const offerPrice = parseFloat(element.getAttribute('data-offer-price'));
        const stock = parseInt(element.getAttribute('data-quantity'));

        // 3. VARIATION INDEX CALCULATION (Restoring Old Feature)
        const sizeOptions = document.querySelectorAll('.size-option');
        let variationIndex = -1;
        sizeOptions.forEach((option, index) => {
            if (option === element) variationIndex = index;
        });

        // 4. PRICE UPDATE LOGIC
        const selectedPriceEl = document.getElementById('selected-price');
        const originalPriceEl = document.getElementById('original-price');
        const discountEl = document.getElementById('discount-val');

        if (offerPrice && offerPrice < price) {
            selectedPriceEl.textContent = `₹${offerPrice}`;
            originalPriceEl.textContent = `₹${price}`;
            originalPriceEl.style.display = 'inline';

            const discountPercent = Math.round(((price - offerPrice) / price) * 100);
            discountEl.textContent = `${discountPercent}% OFF`;
            discountEl.style.display = 'inline';
        } else {
            selectedPriceEl.textContent = `₹${price}`;
            originalPriceEl.style.display = 'none';
            discountEl.style.display = 'none';
        }

        // 5. STOCK & QUANTITY LOGIC
        const stockInfo = document.getElementById('stock-info');
        const quantityContainer = document.querySelector('.quantity-control');
        const quantityInputEl = document.getElementById('quantity');

        if (stock <= 0) {
            stockInfo.innerHTML = `<span class="stock-status stock-out">This product is currently unavailable</span>`;
            quantityContainer.style.opacity = "0.5";
            quantityContainer.style.pointerEvents = "none";
            quantityInputEl.disabled = true;
        } else {
            quantityContainer.style.opacity = "1";
            quantityContainer.style.pointerEvents = "auto";
            quantityInputEl.disabled = false;

            if (stock < 5) {
                stockInfo.innerHTML = `<span class="stock-status stock-low">⚠️ Only ${stock} units left! Hurry up!</span>`;
            } else {
                stockInfo.innerHTML = `<span class="stock-status stock-in">In Stock</span>`;
            }
        }

        // 6. UPDATE ADD TO CART DATA (Preserving data for addToCart function)
        const addToCartBtn = document.querySelector('.btn-add-to-cart');
        const buyNowBtn = document.querySelector('.btn-buy-now');
        const isOut = stock <= 0;

        // Enable/Disable buttons based on stock
        addToCartBtn.disabled = isOut;
        buyNowBtn.disabled = isOut;

        // Sync data to the main button variable (addToCartButton)
        addToCartBtn.setAttribute('data-product-id', productId);
        addToCartBtn.setAttribute('data-details-id', detailsId);
        addToCartBtn.setAttribute('data-price', offerPrice || price);
        addToCartBtn.setAttribute('data-variation-index', variationIndex);

        // Update global state variables if your script uses them
        if (typeof selectedSize !== 'undefined') selectedSize = size;
        if (typeof quantityInput !== 'undefined') quantityInput.value = 1;

        console.log('Size Selected. Index:', variationIndex, 'Stock:', stock);
    }





    // Adjust quantity
    function adjustQuantity(change) {
        let newQuantity = parseInt(quantityInput.value) + change;
        if (newQuantity < 1) newQuantity = 1;
        if (newQuantity > 10) newQuantity = 10;

        quantityInput.value = newQuantity;
        selectedQuantity = newQuantity;
    }

    // Add to Cart function
    async function addToCart() {
        // Get all data from the Add to Cart button
        const productId = addToCartButton.getAttribute('data-product-id');
        const detailsId = addToCartButton.getAttribute('data-details-id');
        const variationIndex = addToCartButton.getAttribute('data-variation-index');
        const quantity = quantityInput.value;

        console.log('Attempting to add to cart with:', {
            productId,
            detailsId,
            variationIndex,
            quantity
        });

        if (!productId || !variationIndex) {
            showValidationError();
            showPopupMessage('Please select a size first', 'error');
            return;
        }

        try {
            const response = await fetch(`/user/cart/${productId}/${variationIndex}/${quantity}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            });

            const data = await response.json();
            showPopupMessage(data.message, data.success ? "success" : "error");

            if (data.cartCount) {
                updateCartCount(data.cartCount);
            }
        } catch (error) {
            console.error("Error adding to cart:", error);
            showPopupMessage("Login First :)", "error");
        }
    }
    //Add to wishlist
    async function addToWishlist(productId, variationIndex) {
        try {
            const response = await fetch(`/user/addtowishlist/${productId}/${variationIndex}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            });
            const data = await response.json();

            showPopupMessage(data.message, data.success ? "success" : "error");

            if (data.success) {
                const addButton = document.querySelector(`.add-to-wishlist[data-product-id="${productId}"]`);
                const addedButton = document.querySelector(`.added-to-wishlist[data-product-id="${productId}"]`);

                if (addButton && addedButton) {
                    addButton.style.display = "none";
                    addedButton.style.display = "inline-flex";
                }
            }
        } catch (error) {
            console.error("Error adding to wishlist:", error);
            showPopupMessage("Login First :)", "error");
        }
    }

    // Update cart count
    function updateCartCount(count) {
        if (cartCountEl) {
            cartCountEl.textContent = count;
            cartCountEl.style.transform = "scale(1.5)";
            setTimeout(() => {
                cartCountEl.style.transform = "scale(1)";
            }, 300);
        }
    }

    // Validation effect on size options
    function showValidationError() {
        const sizeOptions = document.querySelectorAll('.size-option');
        sizeOptions.forEach(option => option.classList.add('validation-error'));
        setTimeout(() => {
            sizeOptions.forEach(option => option.classList.remove('validation-error'));
        }, 1000);
    }

    // Change main image
    function changeMainImage(newSrc, thumbnail) {
        mainImg.src = newSrc;

        document.querySelectorAll('.thumbnail').forEach(thumb => {
            thumb.classList.remove('active');
        });
        thumbnail.classList.add('active');

        const magnifierGlass = document.querySelector(".magnifier");
        if (magnifierGlass) {
            magnifierGlass.style.backgroundImage = `url('${newSrc}')`;
        }
    }

    // Tab switching
    function openTab(evt, tabName) {
        document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
        document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));

        document.getElementById(tabName).classList.add("active");
        evt.currentTarget.classList.add("active");
    }

    // Magnify zoom effect
    function magnify(imgID, zoom) {
        const img = document.getElementById(imgID);
        const magnifierGlass = document.querySelector(".magnifier");

        magnifierGlass.style.backgroundImage = `url('${img.src}')`;
        magnifierGlass.style.backgroundRepeat = "no-repeat";
        magnifierGlass.style.backgroundSize = `${img.offsetWidth * zoom}px ${img.offsetHeight * zoom}px`;

        img.addEventListener("mousemove", moveMagnifier);
        img.addEventListener("mouseenter", () => magnifierGlass.style.display = "block");
        img.addEventListener("mouseleave", () => magnifierGlass.style.display = "none");

        function moveMagnifier(e) {
            e.preventDefault();
            const pos = getCursorPos(e);
            let x = pos.x;
            let y = pos.y;
            const w = magnifierGlass.offsetWidth / 2;
            const h = magnifierGlass.offsetHeight / 2;

            if (x > img.offsetWidth - (w / zoom)) x = img.offsetWidth - (w / zoom);
            if (x < w / zoom) x = w / zoom;
            if (y > img.offsetHeight - (h / zoom)) y = img.offsetHeight - (h / zoom);
            if (y < h / zoom) y = h / zoom;

            magnifierGlass.style.left = `${x - w}px`;
            magnifierGlass.style.top = `${y - h}px`;
            magnifierGlass.style.backgroundPosition = `-${(x * zoom) - w}px -${(y * zoom) - h}px`;
        }

        function getCursorPos(e) {
            const rect = img.getBoundingClientRect();
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
    }

});
