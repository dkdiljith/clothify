const Order = require(`../models/orderSchema`)
const puppeteer = require('puppeteer'); //for pdf generation
const ExcelJS = require('exceljs'); //for excel generation

//MESSAGE_CONSTANTS
const MESSAGES = require(`../services/constants`)

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////





exports.salesReportRender = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = 5;

        // Base query
        let query = {
            paymentStatus: 'Completed'
        };

        // Date filtering
        if (startDate && endDate) {

            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            query.createdAt = {
                $gte: start,
                $lte: end
            };
        }

        // Total orders count
        const totalOrders = await Order.countDocuments(query);

        // Prevent totalPages from becoming 0
        const totalPages = Math.max(
            Math.ceil(totalOrders / limit),
            1
        );

        // Prevent invalid page numbers
        const currentPage = Math.min(page, totalPages);

        // Fetch paginated orders
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .skip((currentPage - 1) * limit)
            .limit(limit)
            .lean();

        // Render page
        return res.render('admin/salesReport', {
            admin: true,
            orders,
            pagination: {
                page: currentPage,
                limit,
                totalPages,
                nextPage: currentPage + 1,
                prevPage: currentPage - 1,
                hasNextPage: currentPage < totalPages,
                hasPrevPage: currentPage > 1,
                serialNumberStart: (currentPage - 1) * limit
            },
            startDate: startDate || '',
            endDate: endDate || ''
        });

    } catch (error) {
        console.log('Sales report error:', error);
        return res.render('admin/salesReport', {
            admin: true,
            orders: [],
            pagination: {
                page: 1,
                limit: 5,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
                serialNumberStart: 0
            },
            startDate: '',
            endDate: '',
            errorMessage: 'Error fetching sales report. Please try again later.'
        });
    }
};











exports.downloadSalesReportPdf = async (req, res) => {
    try {

        const { startDate, endDate } = req.query;
        let query = {
            paymentStatus: 'Completed'
        };

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


        const formattedStartDate = startDate
            ? new Date(startDate).toLocaleDateString()
            : 'All Time';

        const formattedEndDate = endDate
            ? new Date(endDate).toLocaleDateString()
            : 'Present';

        const generatedDate = new Date().toLocaleString();

        // Calculate Summary Data
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

        // Group amounts by payment method
        const paymentSummary = orders.reduce((acc, order) => {
            const method = order.paymentMethod || 'Unknown';
            acc[method] = (acc[method] || 0) + (order.totalAmount || 0);
            return acc;
        }, {});


        // Generate HTML
        const html =

            `<html>

<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 30px;
            color: #222;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
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

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 25px;
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

        .footer {
            margin-top: 30px;
            text-align: right;
            font-size: 11px;
            color: #777;
        }

        .summary-container {
            page-break-inside: avoid;
            margin-top: 30px;
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
            border: 1px solid #ddd;
            padding: 20px;
            background: #fdfdfd;
        }

        .summary-box h3 {
            margin-top: 0;
            font-size: 16px;
            border-bottom: 2px solid #111;
            padding-bottom: 5px;
        }

        .summary-item {
            margin: 8px 0;
            font-size: 14px;
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
        <div class="brand">
            CLOTHIFY
        </div>
        <div class="title">
            Sales Report
        </div>

        <div class="report-details">
            <div>
                <strong>Report Range:</strong>
                ${formattedStartDate} to ${formattedEndDate}
            </div>

            <div style="margin-top:5px;">
                <strong>Generated On:</strong>
                ${generatedDate}
            </div>
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
                <th>Total Amount</th>
            </tr>
        </thead>
        <tbody>
            ${orders.map((order, index) => `

            <tr>
                <td>${index + 1}</td>
                <td>
                    #${order.orderId}
                </td>
                <td>
                    ${new Date(order.createdAt).toLocaleDateString()}
                </td>
                <td>
                    ${order.deliveryAddress?.name || 'N/A'}
                </td>
                <td>
                    ${order.paymentMethod}
                </td>
                <td>
                    ₹${order.totalAmount}
                </td>
            </tr>

            `).join('')}

        </tbody>
    </table>

    <div class="summary-container">
        <div class="summary-box">
            <h3>Overall Summary</h3>
            <div class="summary-item">Total Orders: <strong>${totalOrders}</strong></div>
            <div class="summary-item">Total Revenue: <strong>₹${totalRevenue.toLocaleString()}</strong></div>
        </div>

        <div class="summary-box">
            <h3>Payment Breakdown</h3>
            ${Object.entries(paymentSummary).map(([method, amount]) => `
            <div class="summary-item">${method}: <strong>₹${amount.toLocaleString()}</strong></div>
            `).join('')}
        </div>
    </div>

    <div class="footer">
        Clothify Sales Analytics Report
    </div>

</body>

</html> `;

        // Launch browser
        const browser = await puppeteer.launch();

        const page = await browser.newPage();

        await page.setContent(html, {
            waitUntil: 'domcontentloaded'
        });

        // Generate PDF
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true
        });

        const pdfBuffer = Buffer.from(pdf);

        await browser.close();

        // Send PDF
        res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=sales-report.pdf',
            'Content-Length': pdfBuffer.length
        });


        console.log(Buffer.isBuffer(pdfBuffer));
        return res.end(pdfBuffer);

    } catch (error) {
        console.log(error);
        return res.status(500).send('Failed to generate PDF');
    }
};















