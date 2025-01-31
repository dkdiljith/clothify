// 1. Data and Variables
const coupons = [
    // Sample data (replace with your actual data from backend)
    { id: 1, code: "SUMMER20", name: "Summer Sale", type: "percentage", discount: 20, min_purchase: 50, usage_limit: 100, usage_count: 50, valid_from: "2024-07-01", valid_to: "2024-07-31", applicable_products: "", status: "active" },
    // ... more coupons
];

const couponTable = document.getElementById("coupon-table").getElementsByTagName("tbody")[0];
const addCouponButton = document.getElementById("add-coupon-button");
const couponModal = document.getElementById("coupon-modal");
const closeModalButton = couponModal.querySelector(".close-button");
const couponForm = document.getElementById("coupon-form");
const couponId = document.getElementById("coupon-id"); // Hidden input field
const searchBox = document.getElementById("search-box");
const statusFilter = document.getElementById("status-filter");
const pagination = document.getElementById("pagination");

let currentPage = 1;
const couponsPerPage = 10; // Number of coupons to display per page


// 2. Rendering Coupons and Pagination
function renderCoupons(couponsToDisplay = coupons) {
    couponTable.innerHTML = ""; // Clear the table

    const startIndex = (currentPage - 1) * couponsPerPage;
    const endIndex = Math.min(startIndex + couponsPerPage, couponsToDisplay.length);

    for (let i = startIndex; i < endIndex; i++) {
        const coupon = couponsToDisplay[i];
        const row = couponTable.insertRow();
        row.innerHTML = `
            <td>${coupon.code}</td>
            <td>${coupon.name}</td>
            <td>${coupon.type}</td>
            <td>${coupon.discount}${coupon.type === "percentage" ? "%" : ""}</td>
            <td>${coupon.valid_from}</td>
            <td>${coupon.valid_to}</td>
            <td>${coupon.usage_count}/${coupon.usage_limit || "Unlimited"}</td>
            <td>${coupon.status}</td>
            <td>
                <button class="edit-button" data-id="${coupon.id}"><i class="fas fa-edit"></i></button>
                <button class="delete-button" data-id="${coupon.id}"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;

        // Add event listeners for edit and delete buttons (see section 4)
        const editButton = row.querySelector(".edit-button");
        const deleteButton = row.querySelector(".delete-button");

        editButton.addEventListener("click", () => openModal(coupon));
        deleteButton.addEventListener("click", () => deleteCoupon(coupon.id));
    }

    renderPagination(couponsToDisplay);
}

function renderPagination(couponsToDisplay) {
    const totalPages = Math.ceil(couponsToDisplay.length / couponsPerPage);
    pagination.innerHTML = ""; // Clear pagination links

    for (let i = 1; i <= totalPages; i++) {
        const link = document.createElement("a");
        link.href = "#";
        link.textContent = i;
        link.addEventListener("click", () => {
            currentPage = i;
            renderCoupons(couponsToDisplay);
        });

        if (i === currentPage) {
            link.classList.add("active");
        }
        pagination.appendChild(link);
    }
}


// 3. Modal Functions (Open, Close, Form Submit)
function openModal(coupon = null) {
    couponModal.style.display = "block";

    if (coupon) { // Editing existing coupon
        couponId.value = coupon.id;
        couponForm.code.value = coupon.code;
        couponForm.name.value = coupon.name;
        couponForm.type.value = coupon.type;
        couponForm.discount.value = coupon.discount;
        couponForm.min_purchase.value = coupon.min_purchase || "";
        couponForm.usage_limit.value = coupon.usage_limit || "";
        couponForm.valid_from.value = coupon.valid_from;
        couponForm.valid_to.value = coupon.valid_to;
        couponForm.applicable_products.value = coupon.applicable_products;
        couponForm.status.value = coupon.status;

    } else {  // Adding new coupon
        couponId.value = "";
        couponForm.reset(); // Resets the form to default values.
    }
}

function closeModal() {
    couponModal.style.display = "none";
}

closeModalButton.addEventListener("click", closeModal);
window.addEventListener("click", (event) => {
    if (event.target == couponModal) {
        closeModal();
    }
});

addCouponButton.addEventListener("click", () => openModal());

couponForm.addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent default form submission

    const newCoupon = {
        id: couponId.value || (coupons.length + 1), // Generate ID if new
        code: couponForm.code.value,
        name: couponForm.name.value,
        type: couponForm.type.value,
        discount: parseFloat(couponForm.discount.value), // Parse to number
        min_purchase: parseFloat(couponForm.min_purchase.value) || null,
        usage_limit: parseInt(couponForm.usage_limit.value) || null,
        valid_from: couponForm.valid_from.value,
        valid_to: couponForm.valid_to.value,
        applicable_products: couponForm.applicable_products.value,
        status: couponForm.status.value,
    };

    if (couponId.value) { // Editing
        const index = coupons.findIndex(c => c.id == couponId.value);
        if (index !== -1) {
            coupons[index] = newCoupon;
        }

    } else { // Adding
        coupons.push(newCoupon);
    }

    renderCoupons();
    closeModal();
});


// 4. Delete, Search, Filter
function deleteCoupon(id) {
    if (confirm("Are you sure you want to delete this coupon?")) {
        const index = coupons.findIndex(c => c.id === id);
        if (index !== -1) {
            coupons.splice(index, 1);
            renderCoupons();
        }
    }
}

searchBox.addEventListener("input", () => {
    const searchTerm = searchBox.value.toLowerCase();
    const filteredCoupons = coupons.filter(coupon =>
        coupon.code.toLowerCase().includes(searchTerm) ||
        coupon.name.toLowerCase().includes(searchTerm)
    );
    renderCoupons(filteredCoupons);
});

statusFilter.addEventListener("change", () => {
    const selectedStatus = statusFilter.value;
    const filteredCoupons = selectedStatus ? coupons.filter(coupon => coupon.status === selectedStatus) : coupons;

    renderCoupons(filteredCoupons);
});


// 5. Initial Rendering
renderCoupons(); // Initial rendering of coupons