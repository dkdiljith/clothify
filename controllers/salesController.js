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
    body {
      font-family: Arial, sans-serif;
      padding: 30px;
      color: #222;
    }

    .header {
      text-align: center;
      margin-bottom: 25px;
    }

    .brand {
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 2px;
      color: #111;
    }

    .title {
      font-size: 22px;
      margin-top: 8px;
    }

    .report-details {
      margin-top: 15px;
      font-size: 13px;
      color: #555;
    }

    .summary-container {
      page-break-inside: avoid;
      margin: 30px 0;
      display: flex;
      justify-content: space-between;
      border: 1px solid #ddd;
      padding: 20px;
      background: #fdfdfd;
    }

    .summary-box {
      width: 48%;
    }

    .summary-box h3 {
      margin: 0 0 10px;
      font-size: 16px;
      border-bottom: 2px solid #111;
      padding-bottom: 5px;
    }

    .summary-item {
      margin: 8px 0;
      font-size: 14px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }

    th {
      background: #111;
      color: white;
      padding: 12px;
      font-size: 13px;
      text-align: left;
    }

    td {
      border: 1px solid #ddd;
      padding: 10px;
      font-size: 12px;
    }

    tr:nth-child(even) {
      background: #f5f5f5;
    }

    .status-badge {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 10px;
      color: #555;
    }

    .footer {
      margin-top: 30px;
      text-align: right;
      font-size: 11px;
      color: #777;
    }

    tr {
      page-break-inside: avoid;
    }

    thead {
      display: table-header-group;
    }

    @page {
      margin: 20mm;
    }
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
  <!-- SUMMARY MOVED HERE -->
  <div class="summary-container">
    <div class="summary-box">
      <h3>Overall Summary</h3>
      <div class="summary-item">
        Total Orders:
        <strong>${totalValidOrdersCount}</strong>
      </div>
      <div class="summary-item">
        Gross Sales:
        <strong>₹${grossSales.toLocaleString()}</strong>
      </div>
      <div class="summary-item">
        Total Refunds:
        <strong>₹${totalRefund.toLocaleString()}</strong>
      </div>
      <div class="summary-item">
        Net Revenue:
        <strong>₹${netRevenue.toLocaleString()}</strong>
      </div>
    </div>
    <div class="summary-box">
      <h3>Payment Breakdown</h3>
      ${Object.entries(paymentSummary)
                .map(([method, amount]) => `
      <div class="summary-item">
        ${method}:
        <strong>₹${amount.toLocaleString()}</strong>
      </div>
      `)
                .join("")}
    </div>
  </div>
  <!-- SALES TABLE -->
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
  <div class="footer">
    Clothify Sales Analytics Report
  </div>
</body>

