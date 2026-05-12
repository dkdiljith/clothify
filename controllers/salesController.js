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

        // Generate HTML
        const html =
            `<html>
    <head>
        <style>
            body{
                font-family: Arial, sans-serif;
                padding: 30px;
                color: #222;
            }

            .header{
                text-align: center;
                margin-bottom: 30px;
            }

            .brand{
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 2px;
                color: #111;
            }

            .title{
                font-size: 22px;
                margin-top: 8px;
            }

            .report-details{
                margin-top: 15px;
                font-size: 13px;
                color: #555;
            }

            table{
                width: 100%;
                border-collapse: collapse;
                margin-top: 25px;
            }

            th{
                background: #111;
                color: white;
                padding: 12px;
                font-size: 13px;
                text-align: left;
            }

            td{
                border: 1px solid #ddd;
                padding: 10px;
                font-size: 12px;
            }

            tr:nth-child(even){
                background: #f5f5f5;
            }

            .footer{
                margin-top: 30px;
                text-align: right;
                font-size: 11px;
                color: #777;
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

        // Create workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        // Brand title
        worksheet.mergeCells('A1:F1');
        worksheet.getCell('A1').value = 'CLOTHIFY SALES REPORT';
        worksheet.getCell('A1').font = {
            size: 18,
            bold: true
        };

        worksheet.getCell('A1').alignment = {
            horizontal: 'center'
        };

        // Date range
        worksheet.mergeCells('A2:F2');

        worksheet.getCell('A2').value =
            `Report Range: ${startDate || 'All Time'} to ${endDate || 'Present'}`;

        worksheet.getCell('A2').alignment = {
            horizontal: 'center'
        };

        // Empty row
        worksheet.addRow([]);

        // Table headers
        worksheet.columns = [
            { header: '#', key: 'serial', width: 10 },
            { header: 'Order ID', key: 'orderId', width: 25 },
            { header: 'Date', key: 'date', width: 20 },
            { header: 'Customer', key: 'customer', width: 30 },
            { header: 'Payment', key: 'payment', width: 20 },
            { header: 'Total Amount', key: 'total', width: 20 }
        ];

        // Header styling
        worksheet.getRow(4).font = {
            bold: true,
            color: { argb: 'FFFFFFFF' }
        };

        worksheet.getRow(4).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '000000' }
        };

        // Add order rows
        orders.forEach((order, index) => {

            worksheet.addRow({
                serial: index + 1,
                orderId: order.orderId,
                date: new Date(order.createdAt).toLocaleDateString(),
                customer: order.deliveryAddress?.name || 'N/A',
                payment: order.paymentMethod,
                total: `₹${order.totalAmount}`
            });

        });

        // Border styling
        worksheet.eachRow((row) => {

            row.eachCell((cell) => {

                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };

                cell.alignment = {
                    vertical: 'middle',
                    horizontal: 'left'
                };

            });

        });

        // Response headers
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );

        res.setHeader(
            'Content-Disposition',
            'attachment; filename=sales-report.xlsx'
        );

        // Send workbook
        await workbook.xlsx.write(res);

        res.end();

    } catch (error) {
        console.log(error);
        return res.status(500).send('Failed to generate excel report');
    }
};