exports.downloadSalesReportExcel = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = { paymentStatus: 'Completed' };

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }

        const orders = await Order.find(query).sort({ createdAt: -1 }).lean();
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        // 1. BRAND HEADER
        worksheet.mergeCells('A1:F1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'CLOTHIFY SALES REPORT';
        titleCell.font = { size: 18, bold: true };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        // 2. REPORT PERIOD (Row 2)
        worksheet.mergeCells('A2:F2');
        const rangeCell = worksheet.getCell('A2');
        rangeCell.value = `Report Period: ${startDate || 'All Time'} to ${endDate || 'Present'}`;
        rangeCell.alignment = { horizontal: 'center', vertical: 'middle' };

        // 3. GENERATED DATE & TIME (Row 3)
        worksheet.mergeCells('A3:F3');
        const genCell = worksheet.getCell('A3');
        const now = new Date();
        genCell.value = `Generated on: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;
        genCell.font = { italic: true, size: 10, color: { argb: '444444' } };
        genCell.alignment = { horizontal: 'center', vertical: 'middle' };

        // 4. TABLE HEADERS (Row 5 - shifted down for spacing)
        const headerRow = worksheet.getRow(5);
        headerRow.height = 30;
        headerRow.values = ['#', 'Order ID', 'Date', 'Customer', 'Payment Method', 'Amount'];
        
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        worksheet.columns = [
            { key: 'serial', width: 10 },
            { key: 'orderId', width: 25 },
            { key: 'date', width: 20 },
            { key: 'customer', width: 30 },
            { key: 'payment', width: 20 },
            { key: 'total', width: 20 }
        ];

        // 5. DATA ROWS
        let totalRevenue = 0;
        const paymentSummary = {};

        orders.forEach((order, index) => {
            const amount = Number(order.totalAmount) || 0;
            totalRevenue += amount;
            const method = order.paymentMethod || 'Other';
            paymentSummary[method] = (paymentSummary[method] || 0) + amount;

            const row = worksheet.addRow({
                serial: index + 1,
                orderId: order.orderId,
                date: new Date(order.createdAt).toLocaleDateString(),
                customer: order.deliveryAddress?.name || 'N/A',
                payment: method,
                total: amount
            });

            row.eachCell((cell) => {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });
        });

        worksheet.getColumn('total').numFmt = '₹#,##0.00';

        // 6. SUMMARY SECTION
        worksheet.addRow([]); 
        
        const addSummaryRow = (label, value, isBold = false, format = '0') => {
            const row = worksheet.addRow(['', '', '', '', label, value]);
            row.getCell(5).font = { bold: isBold };
            row.getCell(5).alignment = { horizontal: 'right' };
            row.getCell(6).font = { bold: isBold };
            row.getCell(6).alignment = { horizontal: 'center' };
            row.getCell(6).numFmt = format;
            return row;
        };

        const summaryTitle = worksheet.addRow(['', '', '', '', 'SUMMARY', '']);
        worksheet.mergeCells(`E${summaryTitle.number}:F${summaryTitle.number}`);
        summaryTitle.getCell(5).alignment = { horizontal: 'center' };
        summaryTitle.getCell(5).font = { bold: true, size: 12 };

        addSummaryRow('Total Orders:', orders.length, false, '0');
        addSummaryRow('Total Revenue:', totalRevenue, true, '₹#,##0.00');

        Object.entries(paymentSummary).forEach(([method, amt]) => {
            addSummaryRow(`${method}:`, amt, false, '₹#,##0.00');
        });

        // 7. BORDERS (Starts from row 5 for the table)
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber < 5) return; 
            row.eachCell((cell) => {
                if (cell.value !== null) {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                }
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Clothify_Sales_Report.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating report');
    }
};















exports.downloadSalesReportCsv = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = { paymentStatus: 'Completed' };

        // ... [Same date logic as your Excel code] ...

        const orders = await Order.find(query).sort({ createdAt: -1 }).lean();
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        // Note: CSV doesn't support mergeCells, so we just add these as rows
        worksheet.addRow(['CLOTHIFY SALES REPORT']);
        worksheet.addRow([`Report Period: ${startDate || 'All Time'} to ${endDate || 'Present'}`]);
        worksheet.addRow([`Generated on: ${new Date().toLocaleString()}`]);
        worksheet.addRow([]); // Spacer row

        // Add Table Headers
        worksheet.addRow(['#', 'Order ID', 'Date', 'Customer', 'Payment Method', 'Amount']);

        let totalRevenue = 0;
        const paymentSummary = {};

        orders.forEach((order, index) => {
            const amount = Number(order.totalAmount) || 0;
            totalRevenue += amount;
            const method = order.paymentMethod || 'Other';
            paymentSummary[method] = (paymentSummary[method] || 0) + amount;

            worksheet.addRow([
                index + 1,
                order.orderId,
                new Date(order.createdAt).toLocaleDateString(),
                order.deliveryAddress?.name || 'N/A',
                method,
                amount
            ]);
        });

        // Summary Section
        worksheet.addRow([]);
        worksheet.addRow(['SUMMARY']);
        worksheet.addRow(['Total Orders:', orders.length]);
        worksheet.addRow(['Total Revenue:', totalRevenue]);

        Object.entries(paymentSummary).forEach(([method, amt]) => {
            worksheet.addRow([`${method}:`, amt]);
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
