document.addEventListener("DOMContentLoaded", () => {
  // =====================================================
  // DROPDOWN (Profile Menu)
  // =====================================================
  const userHeaderDropdownButton = document.getElementById("userHeaderDropdownButton");
  const userHeaderDropdown = document.getElementById("userHeaderDropdown");

  function toggleUserHeaderDropdown() {
    if (!userHeaderDropdown) return;
    userHeaderDropdown.classList.toggle("show");

    const expanded = userHeaderDropdownButton?.getAttribute("aria-expanded") === "true";
    userHeaderDropdownButton?.setAttribute("aria-expanded", !expanded);
  }

  userHeaderDropdownButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleUserHeaderDropdown();
  });

  // Close Profile Dropdown on clicking anywhere outside
  window.addEventListener("click", (event) => {
    const clickedInsideDropdown = userHeaderDropdown?.contains(event.target);
    const clickedButton = userHeaderDropdownButton?.contains(event.target);

    if (!clickedInsideDropdown && !clickedButton) {
      userHeaderDropdown?.classList.remove("show");
      userHeaderDropdownButton?.setAttribute("aria-expanded", "false");
    }
  });

  // =====================================================
  // MOBILE MENU (Hamburger Drawer)
  // =====================================================
  const userHeaderMobileToggle = document.getElementById("userHeaderMobileToggle");
  const userMobileMenu = document.getElementById("userMobileMenu");
  const userMobileOverlay = document.getElementById("userMobileOverlay");
  const userMobileClose = document.getElementById("userMobileClose");

  function openMobileMenu() {
    if (!userMobileMenu || !userMobileOverlay) return;
    userMobileMenu.classList.add("show-mobile-menu");
    userMobileOverlay.classList.add("show-mobile-overlay");
    document.body.style.overflow = "hidden";
  }

  function closeMobileMenu() {
    if (!userMobileMenu || !userMobileOverlay) return;
    userMobileMenu.classList.remove("show-mobile-menu");
    userMobileOverlay.classList.remove("show-mobile-overlay");
    document.body.style.overflow = "";
  }

  userHeaderMobileToggle?.addEventListener("click", openMobileMenu);
  userMobileClose?.addEventListener("click", closeMobileMenu);
  userMobileOverlay?.addEventListener("click", closeMobileMenu);
});
