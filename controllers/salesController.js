const Order = require(`../models/orderSchema`)
const puppeteer = require('puppeteer'); //for pdf generation
const ExcelJS = require('exceljs'); //for excel generation

//MESSAGE_CONSTANTS
const MESSAGES = require(`../utils/constants`)

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


exports.salesReportRender = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = 5;

        // 1. ADVANCED DATABASE FILTER MATRIX
        // This explicitly allows all online/wallet payments, but enforces that 
        // if an item is COD, its status CANNOT be 'Pending'. It also blocks global failures.
        const query = {
            deliveryStatus: { $ne: 'Failed' },
            paymentStatus: { $ne: 'Failed' },
            $and: [
                {
                    $or: [
                        { paymentMethod: { $regex: /^cod$/i }, deliveryStatus: { $ne: 'Pending' } },
                        { paymentMethod: { $not: /^cod$/i } } // Safe fallback matching for razorpay, wallet, etc.
                    ]
                }
            ]
        };

        // Date Filter implementation
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }

        // 2. Pagination Calculation using structural query rules
        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.max(Math.ceil(totalOrders / limit), 1);
        const currentPage = Math.min(Math.max(page, 1), totalPages);

        // 3. Fetch Paginated Records
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .skip((currentPage - 1) * limit)
            .limit(limit)
            .lean();

        // 4. Safe Database Engine Aggregation
        const summary = await Order.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    grossSales: { $sum: "$checkoutTotal" },
                    totalRefunds: { $sum: "$totalRefundAmount" },
                    netRevenue: { $sum: "$totalAmount" },
                },
            },
        ]);

        const reportSummary = summary[0] || {
            totalOrders: 0,
            grossSales: 0,
            totalRefunds: 0,
            netRevenue: 0,
        };

        // 5. Output view pipeline parameters
        return res.render("admin/salesReport", {
            admin: true,
            orders,
            summary: reportSummary,
            pagination: {
                page: currentPage,
                limit,
                totalPages,
                nextPage: currentPage + 1,
                prevPage: currentPage - 1,
                hasNextPage: currentPage < totalPages,
                hasPrevPage: currentPage > 1,
                serialNumberStart: (currentPage - 1) * limit,
            },
            startDate: startDate || "",
            endDate: endDate || "",
        });

    } catch (error) {
        console.log("Sales report error:", error);
        return res.render("admin/salesReport", {
            admin: true,
            orders: [],
            summary: { totalOrders: 0, grossSales: 0, totalRefunds: 0, netRevenue: 0 },
            pagination: { page: 1, limit: 5, totalPages: 1, hasNextPage: false, hasPrevPage: false, serialNumberStart: 0 },
            startDate: "",
            endDate: "",
            errorMessage: "Error fetching sales report. Please try again later.",
        });
    }
};









