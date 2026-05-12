const Cart = require(`../models/cartSchema`)
const placeOrder = require(`../controllers/cartController`).placeOrder

//MESSAGE_CONSTANTS
const MESSAGES = require(`../services/constants`)


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const Razorpay = require(`razorpay`)

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID.trim(),
  key_secret: process.env.RAZORPAY_KEY_SECRET.trim()
});

exports.razorpayReciept = async (req, res) => {
  try {
    const userId = res.locals.user._id;
    const cart = await Cart.findOne({ userId }).populate('items.productId');

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

    const amount = Math.round(cart.totalAmount);

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

  } catch (error) {
    console.error("Razorpay Order Error:", error);
    return res.status(500).json({ success: false, message: 'Failed to create order' });
  }
};






exports.razorpayVerification = async (req, res) => {
  try {
    const crypto = require('crypto');
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, addressId } = req.body;

    // 1. Generate the signature using your Secret Key
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET.trim());
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generatedSignature = hmac.digest('hex');

    // 2. Compare signatures
    if (generatedSignature === razorpay_signature) {

      req.body.paymentMethod = 'razorpay';
      req.body.addressId = addressId;
      req.razorpayVerified = true;

      return placeOrder(req, res);

      return res.status(200).json({
        success: true,
        message: 'Payment verified',
        payment_id: razorpay_payment_id
      });
    } else {
      console.log("Signature Mismatch - Possible Tampering");
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: Invalid signature'
      });
    }
  } catch (error) {
    console.error("Verification Route Error:", error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during verification'
    });
  }
};

