const Order = require("../models/orderSchema");
const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');

// Helper: Build shared order query matrix
function buildOrderQuery(startDate, endDate) {
    const query = {
        deliveryStatus: { $ne: 'Failed' },
        paymentStatus: { $ne: 'Failed' },
        $and: [
            {
                $or: [
                    { paymentMethod: { $regex: /^cod$/i }, deliveryStatus: { $ne: 'Pending' } },
                    { paymentMethod: { $not: /^cod$/i } }
                ]
            }
        ]
    };

    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt = { $gte: start, $lte: end };
    }

    return query;
}

// Helper: Process and filter orders for reports
function processOrdersForReport(orders) {
    let grossSales = 0;
    let totalRefund = 0;
    let netRevenue = 0;
    let totalValidOrdersCount = 0;
    const paymentSummary = {};
    const reportRows = [];
    const tableRowsHtml = [];

    orders.forEach((order) => {
        const method = (order.paymentMethod || "Other").toLowerCase();
        const status = order.deliveryStatus;

        if (method === 'cod' && status === 'Pending') {
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
        paymentSummary[formattedMethod] = (paymentSummary[formattedMethod] || 0) + net;

        // HTML Row
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

        // Structured Row for Excel/CSV
        reportRows.push({
            serial: totalValidOrdersCount,
            orderId: order.orderId,
            date: new Date(order.createdAt).toLocaleDateString(),
            customer: order.deliveryAddress?.name || "N/A",
            payment: formattedMethod,
            checkout,
            refund: refunded,
            net,
            status,
        });
    });

    return {
        grossSales,
        totalRefund,
        netRevenue,
        totalValidOrdersCount,
        paymentSummary,
        tableRowsHtml,
        reportRows
    };
}

// ---------------------------------------------------------------------------
// SERVICE METHODS
// ---------------------------------------------------------------------------

async function getSalesReportData(query, page, limit) {
    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.max(Math.ceil(totalOrders / limit), 1);
    const currentPage = Math.min(Math.max(page, 1), totalPages);

    const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * limit)
        .limit(limit)
        .lean();

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

    return { orders, reportSummary, currentPage, totalPages };
}

async function generatePdfBuffer(startDate, endDate) {
    const query = buildOrderQuery(startDate, endDate);
    const orders = await Order.find(query).sort({ createdAt: -1 }).lean();

    const formattedStartDate = startDate ? new Date(startDate).toLocaleDateString() : "All Time";
    const formattedEndDate = endDate ? new Date(endDate).toLocaleDateString() : "Present";
    const generatedDate = new Date().toLocaleString();

    const metrics = processOrdersForReport(orders);

    const html = `
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; color: #222; }
        .header { text-align: center; margin-bottom: 25px; }
        .brand { font-size: 32px; font-weight: bold; letter-spacing: 2px; color: #111; }
        .title { font-size: 22px; margin-top: 8px; }
        .report-details { margin-top: 15px; font-size: 13px; color: #555; }
        .summary-container { page-break-inside: avoid; margin: 30px 0; display: flex; justify-content: space-between; border: 1px solid #ddd; padding: 20px; background: #fdfdfd; }
        .summary-box { width: 48%; }
        .summary-box h3 { margin: 0 0 10px; font-size: 16px; border-bottom: 2px solid #111; padding-bottom: 5px; }
        .summary-item { margin: 8px 0; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #111; color: white; padding: 12px; font-size: 13px; text-align: left; }
        td { border: 1px solid #ddd; padding: 10px; font-size: 12px; }
        tr:nth-child(even) { background: #f5f5f5; }
        .status-badge { font-weight: bold; text-transform: uppercase; font-size: 10px; color: #555; }
        .footer { margin-top: 30px; text-align: right; font-size: 11px; color: #777; }
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
      <div class="summary-container">
        <div class="summary-box">
          <h3>Overall Summary</h3>
          <div class="summary-item">Total Orders: <strong>${metrics.totalValidOrdersCount}</strong></div>
          <div class="summary-item">Gross Sales: <strong>₹${metrics.grossSales.toLocaleString()}</strong></div>
          <div class="summary-item">Total Refunds: <strong>₹${metrics.totalRefund.toLocaleString()}</strong></div>
          <div class="summary-item">Net Revenue: <strong>₹${metrics.netRevenue.toLocaleString()}</strong></div>
        </div>
        <div class="summary-box">
          <h3>Payment Breakdown</h3>
          ${Object.entries(metrics.paymentSummary).map(([method, amount]) => `
          <div class="summary-item">${method}: <strong>₹${amount.toLocaleString()}</strong></div>
          `).join("")}
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
          ${metrics.tableRowsHtml.join("")}
        </tbody>
      </table>
      <div class="footer">Clothify Sales Analytics Report</div>
    </body>
    </html>
    `;

    const browser = await puppeteer.launch({
        // Uses container environment path, falls back to default locally
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Critical to prevent crash on small EC2 instances
            '--disable-gpu'
        ]
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });

    const pdf = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    return Buffer.from(pdf);
}

