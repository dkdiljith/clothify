document.addEventListener("DOMContentLoaded", () => {
  // =====================================================
  // DROPDOWN
  // =====================================================
  const userHeaderDropdownButton = document.getElementById(
    "userHeaderDropdownButton",
  );
  const userHeaderDropdown = document.getElementById("userHeaderDropdown");
  function toggleUserHeaderDropdown() {
    if (!userHeaderDropdown) return;
    userHeaderDropdown.classList.toggle("show");
    const expanded =
      userHeaderDropdownButton.getAttribute("aria-expanded") === "true";
    userHeaderDropdownButton.setAttribute("aria-expanded", !expanded);
  }
  userHeaderDropdownButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleUserHeaderDropdown();
  });
  // =====================================================
  // CLOSE DROPDOWN OUTSIDE CLICK
  // =====================================================
  window.addEventListener("click", (event) => {
    const clickedInsideDropdown = userHeaderDropdown?.contains(event.target);
    const clickedButton = userHeaderDropdownButton?.contains(event.target);
    if (!clickedInsideDropdown && !clickedButton) {
      userHeaderDropdown?.classList.remove("show");
      userHeaderDropdownButton?.setAttribute("aria-expanded", "false");
    }
  });
  // =====================================================
  // MOBILE MENU
  // =====================================================
  const userHeaderMobileToggle = document.getElementById(
    "userHeaderMobileToggle",
  );
  const userMobileMenu = document.getElementById("userMobileMenu");
  const userMobileOverlay = document.getElementById("userMobileOverlay");
  const userMobileClose = document.getElementById("userMobileClose");
  function openMobileMenu() {
    userMobileMenu.classList.add("show-mobile-menu");
    userMobileOverlay.classList.add("show-mobile-overlay");
    document.body.style.overflow = "hidden";
  }
  function closeMobileMenu() {
    userMobileMenu.classList.remove("show-mobile-menu");
    userMobileOverlay.classList.remove("show-mobile-overlay");
    document.body.style.overflow = "";
  }
  userHeaderMobileToggle?.addEventListener("click", openMobileMenu);
  userMobileClose?.addEventListener("click", closeMobileMenu);
  userMobileOverlay?.addEventListener("click", closeMobileMenu);
  // =====================================================
  // CART BADGE
  // =====================================================
  async function updateCartIcon() {
    try {
      const response = await fetch("/user/cartDataIcon");
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      // CHECK: If the server returns HTML (Login Page), exit safely
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        console.log("Cart Badge: User is logged out. Skipping update.");
        return;
      }
      const data = await response.json();
      const itemCount = data.itemCount || 0;
      const cartBadges = document.querySelectorAll(".cart-badge");
      cartBadges.forEach((badge) => {
        if (itemCount > 0) {
          badge.textContent = itemCount;
          badge.style.display = "flex";
        } else {
          badge.style.display = "none";
        }
      });
    } catch (error) {
      console.error("Cart Icon Error:", error);
    }
  }
  // =====================================================
  // WISHLIST BADGE
  // =====================================================
  async function updateWishlistIcon() {
    try {
      const response = await fetch("/user/wishlistDataIcon");
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      // CHECK: If the server returns HTML (Login Page), exit safely
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        console.log("Wishlist Badge: User is logged out. Skipping update.");
        return;
      }
      const data = await response.json();
      const wishlistCount = data.wishlistCount || 0;
      const wishlistBadges = document.querySelectorAll(".wishlist-badge");
      wishlistBadges.forEach((badge) => {
        if (wishlistCount > 0) {
          badge.textContent = wishlistCount;
          badge.style.display = "flex";
        } else {
          badge.style.display = "none";
        }
      });
    } catch (error) {
      console.error("Wishlist Icon Error:", error);
    }
  }
  // =====================================================
  // STICKY HEADER EFFECT
  // =====================================================
  window.addEventListener("scroll", () => {
    const userHeader = document.querySelector(".user-header");
    if (!userHeader) return;
    if (window.scrollY > 20) {
      userHeader.classList.add("scrolled");
    } else {
      userHeader.classList.remove("scrolled");
    }
  });
  // =====================================================
  // INITIAL LOAD
  // =====================================================
  document.addEventListener("DOMContentLoaded", () => {
    updateCartIcon();
    updateWishlistIcon();
  });
});
