const Order = require("../models/orderSchema");
const Wallet = require(`../models/walletSchema`)
const Coupon = require(`../models/couponSchema`)
const Cart = require(`../models/cartSchema`)
const Address = require(`../models/addressSchema`)
const Product = require(`../models/productSchema`)

//MESSAGE_CONSTANTS
const MESSAGES = require(`../utils/constants`)

/////////////////////////////////////////////////////////////////////////////////////


//OrderId - creation
const orderIdGeneration = async () => {
  const crypto = require(`crypto`)
  const randomNumber = crypto.randomInt(100000, 1000000);
  const orderId = `ORD-${randomNumber}`;
  const order = await Order.findOne({ orderId });

  if (order) {
    return await orderIdGeneration();
  }
  return orderId;
};


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////





exports.payment = async (req, res) => {
  try {
    const userId = res.locals.user._id
    const cart = await Cart.findOne({ userId }).lean();
    const address = await Address.find({ userId: userId }).lean();
    const wallet = await Wallet.findOne({ userId }).lean();

    if (!userId) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.render('user/paymentPage', { cart, address, wallet });

  } catch (error) {
    console.error('Error fetching order details:', error);
    return res.status(500).send('Server error');
  }
};




exports.placeOrder = async (req, res) => {
  try {
    const userId = res.locals.user._id;
    const { paymentMethod, addressId } = req.body;
    const isRazorpayVerified = req.razorpayVerified === true;

    // validation 
    if (!paymentMethod || !addressId) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    if (paymentMethod === 'razorpay' && !isRazorpayVerified) {
      return res.status(400).json({ success: false, message: "Wrong Payment Info" });
    }

    // fetch cart and address 
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    const address = await Address.findById(addressId);
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Your cart is empty." });
    }
    if (!address) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    // order limit 
    const ORDER_LIMIT = 25000;
    if (cart.totalAmount > ORDER_LIMIT) {
      return res.json({ success: false, message: `Orders above ₹${ORDER_LIMIT} are not allowed. Please reduce your cart total.` });
    }

    // stock checking 
    for (const item of cart.items) {
      const product = item.productId;
      const variation = product.details[item.variationIndex];
      if (!variation) {
        return res.json({ success: false, message: `${product.name} variation not found` });
      }
      if (variation.quantity < item.quantity) {
        return res.json({ success: false, message: `${product.name} is out of stock` });
      }
    }

    // payment status 
    let paymentStatus = "Pending";

    // razorpay status update 
    if (paymentMethod === 'razorpay' && isRazorpayVerified) {
      paymentStatus = "Completed";
    }

    // wallet payment 
    if (paymentMethod === "wallet") {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        return res.json({ success: false, message: "Wallet not found" });
      }
      if (wallet.balance < cart.totalAmount) {
        return res.json({ success: false, message: "Insufficient wallet balance" });
      }
      wallet.balance -= cart.totalAmount;
      wallet.transactions.push({ type: "debit", amount: cart.totalAmount, description: `₹${cart.totalAmount} debited for order payment` });
      const result = await wallet.save();
      if (result) {
        paymentStatus = "Completed";
      }
    }

    // order items 
    const orderItems = cart.items.map((item) => ({
      productId: item.productId._id,
      productName: item.productId.name,
      productPrice: item.productId.details[item.variationIndex].price,
      productImg: item.productId.images && item.productId.images.length > 0 ? item.productId.images[0].path : null,
      productSize: item.productId.details[item.variationIndex].size,
      variationIndex: item.variationIndex,
      quantity: item.quantity,
      status: "Pending"
    }));

    if (paymentMethod === 'wallet' && paymentStatus === "Pending") {
      return res.status(500).json({ success: false, message: "wallet payment failed." });
    }

    // create order 
    const order = new Order({
      orderId: await orderIdGeneration(),
      userId,
      items: orderItems,
      deliveryAddress: {
        name: address.name,
        streetAddress: address.streetAddress,
        landmark: address.landmark,
        city: address.city,
        state: address.state,
        zip: address.zip,
        country: address.country,
        phone: address.phone
      },
      paymentMethod,
      paymentStatus,
      subtotal: cart.subtotal,
      shippingFee: cart.shippingFee,
      tax: cart.tax,
      couponId: cart.couponId,
      couponDiscount: cart.couponDiscount,
      offerDiscount: cart.offerDiscount,
      checkoutTotal:cart.totalAmount,
      totalAmount: cart.totalAmount
    });

    // save order 
    await order.save();

    // FIX: Atomic MongoDB update eliminates ParallelSaveError and data overwriting
    if (paymentMethod === "cod" || paymentStatus === "Completed") {
      await Promise.all(
        cart.items.map((item) => {
          return Product.findOneAndUpdate(
            { _id: item.productId._id },
            { $inc: { [`details.${item.variationIndex}.quantity`]: -item.quantity } }
          );
        })
      );

      // clear cart 
      await Cart.findByIdAndDelete(cart._id);
    }

    return res.json({ success: true, paymentStatus, message: "Order placed successfully" });
  } catch (error) {
    console.error("Order Placement Error:", error);
    return res.status(500).json({ success: false, message: "Failed to place order." });
  }
};









