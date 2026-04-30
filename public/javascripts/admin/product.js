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

    // notification
    function showNotification(type, message) {
        let container = document.getElementById("notification-container");

        if (!container) {
            container = document.createElement("div");
            container.id = "notification-container";
            document.body.appendChild(container);
        }

        const notification = document.createElement("div");
        notification.className = "notification " + type;

        notification.innerHTML =
            '<span>' + message + '</span>' +
            '<span class="close-btn">&times;</span>';

        container.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 4000);

        notification.querySelector(".close-btn").addEventListener("click", () => {
            notification.remove();
        });
    }

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

    async function openModal(productId) {
        try {
            resetModal();

            modalTitle.textContent = "Loading...";
            mainOverlay.classList.add("active");

            const response = await fetch("/admin/products/apply-offer/" + productId);

            if (!response.ok) {
                throw new Error("Failed to load offer details.");
            }

            const data = await response.json();

            if (!data.product) {
                throw new Error("Product not found.");
            }

            selectedProductId = data.product._id;
            selectedProductIdInput.value = data.product._id;

            availableOffers = data.offers || [];

            displayOffers(availableOffers);

            modalTitle.textContent = 'Apply Offer for "' + data.product.name + '"';

        } catch (error) {
            showNotification("error", error.message);
            closeModal();
        }
    }

    function displayOffers(offers) {
        offerListContainer.innerHTML = "";

        if (!offers || offers.length === 0) {
            offerListContainer.innerHTML =
                '<p class="text-center text-muted">No active offers available.</p>';
            return;
        }

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
                showNotification("error", "Please select an offer.");
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

                showNotification("success", result.message || "Offer applied successfully.");

                closeModal();

                setTimeout(() => {
                    window.location.reload();
                }, 1200);

            } catch (error) {
                showNotification("error", error.message);
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

                showNotification("success", result.message || "Automatic pricing enabled.");

                closeModal();

                setTimeout(() => {
                    window.location.reload();
                }, 1200);

            } catch (error) {
                showNotification("error", error.message);
            }
        });
    }
});