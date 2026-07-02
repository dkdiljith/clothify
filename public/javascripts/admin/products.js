let filterOffers;

document.addEventListener("DOMContentLoaded", () => {
    const mainOverlay = document.getElementById("mainOverlay");
    const closeFormBtn = document.getElementById("closeFormBtn");
    const mainForm = document.getElementById("mainForm");
    const offerListContainer = document.getElementById("offerListContainer");
    const selectedOfferIdInput = document.getElementById("selectedOfferIdInput");
    const selectedProductIdInput = document.getElementById("selectedProductIdInput");
    const modalTitle = document.getElementById("formModalTitle");
    const offerSearchInput = document.getElementById("offerSearch");
    const autoPricingBtn = document.getElementById("autoPricingBtn");

    let availableOffers = [];
    let selectedOfferId = null;
    let selectedProductId = null;


    function resetModal() {
        selectedOfferId = null;
        selectedProductId = null;

        selectedOfferIdInput.value = "";
        selectedProductIdInput.value = "";

        offerSearchInput.value = "";
        offerListContainer.innerHTML = "";
    }

    function closeModal() {
        mainOverlay.classList.remove("active");
        resetModal();
    }

    //block product handle
    document.body.addEventListener('click', (event) => {
        const button = event.target.closest('.block-toggle-btn');

        if (button) {
            const userId = button.dataset.userId;
            handleBlock(userId);
        }
    });


    async function handleBlock(productId) {
        const response = await fetch(`/admin/blockProduct/${productId}`);
        const data = await response.json();

        if (data.success) {
            window.location.reload();
        } else {
            showPopupMessage(data.message, `error`)
        }
    }

    async function openModal(productId) {
        try {
            resetModal();

            // 1. Target the Title using your real HTML ID
            const formModalTitle = document.getElementById("formModalTitle");
            if (formModalTitle) formModalTitle.textContent = "Loading...";

            mainOverlay.classList.add("active");

            const response = await fetch("/admin/products/apply-offer/" + productId);

            if (!response.ok) {
                throw new Error("Product not find or Product maybe blocked");
            }

            const data = await response.json();

            if (!data.product) {
                throw new Error("Product not found.");
            }

            selectedProductId = data.product._id;
            selectedProductIdInput.value = data.product._id;

            availableOffers = data.offers || [];

            // 2. Set your custom title header safely
            if (formModalTitle) {
                formModalTitle.textContent = 'Apply Offer for "' + data.product.name + '"';
            }

            displayOffers(availableOffers);

        } catch (error) {
            showPopupMessage(error.message, 'error');
            closeModal();
        }
    }

    function displayOffers(offers) {
        // 3. TARGET THE EXACT ELEMENTS FROM YOUR HTML SNIPPET
        const searchBar = document.getElementById("offerSearch");
        const descriptionText = searchBar ? searchBar.previousElementSibling : null; // Selects the div directly above search bar
        const formActionsBlock = document.querySelector(".form-actions");

        offerListContainer.innerHTML = "";

        if (!offers || offers.length === 0) {
            // 4. Hide search bar, description, and the bottom actions panel
            if (searchBar) searchBar.style.display = "none";
            if (descriptionText) descriptionText.style.display = "none";
            if (formActionsBlock) formActionsBlock.style.display = "none";

            // 5. Inject the large, clear clean screen notice
            offerListContainer.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background-color: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0;">
                <h2 style="font-size: 2.2rem; font-weight: 800; color: #dc3545; margin-bottom: 12px;">No Offers Available</h2>
                <p style="font-size: 1.2rem; color: #6c757d; margin: 0; line-height: 1.5;">There are currently no active promotional deals or coupon codes available for this product.</p>
            </div>`;
            return;
        }

        // 6. Restore the layout structure instantly if offers do exist
        if (searchBar) searchBar.style.display = "block";
        if (descriptionText) descriptionText.style.display = "block";
        if (formActionsBlock) formActionsBlock.style.display = "flex"; // Restores the default flex behavior of form-actions

        offers.forEach(offer => {
            const startDate = new Date(offer.startDate).toLocaleDateString();
            const endDate = new Date(offer.endDate).toLocaleDateString();

            const card = document.createElement("div");
            card.className = "offer-item";
            card.dataset.offerId = offer._id;

            if (selectedOfferId === offer._id) {
                card.classList.add("selected");
            }

            const discountText =
                offer.discountType === "percentage"
                    ? offer.discountValue + "%"
                    : "₹" + offer.discountValue + " Off";

            card.innerHTML =
                "<h5>" + offer.offerCode + "</h5>" +
                '<div class="offer-details">' +
                "<div><strong>Discount:</strong> " + discountText + "</div>" +
                "<div><strong>Starts:</strong> " + startDate + "<br><strong>Ends:</strong> " + endDate + "</div>" +
                '<div><strong>Status:</strong> <span class="status-badge active">Active</span></div>' +
                "</div>";

            offerListContainer.appendChild(card);
        });
    }



    filterOffers = function () {
        const term = offerSearchInput.value.toLowerCase().trim();

        const filtered = availableOffers.filter(offer => {
            const text =
                String(offer.offerCode || "") + " " +
                String(offer.discountType || "") + " " +
                String(offer.discountValue || "");

            return text.toLowerCase().includes(term);
        });

        displayOffers(filtered);
    };

    // open modal buttons
    document.querySelectorAll(".btn-apply-offer").forEach(button => {
        button.addEventListener("click", function (e) {
            e.preventDefault();

            const productId = this.dataset.productId;

            if (productId) {
                openModal(productId);
            }
        });
    });

    // close modal
    if (closeFormBtn) {
        closeFormBtn.addEventListener("click", closeModal);
    }

    if (mainOverlay) {
        mainOverlay.addEventListener("click", function (e) {
            if (e.target === mainOverlay) {
                closeModal();
            }
        });
    }

    // select offer card
    if (offerListContainer) {
        offerListContainer.addEventListener("click", function (e) {
            const card = e.target.closest(".offer-item");

            if (!card) return;

            const offerId = card.dataset.offerId;

            offerListContainer.querySelectorAll(".offer-item").forEach(item => {
                item.classList.remove("selected");
            });

            if (selectedOfferId === offerId) {
                selectedOfferId = null;
                selectedOfferIdInput.value = "";
            } else {
                selectedOfferId = offerId;
                selectedOfferIdInput.value = offerId;
                card.classList.add("selected");
            }
        });
    }

    // apply offer manual 
    if (mainForm) {
        mainForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const offerId = selectedOfferIdInput.value;
            const productId = selectedProductIdInput.value;

            if (!offerId) {
                showPopupMessage('Please select an offer.', 'error')
                return;
            }

            try {
                const response = await fetch("/admin/products/apply-offer/" + productId, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ offerId: offerId })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || "Failed to apply offer.");
                }

                showPopupMessage(result.message || 'Offer applied successfully.', 'success')

                closeModal();

                setTimeout(() => {
                    window.location.reload();
                }, 1200);

            } catch (error) {
                showPopupMessage(error.message, 'error')
            }
        });
    }

    // restore auto pricing
    if (autoPricingBtn) {
        autoPricingBtn.addEventListener("click", async function () {
            const productId = selectedProductIdInput.value;

            if (!productId) return;

            try {
                const response = await fetch("/admin/products/auto-pricing/" + productId, {
                    method: "PUT"
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || "Failed to restore automatic pricing.");
                }

                showPopupMessage(result.message || 'Automatic pricing enabled.', 'success')

                closeModal();

                setTimeout(() => {
                    window.location.reload();
                }, 1200);

            } catch (error) {
                showPopupMessage(error.message, 'error')
            }
        });
    }
});