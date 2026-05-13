const Order = require("../models/orderSchema");
const Product = require(`../models/productSchema`)
const Wallet = require(`../models/walletSchema`)
const Coupon = require(`../models/couponSchema`)

//pagination
const adminPaginationFactory = require(`../services/pagination`);

//MESSAGE_CONSTANTS
const MESSAGES = require(`../services/constants`)

/////////////////////////////////////////////////////////////////////////////////////





async function calculateRefund(orderId, itemId, isCancellation) {

  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }
  const item = order.items.find(
    item => item._id.toString() === itemId
  );
  if (!item) {
    throw new Error("Item not found");
  }

  // Item Base Total
  const itemSubtotal =
    Number(item.productPrice) * item.quantity;

  // Total Order Subtotal
  const orderSubtotal = order.items.reduce((total, currentItem) => {

    return total + (
      Number(currentItem.productPrice) *
      currentItem.quantity
    );

  }, 0);


  // Item share percentage in order

  const itemSharePercentage =
    orderSubtotal > 0
      ? itemSubtotal / orderSubtotal
      : 0;


  // Coupon share for this item

  const itemCouponShare =
    (order.couponDiscount || 0) *
    itemSharePercentage;

  // Offer share for this item

  const itemOfferShare =
    (order.offerDiscount || 0) *
    itemSharePercentage;

  // Tax share for this item

  const itemTaxShare =
    (order.tax || 0) *
    itemSharePercentage;

  
  // Shipping share for this item

  const itemShippingShare =
    (order.shippingFee || 0) *
    itemSharePercentage;


  // Final refundable amount

  let refundableAmount =
    itemSubtotal
    - itemCouponShare
    - itemOfferShare
    + itemTaxShare
    + itemShippingShare;

 
  // Return fee only for returns
  const RETURN_FEE = 80;

  if (!isCancellation) {
    refundableAmount -= RETURN_FEE;
  }


  // Prevent negative refund

  refundableAmount = Math.max( 0,Math.round(refundableAmount));

  //////////////////////////////////////////////////////

  return {
    itemSubtotal,
    itemCouponShare: Math.round(itemCouponShare),
    itemOfferShare: Math.round(itemOfferShare),
    itemTaxShare: Math.round(itemTaxShare),
    itemShippingShare: Math.round(itemShippingShare),
    returnFee: isCancellation ? 0 : RETURN_FEE,
    totalRefundableAmount: refundableAmount,
  };

}





/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


exports.ordersRender = async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const query = req.query.query || '';

    const result = await adminPaginationFactory({
      page,
      limit: 5,
      query,
      type: 'order'
    });
    return res.render('admin/orders', {
      admin: true,
      ...result
    });

  } catch (error) {

    console.error("Error fetching orders:", error);

    return res.render('admin/orders', {
      admin: true,
      order: [],
      query: '',
      pagination: {
        page: 1,
        limit: 5,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
        serialNumberStart: 0
      },
      errorMessage: "Error fetching orders. Please try again later."
    });
  }
};



exports.orderDetails = async (req, res) => {
  const orderId = req.params.orderId

  const order = await Order.findById(orderId).lean()

  return res.render(`admin/orderDetails`, { order: order, admin: true })
}









