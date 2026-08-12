const Order = require("../models/orderSchema");
const Wallet = require(`../models/walletSchema`)
const Cart = require(`../models/cartSchema`)
const Address = require(`../models/addressSchema`)
const Product = require(`../models/productSchema`)
const mongoose = require("mongoose");

//MESSAGE_CONSTANTS
// const MESSAGES = require(`../utils/constants`)

/////////////////////////////////////////////////////////////////////////////////////


//OrderId - creation
const orderIdGeneration = async (session) => {
  const crypto = require("crypto");
  const randomNumber = crypto.randomInt(100000, 1000000);
  const orderId = `ORD-${randomNumber}`;
  const order = await Order.findOne({ orderId }).session(session);
  if (order) {
    return await orderIdGeneration(session);
  }
  return orderId;
};





async function itemAmountCalculate(order, item) {
  if (!order) {
    throw new Error("Order not found");
  }
  if (!item) {
    throw new Error("Item not found");
  }
  // Item Base Total
  const itemSubtotal = Number(item.productPrice) * item.quantity;
  // Total Order Subtotal
  const orderSubtotal = order.items.reduce((total, currentItem) => {
    return total + Number(currentItem.productPrice) * currentItem.quantity;
  }, 0);
  // Item share percentage in order
  const itemSharePercentage =
    orderSubtotal > 0 ? itemSubtotal / orderSubtotal : 0;
  // Coupon share for this item
  const itemCouponShare = (order.couponDiscount || 0) * itemSharePercentage;
  // Offer share for this item
  const itemOfferShare = (order.offerDiscount || 0) * itemSharePercentage;
  // Tax share for this item
  const itemTaxShare = (order.tax || 0) * itemSharePercentage;
  // Shipping share for this item
  const itemShippingShare = (order.shippingFee || 0) * itemSharePercentage;
  // Final refundable amount
  let refundableAmount =
    itemSubtotal -
    itemCouponShare -
    itemOfferShare +
    itemTaxShare +
    itemShippingShare;
  // Prevent negative refund
  refundableAmount = Math.max(0, Math.round(refundableAmount));
  //////////////////////////////////////////////////////
  return refundableAmount
}



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

  } catch {
    return res.status(500).send('Server error');
  }
};





exports.placeOrder = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const userId = res.locals.user._id;
    const { paymentMethod, addressId } = req.body;
    const isRazorpayVerified = req.razorpayVerified === true;
    // VALIDATION
    if (!paymentMethod || !addressId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }
    if (paymentMethod === "razorpay" && !isRazorpayVerified) {
      return res.status(400).json({
        success: false,
        message: "Wrong Payment Info",
      });
    }
    // FETCH CART
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty.",
      });
    }
    // FETCH ADDRESS
    const address = await Address.findById(addressId);
    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }
    // ORDER LIMIT
    const ORDER_LIMIT = 25000;
    if (cart.totalAmount > ORDER_LIMIT) {
      return res.json({
        success: false,
        message: `Orders above ₹${ORDER_LIMIT} are not allowed. Please reduce your cart total.`,
      });
    }
    // STOCK VALIDATION
    for (const item of cart.items) {
      const product = item.productId;
      const variation = product.details[item.variationIndex];
      if (!variation) {
        return res.json({
          success: false,
          message: `${product.name} variation not found`,
        });
      }
      if (variation.quantity < item.quantity) {
        return res.json({
          success: false,
          message: `${product.name} is out of stock`,
        });
      }
    }
    // PAYMENT STATUS
    let paymentStatus = "Pending";
    if (paymentMethod === "razorpay" && isRazorpayVerified) {
      paymentStatus = "Completed";
    }
    // START TRANSACTION
    session.startTransaction();
    // WALLET PAYMENT
    if (paymentMethod === "wallet") {
      const wallet = await Wallet.findOne({ userId }).session(session);
      if (!wallet) {
        await session.abortTransaction();
        return res.json({
          success: false,
          message: "Wallet not found",
        });
      }
      if (wallet.balance < cart.totalAmount) {
        await session.abortTransaction();
        return res.json({
          success: false,
          message: "Insufficient wallet balance",
        });
      }
      wallet.balance -= cart.totalAmount;
      wallet.transactions.push({
        type: "debit",
        amount: cart.totalAmount,
        description: `₹${cart.totalAmount} debited for order payment`,
      });
      await wallet.save({ session });
      paymentStatus = "Completed";
    }
    if (paymentMethod === "wallet" && paymentStatus === "Pending") {
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        message: "Wallet payment failed.",
      });
    }
    // ORDER ITEMS
    const orderItems = cart.items.map((item) => ({
      productId: item.productId._id,
      productName: item.productId.name,
      productPrice: item.productId.details[item.variationIndex].price,
      productImg:
        item.productId.images && item.productId.images.length > 0
          ? item.productId.images[0].path
          : null,
      productSize: item.productId.details[item.variationIndex].size,
      variationIndex: item.variationIndex,
      quantity: item.quantity,
      status: "Pending",
    }));
    // CREATE ORDER
    const order = new Order({
      orderId: await orderIdGeneration(session),
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
        phone: address.phone,
      },
      paymentMethod,
      paymentStatus,
      subtotal: cart.subtotal,
      shippingFee: cart.shippingFee,
      tax: cart.tax,
      couponId: cart.couponId,
      couponDiscount: cart.couponDiscount,
      offerDiscount: cart.offerDiscount,
      checkoutTotal: cart.totalAmount,
      totalAmount: cart.totalAmount,
    });
    // ITEM AMOUNT CALCULATION
    let itemTotal = 0;
    for (const item of order.items) {
      const amount = await itemAmountCalculate(order, item);
      item.amount = amount;
      itemTotal += amount;
    }
    const variationAmount = order.totalAmount - itemTotal;
    if (variationAmount !== 0 && order.items.length > 0) {
      order.items[0].amount += variationAmount;
      if (order.items[0].amount < 0) {
        order.items[0].amount = 0;
      }
    }
    // SAVE ORDER
    await order.save({ session });
    // UPDATE PRODUCT STOCK
    if (paymentMethod === "cod" || paymentStatus === "Completed") {
      for (const item of cart.items) {
        const updateResult = await Product.findOneAndUpdate(
          {
            _id: item.productId._id,
            [`details.${item.variationIndex}.quantity`]: {
              $gte: item.quantity,
            },
          },
          {
            $inc: {
              [`details.${item.variationIndex}.quantity`]: -item.quantity,
            },
          },
          {
            session,
            new: true,
          },
        );
        if (!updateResult) {
          throw new Error(
            `${item.productId.name} went out of stock while placing the order.`,
          );
        }
      }

      // CLEAR CART

      await Cart.findByIdAndDelete(cart._id, { session });
    }
    // COMMIT TRANSACTION
    await session.commitTransaction();
    return res.json({
      success: true,
      paymentStatus,
      message: "Order placed successfully",
      orderId: order.orderId,
    });
  } catch (error){
    await session.abortTransaction();
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to place order.",
    });
  } finally {
    await session.endSession();
  }
};









