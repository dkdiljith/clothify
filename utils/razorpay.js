import Cart from '../models/cartSchema.js';
import Order from '../models/orderSchema.js';
import { placeOrder, retryFailedOrder } from '../controllers/userOrderController.js';


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import Razorpay from 'razorpay';
import crypto from 'crypto';


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID.trim(),
  key_secret: process.env.RAZORPAY_KEY_SECRET.trim()
});



export const razorpayReciept = async (req, res) => {
  try {
    const userId = res.locals.user._id;
    const cart = await Cart.findOne({ userId }).populate('items.productId');

    const orderId = req.body.orderId
    const retryOrder = await Order.findOne({ orderId, userId })

    let amount = 0

    if (!retryOrder) {

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ success: false, message: "Cart is empty" });
      }

      // order limit
      const ORDER_LIMIT = 25000;
      if (cart.totalAmount > ORDER_LIMIT) {
        return res.json({
          success: false,
          message: `Orders above ₹${ORDER_LIMIT} are not allowed. Please reduce your cart total.`
        });
      }

      amount = Math.round(cart.totalAmount);

    } else {
      // 1. CHECK IF THE TIME WINDOW HAS EXPIRED
      const currentTime = new Date();
      if (currentTime > retryOrder.paymentRetryExpiresAt) {
        return res.status(400).json({
          success: false,
          message: "The 30-minute retry window has expired. Please create a new order."
        });
      }

      // 2. CHECK IF THE MAX ATTEMPTS ARE EXCEEDED (Max 5 attempts)
      if (retryOrder.paymentAttemptsCount >= 6) {
        return res.status(400).json({
          success: false,
          message: "You have reached the maximum limit of 5 payment attempts for this order."
        });
      }
      amount = Math.round(retryOrder.totalAmount);
    }



    const order = await razorpay.orders.create({
      amount: amount * 100, // Razorpay expects paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    });

    return res.json({
      success: true,
      id: order.id,
      amount: order.amount,
      currency: order.currency
    });

  } catch {
    return res.status(500).json({ success: false, message: 'Failed to create order' });
  }
};






export const razorpayVerification = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, addressId, orderId } = req.body;

    // 1. Generate the signature using your Secret Key
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET.trim());
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generatedSignature = hmac.digest('hex');

    // 2. Compare signatures
    if (generatedSignature === razorpay_signature) {

      req.body.paymentMethod = 'razorpay';
      req.body.addressId = addressId;
      req.body.orderId = orderId;
      req.razorpayVerified = true;

      if (orderId) {
        return retryFailedOrder(req, res);
      }

      return placeOrder(req, res);

    } else {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: Invalid signature'
      });
    }
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Internal server error during verification'
    });
  }
};

