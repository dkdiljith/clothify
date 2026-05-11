document.addEventListener("DOMContentLoaded", () => {
    // ===============================
    // 1. CORE ELEMENTS
    // ===============================
    const form = document.getElementById("couponForm");
    const addCouponOverlay = document.getElementById("addCouponOverlay");
    const toggleFormBtn = document.getElementById("toggleCouponForm");
    const closeFormBtn = document.getElementById("closeFormBtn");

    const offerCodeInput = document.getElementById("offerCode");
    const offerTypeInput = document.getElementById("offerType");
    const discountTypeInput = document.getElementById("discountType");
    const discountValueInput = document.getElementById("discountValue");
    const startDateInput = document.getElementById("startDate");
    const endDateInput = document.getElementById("endDate");

    // Selection Modal
    const selectionModal = document.getElementById("selectionModalOverlay");
    const selectionSearch = document.getElementById("selectionSearch");
    const selectionList = document.getElementById("selectionList");
    const selectionPagination = document.getElementById("selectionPagination");
    const targetIdsInput = document.getElementById("targetIds");

    const selectedCountLabel = document.getElementById("selectedCount");
    const confirmSelectionBtn = document.getElementById("confirmSelection");
    const closeSelectionBtn = document.getElementById("closeSelectionBtn");

    const selectionStatusBadge = document.getElementById("selectionStatusBadge");
    const badgeText = document.getElementById("badgeText");

    const openSelectionBtn = document.getElementById("openSelectionBtn");

    let selectedItems = new Set();
    let searchTimeout;

    // ===============================
    // 2. INITIALIZATION
    // ===============================
    $("#discountType").select2({
        minimumResultsForSearch: Infinity,
        width: "100%",
    });

    // ===============================
    // 3. OFFER CODE AUTO UPPERCASE
    // ===============================
    offerCodeInput.addEventListener("input", () => {
        offerCodeInput.value = offerCodeInput.value.toUpperCase();
    });

    // ===============================
    // 4. MAIN MODAL OPEN/CLOSE
    // ===============================
    toggleFormBtn.addEventListener("click", () => {
        addCouponOverlay.classList.add("active");
    });

    closeFormBtn.addEventListener("click", closeModal);

    addCouponOverlay.addEventListener("click", (e) => {
        if (e.target === addCouponOverlay) {
            closeModal();
        }
    });

    // ===============================
    // 5. OPEN SELECTION MODAL
    // ===============================
    openSelectionBtn.addEventListener("click", () => {
        const type = offerTypeInput.value;

        if (!type) {
            showPopupMessage('Please select Offer Type first', 'error')
            return;
        }

        selectionModal.classList.add("active");

        document.getElementById("selectionModalTitle").textContent =
            `Select ${type === "product" ? "Products" : "Sub-Categories"}`;

        fetchSelectionData(1);
    });

    // ===============================
    // 6. CLOSE SELECTION MODAL
    // ===============================
    closeSelectionBtn.addEventListener("click", () => {
        selectionModal.classList.remove("active");
    });

    // ===============================
    // 7. FETCH PRODUCTS / CATEGORIES
    // ===============================
    async function fetchSelectionData(page = 1) {
        const type = offerTypeInput.value;
        const search = selectionSearch.value.trim();

        const url =
            type === "product"
                ? `/admin/offer/totalProducts?page=${page}&search=${encodeURIComponent(search)}`
                : `/admin/offer/totalCategories?page=${page}&search=${encodeURIComponent(search)}`;

        try {
            selectionList.innerHTML =
                '<div class="text-center">Loading items...</div>';

            const response = await fetch(url);
            const data = await response.json();

            renderSelectionItems(data.products || data.categories, type);

            renderSelectionPagination(data.pagination);
        } catch (error) {
            console.error(error);

            selectionList.innerHTML =
                '<div class="error-message show">Failed to load data.</div>';
        }
    }

    // ===============================
    // 8. RENDER ITEMS
    // ===============================
    function renderSelectionItems(items, type) {
        if (!items || items.length === 0) {
            selectionList.innerHTML = '<p class="text-center">No results found.</p>';
            return;
        }

        // move selected items to top
        items.sort((a, b) => {
            const aSelected = selectedItems.has(a._id.toString()) ? 1 : 0;

            const bSelected = selectedItems.has(b._id.toString()) ? 1 : 0;

            return bSelected - aSelected;
        });

        selectionList.innerHTML = items
            .map((item) => {
                const title = item.name || item.categoryName;

                const price = item.details?.[0]?.price || 0;

                const isChecked = selectedItems.has(item._id.toString());

                return `
                <div class="selection-row"
                     style="display:flex;align-items:center;padding:10px;border-bottom:1px solid #eee;">

                    <input
                        type="checkbox"
                        class="item-checkbox"
                        value="${item._id}"
                        id="chk-${item._id}"
                        ${isChecked ? "checked" : ""}
                        style="margin-right:15px;width:18px;height:18px;">

                    <label
                        for="chk-${item._id}"
                        style="cursor:pointer;flex-grow:1;">

                        <strong>${title}</strong>

                        ${type === "product"
                        ? `<br><small>Price: ₹${price}</small>`
                        : ""
                    }

                    </label>

                </div>
            `;
            })
            .join("");

        // checkbox events
        document.querySelectorAll(".item-checkbox").forEach((cb) => {
            cb.addEventListener("change", (e) => {
                if (e.target.checked) {
                    selectedItems.add(e.target.value);
                } else {
                    selectedItems.delete(e.target.value);
                }

                selectedCountLabel.textContent = selectedItems.size;
            });
        });
    }

    // ===============================
    // 9. LIVE SEARCH (DEBOUNCE)
    // ===============================
    selectionSearch.addEventListener("input", () => {
        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(() => {
            fetchSelectionData(1);
        }, 500);
    });

    // ===============================
    // 10. VALIDATION HELPERS
    // ===============================
    function showError(input, message) {
        const errorElement = input.nextElementSibling;

        if (errorElement && errorElement.classList.contains("error-message")) {
            errorElement.textContent = message;
            errorElement.classList.add("show");
        }

        input.style.borderColor = "red";
    }

    function clearError(input) {
        const errorElement = input.nextElementSibling;

        if (errorElement && errorElement.classList.contains("error-message")) {
            errorElement.classList.remove("show");
        }

        input.style.borderColor = "";
    }

    // ===============================
    // 11. FORM VALIDATION
    // ===============================
    function validateForm() {
        let isValid = true;
        const today = new Date().toISOString().split("T")[0];

        const codeRegex = /^[A-Z0-9]{6}$/;

        if (!codeRegex.test(offerCodeInput.value)) {
            showError(
                offerCodeInput,
                "Code must be 6 uppercase alphanumeric characters.",
            );
            isValid = false;
        } else {
            clearError(offerCodeInput);
        }

        const discountValue = parseFloat(discountValueInput.value);

        if (isNaN(discountValue) || discountValue < 0) {
            showError(discountValueInput, "Enter valid positive number");

            isValid = false;
        } else if (
            discountTypeInput.value === "percentage" &&
            (discountValue <= 0 || discountValue > 100)
        ) {
            showError(discountValueInput, "Percentage must be between 1 and 100");

            isValid = false;
        } else {
            clearError(discountValueInput);
        }

        const offerTypeIsSelected = !!offerTypeInput.value;

        if (!offerTypeIsSelected) {
            offerTypeInput.classList.add('is-invalid');
            const errorBox = document.getElementById('offerType-error');
            errorBox.textContent = 'Please select where the offer applies';
            errorBox.classList.add('show');
            isValid = false;
        } else {
            const selectedIds = targetIdsInput.value
                ? JSON.parse(targetIdsInput.value)
                : [];
            if (selectedIds.length === 0) {
                const errorBox = document.getElementById('offerType-error');
                errorBox.textContent = offerTypeInput.value === 'product'
                    ? 'Please select at least one Product'
                    : 'Please select at least one Sub-Category';
                errorBox.classList.add('show');
                offerTypeInput.classList.remove('is-invalid');
                isValid = false;
            } else {
                document.getElementById('offerType-error').classList.remove('show');
                offerTypeInput.classList.remove('is-invalid');
            }
        }

        if (!discountTypeInput.value) {
            document.querySelector('.select2-container').style.border = '1px solid red';
            const errorBox = document.getElementById('discountType-error');
            errorBox.textContent = 'Please select discount type';
            errorBox.classList.add('show');
            isValid = false;
        } else {
            document.querySelector('.select2-container').style.border = '';
            const errorBox = document.getElementById('discountType-error');
            errorBox.textContent = '';
            errorBox.classList.remove('show');
        }


        if (!startDateInput.value) {
            showError(startDateInput, "Start date required");
            isValid = false;
        } else {
            clearError(startDateInput);
        }

        if (endDateInput.value <= today) {
            showError(endDateInput, "Expiry must be future date");
            isValid = false;
        } else {
            clearError(endDateInput);
        }

        return isValid;
    }

    // ===============================
    // 12. CONFIRM SELECTION
    // ===============================
    confirmSelectionBtn.addEventListener("click", () => {
        const idArray = Array.from(selectedItems);

        targetIdsInput.value = JSON.stringify(idArray);

        selectedCountLabel.textContent = idArray.length;

        if (idArray.length > 0) {
            badgeText.textContent = `${idArray.length} items selected`;

            selectionStatusBadge.style.display = "flex";
        } else {
            badgeText.textContent = "0 items selected";
            selectionStatusBadge.style.display = "none";
        }

        selectionModal.classList.remove("active");

        showPopupMessage(`${idArray.length} items linked to offer`, 'success')
    });

    // ===============================
    // 13. PAGINATION RENDER
    // ===============================
    function renderSelectionPagination(nav) {
        if (!nav || nav.totalPages <= 1) {
            selectionPagination.innerHTML = "";
            return;
        }

        selectionPagination.innerHTML = `
            <div class="pagination"
                 style="display:flex;gap:10px;justify-content:center;margin-top:15px;">

                <button
                    type="button"
                    class="btn"
                    ${!nav.hasPrevPage ? "disabled" : ""}
                    onclick="window.fetchSelectionData(${nav.prevPage})">

                    Prev
                </button>

                <span style="align-self:center;">
                    Page ${nav.page} of ${nav.totalPages}
                </span>

                <button
                    type="button"
                    class="btn"
                    ${!nav.hasNextPage ? "disabled" : ""}
                    onclick="window.fetchSelectionData(${nav.nextPage})">

                    Next
                </button>

            </div>
        `;
    }

    // ===============================
    // 14. CLOSE MODAL / RESET
    // ===============================
    function closeModal() {
        selectedItems.clear();
        selectedCountLabel.textContent = "0";
        badgeText.textContent = "0 items selected";
        targetIdsInput.value = "";
        selectionSearch.value = "";
        selectionList.innerHTML = "";
        selectionPagination.innerHTML = "";
        selectionStatusBadge.style.display = "none";
        form.reset();
        $("#discountType").val(null).trigger("change");
        document.getElementById("editCouponId").value = "";
        document.getElementById("couponModalTitle").textContent =
            "Create New Offer";
        // clear all error messages
        document.querySelectorAll(".error-message").forEach((el) => {
            el.textContent = "";
            el.classList.remove("show");
            el.style.display = "";
        });
        // remove red invalid classes
        document.querySelectorAll(".is-invalid").forEach((el) => {
            el.classList.remove("is-invalid");
        });
        // clear inline borders from inputs/selects
        document.querySelectorAll(".form-control").forEach((el) => {
            el.style.borderColor = "";
            el.style.border = "";
        });
        // reset select2 border
        const select2Container = document.querySelector(".select2-container");
        if (select2Container) {
            select2Container.style.border = "";
        }
        // clear offer apply button error state
        document.getElementById("openSelectionBtn").classList.remove("is-invalid");
        addCouponOverlay.classList.remove("active");
    }

    // ===============================
    // 15. GLOBAL ACCESS FOR PAGINATION
    // ===============================
    window.fetchSelectionData = fetchSelectionData;

    // ===============================
    // 16. FORM SUBMIT (CREATE / UPDATE)
    // ===============================
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!validateForm()) return;


        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        data.targetIds = JSON.parse(targetIdsInput.value);

        const couponId = document.getElementById("editCouponId").value;

        try {
            const url = couponId
                ? `/admin/offer/${couponId}`
                : `/admin/offer/addOffer`;

            const method = couponId ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (result.success) {
                showPopupMessage(result.message, 'success')

                closeModal();

                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showPopupMessage(result.message, 'error')
            }
        } catch (error) {
            console.error(error);

            showPopupMessage('Something went wrong', 'error')
        }
    });

    // ===============================
    // 17. EDIT OFFER MODAL
    // ===============================
    window.openEditModal = async function (couponId) {
        try {
            document.getElementById("couponModalTitle").textContent = "Loading...";

            addCouponOverlay.classList.add("active");

            const response = await fetch(`/admin/offer/${couponId}`);

            const offer = await response.json();

            document.getElementById("editCouponId").value = offer._id;

            document.getElementById("couponModalTitle").textContent = "Edit Offer";

            offerCodeInput.value = offer.offerCode || "";

            offerTypeInput.value = offer.offerType || "";

            discountTypeInput.value = offer.discountType || "";

            discountValueInput.value = offer.discountValue || "";

            startDateInput.value = offer.startDate?.split("T")[0] || "";

            endDateInput.value = offer.endDate?.split("T")[0] || "";

            $("#discountType").trigger("change");

            // restore selected ids
            if (offer.targetIds && offer.targetIds.length > 0) {
                selectedItems = new Set(offer.targetIds);

                targetIdsInput.value = JSON.stringify(Array.from(selectedItems));

                badgeText.textContent = `${selectedItems.size} items selected`;

                selectedCountLabel.textContent = selectedItems.size;

                selectionStatusBadge.style.display = "flex";
            }
        } catch (error) {
            console.error(error);

            showPopupMessage('Failed to load offer data', 'error')

            closeModal();
        }
    };

    offerTypeInput.addEventListener("change", () => {
        selectedItems.clear();

        targetIdsInput.value = "";

        selectedCountLabel.textContent = "0";

        badgeText.textContent = "0 items selected";

        selectionStatusBadge.style.display = "none";
    });

    document.querySelectorAll(".btn-edit").forEach((button) => {
        button.addEventListener("click", async (e) => {
            e.preventDefault();

            const couponId = button.dataset.couponId;

            await window.openEditModal(couponId);
        });
    });

    // ===============================
    // 18. INITIAL DELETE BUTTONS
    // ===============================
    setupDeleteButtons();
}); // END DOMContentLoaded

// ===============================
// 19. DELETE BUTTON LOGIC
// ===============================
function setupDeleteButtons() {
    document.querySelectorAll(".btn-delete").forEach((button) => {
        button.addEventListener("click", async () => {
            const couponId = button.dataset.couponId;

            const confirmed = confirm("Are you sure you want to delete this offer?");

            if (!confirmed) return;

            try {
                const response = await fetch(`/admin/offer/${couponId}`, {
                    method: "DELETE",
                });

                const result = await response.json();

                if (result.success) {
                    showPopupMessage(result.message, 'success')

                    setTimeout(() => {
                        window.location.reload();
                    }, 1200);
                } else {
                    showPopupMessage(result.message, 'error')
                }
            } catch (error) {
                console.error(error);

                showPopupMessage(`Failed to delete offer` , `error`)
            }
        });
    });
}

