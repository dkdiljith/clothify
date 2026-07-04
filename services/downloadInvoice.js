const puppeteer = require('puppeteer');
const Order = require(`../models/orderSchema`)

//MESSAGE_CONSTANTS
const MESSAGES = require(`../utils/constants`)

//////////////////////////////////////////////////////////////////////////////////


const downloadInvoice = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId).lean();

        if (!order) {
            return res.status(404).send('Order not found');
        }

        const html = `
        <html>
        <head>
            <style>
                body {
                    font-family: 'Helvetica Neue', 'Helvetica', Arial, sans-serif;
                    padding: 40px;
                    color: #333;
                    line-height: 1.6;
                }

                /* Header Layout */
                .top-section {
                    display: flex;
                    justify-content: space-between;
                    border-bottom: 2px solid #eee;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }

                .brand h1 { margin: 0; font-size: 32px; letter-spacing: 1px; color: #000; }
                .invoice-meta { text-align: right; }
                .invoice-meta h2 { margin: 0; font-size: 24px; color: #555; }

                /* Address Section */
                .billing-box {
                    margin-bottom: 30px;
                }
                .label {
                    font-size: 11px;
                    text-transform: uppercase;
                    color: #888;
                    font-weight: bold;
                    margin-bottom: 5px;
                }

                /* Table Styling */
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                
                /* Repeating Header Logic */
                thead { display: table-header-group; }
                tr { page-break-inside: avoid; }

                th {
                    background: #f8f8f8;
                    color: #555;
                    padding: 12px;
                    text-align: left;
                    border-bottom: 2px solid #eee;
                    font-size: 13px;
                }

                td {
                    padding: 12px;
                    border-bottom: 1px solid #eee;
                    font-size: 13px;
                }

                /* Professional Summary Box */
                .summary-container {
                    width: 280px;
                    margin-left: auto;
                    margin-top: 40px;
                    border: 1px solid #eee;
                    padding: 20px;
                    background: #fdfdfd;
                    page-break-inside: avoid;
                }

                .summary-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    font-size: 14px;
                }

                .total-row {
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 2px solid #111;
                    font-weight: bold;
                    font-size: 16px;
                }

                .footer {
                    margin-top: 60px;
                    text-align: center;
                    font-size: 12px;
                    color: #999;
                    border-top: 1px solid #eee;
                    padding-top: 20px;
                }

                .discount { color: #d9534f; } /* Red for discounts */

            </style>
        </head>
        <body>
            <div class="top-section">
                <div class="brand">
                    <h1>CLOTHIFY</h1>
                    <p>Thrissur, Kerala, India</p>
                </div>
                <div class="invoice-meta">
                    <h2>INVOICE</h2>
                    <p><strong>#${order.orderId}</strong></p>
                    <p>${new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
            </div>

            <div class="billing-box">
                <div class="label">Bill To:</div>
                <p style="margin:0;">
                    <strong>${order.deliveryAddress.name}</strong><br>
                    ${order.deliveryAddress.streetAddress}<br>
                    ${order.deliveryAddress.city}, ${order.deliveryAddress.state}<br>
                    Ph: ${order.deliveryAddress.phone}
                </p>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Size</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items.map(item => `
                        <tr>
                            <td>${item.productName}</td>
                            <td>${item.productSize}</td>
                            <td>${item.quantity}</td>
                            <td>₹${item.productPrice.toLocaleString()}</td>
                            <td>₹${(item.productPrice * item.quantity).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="summary-container">
                <div style="font-weight: bold; margin-bottom: 12px; font-size: 14px; color: #555;">Amount Details</div>
                
                <div class="summary-row">
                    <span>Subtotal</span>
                    <span>₹${order.subtotal.toLocaleString()}</span>
                </div>

                <div class="summary-row">
                    <span>Shipping</span>
                    <span>₹${order.shippingFee.toLocaleString()}</span>
                </div>

                <div class="summary-row">
                    <span>Estimated Tax</span>
                    <span>₹${order.tax.toLocaleString()}</span>
                </div>

                ${order.couponDiscount ? `
                    <div class="summary-row discount">
                        <span>Coupon Savings</span>
                        <span>-₹${order.couponDiscount.toLocaleString()}</span>
                    </div>
                ` : ''}

                ${order.offerDiscount ? `
                    <div class="summary-row discount">
                        <span>Offer Savings</span>
                        <span>-₹${order.offerDiscount.toLocaleString()}</span>
                    </div>
                ` : ''}

                <div class="summary-row total-row">
                    <span>Total Amount</span>
                    <span>₹${order.totalAmount.toLocaleString()}</span>
                </div>
            </div>

            <div class="footer">
                Thank you for choosing <strong>CLOTHIFY</strong>. 
                <br>For any support, contact us at support@clothify.com
            </div>
        </body>
        </html>
        `;

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
      
      
              return res.end(pdfBuffer);

    } catch (error) {
        console.error('Invoice Generation Error:', error);
        return res.status(500).send('Failed to generate invoice');
    }
};




module.exports = downloadInvoice;