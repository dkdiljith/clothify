const Order = require("../models/orderSchema");
const Product = require(`../models/productSchema`)
const Wallet = require(`../models/walletSchema`)
const Coupon = require(`../models/couponSchema`)






async function calculateRefund(orderId, itemId) {

  const order = await Order.findById(orderId)
    .populate('items.productId')
    .populate('couponId');

  if (!order) {
    throw new Error('Order not found.');
  }

  const itemToReturn = order.items.find(item => item._id.toString() === itemId);

  if (!itemToReturn) {
    throw new Error('Item not found in this order.');
  }

  // calculating the total without the returning item
  let newSubtotal = 0;
  let newOfferDiscount = 0;

  // Filter out the returned item and calculate totals for the rest
  const remainingItems = order.items.filter(item => item._id.toString() !== itemId);

  remainingItems.forEach(item => {
    const productPrice = item.productId.details[item.variationIndex].price * item.quantity;
    const offerAmount = item.productId.details[item.variationIndex].discountPrice * item.quantity;
    newSubtotal += productPrice;
    newOfferDiscount += offerAmount;
  });

  let newDiscountedPrice = newSubtotal - newOfferDiscount;

  /////////////////////////// Handle Coupon 
  let newCouponDiscount = 0;
  const coupon = await Coupon.findById(order.couponId.toString())
    // Check if the remaining items still meet the coupon criteria
    if (coupon) {
      if (newDiscountedPrice >= coupon.minimumPurchaseAmount) {
        if (coupon.discountType === 'price') {
          newCouponDiscount = coupon.discountValue;
        } else { // %
          newCouponDiscount = newDiscountedPrice * (coupon.discountValue / 100);
        }
      }
      // If criteria not met, newCouponDiscount remains 0, effectively removing it.
    }

  newDiscountedPrice -= newCouponDiscount;


  // Calculating Tax , shippingFee
  const TAX_RATE = 0.06; // 6% tax
  let newTax = newDiscountedPrice * TAX_RATE;

  let newShippingFee = 0;
  if ((newDiscountedPrice + newTax) < 2000) {
    if ((newDiscountedPrice + newTax) <= 0) {
      //do nothing , because newShippingFee is already 0
    } else {
      newShippingFee = 80;
    }
  }

  // New total that the customer SHOULD HAVE paid
  let newTotalAmount = newDiscountedPrice + newTax + newShippingFee;


  // Calculate Final Refundable Amount
  const RETURN_FEE = 80; // Your fixed return fee

  // Round the final amounts for accuracy
  newTotalAmount = Math.round(newTotalAmount);

  // The refund is the difference between the original total and the new total, less the return fee.
  let totalRefundableAmount = order.totalAmount - newTotalAmount - RETURN_FEE;

  // Ensure refund is not negative
  totalRefundableAmount = Math.max(0, totalRefundableAmount);


  // Return a detailed breakdown
  return {
    originalTotalAmount: order.totalAmount,
    newTotalForKeptItems: newTotalAmount,
    couponLost: order.couponDiscount - newCouponDiscount, // Shows how much coupon value was lost
    returnFee: RETURN_FEE,
    totalRefundableAmount: Math.round(totalRefundableAmount),
  };
}




















/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


