import puppeteer from 'puppeteer';
import Order from '../models/orderSchema.js';


//////////////////////////////////////////////////////////////////////////////////
const downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId).lean();
    //////////////////////////////////////////////////////////////////////////
    // VALIDATIONS
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found."
      });
    }
    // Failed payment
    if (order.deliveryStatus === "Failed") {
      return res.status(400).json({
        success: false,
        message: "Invoice cannot be generated for failed orders."
      });
    }
    // Fully cancelled order
    if (order.deliveryStatus === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Invoice cannot be generated for cancelled orders."
      });
    }
    // Fully returned order
    if (order.deliveryStatus === "Returned") {
      return res.status(400).json({
        success: false,
        message: "Invoice cannot be generated for fully refunded orders."
      });
    }
    // Extra safety
    if (order.totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invoice cannot be generated."
      });
    }
    //////////////////////////////////////////////////////////////////////////
    // PREPARE ITEMS
    const invoiceItems = order.items.map(item => {
      const unitPrice = Number(item.productPrice);
      const totalPrice =
        unitPrice * item.quantity;
      const refundAmount =
        item.refundDetails?.refundAmount || 0;
      const paymentStatus = (() => {
        switch (item.status) {
          case "Completed":
            return {
              text: "Completed",
              color: "#28a745"
            };
          case "Cancelled":
            return {
              text: "Cancelled",
              color: "#dc3545"
            };
          case "Returned":
            return {
              text: "Returned",
              color: "#fd7e14"
            };
          case "Return Requested":
            return {
              text: "Return Requested",
              color: "#0d6efd"
            };
          case "Return Rejected":
            return {
              text: "Return Rejected",
              color: "#6c757d"
            };
          default:
            return {
              text: item.status,
              color: "#555"
            };
        }
      })();
      return {
        ...item,
        unitPrice,
        totalPrice,
        refundAmount,
        paymentStatus
      };
    });
    //////////////////////////////////////////////////////////////////////////////////
    const html = `
<html>

  <head>
    <style>
      body {
        font-family: Arial, Helvetica, sans-serif;
        color: #333;
        padding: 40px;
        line-height: 1.6;
      }

      .top-section {
        display: flex;
        justify-content: space-between;
        border-bottom: 2px solid #eee;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }

      .brand h1 {
        margin: 0;
        font-size: 30px;
      }

      .invoice-meta {
        text-align: right;
      }

      .invoice-meta h2 {
        margin: 0;
      }

      .billing-box {
        margin-bottom: 25px;
      }

      .label {
        font-size: 11px;
        font-weight: bold;
        color: #888;
        text-transform: uppercase;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }

      thead {
        display: table-header-group;
      }

      tr {
        page-break-inside: avoid;
      }

      th {
        background: #f8f8f8;
        border-bottom: 2px solid #ddd;
        padding: 12px;
        font-size: 13px;
        text-align: left;
      }

      td {
        border-bottom: 1px solid #eee;
        padding: 12px;
        font-size: 13px;
        vertical-align: top;
      }

      .status {
        font-weight: bold;
      }

      .refund-note {
        color: #fd7e14;
        font-size: 11px;
        margin-top: 4px;
        line-height: 1.5;
      }

      .summary-container {
        width: 320px;
        margin-left: auto;
        margin-top: 35px;
        border: 1px solid #eee;
        padding: 20px;
      }

      .summary-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .total-row {
        border-top: 2px solid #111;
        padding-top: 10px;
        margin-top: 12px;
        font-size: 16px;
        font-weight: bold;
      }

      .footer {
        margin-top: 60px;
        border-top: 1px solid #eee;
        padding-top: 20px;
        font-size: 12px;
        color: #777;
        text-align: center;
      }

      .discount {
        color: #dc3545;
      }

      .refund {
        color: #fd7e14;
      }

      .payment-method {
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px dashed #ddd;
        display: flex;
        justify-content: space-between;
        font-size: 13px;
      }

      .payment-method span:first-child {
        font-weight: bold;
        color: #555;
      }
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
        <p style="margin:2px 0;color:#666;">
          Tax Invoice
        </p>
        <p>
          <strong>#${order.orderId}</strong>
        </p>
        <p>
          ${new Date(order.createdAt).toLocaleDateString("en-IN", {
      day:
        "2-digit", month: "short", year: "numeric"
    })}
        </p>
      </div>
    </div>
    <div class="billing-box">
      <div class="label">
        Bill To
      </div>
      <p>
        <strong>${order.deliveryAddress.name}</strong><br />
        ${order.deliveryAddress.streetAddress}<br />
        ${order.deliveryAddress.city}, ${order.deliveryAddress.state},
        ${order.deliveryAddress.zip}<br />
        Phone : ${order.deliveryAddress.phone}
      </p>
    </div>
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>Size</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Status</th>
          <th style="text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${invoiceItems.map(item => `
        <tr>
          <td>
            <strong>${item.productName}</strong>
            ${item.refundAmount > 0 ? `
            <div class="refund-note">
              ${item.refundDetails.refundType === "Returned" ? "↩ Returned" : "✖ Cancelled"}
              <br />
              ${order.paymentMethod === "cod" && item.refundDetails.refundType
          === "Cancelled" ? `No Refund Applicable` : `Wallet Refund :
              ₹${item.refundAmount.toLocaleString()}`}
            </div>
            ` : ""}
          </td>
          <td>
            ${item.productSize}
          </td>
          <td>
            ${item.quantity}
          </td>
          <td>
            ₹${item.unitPrice.toLocaleString()}
          </td>
          <td>
            <span class="status" style="color:${item.paymentStatus.color};">
              ${item.paymentStatus.text}
            </span>
          </td>
          <td style="text-align:right;">
            ₹${item.totalPrice.toLocaleString()}
          </td>
        </tr>
        `).join("")}
      </tbody>
    </table>
    <div class="summary-container">
      <div
        style="
                font-weight:bold;
                margin-bottom:12px;
                font-size:14px;
                color:#555;
            "
      >
        Amount Details
      </div>
      <div class="summary-row">
        <span>Subtotal</span>
        <span>
          ₹${order.subtotal.toLocaleString()}
        </span>
      </div>
      <div class="summary-row">
        <span>Shipping</span>
        <span>
          ₹${order.shippingFee.toLocaleString()}
        </span>
      </div>
      <div class="summary-row">
        <span>Estimated Tax</span>
        <span>
          ₹${order.tax.toLocaleString()}
        </span>
      </div>
      ${order.couponDiscount ? `
      <div class="summary-row discount">
        <span>
          Coupon Discount
        </span>
        <span>
          -₹${order.couponDiscount.toLocaleString()}
        </span>
      </div>
      ` : ""} ${order.offerDiscount ? `
      <div class="summary-row discount">
        <span>
          Offer Discount
        </span>
        <span>
          -₹${order.offerDiscount.toLocaleString()}
        </span>
      </div>
      ` : ""}
      <div class="summary-row">
        <span>
          <strong>
            Checkout Total
          </strong>
        </span>
        <span>
          <strong>
            ₹${order.checkoutTotal.toLocaleString()}
          </strong>
        </span>
      </div>
      ${order.totalRefundAmount > 0 ? `
      <div class="summary-row refund">
        <span>
          <strong>
            Deducted Amount
          </strong>
        </span>
        <span>
          -₹${order.totalRefundAmount.toLocaleString()}
        </span>
      </div>
      ` : ""}
      <div class="summary-row total-row">
        <span>
          ${order.paymentMethod === "cod" ? "Amount Payable" : "Final Amount Paid"}
        </span>
        <span>
          ₹${order.totalAmount.toLocaleString()}
        </span>
      </div>
      <div class="payment-method">
        <span>
          Payment Method
        </span>
        <span>
          ${order.paymentMethod === "razorpay" ? "Online Payment (Razorpay)" :
        order.paymentMethod === "wallet" ? "Wallet" : "Cash On Delivery"}
        </span>
      </div>
    </div>
    <div class="footer">
      Thank you for shopping with
      <strong>CLOTHIFY</strong>.
      <br /><br />
      This invoice reflects the current financial status of your order,
      including any approved cancellations or returns. ${order.totalRefundAmount
        > 0 ? `
      <br /><br />
      ${order.paymentMethod === "cod" ? `This order was placed using
      <strong>Cash on Delivery</strong>. The cancelled amount shown above has
      been deducted from the original order value. No refund was required for
      cancelled items because payment had not yet been collected. Any returned
      items, if applicable, have been refunded to your Clothify Wallet.` : `Any
      approved cancellation or return refund shown above has been credited to
      your
      <strong>Clothify Wallet</strong>.` } ` : ""}
    </div>
  </body>

</html>
`;
    ////////////////////////////////////////////////////////////////////////////////////
    // Launch browser
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
  } catch {
    return res.status(500).send('Failed to generate invoice');
  }
};





export default downloadInvoice;