exports.downloadSalesReportPdf = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // 1. Base query: Filter out explicit system failures globally
        let query = {
            deliveryStatus: { $ne: 'Failed' },
            paymentStatus: { $ne: 'Failed' }
        };

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }

        const orders = await Order.find(query).sort({ createdAt: -1 }).lean();

        const formattedStartDate = startDate ? new Date(startDate).toLocaleDateString() : "All Time";
        const formattedEndDate = endDate ? new Date(endDate).toLocaleDateString() : "Present";
        const generatedDate = new Date().toLocaleString();

        // 2. Initialize Single-Loop Metrics
        let grossSales = 0;
        let totalRefund = 0;
        let netRevenue = 0;
        let totalValidOrdersCount = 0;
        const paymentSummary = {};
        const tableRowsHtml = [];

        // 3. Process and Filter Rows Matrix-side
        orders.forEach((order) => {
            const method = (order.paymentMethod || "Other").toLowerCase();
            const status = order.deliveryStatus;

            // CRITICAL EXCLUSION: Skip if payment is Cash On Delivery AND order is still Pending
            if (method === 'cod' && status === 'Pending') {
                return; // Skip this unfulfilled order completely
            }

            const checkout = Number(order.checkoutTotal) || 0;
            const refunded = Number(order.totalRefundAmount) || 0;
            const net = Number(order.totalAmount) || 0;

            grossSales += checkout;
            totalRefund += refunded;
            netRevenue += net;
            totalValidOrdersCount++;

            const formattedMethod = order.paymentMethod || "Other";
            paymentSummary[formattedMethod] = (paymentSummary[formattedMethod] || 0) + net;

            // Build individual HTML rows dynamically
            tableRowsHtml.push(`
                <tr>
                    <td>${totalValidOrdersCount}</td>
                    <td>#${order.orderId}</td>
                    <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                    <td>${order.deliveryAddress?.name || "N/A"}</td>
                    <td>${formattedMethod}</td>
                    <td>₹${checkout.toLocaleString()}</td>
                    <td>₹${refunded.toLocaleString()}</td>
                    <td>₹${net.toLocaleString()}</td>
                    <td><span class="status-badge">${status}</span></td>
                </tr>
            `);
        });

        // 4. HTML Document Assembly with updated CSS layout structures
        const html = `
        <html>
        <head>
        <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #222; }
            .header { text-align: center; margin-bottom: 30px; }
            .brand { font-size: 32px; font-weight: bold; letter-spacing: 2px; color: #111; }
            .title { font-size: 22px; margin-top: 8px; }
            .report-details { margin-top: 15px; font-size: 13px; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 25px; }
            th { background: #111; color: white; padding: 12px; font-size: 13px; text-align: left; }
            td { border: 1px solid #ddd; padding: 10px; font-size: 12px; }
            tr:nth-child(even) { background: #f5f5f5; }
            .status-badge { font-weight: bold; text-transform: uppercase; font-size: 10px; color: #555; }
            .footer { margin-top: 30px; text-align: right; font-size: 11px; color: #777; }
            .summary-container { page-break-inside: avoid; margin-top: 30px; display: flex; justify-content: space-between; border: 1px solid #ddd; padding: 20px; background: #fdfdfd; }
            .summary-box { width: 48%; }
            .summary-box h3 { margin-top: 0; font-size: 16px; border-bottom: 2px solid #111; padding-bottom: 5px; }
            .summary-item { margin: 8px 0; font-size: 14px; }
            tr { page-break-inside: avoid; }
            thead { display: table-header-group; }
            @page { margin: 20mm; }
        </style>
        </head>
        <body>
            <div class="header">
                <div class="brand">CLOTHIFY</div>
                <div class="title">Sales Report</div>
                <div class="report-details">
                    <div><strong>Report Range:</strong> ${formattedStartDate} to ${formattedEndDate}</div>
                    <div style="margin-top:5px;"><strong>Generated On:</strong> ${generatedDate}</div>
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Order ID</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Payment</th>
                        <th>Checkout</th>
                        <th>Refunded</th>
                        <th>Net Amount</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRowsHtml.join("")}
                </tbody>
            </table>
            <div class="summary-container">
                <div class="summary-box">
                    <h3>Overall Summary</h3>
                    <div class="summary-item">Total Orders: <strong>${totalValidOrdersCount}</strong></div>
                    <div class="summary-item">Gross Sales: <strong>₹${grossSales.toLocaleString()}</strong></div>
                    <div class="summary-item">Total Refunds: <strong>₹${totalRefund.toLocaleString()}</strong></div>
                    <div class="summary-item">Net Revenue: <strong>₹${netRevenue.toLocaleString()}</strong></div>
                </div>
                <div class="summary-box">
                    <h3>Payment Breakdown</h3>
                    ${Object.entries(paymentSummary).map(([method, amount]) => `
                        <div class="summary-item">${method} : <strong>₹${amount.toLocaleString()}</strong></div>
                    `).join("")}
                </div>
            </div>
            <div class="footer">Clothify Sales Analytics Report</div>
        </body>
        </html>`;

        // 5. PDF Engine Compilation
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "domcontentloaded" });
        
        const pdf = await page.pdf({ format: "A4", printBackground: true });
        const pdfBuffer = Buffer.from(pdf);
        await browser.close();

        res.writeHead(200, {
            "Content-Type": "application/pdf",
            "Content-Disposition": "attachment; filename=sales-report.pdf",
            "Content-Length": pdfBuffer.length,
        });
        return res.end(pdfBuffer);

    } catch (error) {
        console.error(error);
        return res.status(500).send("Failed to generate PDF");
    }
};








