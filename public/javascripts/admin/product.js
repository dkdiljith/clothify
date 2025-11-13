let filterOffers;

document.addEventListener("DOMContentLoaded", () => {
    // --- ELEMENT SELECTORS ---
    const mainOverlay = document.getElementById("mainOverlay");
    const closeFormBtn = document.getElementById("closeFormBtn");
    const mainForm = document.getElementById("mainForm");
    const offerListContainer = document.getElementById('offerListContainer');
    const selectedOfferIdInput = document.getElementById('selectedOfferIdInput');
    const selectedProductIdInput = document.getElementById('selectedProductIdInput');
    const modalTitle = document.getElementById('formModalTitle');
    const offerSearchInput = document.getElementById('offerSearch');

    // --- STATE VARIABLES ---
    let availableOffers = [];
    let selectedOfferId = null;
    let selectedProductId = null;


    /////////////////////////////////////////////////////////////////////////////////

    //  Notification function
    const showNotification = (type, message) => {
        const container = document.getElementById('notification-container') || createNotificationContainer();
        const notification = document.createElement('div');
        notification.classList.add('notification', type);
        notification.innerHTML = `
                <span>${message}</span>
                <span class="close-btn">&times;</span>
            `;

        container.appendChild(notification);

        // Remove notification after 4 seconds
        setTimeout(() => {
            notification.remove();
        }, 4000);

        // Close button functionality
        notification.querySelector('.close-btn').addEventListener('click', () => {
            notification.remove();
        });
    };

    const createNotificationContainer = () => {
      const container = document.createElement("div");
      container.id = "notification-container";
      document.body.appendChild(container);
      return container;
    };

    ///////////////////////////////////////////////////////////////////////////////////

    // --- MODAL & DATA FETCHING ---
    async function openModal(productId) {
        try {
            modalTitle.textContent = 'Loading...';
            mainOverlay.classList.add("active");

            // Reset state from previous openings
            selectedOfferId = null;
            selectedOfferIdInput.value = "";
            offerSearchInput.value = "";

            const response = await fetch(`/admin/products/apply-offer/${productId}`);
            if (!response.ok) throw new Error('Network response was not ok');

            const obj = await response.json();

            selectedProductId = obj.product._id
            selectedProductIdInput.value = obj.product._id;
            availableOffers = obj.offers || [];
            displayOffers(availableOffers);

            modalTitle.textContent = 'Select an Offer for "' + obj.product.name + '"';

        } catch (error) {
            console.error('Error loading offer modal:', error);
            showNotification('error', 'Failed to load offer information');
            closeModal();
        }
    }

    const closeModal = () => {
        mainOverlay.classList.remove("active");
    };

    // --- OFFER DISPLAY & FILTERING ---

    // (MODIFIED) Function to generate and display the offer cards
    function displayOffers(offersToDisplay) {
        offerListContainer.innerHTML = ""; // Clear previous content

        if (!offersToDisplay || offersToDisplay.length === 0) {
            offerListContainer.innerHTML = '<p class="text-center text-muted">No offers found.</p>';
            return;
        }

        offersToDisplay.forEach((offer) => {
            const startDate = new Date(offer.startDate).toLocaleDateString();
            const endDate = new Date(offer.endDate).toLocaleDateString();

            const offerElement = document.createElement("div");
            offerElement.className = "offer-item";
            // If this offer is the currently selected one, add the 'selected' class on render
            if (offer._id === selectedOfferId) {
                offerElement.classList.add('selected');
            }
            offerElement.dataset.offerId = offer._id;

            offerElement.innerHTML = `
                <h5>${offer.offerCode}</h5>
                <div class="offer-details">
                    <div>
                        <strong>Discount:</strong> ${offer.discountValue}${offer.discountType === 'percentage' ? '%' : ' (flat)'}
                    </div>
                    <div>
                        <strong>Starts:</strong> ${startDate}<br>
                        <strong>Ends:</strong> ${endDate}
                    </div>
                    <div>
                        <strong>Status:</strong> 
                        <span class="status-badge ${offer.isActive ? 'active' : 'inactive'}">
                            ${offer.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
            `;
            offerListContainer.appendChild(offerElement);
        });
    }

    // This function is now exposed globally for the onkeyup attribute
    filterOffers = () => {
        const searchTerm = offerSearchInput.value.toLowerCase();

        const filteredOffers = availableOffers.filter(offer => {
            const searchableText = `${offer.offerCode} ${offer.offerType}`.toLowerCase();
            return searchableText.includes(searchTerm);
        });

        displayOffers(filteredOffers);
    }

    // --- EVENT LISTENERS ---

    // Open modal when any edit button is clicked
    document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const productId = button.dataset.productId;
            if (productId) {
                openModal(productId);
            }
        });
    });

    // Close modal listeners
    if (closeFormBtn) {
        closeFormBtn.addEventListener("click", closeModal);
    }
    if (mainOverlay) {
        mainOverlay.addEventListener("click", (e) => {
            if (e.target === mainOverlay) {
                closeModal();
            }
        });
    }


    if (offerListContainer) {
        offerListContainer.addEventListener('click', (event) => {
            const clickedOfferCard = event.target.closest('.offer-item');
            if (!clickedOfferCard) return; 

            const offerId = clickedOfferCard.dataset.offerId;

            // Clear selection from all visible cards first
            offerListContainer.querySelectorAll('.offer-item').forEach(item => {
                item.classList.remove('selected');
            });

            // If the user clicks the already selected card, deselect it
            if (selectedOfferId === offerId) {
                selectedOfferId = null;
                selectedOfferIdInput.value = '';
            } else {
                // Otherwise, select the new card
                clickedOfferCard.classList.add('selected');
                selectedOfferId = offerId;
                selectedOfferIdInput.value = offerId;
            }
        });
    }


    // Form submission
    if (mainForm) {
        mainForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const offerId = selectedOfferIdInput.value;
            const productId = selectedProductIdInput.value

            if (offerId) {
                try {
                    const url = `/admin/products/apply-offer/${productId}`;
                    const method = 'PUT';

                    const response = await fetch(url, {
                        method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ offerId: offerId })
                    });

                    //create error if responce is not came
                    if (!response.ok) {
                        const errorResult = await response.json().catch(() => ({ message: 'Failed to apply offer. Server returned an error.' }));
                        throw new Error(errorResult.message);
                    }

                    const result = await response.json();
                    if (result.success) {
                        closeModal();
                        showNotification('success', result.message);
                        mainForm.reset();
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    } else {
                        showNotification('error', result.message);
                        closeModal();
                    }

                } catch (error) {
                    console.error('Error during offer application:', error);
                    showNotification('error', error.message || 'Something went wrong!');
                    closeModal();
                }

            } else {
                showNotification('error', "Please select an offer before submitting.");
            }
        });
    }
});