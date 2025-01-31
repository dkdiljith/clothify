// Sample order data (replace with actual data from your backend)
const orders = [
    { id: 1, customer: "John Doe", date: "2024-07-28", status: "Shipped", total: "$50.00", items: [{product: "Product A", qty: 2, price: 10}, {product: "Product B", qty: 1, price: 15}] },
    { id: 2, customer: "Jane Smith", date: "2024-07-27", status: "Pending", total: "$25.00", items: [{product: "Product C", qty: 1, price: 25}] },
    // ... more order data
];

const tableBody = document.querySelector("table tbody");
const modal = document.getElementById("orderModal");
const modalContent = document.querySelector(".modal-content");
const span = document.querySelector(".close");
const modalOrderItems = document.getElementById("modal-order-items");


function displayOrders(ordersToDisplay = orders) {
    tableBody.innerHTML = ""; // Clear existing rows
    ordersToDisplay.forEach(order => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${order.id}</td>
            <td>${order.customer}</td>
            <td>${order.date}</td>
            <td>${order.status}</td>
            <td>${order.total}</td>
            <td class="actions">
                <button class="view-btn" data-order-id="${order.id}">View</button>
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">Delete</button>
            </td>
        `;

        const viewButton = row.querySelector(".view-btn");
        viewButton.addEventListener("click", () => {
            openModal(order.id);
        });
    });
}

function openModal(orderId) {
    const order = orders.find(o => o.id === orderId);
    if(order){
        // Load order details into the modal
        const orderDetailsDiv = modalContent.querySelector(".order-details");
        orderDetailsDiv.innerHTML = `
            <div><strong>Order ID:</strong> ${order.id}</div>
            <div><strong>Customer:</strong> ${order.customer}</div>
            <div><strong>Date:</strong> ${order.date}</div>
            <div><strong>Status:</strong> ${order.status}</div>
            <div><strong>Total:</strong> ${order.total}</div>
            `;

        modalOrderItems.innerHTML = ""; // Clear previous items
        order.items.forEach(item => {
            const itemRow = modalOrderItems.insertRow();
            itemRow.innerHTML = `
                <td>${item.product}</td>
                <td>${item.qty}</td>
                <td>${item.price}</td>
                <td>${item.qty * item.price}</td>
            `;
        });
        modal.style.display = "block";
    }
}

span.onclick = function() {
    modal.style.display = "none";
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

displayOrders(); // Initial display of orders


// ... (rest of the JavaScript code for search, filtering, pagination, etc.) ...