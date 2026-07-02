document.addEventListener("DOMContentLoaded", function () {
    // Elements
    const cancelButton = document.getElementById("cancel-order-button");
    const returnButton = document.getElementById("return-order-button");
    const returnAllButton = document.getElementById("returnAll-order-button");
    let activeReturnContext = null;
    let returnAll = false;

    const cancelModal = document.getElementById("cancel-order-modal");
    const returnModal = document.getElementById("return-order-modal");
    const successMessage = document.getElementById("success-message");

    const orderStatus = cancelButton ? cancelButton.dataset.orderStatus : "";
    const completionDate = returnButton ? new Date(returnButton.dataset.completionDate) : null;

    // Cancel Button Logic
    if (cancelButton) {
        if (orderStatus !== "Pending") {
            cancelButton.disabled = true;
        } else {
            cancelButton.addEventListener("click", function () {
                cancelModal.style.display = "flex";
            });
        }
    }

    // Close Cancel Modal
    document.querySelector("#cancel-order-modal .close-modal")?.addEventListener("click", function () {
        cancelModal.style.display = "none";
    });

    document.getElementById("cancel-modal-button")?.addEventListener("click", function () {
        cancelModal.style.display = "none";
    });

    // Submit Cancellation
    document.getElementById("submit-cancellation")?.addEventListener("click", async function () {
        const reason = document.getElementById("cancellation-reason").value.trim();

        if (!reason) {
            alert("Please provide a reason for cancellation.");
            return;
        }

        const cancelBtn = document.getElementById("cancel-order-button");
        if (!cancelBtn) {
            alert("Error: Cancel button context not found.");
            return;
        }

        const data = {
            orderId: cancelBtn.dataset.orderId,
            itemId: cancelBtn.dataset.itemId,
            variationIndex: cancelBtn.dataset.variationIndex,
            reason: reason
        };

        try {
            const response = await fetch("/user/cancel-order", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                if (typeof cancelModal !== 'undefined') cancelModal.style.display = "none";
                showSuccessMessage();
            } else {
                const errorData = await response.json();
                alert(errorData.message || "Failed to cancel order. Please try again.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("An error occurred. Please try again.");
        }
    });



    // Download Invoice
    document.getElementById("download-invoice-button")?.addEventListener("click", async function () {
        const orderId = this.dataset.orderId;

        if (!orderId) {
            showPopupMessage("Order reference missing", "error");
            return;
        }

        try {
            const response = await fetch("/user/download-invoice", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ orderId: orderId })
            });

            if (!response.ok) {
                showPopupMessage("Invoice generation failed", "error");
                return;
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `invoice-${orderId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            showPopupMessage("Invoice could not be generated", "error");
        }
    });


    //  Return Button Initialization Logic
    if (orderStatus === "Completed" && completionDate && !isNaN(completionDate)) {
        const currentDate = new Date();
        const returnEndDate = new Date(completionDate);
        returnEndDate.setDate(returnEndDate.getDate() + 7);

        if (currentDate > returnEndDate) {
            if (returnButton) returnButton.disabled = true;
            if (returnAllButton) returnAllButton.disabled = true;
        } else {
            returnButton?.addEventListener("click", function () {
                returnAll = false; // FIX: Reset state flag for single items explicitly
                returnModal.style.display = "flex";
            });
            returnAllButton?.addEventListener("click", function () {
                returnAll = true; // Set state flag for full returns
                returnModal.style.display = "flex";
            });
        }
    } else {
        // If item status is already modified, fallback lets user press button or disables gracefully
        returnButton?.addEventListener("click", function () {
            returnAll = false;
            returnModal.style.display = "flex";
        });
        returnAllButton?.addEventListener("click", function () {
            returnAll = true;
            returnModal.style.display = "flex";
        });
    }

    // Close Return Modal
    document.querySelector("#return-order-modal .close-modal")?.addEventListener("click", function () {
        returnAll = false;
        returnModal.style.display = "none";
    });

    document.getElementById("cancel-return-modal-button")?.addEventListener("click", function () {
        returnAll = false;
        returnModal.style.display = "none";
    });


    // Track opening via "Return Item" button
    document.getElementById("return-order-button")?.addEventListener("click", function () {
        activeReturnContext = this.dataset;
    });

    // Track opening via "Return All" button
    document.getElementById("returnAll-order-button")?.addEventListener("click", function () {
        activeReturnContext = this.dataset;
    });

    // Submit Return Listener
    document.getElementById("submit-return")?.addEventListener("click", async function () {
        const reason = document.getElementById("return-reason").value.trim();
        const errorElement = document.getElementById("return-reason-error");

        if (!reason) {
            if (errorElement) errorElement.style.display = "block";
            return;
        }

        if (errorElement) errorElement.style.display = "none";

        // Ensure we have context data from the clicked button
        if (!activeReturnContext) {
            alert("Error: Return context missing. Please try again.");
            return;
        }

        // Map your payload cleanly using dataset variables
        const data = {
            orderId: activeReturnContext.orderId,
            itemId: activeReturnContext.itemId,
            returnAll: activeReturnContext.returnAll === "true",
            reason: reason
        };

        try {
            const response = await fetch("/user/return-order", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                if (typeof returnModal !== 'undefined') returnModal.style.display = "none";
                showSuccessMessage();
            } else {
                const errorData = await response.json();
                alert(errorData.message || "Failed to return order. Please try again.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("An error occurred. Please try again.");
        }
    });


    // Close Success Message
    document.getElementById("close-success-message")?.addEventListener("click", function () {
        successMessage.style.display = "none";
        window.location.reload();
    });

    // Close modals when clicking outside
    window.addEventListener("click", function (event) {
        if (event.target === cancelModal) {
            cancelModal.style.display = "none";
        }
        if (event.target === returnModal) {
            returnModal.style.display = "none";
            returnAll = false;
        }
    });

    // Helper function to show success message
    function showSuccessMessage() {
        successMessage.style.display = "block";
        setTimeout(() => {
            if (successMessage.style.display === "block") {
                successMessage.style.display = "none";
                window.location.reload();
            }
        }, 3000);
    }
});