exports.downloadSalesReportExcel = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // 1. Base query: Filter out explicit system failures globally
        let query = {
            deliveryStatus: { $ne: 'Failed' },
            paymentStatus: { $ne: 'Failed' }
        };

        const formattedStartDate = startDate ? new Date(startDate).toLocaleDateString() : "All Time";
        const formattedEndDate = endDate ? new Date(endDate).toLocaleDateString() : "Present";

        // Date Filter
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }

        const orders = await Order.find(query).sort({ createdAt: -1 }).lean();

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Sales Report");

        // HEADER (Updated range to I1 to include the new Status column)
        worksheet.mergeCells("A1:I1");
        const titleCell = worksheet.getCell("A1");
        titleCell.value = "CLOTHIFY SALES REPORT";
        titleCell.font = { size: 18, bold: true };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };

        // REPORT PERIOD
        worksheet.mergeCells("A2:I2");
        const rangeCell = worksheet.getCell("A2");
        rangeCell.value = `Report Period: ${formattedStartDate} to ${formattedEndDate}`;
        rangeCell.alignment = { horizontal: "center", vertical: "middle" };

        // GENERATED DATE
        worksheet.mergeCells("A3:I3");
        const generatedCell = worksheet.getCell("A3");
        generatedCell.value = `Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
        generatedCell.font = { italic: true, size: 10, color: { argb: "444444" } };
        generatedCell.alignment = { horizontal: "center", vertical: "middle" };

        // TABLE HEADER
        const headerRow = worksheet.getRow(5);
        headerRow.height = 30;
        headerRow.values = [
            "#",
            "Order ID",
            "Date",
            "Customer",
            "Payment",
            "Checkout Total",
            "Refunded",
            "Net Amount",
            "Status", // Added Status header column
        ];

        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: "FFFFFF" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "000000" } };
            cell.alignment = { horizontal: "center", vertical: "middle" };
        });

        // COLUMNS configuration
        worksheet.columns = [
            { key: "serial", width: 10 },
            { key: "orderId", width: 24 },
            { key: "date", width: 18 },
            { key: "customer", width: 28 },
            { key: "payment", width: 18 },
            { key: "checkout", width: 18 },
            { key: "refund", width: 18 },
            { key: "net", width: 18 },
            { key: "status", width: 18 }, // Added status key mapping
        ];

        let grossSales = 0;
        let totalRefund = 0;
        let netRevenue = 0;
        let totalValidOrdersCount = 0; 
        const paymentSummary = {};

        orders.forEach((order) => {
            const method = (order.paymentMethod || "Other").toLowerCase();
            const status = order.deliveryStatus;

            // 2. CRITICAL EXCLUSION: Skip if payment is Cash On Delivery AND order is still Pending
            if (method === 'cod' && status === 'Pending') {
                return; // Skip this unfulfilled order completely
            }

            const checkout = Number(order.checkoutTotal) || 0;
            const refunded = Number(order.totalRefundAmount) || 0;
            const net = Number(order.totalAmount) || 0;

            grossSales += checkout;
            totalRefund += refunded;
            netRevenue += net;
            totalValidOrdersCount++;

            const paymentMethod = order.paymentMethod || "Other";
            paymentSummary[paymentMethod] = (paymentSummary[paymentMethod] || 0) + net;

            const row = worksheet.addRow({
                serial: totalValidOrdersCount, // Use running valid index counter instead of raw index
                orderId: order.orderId,
                date: new Date(order.createdAt).toLocaleDateString(),
                customer: order.deliveryAddress?.name || "N/A",
                payment: paymentMethod,
                checkout,
                refund: refunded,
                net,
                status: status, // Output raw delivery lifecycle status string
            });

            row.eachCell((cell) => {
                cell.alignment = { horizontal: "center", vertical: "middle" };
            });
        });

        // CURRENCY FORMAT
        worksheet.getColumn("checkout").numFmt = "₹#,##0.00";
        worksheet.getColumn("refund").numFmt = "₹#,##0.00";
        worksheet.getColumn("net").numFmt = "₹#,##0.00";

        // SUMMARY (Shifted right to index 8 and 9 to fit the new layout grid cleanly)
        worksheet.addRow([]);
        const addSummaryRow = (label, value, bold = false, format = "0") => {
            const row = worksheet.addRow(["", "", "", "", "", "", "", label, value]);
            row.getCell(8).font = { bold };
            row.getCell(8).alignment = { horizontal: "right" };
            row.getCell(9).font = { bold };
            row.getCell(9).alignment = { horizontal: "center" };
            row.getCell(9).numFmt = format;
            return row;
        };

        const summaryTitle = worksheet.addRow([
            "", "", "", "", "", "", "", "SUMMARY", "",
        ]);
        worksheet.mergeCells(`H${summaryTitle.number}:I${summaryTitle.number}`);
        summaryTitle.getCell(8).font = { bold: true, size: 12 };
        summaryTitle.getCell(8).alignment = { horizontal: "center" };

        addSummaryRow("Total Orders:", totalValidOrdersCount);
        addSummaryRow("Gross Sales:", grossSales, true, "₹#,##0.00");
        addSummaryRow("Total Refunds:", totalRefund, true, "₹#,##0.00");
        addSummaryRow("Net Revenue:", netRevenue, true, "₹#,##0.00");

        worksheet.addRow([]);
        const paymentTitle = worksheet.addRow([
            "", "", "", "", "", "", "", "PAYMENT BREAKDOWN", "",
        ]);
        worksheet.mergeCells(`H${paymentTitle.number}:I${paymentTitle.number}`);
        paymentTitle.getCell(8).font = { bold: true };
        paymentTitle.getCell(8).alignment = { horizontal: "center" };

        Object.entries(paymentSummary).forEach(([method, amount]) => {
            addSummaryRow(`${method}:`, amount, false, "₹#,##0.00");
        });

        // BORDERS
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber < 5) return;
            row.eachCell((cell) => {
                if (cell.value !== null) {
                    cell.border = {
                        top: { style: "thin" },
                        left: { style: "thin" },
                        bottom: { style: "thin" },
                        right: { style: "thin" },
                    };
                }
            });
        });

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=Clothify_Sales_Report.xlsx",
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error(error);
        return res.status(500).send("Error generating report");
    }
};










exports.downloadSalesReportCsv = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // 1. Base query: Filter out explicit system failures globally
        let query = {
            deliveryStatus: { $ne: 'Failed' },
            paymentStatus: { $ne: 'Failed' }
        };

        const formattedStartDate = startDate ? new Date(startDate).toLocaleDateString() : "All Time";
        const formattedEndDate = endDate ? new Date(endDate).toLocaleDateString() : "Present";

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }

        // Fetch matched records from MongoDB
        const orders = await Order.find(query).sort({ createdAt: -1 }).lean();

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.addRow(['CLOTHIFY SALES REPORT']);
        worksheet.addRow([`Report Period: ${formattedStartDate} to ${formattedEndDate}`]);
        worksheet.addRow([`Generated on: ${new Date().toLocaleString()}`]);
        worksheet.addRow([]); // Spacer row

        // Add Table Headers
        worksheet.addRow(['#', 'Order ID', 'Date', 'Customer', 'Payment Method', 'Checkout Total', 'Refunded', 'Net Amount', 'Status']);

        let grossSales = 0;
        let totalRefund = 0;
        let netRevenue = 0;
        let totalValidOrdersCount = 0; // Track actual items in the report instead of orders.length
        const paymentSummary = {};

        orders.forEach((order) => {
            const method = (order.paymentMethod || "Other").toLowerCase();
            const status = order.deliveryStatus;

            // 2. CRITICAL EXCLUSION: Skip if payment is Cash On Delivery AND order is still Pending
            if (method === 'cod' && status === 'Pending') {
                return; // Skip this unfulfilled order completely
            }

            const checkout = Number(order.checkoutTotal) || 0;
            const refunded = Number(order.totalRefundAmount) || 0;
            const net = Number(order.totalAmount) || 0;

            // Accumulate metrics for active transactions
            grossSales += checkout;
            totalRefund += refunded;
            netRevenue += net;
            totalValidOrdersCount++;

            const formattedMethod = order.paymentMethod || "Other";
            paymentSummary[formattedMethod] = (paymentSummary[formattedMethod] || 0) + net;

            // Append row data to CSV worksheet
            worksheet.addRow([
                totalValidOrdersCount,
                order.orderId,
                new Date(order.createdAt).toLocaleDateString(),
                order.deliveryAddress?.name || "N/A",
                formattedMethod,
                checkout.toLocaleString(),
                refunded.toLocaleString(),
                net.toLocaleString(),
                status
            ]);
        });

        // Summary Section
        worksheet.addRow([]);
        worksheet.addRow(["SUMMARY"]);
        worksheet.addRow(["Total Orders:", totalValidOrdersCount]);
        worksheet.addRow(["Gross Sales:", grossSales.toLocaleString()]);
        worksheet.addRow(["Total Refunds:", totalRefund.toLocaleString()]);
        worksheet.addRow(["Net Revenue:", netRevenue.toLocaleString()]);
        worksheet.addRow([]);
        worksheet.addRow(["PAYMENT BREAKDOWN"]);

        Object.entries(paymentSummary).forEach(([method, amount]) => {
            worksheet.addRow([method, amount.toLocaleString()]);
        });

        // Set Headers for CSV Download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=Clothify_Sales_Report.csv');

        // Stream the CSV directly to the response
        await workbook.csv.write(res);
        res.end();

    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating CSV report');
    }
};