</html>
`;

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
        let query = {
            deliveryStatus: { $ne: "Failed" },
            paymentStatus: { $ne: "Failed" },
        };
        const formattedStartDate = startDate
            ? new Date(startDate).toLocaleDateString()
            : "All Time";
        const formattedEndDate = endDate
            ? new Date(endDate).toLocaleDateString()
            : "Present";
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt = {
                $gte: start,
                $lte: end,
            };
        }
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .lean();
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Sales Report");
        worksheet.columns = [
            { key: "serial", width: 10 },
            { key: "orderId", width: 24 },
            { key: "date", width: 18 },
            { key: "customer", width: 28 },
            { key: "payment", width: 18 },
            { key: "checkout", width: 18 },
            { key: "refund", width: 18 },
            { key: "net", width: 18 },
            { key: "status", width: 18 },
        ];
        let grossSales = 0;
        let totalRefund = 0;
        let netRevenue = 0;
        let totalValidOrdersCount = 0;
        const paymentSummary = {};
        const reportRows = [];
        // Process Orders
        orders.forEach((order) => {
            const method = (order.paymentMethod || "Other").toLowerCase();
            const status = order.deliveryStatus;
            if (method === "cod" && status === "Pending") return;
            const checkout = Number(order.checkoutTotal) || 0;
            const refunded = Number(order.totalRefundAmount) || 0;
            const net = Number(order.totalAmount) || 0;
            grossSales += checkout;
            totalRefund += refunded;
            netRevenue += net;
            totalValidOrdersCount++;
            const paymentMethod = order.paymentMethod || "Other";
            paymentSummary[paymentMethod] =
                (paymentSummary[paymentMethod] || 0) + net;
            reportRows.push({
                serial: totalValidOrdersCount,
                orderId: order.orderId,
                date: new Date(order.createdAt).toLocaleDateString(),
                customer: order.deliveryAddress?.name || "N/A",
                payment: paymentMethod,
                checkout,
                refund: refunded,
                net,
                status,
            });
        });
        // ====================================================
        // HEADER
        // ====================================================
        worksheet.mergeCells("A1:I1");
        worksheet.getCell("A1").value = "CLOTHIFY SALES REPORT";
        worksheet.getCell("A1").font = { size: 18, bold: true };
        worksheet.getCell("A1").alignment = {
            horizontal: "center",
            vertical: "middle",
        };
        worksheet.mergeCells("A2:I2");
        worksheet.getCell("A2").value =
            `Report Period: ${formattedStartDate} to ${formattedEndDate}`;
        worksheet.getCell("A2").alignment = {
            horizontal: "center",
            vertical: "middle",
        };
        worksheet.mergeCells("A3:I3");
        worksheet.getCell("A3").value =
            `Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
        worksheet.getCell("A3").font = {
            italic: true,
            size: 10,
            color: { argb: "444444" },
        };
        worksheet.getCell("A3").alignment = {
            horizontal: "center",
            vertical: "middle",
        };
        // ====================================================
        // SUMMARY
        // ====================================================
        worksheet.addRow([]);
        let row = worksheet.addRow(["SUMMARY"]);
        worksheet.mergeCells(`A${row.number}:B${row.number}`);
        row.getCell(1).font = { bold: true, size: 13 };
        worksheet.addRow(["Total Orders", totalValidOrdersCount]);
        worksheet.addRow(["Gross Sales", grossSales]);
        worksheet.addRow(["Total Refunds", totalRefund]);
        worksheet.addRow(["Net Revenue", netRevenue]);
        worksheet.getCell(`B${row.number + 2}`).numFmt = "₹#,##0.00";
        worksheet.getCell(`B${row.number + 3}`).numFmt = "₹#,##0.00";
        worksheet.getCell(`B${row.number + 4}`).numFmt = "₹#,##0.00";
        // ====================================================
        // PAYMENT BREAKDOWN
        // ====================================================
        worksheet.addRow([]);
        row = worksheet.addRow(["PAYMENT BREAKDOWN"]);
        worksheet.mergeCells(`A${row.number}:B${row.number}`);
        row.getCell(1).font = { bold: true, size: 12 };
        Object.entries(paymentSummary).forEach(([method, amount]) => {
            const paymentRow = worksheet.addRow([method, amount]);
            paymentRow.getCell(2).numFmt = "₹#,##0.00";
        });
        // ====================================================
        // SALES TABLE
        // ====================================================
        worksheet.addRow([]);
        worksheet.addRow([]);
        const headerRow = worksheet.addRow([
            "#",
            "Order ID",
            "Date",
            "Customer",
            "Payment",
            "Checkout Total",
            "Refunded",
            "Net Amount",
            "Status",
        ]);
        headerRow.height = 30;
        headerRow.eachCell((cell) => {
            cell.font = {
                bold: true,
                color: { argb: "FFFFFF" },
            };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "000000" },
            };
            cell.alignment = {
                horizontal: "center",
                vertical: "middle",
            };
        });
        reportRows.forEach((order) => {
            const r = worksheet.addRow(order);
            r.eachCell((cell) => {
                cell.alignment = {
                    horizontal: "center",
                    vertical: "middle",
                };
            });
        });
        worksheet.getColumn("checkout").numFmt = "₹#,##0.00";
        worksheet.getColumn("refund").numFmt = "₹#,##0.00";
        worksheet.getColumn("net").numFmt = "₹#,##0.00";
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber < headerRow.number) return;
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
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=Clothify_Sales_Report.xlsx"
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
        // Base query: Filter out explicit system failures globally
        let query = {
            deliveryStatus: { $ne: 'Failed' },
            paymentStatus: { $ne: 'Failed' }
        };
        const formattedStartDate = startDate
            ? new Date(startDate).toLocaleDateString()
            : "All Time";
        const formattedEndDate = endDate
            ? new Date(endDate).toLocaleDateString()
            : "Present";
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt = {
                $gte: start,
                $lte: end
            };
        }
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .lean();
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Sales Report");
        let grossSales = 0;
        let totalRefund = 0;
        let netRevenue = 0;
        let totalValidOrdersCount = 0;
        const paymentSummary = {};
        const reportRows = [];
        // Process Orders
        orders.forEach((order) => {
            const method = (order.paymentMethod || "Other").toLowerCase();
            const status = order.deliveryStatus;
            // Skip Pending COD Orders
            if (method === "cod" && status === "Pending") {
                return;
            }
            const checkout = Number(order.checkoutTotal) || 0;
            const refunded = Number(order.totalRefundAmount) || 0;
            const net = Number(order.totalAmount) || 0;
            grossSales += checkout;
            totalRefund += refunded;
            netRevenue += net;
            totalValidOrdersCount++;
            const formattedMethod = order.paymentMethod || "Other";
            paymentSummary[formattedMethod] =
                (paymentSummary[formattedMethod] || 0) + net;
            reportRows.push([
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
        // ===============================
        // Report Header
        // ===============================
        worksheet.addRow(["CLOTHIFY SALES REPORT"]);
        worksheet.addRow([`Report Period: ${formattedStartDate} to ${formattedEndDate}`]);
        worksheet.addRow([`Generated on: ${new Date().toLocaleString()}`]);
        worksheet.addRow([]);
        // ===============================
        // Summary
        // ===============================
        worksheet.addRow(["SUMMARY"]);
        worksheet.addRow(["Total Orders", totalValidOrdersCount]);
        worksheet.addRow(["Gross Sales", grossSales.toLocaleString()]);
        worksheet.addRow(["Total Refunds", totalRefund.toLocaleString()]);
        worksheet.addRow(["Net Revenue", netRevenue.toLocaleString()]);
        worksheet.addRow([]);
        // ===============================
        // Payment Breakdown
        // ===============================
        worksheet.addRow(["PAYMENT BREAKDOWN"]);
        Object.entries(paymentSummary).forEach(([method, amount]) => {
            worksheet.addRow([method, amount.toLocaleString()]);
        });
        worksheet.addRow([]);
        worksheet.addRow([]);
        // ===============================
        // Sales Details
        // ===============================
        worksheet.addRow([
            "#",
            "Order ID",
            "Date",
            "Customer",
            "Payment Method",
            "Checkout Total",
            "Refunded",
            "Net Amount",
            "Status"
        ]);
        reportRows.forEach((row) => worksheet.addRow(row));
        // Download Headers
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=Clothify_Sales_Report.csv"
        );
        await workbook.csv.write(res);
        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).send("Error generating CSV report");
    }
};
