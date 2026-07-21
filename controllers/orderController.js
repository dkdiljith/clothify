const Order = require("../models/orderSchema");
const Product = require(`../models/productSchema`);
const Wallet = require(`../models/walletSchema`);
const Coupon = require(`../models/couponSchema`);

//pagination
const adminPaginationFactory = require(`../utils/pagination`);

//MESSAGE_CONSTANTS
const MESSAGES = require(`../utils/constants`);

/////////////////////////////////////////////////////////////




async function calculateRefund(orderId, itemId, isCancellation) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }
  const item = order.items.find((item) => item._id.toString() === itemId);
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

  return {
    itemSubtotal,
    itemCouponShare: Math.round(itemCouponShare),
    itemOfferShare: Math.round(itemOfferShare),
    itemTaxShare: Math.round(itemTaxShare),
    itemShippingShare: Math.round(itemShippingShare),
    totalRefundableAmount: refundableAmount,
  };
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////




exports.ordersRender = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    const query = req.query.query || "";
    const deliveryStatus = req.query.deliveryStatus || "";
    const returnRequested = req.query.returnRequested === "true";
    const filter = {};
    // Search
    if (query) {
      filter.$or = [
        {
          orderId: {
            $regex: query,
            $options: "i",
          },
        },
        {
          "deliveryAddress.name": {
            $regex: query,
            $options: "i",
          },
        },
      ];
    }
    // Payment Status Filter
    if (deliveryStatus) {
      filter.deliveryStatus = deliveryStatus;
    }
    // Return Request Filter
    if (returnRequested) {
      filter["items.status"] = "Return Requested";
    }
    const [totalDocuments, order, pendingReturns] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments({
        "items.status": "Return Requested",
      }),
    ]);
    const totalPages = Math.ceil(totalDocuments / limit);
    return res.render("admin/orders", {
      admin: true,
      order,
      query,
      deliveryStatus,
      returnRequested,
      pendingReturns,
      pagination: {
        page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page + 1,
        prevPage: page - 1,
        serialNumberStart: skip,
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.render("admin/orders", {
      admin: true,
      order: [],
      query: "",
      deliveryStatus: "",
      returnRequested: false,
      pendingReturns: 0,
      pagination: {
        page: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
        nextPage: 2,
        prevPage: 0,
        serialNumberStart: 0,
      },
      errorMessage: "Failed to load orders.",
    });
  }
};





exports.orderDetails = async (req, res) => {
  const orderId = req.params.orderId;

  const order = await Order.findById(orderId).lean();

  return res.render(`admin/orderDetails`, { order: order, admin: true });
};





exports.orderStatusChange = async (req, res) => {
  const orderId = req.params.orderId;
  const itemId = req.params.itemId;
  const newStatus = req.body.status;

  try {

    if (newStatus === "Cancelled") {
      const cancellationResult = await processItemCancellation(orderId, itemId, "item is out of stock");

      // Destructure status out, send the rest as JSON response
      const { status, ...responseBody } = cancellationResult;
      return res.status(status).json(responseBody);
    }


    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    // PREVENT LATERAL CHANGES (e.g., Cannot change a Returned/Cancelled item to Completed)
    if (["Returned", "Cancelled"].includes(item.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status. Item is already ${item.status}.`,
      });
    }

    // RETURN PROCESSING LOGIC
    if (newStatus === "Returned") {
      // Refund calculation
      const refundDetails = await calculateRefund(orderId, itemId, false);
      let refundAmount = refundDetails.totalRefundableAmount;

      //handles surplus cases
      if (order.totalAmount - refundAmount === -1) {
        refundAmount -= 1;
      } else if (order.totalAmount - refundAmount === 1) {
        refundAmount += 1;
      }

      // Wallet credit
      const wallet = await Wallet.findOne({ userId: order.userId });
      if (!wallet) {
        return res
          .status(404)
          .json({ success: false, message: "Wallet not found" });
      }

      wallet.balance += refundAmount;
      wallet.transactions.push({
        type: "credit",
        amount: refundAmount,
        description: `Refund for returned item (${item.productName}) in Order #${order.orderId}`,
      });
      await wallet.save();

      // Restore stock
      const product = await Product.findById(item.productId);
      if (product) {
        const variation = product.details[item.variationIndex];
        if (variation && typeof variation.quantity === "number") {
          variation.quantity += item.quantity;
          await product.save();
        }
      }

      // Populate return tracking fields
      item.refundDetails.refundedAt = new Date();
      item.refundDetails.paymentMethod = order.paymentMethod;
      item.refundDetails.refundType = newStatus;
      item.refundDetails.refundAmount = refundAmount;
      item.refundDetails.refundAmountStatus = "Refunded";

      // Update financial records on order level
      order.totalRefundAmount += refundAmount;
      order.totalAmount -= refundAmount;
    }

    //  UNIVERSAL STATUS UPDATE (Works for Completed, Returned, Cancelled, etc.)
    item.status = newStatus;

    // PAYMENT COMPLETION CHECK
    const allCompleted = order.items.every(
      (singleItem) =>
        singleItem.status === "Completed" ||
        singleItem.status === "Returned" ||
        singleItem.status === "Cancelled",
    );

    if (allCompleted && order.paymentMethod === "cod") {
      order.paymentStatus = "Completed";
    }

    // Save final order changes
    await order.save();

    return res.status(200).json({
      success: true,
      message: `Item status updated to ${newStatus}`,
    });
  } catch (error) {
    console.error("Order Status Change Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

/////////////////////////////////////////////////////USERSIDE ORDER CANCELAND RETURNING//////////////////////////////////////////////////////





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

    const item = order.items.find((item) => item._id.toString() === itemId);

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

    const isCancellation = true;
    const refundDetails = await calculateRefund(
      orderId,
      itemId,
      isCancellation,
    );

    let refundAmount = refundDetails.totalRefundableAmount;

    //handles surplus cases
    if (order.totalAmount - refundAmount === -1) {
      refundAmount -= 1;
    } else if (order.totalAmount - refundAmount === 1) {
      refundAmount += 1;
    }

    //////////////////////////////////////////////////////
    // wallet refund

    if (
      order.paymentMethod === "razorpay" ||
      order.paymentMethod === "wallet"
    ) {
      const wallet = await Wallet.findOne({
        userId: order.userId,
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
        description: `Refund for cancelled item (${item.productName}) in Order #${order.orderId}`,
      });

      await wallet.save();
      item.refundDetails.refundedAt = new Date();
    }

    //////////////////////////////////////////////////////
    // update item

    item.status = "Cancelled";
    item.cancellationReason.push({
      itemId: item._id,
      reason,
      cancelledAt: new Date(),
    });

    //update totalAmount
    if (
      order.paymentMethod === "razorpay" ||
      order.paymentMethod === "wallet"
    ) {
      item.refundDetails.refundRequestedAt = new Date();
      item.refundDetails.paymentMethod = order.paymentMethod;
      item.refundDetails.refundType = "Cancelled";
      item.refundDetails.refundAmount = refundAmount;
      item.refundDetails.refundAmountStatus = "Refunded";
      item.refundDetails.refundReason = reason;
      order.totalRefundAmount += refundAmount;
      order.totalAmount -= refundAmount;
    } else if (order.paymentMethod === `cod`) {
      item.refundDetails.refundRequestedAt = new Date();
      item.refundDetails.paymentMethod = "cod";
      item.refundDetails.refundType = "Cancelled";
      item.refundDetails.refundAmount = refundAmount;
      item.refundDetails.refundAmountStatus = "No Refund Required";
      item.refundDetails.refundReason = reason;
      order.totalRefundAmount += refundAmount;
      order.totalAmount -= refundAmount;
    }

    //////////////////////////////////////////////////////
    // update order status

    const allItemsCancelled = order.items.every(
      (item) => item.status === "Cancelled",
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
  const { orderId, itemId, reason, returnAll } = req.body;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const item = order.items.find((item) => item._id.toString() === itemId);

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
    if (returnAll) {
      const nonReturnableItems = order.items.filter(
        (item) => item.status !== "Completed",
      );

      if (nonReturnableItems.length > 0) {
        const details = nonReturnableItems
          .map((item) => {
            let statusReason = "is not eligible for return";
            if (item.status === "Returned")
              statusReason = "has already been returned";
            if (item.status === "Return Requested")
              statusReason = "already has a pending return request";

            return `${item.productName} (${statusReason})`;
          })
          .join(", ");

        return res.status(400).json({
          success: false,
          message: `Cannot process bulk return. Problem items: ${details}.`,
        });
      }
    }

    //////////////////////////////////////////////////////

    if (returnAll) {
      for (let i = 0; i < order.items.length; i++) {
        let item = order.items[i];

        item.status = "Return Requested";
        item.refundDetails.refundRequestedAt = new Date();
        item.refundDetails.refundReason = reason;

        item.returnReason.push({
          itemId: item._id,
          reason,
          requestedAt: new Date(),
        });
      }
    } else {
      // update item

      item.status = "Return Requested";
      item.refundDetails.refundRequestedAt = new Date();
      item.refundDetails.refundReason = reason;

      item.returnReason.push({
        itemId: item._id,
        reason,
        requestedAt: new Date(),
      });
    }

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











async function processItemCancellation(orderId, itemId, reason) {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return { status: 404, success: false, message: "Order not found" };
    }
    const item = order.items.find((item) => item._id.toString() === itemId);
    if (!item) {
      return { status: 404, success: false, message: "Item not found in order" };
    }
    // validations
    if (item.status === "Cancelled") {
      return { status: 400, success: false, message: "Item already cancelled" };
    }
    if (item.status !== "Pending") {
      return { status: 400, success: false, message: "Only pending items can be cancelled" };
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
    const isCancellation = true;
    const refundDetails = await calculateRefund(
      orderId,
      itemId,
      isCancellation,
    );
    let refundAmount = refundDetails.totalRefundableAmount;
    //handles surplus cases
    if (order.totalAmount - refundAmount === -1) {
      refundAmount -= 1;
    } else if (order.totalAmount - refundAmount === 1) {
      refundAmount += 1;
    }
    //////////////////////////////////////////////////////
    // wallet refund
    if (
      order.paymentMethod === "razorpay" ||
      order.paymentMethod === "wallet"
    ) {
      const wallet = await Wallet.findOne({
        userId: order.userId,
      });
      if (!wallet) {
        return { status: 404, success: false, message: "Wallet not found" };
      }
      wallet.balance += refundAmount;
      wallet.transactions.push({
        type: "credit",
        amount: refundAmount,
        description: `Refund for cancelled item (${item.productName}) in Order #${order.orderId}`,
      });
      await wallet.save();
      item.refundDetails.refundedAt = new Date();
    }
    //////////////////////////////////////////////////////
    // update item
    item.status = "Cancelled";
    item.cancellationReason.push({
      itemId: item._id,
      reason,
      cancelledAt: new Date(),
    });
    //update totalAmount
    if (
      order.paymentMethod === "razorpay" ||
      order.paymentMethod === "wallet"
    ) {
      item.refundDetails.refundRequestedAt = new Date();
      item.refundDetails.paymentMethod = order.paymentMethod;
      item.refundDetails.refundType = "Cancelled";
      item.refundDetails.refundAmount = refundAmount;
      item.refundDetails.refundAmountStatus = "Refunded";
      item.refundDetails.refundReason = reason;
      order.totalRefundAmount += refundAmount;
      order.totalAmount -= refundAmount;
    } else if (order.paymentMethod === `cod`) {
      item.refundDetails.refundRequestedAt = new Date();
      item.refundDetails.paymentMethod = "cod";
      item.refundDetails.refundType = "Cancelled";
      item.refundDetails.refundAmount = refundAmount;
      item.refundDetails.refundAmountStatus = "No Refund Required";
      item.refundDetails.refundReason = reason;
      order.totalRefundAmount += refundAmount;
      order.totalAmount -= refundAmount;
    }
    //////////////////////////////////////////////////////
    // update order status
    const allItemsCancelled = order.items.every(
      (item) => item.status === "Cancelled",
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
    return {
      status: 200,
      success: true,
      message: "Item cancelled successfully",
      refundAmount,
    };
  } catch (error) {
    console.error("Order Cancel Error:", error);
    return {
      status: 500,
      success: false,
      message: "Something went wrong during cancellation processing",
    };
  }
};
