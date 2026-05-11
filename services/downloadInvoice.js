const puppeteer = require('puppeteer');
const Order = require(`../models/orderSchema`)

//////////////////////////////////////////////////////////////////////////////////


const downloadInvoice = async (req, res) => {

    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId).lean();

        if (!order) {
            return res.status(404).send(
                'Order not found'
            );
        }

        const html = `
            <html>
            <head>
                <style>
                    body{
                        font-family: Arial, sans-serif;
                        padding: 30px;
                        color: #222;
                    }

                    .top-section{
                        display:flex;
                        justify-content:space-between;
                        margin-bottom:30px;
                    }

                    h1,h2,h3,p{
                        margin:0;
                    }

                    table{
                        width:100%;
                        border-collapse: collapse;
                        margin-top:20px;
                    }

                    th{
                        background:#111;
                        color:white;
                        padding:10px;
                        text-align:left;
                    }

                    td{
                        border:1px solid #ddd;
                        padding:10px;
                    }

                    .summary{
                        width:300px;
                        margin-left:auto;
                        margin-top:30px;
                    }

                    .summary-row{
                        display:flex;
                        justify-content:space-between;
                        margin-bottom:10px;
                    }

                    .footer{
                        margin-top:40px;
                        text-align:center;
                        color:#666;
                        font-size:12px;
                    }

                </style>
            </head>
            <body>
                <div class="top-section">
                    <div>
                        <h1>
                            CLOTHIFY
                        </h1>
                        <p>
                            Thrissur, Kerala
                        </p>
                    </div>
                    <div>
                        <h2>
                            INVOICE
                        </h2>
                        <p>
                             #${order.orderId}
                        </p>

                        <p>
                            ${new Date(order.createdAt)
                .toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <br>
                <div>
                    <h3>
                        Billing Address
                    </h3>

                    <p>
                        ${order.deliveryAddress.name}<br>
                        ${order.deliveryAddress.streetAddress}<br>
                        ${order.deliveryAddress.city}<br>
                        ${order.deliveryAddress.state}<br>
                        ${order.deliveryAddress.phone}
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
                                <td>
                                    ${item.productName}
                                </td>
                                <td>
                                    ${item.productSize}
                                </td>
                                <td>
                                    ${item.quantity}
                                </td>
                                <td>
                                    ₹${item.productPrice}
                                </td>
                                <td>
                                    ₹${item.productPrice * item.quantity}
                                </td>
                            </tr>

                        `).join('')}

                    </tbody>
                </table>
                <div class="summary">
                    <div class="summary-row">
                        <span>Subtotal</span>
                        <span>₹${order.subtotal}</span>
                    </div>

                    <div class="summary-row">
                        <span>Shipping</span>
                        <span>₹${order.shippingFee}</span>
                    </div>

                    <div class="summary-row">
                        <span>Tax</span>
                        <span>₹${order.tax}</span>
                    </div>

                    ${order.couponDiscount ? `

                        <div class="summary-row">
                            <span>Coupon Discount</span>
                            <span>
                                -₹${order.couponDiscount}
                            </span>
                        </div>

                    ` : ''}

                    ${order.offerDiscount ? `

                        <div class="summary-row">
                            <span>Offer Discount</span>
                            <span>
                                -₹${order.offerDiscount}
                            </span>
                        </div>

                    ` : ''}

                    <div class="summary-row">

                        <strong>Total Amount</strong>

                        <strong>
                            ₹${order.totalAmount}
                        </strong>

                    </div>

                </div>

                <div class="footer">
                    Thank you for shopping with
                    CLOTHIFY ❤️
                </div>
            </body>
            </html>
        `;

        const browser = await puppeteer.launch()
        const page = await browser.newPage();
        await page.setContent(html, {
            waitUntil: 'domcontentloaded'
        });
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true
        });

        const pdfBuffer = Buffer.from(pdf);
        await browser.close();

        res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=invoice-${order.orderId}.pdf`,
            'Content-Length': pdfBuffer.length
        });

        return res.end(pdfBuffer);

    } catch (error) {
        console.log(error);
        return res.status(500).send('Failed to generate invoice'
        );
    }
};

module.exports = downloadInvoice;