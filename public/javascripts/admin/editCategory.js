let filterOffers;

document.addEventListener("DOMContentLoaded", () => {
    const deleteButtons = document.querySelectorAll(".btn-delete");
    const form = document.querySelector(".form");
    const categoryNameInput = document.getElementById("categoryName");
    const subcategoryInput = document.getElementById("newSubcategory");

    const mainOverlay = document.getElementById("mainOverlay");
    const closeFormBtn = document.getElementById("closeFormBtn");
    const mainForm = document.getElementById("mainForm");
    const offerListContainer = document.getElementById("offerListContainer");
    const selectedOfferIdInput = document.getElementById("selectedOfferIdInput");
    const selectedCategoryIdInput = document.getElementById("selectedCategoryIdInput");
    const modalTitle = document.getElementById("formModalTitle");
    const offerSearchInput = document.getElementById("offerSearch");
    const autoPricingBtn = document.getElementById("autoPricingBtn");

    let availableOffers = [];
    let selectedOfferId = null;
    let selectedCategoryId = null;

    // delete subcategory
    deleteButtons.forEach(button => {
        button.addEventListener("click", async function () {
            const categoryId = this.dataset.id;

            const confirmed = confirm(
                "Delete this subcategory?\n\nThis action cannot be undone."
            );

            if (!confirmed) return;

            try {
                const response = await fetch("/admin/category/" + categoryId, {
                    method: "DELETE"
                });

                const result = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(result.message || "Delete failed.");
                }

                showPopupMessage('Subcategory deleted.', 'success')

                setTimeout(() => {
                    location.reload();
                }, 1000);

            } catch (error) {
                showPopupMessage(error.message, 'error')
            }
        });
    });

    // update category / add subcategory
    if (form) {
        form.addEventListener("submit", async e => {
            e.preventDefault();

            const name = categoryNameInput.value.trim();
            const newSubcategory = subcategoryInput.value.trim();

            const categoryId = window.location.pathname.split("/").pop();

            try {
                const response = await fetch("/admin/category/" + categoryId, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name,
                        newSubcategory
                    })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || "Update failed.");
                }

               showPopupMessage(result.message || 'Saved successfully.', 'success')

                setTimeout(() => {
                    location.reload();
                }, 1000);

            } catch (error) {
                showPopupMessage(error.message, 'error')
            }
        });
    }

    function resetModal() {
        selectedOfferId = null;
        selectedCategoryId = null;

        selectedOfferIdInput.value = "";
        selectedCategoryIdInput.value = "";

        offerSearchInput.value = "";
        offerListContainer.innerHTML = "";
    }

    function closeModal() {
        mainOverlay.classList.remove("active");
        resetModal();
    }

    async function openModal(categoryId) {
        try {
            resetModal();

            modalTitle.textContent = "Loading...";
            mainOverlay.classList.add("active");

            const response = await fetch("/admin/category/apply-offer/" + categoryId);

            if (!response.ok) {
                throw new Error("Failed to load offers.");
            }

            const data = await response.json();

            if (!data.category) {
                throw new Error("Category not found.");
            }

            selectedCategoryId = data.category._id;
            selectedCategoryIdInput.value = data.category._id;

            availableOffers = data.offers || [];

            displayOffers(availableOffers);

            modalTitle.textContent =
                'Apply Offer for "' + data.category.name + '"';

        } catch (error) {
            showPopupMessage(error.message, 'error')
            closeModal();
        }
    }

    function displayOffers(offers) {
        offerListContainer.innerHTML = "";

        if (!offers.length) {
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

            const categoryId = this.dataset.categoryId;

            if (categoryId) {
                openModal(categoryId);
            }
        });
    });

    // close modal
    if (closeFormBtn) {
        closeFormBtn.addEventListener("click", closeModal);
    }

    if (mainOverlay) {
        mainOverlay.addEventListener("click", e => {
            if (e.target === mainOverlay) {
                closeModal();
            }
        });
    }

    // select offer
    if (offerListContainer) {
        offerListContainer.addEventListener("click", e => {
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

    // apply Offer
    if (mainForm) {
        mainForm.addEventListener("submit", async e => {
            e.preventDefault();

            const offerId = selectedOfferIdInput.value;
            const categoryId = selectedCategoryIdInput.value;

            if (!offerId) {
                showPopupMessage('Please select an offer.', 'error')
                return;
            }

            try {
                const response = await fetch("/admin/category/apply-offer/" + categoryId, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ offerId })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || "Failed to apply offer.");
                }

                showPopupMessage(result.message || 'Offer applied.', 'success')

                closeModal();

                setTimeout(() => {
                    location.reload();
                }, 1200);

            } catch (error) {
                showPopupMessage(error.message, 'error')
            }
        });
    }

    // restore automatic pricing
    if (autoPricingBtn) {
        autoPricingBtn.addEventListener("click", async () => {
            const categoryId = selectedCategoryIdInput.value;

            if (!categoryId) return;

            try {
                const response = await fetch("/admin/category/auto-pricing/" + categoryId, {
                    method: "PUT"
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || "Failed to restore automatic pricing.");
                }

               showPopupMessage(result.message || 'Automatic pricing enabled.', 'success')

                closeModal();

                setTimeout(() => {
                    location.reload();
                }, 1200);

            } catch (error) {
                showPopupMessage(error.message, 'error')
            }
        });
    }
});