exports.ordersRender = async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = 5; // 5 orders per page

    // Get total count of orders
    const totalOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalOrders / limit);

    // Get paginated orders (newest first)
    const orders = await Order.find()
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.render('admin/orders', {
      order: orders,
      admin: true,
      pagination: {
        page,
        limit,
        totalPages,
        nextPage: page + 1,
        prevPage: page - 1,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error("Error fetching orders:", error);
    res.render('admin/orders', {
      order: [],
      admin: true,
      pagination: {
        page: 1,
        limit: 5,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      },
      errorMessage: "Error fetching orders. Please try again later."
    });
  }
};



exports.orderDetails = async (req, res) => {
  const orderId = req.params.orderId

  const order = await Order.findById(orderId).lean()

  res.render(`admin/orderDetails`, { order: order, admin: true })
}










exports.orderStatusChange = async (req, res) => {
  const orderId = req.params.orderId;
  const itemId = req.params.itemId;
  const newStatus = req.body.status;


  try {
    const order = await Order.findById(orderId);
    const item = order.items.id(itemId);
    const userId = order.userId;
    const wallet = await Wallet.findOne({ userId })

    if (!order) {
      throw new Error('Order not found');
    }
    if (!wallet) {
      throw new Error('wallet not found');
    }
    if (!item) {
      throw new Error('Item not found in order');
    }

    item.status = newStatus;
    await order.save();

    //////////////////////////////////////////////////////
    //Return the refund amount to wallet

    if (newStatus === 'Returned') {

      //refundAmount Calculation
      const refundDetails = await calculateRefund(orderId, itemId);
      let refundAmount

      if (refundDetails) {
        refundAmount = refundDetails.totalRefundableAmount
      }

      //  if(product.details[item.variationIndex].quantity <= 5){
      //       refundAmount = refundAmount * 0.2 //20%
      //     }

      console.log(refundAmount, "this is refund amount")

      ///////////////////////////////////////////////////

      wallet.balance += refundAmount;
      wallet.transactions.push({
        type: "credit",
        amount: refundAmount,
        description: `Refund for Order #${order._id}: ₹${refundAmount} credited for returned item (${item.productName})`,
      });
      await wallet.save();
    }

    /////////////////////////////////////////////////////////
    //change the  payment status to completed after every order delivered (cod)

    const count = order.items.length
    let completedCount = 0
    order.items.forEach((item) => {
      if (item.status === 'Completed') {
        completedCount += 1
      }
    })
    if (count == completedCount) {
      order.paymentStatus = "Completed"
    }
    await order.save();
    ///////////////////////////////////////////////////////////

  } catch (error) {
    console.error('Error updating order item status:', error);
    throw error;
  }
}














exports.orderCancel = async (req, res) => {
  const { orderId, itemId, reason } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const item = order.items.find((item) => item._id.toString() === itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found in order" });
    }

    if (item.status === "Cancelled") {
      return res.status(400).json({ message: "Item is already cancelled" });
    }

    if (item.status !== "Pending") {
      return res.status(400).json({ message: "Only pending items can be cancelled" });
    }

    // Product Quantity Update
    const product = await Product.findById(item.productId);

    if (product) {
      const sizeDetail = product.details[item.variationIndex];
      if (sizeDetail) {
        sizeDetail.quantity += item.quantity;
        await product.save();
      }
    }


    /////////////////////////////
    //refundAmount Calculation
    const refundDetails = await calculateRefund(orderId, itemId);
    let refundAmount

    if (refundDetails) {
      refundAmount = refundDetails.totalRefundableAmount
      refundAmount += 80 //as it is cancellation, RETURN_FEE is not needed
    }

    //  if(product.details[item.variationIndex].quantity <= 5){
    //       refundAmount = refundAmount * 0.2 //20%
    //     }

    console.log(refundAmount, "this is refund amount")
    ////////////////////////////


    // Wallet Refund
    if (order.paymentMethod === "razorpay" || order.paymentMethod === "wallet") {

      const wallet = await Wallet.findOne({ userId: order.userId });
      if (!wallet) {
        return res.status(200).json({
          success: false,
          message: "No Wallet Found",
        });
      } else {
        wallet.balance += refundAmount;
        wallet.transactions.push({
          type: "credit",
          amount: refundAmount,
          description: `Refund for Order #${order._id}: ₹${refundAmount} credited for cancelled item (${item.productName})`,
        });
        await wallet.save();
      }

    } else if (order.paymentMethod === "cod") {
      // future cod handle  case
    }


    // Update Item and Order Status
    item.status = "Cancelled";
    item.cancellationReason.push({
      itemId: item._id,
      reason: reason,
      cancelledAt: new Date(),
    });


    const allItemsCancelled = order.items.every((i) => i.status === "Cancelled");
    if (allItemsCancelled) {
      order.status = "Cancelled";
      order.paymentStatus = "Refunded";
    }

    await order.save();

    // Sales Document Update (To be completed after you provide the Sales document)
    // ...

    return res.status(200).json({
      success: true,
      message: "Item cancelled and refund processed successfully",
    });
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "An error occurred. Please try again." });
  }
};











exports.orderReturn = async (req, res) => {
  const { orderId, itemId, reason } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const item = order.items.find((item) => item._id.toString() === itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found in order" });
    }

    if (item.status === "Returned") {
      return res.status(400).json({ message: "Item is already returned" });
    }

    if (item.status !== "Completed") {
      return res.status(400).json({ message: "Only delivered items can be returned" });
    }

    // Update Item Status to "Return Requested"
    item.status = "Return Requested";
    item.returnReason.push({
      itemId: item._id,
      reason: reason,
      requestedAt: new Date(),
    });
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Return request initiated successfully. Awaiting approval.",
    });

  } catch (error) {
    console.error("Error initiating return:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while initiating the return. Please try again.",
    });
  }
};

