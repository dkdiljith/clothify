const Razorpay = require(`razorpay`)
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID.trim(),
  key_secret: process.env.RAZORPAY_KEY_SECRET.trim()
});

exports.razorpayReciept = async (req, res) => {
  const { amount } = req.body;
  const IntegerAmount = parseInt(amount)

  try {
    const order = await razorpay.orders.create({
      amount: IntegerAmount * 100,   //only paisa is accepted in razorpay
      currency: 'INR',
      receipt: 'receipt#1',
      payment_capture: 1 // Auto capture payment
    });
    console.log(order, "This is order")
    return res.json(order);
  } catch (error) {
    console.error(error);
     console.log("Failed tocreate order")
    return res.status(500).send('Failed to create order');
  }
};

exports.razorpayVerification = async (req, res) => {
  const crypto = require('crypto');
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET.trim() );
  hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
  const generatedSignature = hmac.digest('hex');

  if (generatedSignature === razorpay_signature) {
    console.log("This is verification")
    return res.status(200).json({
      success: true,
      message: 'Payment verified',
      payment_id: razorpay_payment_id
    });
  } else {
    console.log("Failed to create order 2")
    return res.status(500).json({
      success: false,
      message: 'Payment not verified',
      payment_id: razorpay_payment_id
    });
  }
};