exports.orderStatusChange = async (req, res) => {

  const orderId = req.params.orderId;
  const itemId = req.params.itemId;
  const newStatus = req.body.status;

  try {

    const order = await Order.findById(orderId);

    if (!order) {
      throw new Error("Order not found");
    }

    const item = order.items.id(itemId);

    if (!item) {
      throw new Error("Item not found");
    }

    //////////////////////////////////////////////////////
    // RETURN APPROVAL

    if (newStatus === "Returned") {

      if (item.status === "Returned") {
        throw new Error("Item already returned");
      }

      if (item.isRefunded) {
        throw new Error("Refund already processed");
      }

      ////////////////////////////////////////////////////
      // refund calculation

      const refundDetails = await calculateRefund(
        orderId,
        itemId,
        false // return
      );

      const refundAmount =
        refundDetails.totalRefundableAmount;

      ////////////////////////////////////////////////////
      // wallet credit

      const wallet = await Wallet.findOne({
        userId: order.userId
      });

      if (!wallet) {
        throw new Error("Wallet not found");
      }

      wallet.balance += refundAmount;

      wallet.transactions.push({
        type: "credit",
        amount: refundAmount,
        description:
          `Refund for returned item (${item.productName}) in Order #${order.orderId}`,
      });

      await wallet.save();

      ////////////////////////////////////////////////////
      // restore stock

      const product = await Product.findById(
        item.productId
      );

      if (product) {

        const variation =
          product.details[item.variationIndex];

        if (variation) {

          variation.quantity += item.quantity;

          await product.save();
        }
      }

      ////////////////////////////////////////////////////
      // update item

      item.refundAmount = refundAmount;

      item.isRefunded = true;
    }

    //////////////////////////////////////////////////////
    // status update

    item.status = newStatus;

    //////////////////////////////////////////////////////
    // payment completion check

    const allCompleted = order.items.every(
      item =>
        item.status === "Completed" ||
        item.status === "Returned" ||
        item.status === "Cancelled"
    );

    if (
      allCompleted &&
      order.paymentMethod === "cod"
    ) {
      order.paymentStatus = "Completed";
    }

    //////////////////////////////////////////////////////

    await order.save();

    return res.status(200).json({
      success: true,
      message: `Item status updated to ${newStatus}`,
    });

  } catch (error) {

    console.error(
      "Order Status Change Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};













exports.orderCancel = async (req, res) => {

  const { orderId, itemId, reason } = req.body;

  try {

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const item = order.items.find(
      item => item._id.toString() === itemId
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found in order",
      });
    }


    // validations

    if (item.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Item already cancelled",
      });
    }

    if (item.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending items can be cancelled",
      });
    }

    //////////////////////////////////////////////////////
    // restore stock

    const product = await Product.findById(item.productId);

    if (product) {

      const variation = product.details[item.variationIndex];

      if (variation) {

        variation.quantity += item.quantity;

        await product.save();
      }
    }

    //////////////////////////////////////////////////////
    // refund calculation

    const isCancellation = true
    const refundDetails = await calculateRefund(
      orderId,
      itemId,
      isCancellation
    );

    const refundAmount =
      refundDetails.totalRefundableAmount;

    //////////////////////////////////////////////////////
    // wallet refund

    if (
      order.paymentMethod === "razorpay" ||
      order.paymentMethod === "wallet"
    ) {

      const wallet = await Wallet.findOne({
        userId: order.userId
      });

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: "Wallet not found",
        });
      }

      wallet.balance += refundAmount;

      wallet.transactions.push({
        type: "credit",
        amount: refundAmount,
        description:
          `Refund for cancelled item (${item.productName}) in Order #${order.orderId}`,
      });

      await wallet.save();
    }

    //////////////////////////////////////////////////////
    // update item

    item.status = "Cancelled";

    item.refundAmount = refundAmount;

    item.isRefunded = true;

    item.cancellationReason.push({
      itemId: item._id,
      reason,
      cancelledAt: new Date(),
    });

    //////////////////////////////////////////////////////
    // update order status

    const allItemsCancelled = order.items.every(
      item => item.status === "Cancelled"
    );

    if (allItemsCancelled) {

      order.status = "Cancelled";

      if (
        order.paymentMethod === "razorpay" ||
        order.paymentMethod === "wallet"
      ) {
        order.paymentStatus = "Refunded";
      }
    }

    await order.save();

    //////////////////////////////////////////////////////

    return res.status(200).json({
      success: true,
      message: "Item cancelled successfully",
      refundAmount,
    });

  } catch (error) {

    console.error("Order Cancel Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};









exports.orderReturn = async (req, res) => {

  const { orderId, itemId, reason } = req.body;

  try {

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const item = order.items.find(
      item => item._id.toString() === itemId
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found in order",
      });
    }

    //////////////////////////////////////////////////////
    // validations

    if (item.status === "Returned") {
      return res.status(400).json({
        success: false,
        message: "Item already returned",
      });
    }

    if (item.status === "Return Requested") {
      return res.status(400).json({
        success: false,
        message: "Return already requested",
      });
    }

    if (item.status !== "Completed") {
      return res.status(400).json({
        success: false,
        message: "Only delivered items can be returned",
      });
    }

    //////////////////////////////////////////////////////
    // update item

    item.status = "Return Requested";

    item.returnReason.push({
      itemId: item._id,
      reason,
      requestedAt: new Date(),
    });

    //////////////////////////////////////////////////////

    await order.save();

    //////////////////////////////////////////////////////

    return res.status(200).json({
      success: true,
      message: "Return request submitted successfully",
    });

  } catch (error) {

    console.error("Order Return Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};