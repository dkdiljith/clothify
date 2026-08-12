document.addEventListener("DOMContentLoaded", () => {
    document.body.addEventListener("change", async (event) => {
        const dropdown = event.target.closest(".status-dropdown");
        if (!dropdown) return;
        const itemId = dropdown.dataset.itemId;
        const orderId = dropdown.dataset.orderId;
        const newStatus = dropdown.value;
        const confirmed = await showCustomConfirm(
            "Update Item Status",
            `Are you sure you want to change the item status to "${newStatus}"?`,
            "warning"
        );
        if (!confirmed) {
            window.location.reload();
            return;
        }
        dropdown.disabled = true;
        try {
            const response = await fetch(
                `/admin/orderDetails/${orderId}/item/${itemId}/status`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        status: newStatus
                    })
                }
            );
            const data = await response.json();
            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to update item status."
                );
            }
            let message = "Status updated successfully.";
            switch (newStatus) {
                case "Shipped":
                    message = "Item marked as shipped.";
                    break;
                case "Completed":
                    message = "Item marked as delivered.";
                    break;
                case "Cancelled":
                    message =
                        data.refundStatus === "No Refund Required"
                            ? "Item cancelled. No refund required."
                            : "Item cancelled successfully.";
                    break;
                case "Returned":
                    message = "Return approved and wallet refunded.";
                    break;
                case "Return Rejected":
                    message = "Return request rejected.";
                    break;
                default:
                    message = "Status updated successfully.";
            }
            showPopupMessage(
                message,
                "success"
            );
            setTimeout(() => {
                location.reload();
            }, 1800);
        } catch (error) {
            dropdown.disabled = false;
            showPopupMessage(
                error.message || "Unable to update item status.",
                "error"
            );
        }
    });
    ////////////////////////////////////////////////////////////////////////
    const invoiceButton =
        document.getElementById("download-invoice-button");
    if (!invoiceButton) return;
    invoiceButton.addEventListener("click", async function () {
        const orderId = this.dataset.orderId;
        this.disabled = true;
        this.textContent = "Generating...";
        try {
            const response = await fetch(
                "/admin/download-invoice",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        orderId
                    })
                }
            );
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "invoice.pdf";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            showPopupMessage(
                "Invoice downloaded successfully.",
                "success"
            );
        } catch (error) {
            showPopupMessage(
                error.message || "Invoice could not be generated.",
                "error"
            );
        } finally {
            this.disabled = false;
            this.textContent = "Download Invoice";
        }
    });
});