exports.placeOrderFailed = async (req, res) => {
  console.log("Razorpay failed order processor triggered.");
  try {
    const userId = res.locals.user._id;
    const { addressId, reason, orderId } = req.body;
    const paymentMethod = 'razorpay';

    // FIX: Return the helper directly to avoid "Headers already sent" errors
    if (orderId) {
      const retryOrder = await Order.findOne({ orderId, userId });
      if (!retryOrder) {
        return res.status(400).json({ success: false, message: "Cannot Find Order" });
      }
      return await retryFailedOrderFailed(req, res, orderId);
    }

    if (!addressId || !reason || !userId) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // fetch cart and address
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    const address = await Address.findById(addressId);

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Your cart is empty." });
    }
    if (!address) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    // order total upper threshold validation
    const ORDER_LIMIT = 25000;
    if (cart.totalAmount > ORDER_LIMIT) {
      return res.status(400).json({ success: false, message: `Orders above ₹${ORDER_LIMIT} are not allowed.` });
    }

    // stock checking
    for (const item of cart.items) {
      const product = item.productId;
      const variation = product.details[item.variationIndex];
      if (!variation) {
        return res.status(400).json({ success: false, message: `${product.name} variation not found` });
      }
      if (variation.quantity < item.quantity) {
        return res.status(400).json({ success: false, message: `${product.name} is out of stock` });
      }
    }

    // process failed array payload mapping
    const orderItems = cart.items.map((item) => ({
      productId: item.productId._id,
      productName: item.productId.name,
      productPrice: item.productId.details[item.variationIndex].price,
      productImg: item.productId.images && item.productId.images.length > 0 ? item.productId.images[0].path : null,
      productSize: item.productId.details[item.variationIndex].size,
      variationIndex: item.variationIndex,
      quantity: item.quantity,
      status: "Failed"
    }));

    // create order with systematic status tracking flags
    const order = new Order({
      orderId: await orderIdGeneration(),
      userId,
      items: orderItems,
      deliveryAddress: {
        name: address.name,
        streetAddress: address.streetAddress,
        landmark: address.landmark,
        city: address.city,
        state: address.state,
        zip: address.zip,
        country: address.country,
        phone: address.phone
      },
      paymentMethod,
      paymentStatus: "Failed",
      subtotal: cart.subtotal,
      shippingFee: cart.shippingFee,
      tax: cart.tax,
      couponId: cart.couponId,
      couponDiscount: cart.couponDiscount,
      offerDiscount: cart.offerDiscount,
      checkoutTotal:cart.totalAmount,
      totalAmount: cart.totalAmount,
      paymentAttemptsCount: 1, // First initial attempt failed
      paymentRetryExpiresAt: new Date(Date.now() + 30 * 60 * 1000) // Explicit 30 min window set
    });

    await order.save();
    await Cart.findByIdAndDelete(cart._id); // Clear cart so they don't buy duplicate items

    return res.status(201).json({ success: true, paymentStatus: "Failed", message: "Failed order record generated. You can retry from your dashboard.", orderId: order.orderId });
  } catch (error) {
    console.error("Order Placement Error:", error);
    return res.status(500).json({ success: false, message: "Failed to place order." });
  }
};


exports.retryFailedOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: "Invalid Order ID provided" });
    }

    // 1. Fetch the order document from database 
    const order = await Order.findOne({ orderId: orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // 2. Prevent reducing stock twice if the payment was already completed 
    if (order.paymentStatus === 'Completed') {
      return res.status(400).json({ success: false, message: "Order is already completed" });
    }

    // 3. Change statuses on the order document 
    order.paymentStatus = 'Completed';
    order.items.forEach(item => {
      item.status = 'Pending';
    });

    // 4. Save the updated order first 
    await order.save();

    // FIX: Atomic MongoDB update saves processing time and ensures exact stock inventory math
    await Promise.all(
      order.items.map((item) => {
        return Product.findOneAndUpdate(
          { _id: item.productId },
          { $inc: { [`details.${item.variationIndex}.quantity`]: -item.quantity } }
        );
      })
    );

    // 6. Send success response back to the client 
    return res.status(200).json({ success: true, message: "Order status updated and stock reduced successfully.", order });
  } catch (error) {
    console.error("Order Placement Error:", error);
    return res.status(500).json({ success: false, message: "Failed to retry payment." });
  }
};




async function retryFailedOrderFailed(req, res, orderId) {
  try {
    const userId = res.locals.user._id;
    const retryOrder = await Order.findOne({ orderId, userId });

    if (!retryOrder) {
      return res.status(400).json({ success: false, message: "Cannot Find Order" });
    }

    // 1. CHECK IF THE TIME WINDOW HAS EXPIRED
    const currentTime = new Date();
    if (retryOrder.paymentRetryExpiresAt && currentTime > retryOrder.paymentRetryExpiresAt) {
      return res.status(400).json({ success: false, message: "The 30-minute retry window has expired. Please create a new order." });
    }

    // 2. CHECK IF THE MAX ATTEMPTS ARE EXCEEDED (Original 1 initial + 5 retries logic kept)
    if (retryOrder.paymentAttemptsCount >= 6) {
      return res.status(400).json({ success: false, message: "You have reached the maximum limit of 5 payment retries for this order." });
    }

    // 3. INCREMENT THE ATTEMPT COUNTER AND ATOMIC SAVE
    retryOrder.paymentAttemptsCount++;
    await retryOrder.save();

    return res.status(200).json({ success: true, message: `Payment failed again. Attempt ${retryOrder.paymentAttemptsCount}/6 used.` });
  } catch (error) {
    console.error("Retry Fail Handler Error:", error);
    return res.status(500).json({ success: false, message: "An error occurred while updating the retry order." });
  }
}





exports.orderSuccess = (req, res) => {
  res.render('user/orderSuccess', { plain_body: true });
}

exports.orderFailed = (req, res) => {
  res.render('user/orderFailure', { plain_body: true })
}



