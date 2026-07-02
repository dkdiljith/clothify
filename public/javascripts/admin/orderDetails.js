document.addEventListener("DOMContentLoaded", function () {

    document.body.addEventListener('change', (event) => {

        const dropdown = event.target.closest('.status-dropdown');

        if (dropdown) {

            const itemId = dropdown.dataset.itemId;
            const orderId = dropdown.dataset.orderId;
            const selectedValue = dropdown.value;

            updateItemStatus(orderId, itemId, selectedValue);
        }
    });


    function updateItemStatus(orderId, itemId, newStatus) {

        if (!confirm(`Are you sure you want to change status to "${newStatus}"?`)) {
            return;
        }

        fetch(`/admin/orderDetails/${orderId}/item/${itemId}/status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus }),
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                showPopupMessage(`Status updated to ${newStatus}`, 'success');
                setTimeout(() => window.location.reload(), 1500);
            })
            .catch(error => {
                console.error('Error updating status:', error);
                showPopupMessage('Failed to update status', 'error');
            });
    }

    // Download Invoice
    document.getElementById("download-invoice-button")
        ?.addEventListener("click", async function () {
            const orderId = this.dataset.orderId;

            try {

                const response = await fetch(
                    "/admin/download-invoice",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            orderId: orderId
                        })
                    }
                );

                if (!response.ok) {

                    showPopupMessage(
                        "Invoice generation failedddddddddddddddd",
                        "error"
                    );

                    return;
                }

                const blob =
                    await response.blob();

                const url =
                    window.URL.createObjectURL(blob);

                const a =
                    document.createElement("a");

                a.href = url;

                a.download =
                    "invoice.pdf";

                document.body.appendChild(a);

                a.click();

                a.remove();

                window.URL.revokeObjectURL(url);

            } catch (error) {

                console.log(error);

                showPopupMessage(
                    "Invoice could not be generated",
                    "error"
                );
            }
        });

})