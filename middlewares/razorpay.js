const Razorpay = require(`razorpay`)
const razorpay = new Razorpay({
  key_id: 'rzp_test_TVFPFUZdUa9wz4',        
  key_secret: 'JDjqv22uAP27Xw7LkFRelTkH' 
});

exports.razorpayReciept =  async (req, res) => {
    const { amount} = req.body;
    const IntegerAmount = parseInt(amount)
  
    try {
      const order = await razorpay.orders.create({
        amount: IntegerAmount * 100,   //only paisa is accepted in razorpay
        currency: 'INR',
        receipt: 'receipt#1',
        payment_capture: 1 // Auto capture payment
      });
      console.log(order , "This is order")
      res.json(order);
    } catch (error) {
      console.error(error);
      res.status(500).send('Failed to create order');
    }
  };
  
  exports.razorpayVerification =  async (req, res) => {
    const crypto = require('crypto');
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  
    const hmac = crypto.createHmac('sha256', 'JDjqv22uAP27Xw7LkFRelTkH');
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generatedSignature = hmac.digest('hex');
  
    if (generatedSignature === razorpay_signature) {
      res.status(200).json({ 
        success: true, 
        message: 'Payment verified', 
        payment_id: razorpay_payment_id 
      });
    } else {
      res.status(500).send('Failed to create order');
    }
  };
  