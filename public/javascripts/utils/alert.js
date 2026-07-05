/**
 * Professional Center Confirmation Alert Modal
 * @param {string} title - The main heading/warning title
 * @param {string} message - Detailed multi-line context or awareness text
 * @param {string} type - 'danger' (red), 'warning' (yellow), 'info' (blue), 'success' (green)
 * @returns {Promise<boolean>} - Resolves to true if OK/Confirm is clicked, false if Cancel is clicked.
 */
function showCustomConfirm(title, message, type = "danger") {
  return new Promise((resolve) => {
    // FIX: Remove any existing custom modals instantly to prevent stacking bugs
    const existingBackdrop = document.querySelector(".modal-backdrop");
    if (existingBackdrop) {
      existingBackdrop.remove();
    }

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    const icons = {
      danger: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`,
      warning: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`,
      info: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
      success: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
    };

    const formattedMessage = message.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '<div class="modal-gap"></div>').join('');
    const showCancel = (type === 'danger' || type === 'warning');
    const cancelBtnHTML = showCancel ? `<button type="button" class="modal-btn modal-btn-cancel">Cancel</button>` : '';

    backdrop.innerHTML = `
      <div class="modal-alert-window modal-type-${type}">
        <div class="modal-body-layout">
          <div class="modal-icon-frame">${icons[type] || icons.info}</div>
          <div class="modal-text-frame">
            <h3 class="modal-title-text">${title}</h3>
            <div class="modal-description-text">${formattedMessage}</div>
          </div>
        </div>
        <div class="modal-actions-layout">
          ${cancelBtnHTML}
          <button type="button" class="modal-btn modal-btn-confirm">OK</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    requestAnimationFrame(() => {
      backdrop.classList.add("modal-active");
    });

    const closeModal = (result) => {
      backdrop.classList.remove("modal-active");
      setTimeout(() => {
        backdrop.remove();
        resolve(result);
      }, 300);
    };

    const cancelBtn = backdrop.querySelector(".modal-btn-cancel");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => closeModal(false));
    }

    backdrop.querySelector(".modal-btn-confirm").addEventListener("click", () => closeModal(true));
  });
}