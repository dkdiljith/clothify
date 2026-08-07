document.addEventListener("DOMContentLoaded", () => {
    /* ==========================================
         Elements
      ========================================== */
    const changePasswordButton = document.getElementById("changePasswordButton");
    if (!changePasswordButton) return;
    /* ==========================================
         Change Password
      ========================================== */
    changePasswordButton.addEventListener("click", () => {
        changePasswordButton.disabled = true;
        changePasswordButton.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2"></span>
            Redirecting...
        `;
        window.location.href = "/user/forgetPassword?priority=true";
    });
});
