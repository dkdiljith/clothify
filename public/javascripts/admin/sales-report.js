  document.addEventListener('DOMContentLoaded', function () {
            // Set default dates (last 30 days)
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);

            document.getElementById('startDate').valueAsDate = startDate;
            document.getElementById('endDate').valueAsDate = endDate;

            // Apply filter button click handler
            document.getElementById('applyFilter').addEventListener('click', function () {
                const startDate = document.getElementById('startDate').value;
                const endDate = document.getElementById('endDate').value;

                if (!startDate || !endDate) {
                    Swal.fire('Error', 'Please select both start and end dates', 'error');
                    return;
                }

                if (new Date(startDate) > new Date(endDate)) {
                    Swal.fire('Error', 'Start date cannot be after end date', 'error');
                    return;
                }

                fetchSalesData(startDate, endDate);
            });

            // Export to PDF
            document.getElementById('exportPdf').addEventListener('click', exportToPdf);

            // Export to Excel
            document.getElementById('exportExcel').addEventListener('click', exportToExcel);

            function fetchSalesData(startDate, endDate) {
                fetch('/admin/salesReport', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        startDate: startDate,
                        endDate: endDate
                    })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            renderOrders(data.orders);
                        } else {
                            Swal.fire('Error', data.message || 'Failed to fetch sales data', 'error');
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        Swal.fire('Error', 'An error occurred while fetching data', 'error');
                    });
            }

            function renderOrders(orders) {
                const tbody = document.getElementById('ordersTableBody');
                tbody.innerHTML = '';

                if (orders.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No orders found for the selected period</td></tr>';
                    return;
                }

                orders.forEach(order => {
                    const row = document.createElement('tr');

                    // Format your order data here similar to your Handlebars template
                    row.innerHTML = `
                        <td>#${order._id.toString().substring(18, 24)}</td>
                        <td>${order.deliveryAddress.name}</td>
                        <td>
                            ${order.items.map(item => `
                                <div class="product-item">
                                    ${item.productName} (${item.productSize}) × ${item.quantity}<br>
                                    <small>₹${item.productPrice} each</small>
                                </div>
                            `).join('')}
                        </td>
                        <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                        <td>
                            ${order.paymentMethod}<br>
                            <small>${order.paymentStatus}</small>
                        </td>
                        <td>
                            ₹${order.totalAmount}<br>
                            <div class="order-details">
                                <span>Subtotal: ₹${order.subtotal}</span>
                                <span>Tax: ₹${order.tax}</span>
                                <span>Shipping: ₹${order.shippingFee}</span>
                            </div>
                        </td>
                    `;

                    tbody.appendChild(row);
                });
            }

            function exportToPdf() {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();

                // Get table data
                const table = document.getElementById('salesTable');
                const title = "Sales Report";
                const dateRange = `From ${document.getElementById('startDate').value} to ${document.getElementById('endDate').value}`;

                // Add title and date range
                doc.setFontSize(18);
                doc.text(title, 14, 15);
                doc.setFontSize(12);
                doc.text(dateRange, 14, 22);

                // Generate table
                doc.autoTable({
                    html: table,
                    startY: 30,
                    styles: {
                        fontSize: 8,
                        cellPadding: 2,
                        valign: 'middle'
                    },
                    headStyles: {
                        fillColor: [78, 115, 223],
                        textColor: 255,
                        fontStyle: 'bold'
                    },
                    alternateRowStyles: {
                        fillColor: [240, 240, 240]
                    },
                    columnStyles: {
                        0: { cellWidth: 20 },
                        1: { cellWidth: 25 },
                        2: { cellWidth: 45 },
                        3: { cellWidth: 20 },
                        4: { cellWidth: 20 },
                        5: { cellWidth: 90 }
                    }
                });

                // Save the PDF
                doc.save(`sales_report_${new Date().toISOString().slice(0, 10)}.pdf`);
            }

            function exportToExcel() {
                const table = document.getElementById('salesTable');
                const workbook = XLSX.utils.table_to_book(table);
                XLSX.writeFile(workbook, `sales_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
            }
        });