document.addEventListener("DOMContentLoaded", () => {

    const currentPath = window.location.pathname;
    const navItems = document.querySelectorAll(".settings-nav-item");

    navItems.forEach((item) => {
        item.classList.remove("active");
        const href = item.getAttribute("href");
        if (href && currentPath === href) {
            item.classList.add("active");
        }
    });
});