exports.placeOrderFailed = async (req, res) => {
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
      checkoutTotal: cart.totalAmount,
      totalAmount: cart.totalAmount,
      paymentAttemptsCount: 1, // First initial attempt failed
      paymentRetryExpiresAt: new Date(Date.now() + 30 * 60 * 1000) // Explicit 30 min window set
    });



    //adding variation amount
    {
      let itemTotal = 0;

      for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i];
        // Calculate individual amount
        const amount = await itemAmountCalculate(order, item);
        item.amount = amount;
        itemTotal += amount;
      }
      // Handling surplus or deficit money directly
      const variationAmount = order.totalAmount - itemTotal;

      if (variationAmount !== 0 && order.items.length > 0) {
        order.items[0].amount += variationAmount;

        if (order.items[0].amount < 0) {
          order.items[0].amount = 0;
        }
      }
    }

    await order.save();
    await Cart.findByIdAndDelete(cart._id); // Clear cart so they don't buy duplicate items

    return res.status(201).json({ success: true, paymentStatus: "Failed", message: "Failed order record generated. You can retry from your dashboard.", orderId: order.orderId });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to place order." });
  }
};

exports.retryFailedOrder = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Invalid Order ID provided",
      });
    }
    session.startTransaction();
    // Fetch order inside transaction
    const order = await Order.findOne({ orderId }).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }
    // Prevent duplicate retry
    if (order.paymentStatus === "Completed") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Order is already completed",
      });
    }
    // Update payment status
    order.paymentStatus = "Completed";
    order.items.forEach((item) => {
      item.status = "Pending";
    });
    // Save updated order
    await order.save({ session });
    // Reduce stock
    for (const item of order.items) {
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          [`details.${item.variationIndex}.quantity`]: {
            $gte: item.quantity,
          },
        },
        {
          $inc: {
            [`details.${item.variationIndex}.quantity`]: -item.quantity,
          },
        },
        {
          session,
          new: true,
        },
      );
      if (!updatedProduct) {
        throw new Error(`Insufficient stock for one or more products.`);
      }
    }
    await session.commitTransaction();
    return res.status(200).json({
      success: true,
      message: "Order status updated and stock reduced successfully.",
      orderId: order.orderId,
    });
  } catch(error) {
    await session.abortTransaction();
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retry payment.",
    });
  } finally {
    await session.endSession();
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

    return res.status(200).json({ success: true, message: `Payment failed again. Attempt ${retryOrder.paymentAttemptsCount}/6 used.`, orderId });
  } catch {
    return res.status(500).json({ success: false, message: "An error occurred while updating the retry order." });
  }
}




exports.orderSuccess = async (req, res) => {
  try {
    const { orderId } = req.query;

    if (!orderId) {
      return res.render('user/orderFailure', { plain_body: true });
    }

    const order = await Order.findOne({ orderId }).lean()

    if (!order) {
      return res.render('user/orderSuccess', { plain_body: true });
    }

    return res.render('user/orderSuccess', { plain_body: true, order });
  } catch {
    return res.render('user/orderSuccess', { plain_body: true });
  }
};



exports.orderFailed = async (req, res) => {
  try {
    const { orderId } = req.query;

    if (!orderId) {
      return res.render('user/orderFailure', { plain_body: true });
    }

    const order = await Order.findOne({ orderId }).lean()

    if (!order) {
      return res.render('user/orderFailure', { plain_body: true });
    }
    return res.render('user/orderFailure', { plain_body: true, order });

  } catch {
    return res.render('user/orderFailure', { plain_body: true });
  }
};



