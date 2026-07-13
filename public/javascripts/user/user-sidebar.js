document.addEventListener("DOMContentLoaded", function () {
    const currentPath = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const menuItems = document.querySelectorAll("#user-sidebar-menu li");

    // Clear previous active classes safely
    menuItems.forEach(item => item.classList.remove("active"));

    let targetKey = "";

    // Rule 1: Address Matching
    if (currentPath.includes("/user/address") || currentPath.includes("/user/addaddress") || currentPath.includes("/user/editaddress")) {
        targetKey = "address";
    }
    // Rule 2: Profile Matching
    else if (currentPath.includes("/user/profile") || currentPath.includes("/user/profileEdit") || currentPath.includes("/user/profileView")) {
        targetKey = "profile";
    }
    // Rule 3: Order Details Parent Routing Logic
    else if (currentPath.includes("/user/orderDetails")) {
        if (searchParams.get("from") === "pending") {
            targetKey = "orders-pending";
        } else {
            targetKey = "orders-regular";
        }
    }
    // Rule 4: Regular Orders vs Pending Orders Main Landing Lists
    else if (currentPath.includes("/user/orders")) {
        if (searchParams.get("retryPendingOrder") === "true") {
            targetKey = "orders-pending";
        } else {
            targetKey = "orders-regular";
        }
    }
    // Rule 5: Fallback Direct Matching
    else {
        if (currentPath.includes("/user/security")) targetKey = "security";
        if (currentPath.includes("/user/wallet")) targetKey = "wallet";
        if (currentPath.includes("/user/deleteuser")) targetKey = "deleteuser";
        if (currentPath.includes("/user/referral")) targetKey = "referral"; // Added this line
    }

    // Apply the active class to the matched key element
    if (targetKey) {
        const activeItem = document.querySelector(`#user-sidebar-menu li[data-match="${targetKey}"]`);
        if (activeItem) {
            activeItem.classList.add("active");
        }
    }
});