/**
 * Universal Popup Message
 * @param {string} message - The text to display
 * @param {string} type - 'success', 'error', 'warning', or 'info'
 */
function showPopupMessage(message, type = "success") {
    // Check if a popup already exists to prevent stacking overlaps (optional)
    const existingPopup = document.querySelector(".popup-message");
    if (existingPopup) existingPopup.remove();

    const popup = document.createElement("div");
    popup.className = `popup-message ${type}`;
    
    // Mapping icons to types
    const icons = {
        success: "check-circle",
        error: "exclamation-circle",
        warning: "exclamation-triangle",
        info: "info-circle"
    };

    popup.innerHTML = `
      <i class="fas fa-${icons[type] || icons.success}"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(popup);

    // Timing 
    setTimeout(() => {
        popup.classList.add("fade-out");
        setTimeout(() => popup.remove(), 500);
    }, 3000);
}