async function generateExcelWorkbook(startDate, endDate) {
    const query = buildOrderQuery(startDate, endDate);
    const orders = await Order.find(query).sort({ createdAt: -1 }).lean();

    const formattedStartDate = startDate ? new Date(startDate).toLocaleDateString() : "All Time";
    const formattedEndDate = endDate ? new Date(endDate).toLocaleDateString() : "Present";

    const metrics = processOrdersForReport(orders);

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

    // Header Construction
    worksheet.mergeCells("A1:I1");
    worksheet.getCell("A1").value = "CLOTHIFY SALES REPORT";
    worksheet.getCell("A1").font = { size: 18, bold: true };
    worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

    worksheet.mergeCells("A2:I2");
    worksheet.getCell("A2").value = `Report Period: ${formattedStartDate} to ${formattedEndDate}`;
    worksheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

    worksheet.mergeCells("A3:I3");
    worksheet.getCell("A3").value = `Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
    worksheet.getCell("A3").font = { italic: true, size: 10, color: { argb: "444444" } };
    worksheet.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

    // Summary Section
    worksheet.addRow([]);
    let row = worksheet.addRow(["SUMMARY"]);
    worksheet.mergeCells(`A${row.number}:B${row.number}`);
    row.getCell(1).font = { bold: true, size: 13 };

    worksheet.addRow(["Total Orders", metrics.totalValidOrdersCount]);
    worksheet.addRow(["Gross Sales", metrics.grossSales]);
    worksheet.addRow(["Total Refunds", metrics.totalRefund]);
    worksheet.addRow(["Net Revenue", metrics.netRevenue]);
    worksheet.getCell(`B${row.number + 2}`).numFmt = "₹#,##0.00";
    worksheet.getCell(`B${row.number + 3}`).numFmt = "₹#,##0.00";
    worksheet.getCell(`B${row.number + 4}`).numFmt = "₹#,##0.00";

    // Payment Breakdown Section
    worksheet.addRow([]);
    row = worksheet.addRow(["PAYMENT BREAKDOWN"]);
    worksheet.mergeCells(`A${row.number}:B${row.number}`);
    row.getCell(1).font = { bold: true, size: 12 };

    Object.entries(metrics.paymentSummary).forEach(([method, amount]) => {
        const paymentRow = worksheet.addRow([method, amount]);
        paymentRow.getCell(2).numFmt = "₹#,##0.00";
    });

    // Table Header & Rows
    worksheet.addRow([]);
    worksheet.addRow([]);
    const headerRow = worksheet.addRow([
        "#", "Order ID", "Date", "Customer", "Payment", "Checkout Total", "Refunded", "Net Amount", "Status"
    ]);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "000000" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    metrics.reportRows.forEach((order) => {
        const r = worksheet.addRow(order);
        r.eachCell((cell) => {
            cell.alignment = { horizontal: "center", vertical: "middle" };
        });
    });

    worksheet.getColumn("checkout").numFmt = "₹#,##0.00";
    worksheet.getColumn("refund").numFmt = "₹#,##0.00";
    worksheet.getColumn("net").numFmt = "₹#,##0.00";

    worksheet.eachRow((rItem, rowNumber) => {
        if (rowNumber < headerRow.number) return;
        rItem.eachCell((cell) => {
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

    return workbook;
}

async function generateCsvWorkbook(startDate, endDate) {
    const query = buildOrderQuery(startDate, endDate);
    const orders = await Order.find(query).sort({ createdAt: -1 }).lean();

    const formattedStartDate = startDate ? new Date(startDate).toLocaleDateString() : "All Time";
    const formattedEndDate = endDate ? new Date(endDate).toLocaleDateString() : "Present";

    const metrics = processOrdersForReport(orders);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

    worksheet.addRow(["CLOTHIFY SALES REPORT"]);
    worksheet.addRow([`Report Period: ${formattedStartDate} to ${formattedEndDate}`]);
    worksheet.addRow([`Generated on: ${new Date().toLocaleString()}`]);
    worksheet.addRow([]);

    worksheet.addRow(["SUMMARY"]);
    worksheet.addRow(["Total Orders", metrics.totalValidOrdersCount]);
    worksheet.addRow(["Gross Sales", metrics.grossSales.toLocaleString()]);
    worksheet.addRow(["Total Refunds", metrics.totalRefund.toLocaleString()]);
    worksheet.addRow(["Net Revenue", metrics.netRevenue.toLocaleString()]);
    worksheet.addRow([]);

    worksheet.addRow(["PAYMENT BREAKDOWN"]);
    Object.entries(metrics.paymentSummary).forEach(([method, amount]) => {
        worksheet.addRow([method, amount.toLocaleString()]);
    });

    worksheet.addRow([]);
    worksheet.addRow([]);

    worksheet.addRow([
        "#", "Order ID", "Date", "Customer", "Payment Method", "Checkout Total", "Refunded", "Net Amount", "Status"
    ]);

    metrics.reportRows.forEach((row) => {
        worksheet.addRow([
            row.serial,
            row.orderId,
            row.date,
            row.customer,
            row.payment,
            row.checkout.toLocaleString(),
            row.refund.toLocaleString(),
            row.net.toLocaleString(),
            row.status
        ]);
    });

    return workbook;
}

module.exports = {
    buildOrderQuery,
    getSalesReportData,
    generatePdfBuffer,
    generateExcelWorkbook,
    generateCsvWorkbook
};