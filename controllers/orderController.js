const Order = require("../models/orderSchema");
const Product = require(`../models/productSchema`);
const Wallet = require(`../models/walletSchema`);
const Coupon = require(`../models/couponSchema`);
const mongoose = require("mongoose");

//pagination
const adminPaginationFactory = require(`../utils/pagination`);

//MESSAGE_CONSTANTS
const MESSAGES = require(`../utils/constants`);

/////////////////////////////////////////////////////////////




async function calculateRefund(order, itemId) {

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
  const session = await mongoose.startSession();
  try {
    const orderId = req.params.orderId;
    const itemId = req.params.itemId;
    const newStatus = req.body.status;
    // ==========================
    // CANCELLED
    // ==========================
    if (newStatus === "Cancelled") {
      const cancellationResult = await processItemCancellation(
        orderId,
        itemId,
        "item is out of stock",
      );
      const { status, ...responseBody } = cancellationResult;
      return res.status(status).json(responseBody);
    }
    // ==========================
    // SIMPLE STATUS CHANGES
    // ==========================
    if (newStatus !== "Returned") {
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }
      const item = order.items.id(itemId);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found",
        });
      }
      if (["Returned", "Cancelled"].includes(item.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot change status. Item is already ${item.status}.`,
        });
      }
      item.status = newStatus;
      if (newStatus === "Completed") {
        item.completionDate = new Date();
      }
      const allCompleted = order.items.every(
        (singleItem) =>
          singleItem.status === "Completed" ||
          singleItem.status === "Returned" ||
          singleItem.status === "Cancelled",
      );
      if (allCompleted && order.paymentMethod === "cod") {
        order.paymentStatus = "Completed";
      }
      await order.save();
      return res.status(200).json({
        success: true,
        message: `Item status updated to ${newStatus}`,
      });
    }
    // ==========================
    // RETURN PROCESS
    // ==========================
    session.startTransaction();
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }
    const item = order.items.id(itemId);
    if (!item) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }
    if (["Returned", "Cancelled"].includes(item.status)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Cannot change status. Item is already ${item.status}.`,
      });
    }
    // ==========================
    // REFUND CALCULATION
    // ==========================
    const refundDetails = await calculateRefund(order, itemId);
    let refundAmount = refundDetails.totalRefundableAmount;
    if (order.totalAmount - refundAmount === -1) {
      refundAmount--;
    } else if (order.totalAmount - refundAmount === 1) {
      refundAmount++;
    }
    // ==========================
    // WALLET
    // ==========================
    const wallet = await Wallet.findOne({
      userId: order.userId,
    }).session(session);
    if (!wallet) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }
    wallet.balance += refundAmount;
    wallet.transactions.push({
      type: "credit",
      amount: refundAmount,
      description: `Refund for returned item (${item.productName}) in Order #${order.orderId}`,
    });
    await wallet.save({ session });
    // ==========================
    // ==========================
    // RESTORE STOCK
    // ==========================
    await Product.updateOne(
      {
        _id: item.productId,
      },
      {
        $inc: {
          [`details.${item.variationIndex}.quantity`]: item.quantity,
        },
      },
      {
        session,
      },
    );
    // ==========================
    // UPDATE REFUND DETAILS
    // ==========================
    item.refundDetails.refundedAt = new Date();
    item.refundDetails.paymentMethod = order.paymentMethod;
    item.refundDetails.refundType = "Returned";
    item.refundDetails.refundAmount = refundAmount;
    item.refundDetails.refundAmountStatus = "Refunded";
    // If your schema has refundReason, you may set it here:
    // item.refundDetails.refundReason = "Return Approved";
    // ==========================
    // UPDATE ORDER FINANCIALS
    // ==========================
    order.totalRefundAmount += refundAmount;
    order.totalAmount -= refundAmount;
    // ==========================
    // UPDATE ITEM STATUS
    // ==========================
    item.status = "Returned";
    // ==========================
    // PAYMENT STATUS
    // ==========================
    const allCompleted = order.items.every(
      (singleItem) =>
        singleItem.status === "Completed" ||
        singleItem.status === "Returned" ||
        singleItem.status === "Cancelled",
    );
    if (allCompleted && order.paymentMethod === "cod") {
      order.paymentStatus = "Completed";
    }
    // ==========================
    // SAVE ORDER
    // ==========================
    await order.save({ session });
    // ==========================
    // COMMIT
    // ==========================
    await session.commitTransaction();
    return res.status(200).json({
      success: true,
      message: `Item status updated to ${newStatus}`,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Order Status Change Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  } finally {
    await session.endSession();
  }
};


/////////////////////////////////////////////////////USERSIDE ORDER CANCELAND RETURNING//////////////////////////////////////////////////////




exports.orderCancel = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { orderId, itemId, reason } = req.body;
    // Fetch order first for validation
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
    // ==========================
    // VALIDATIONS
    // ==========================
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
    // ==========================
    // REFUND CALCULATION
    // ==========================
    const refundDetails = await calculateRefund(order, itemId);
    let refundAmount = refundDetails.totalRefundableAmount;
    if (order.totalAmount - refundAmount === -1) {
      refundAmount -= 1;
    } else if (order.totalAmount - refundAmount === 1) {
      refundAmount += 1;
    }
    // ==========================
    // START TRANSACTION
    // ==========================
    session.startTransaction();
    // Fetch latest order inside transaction
    const transactionOrder = await Order.findById(orderId).session(session);
    const transactionItem = transactionOrder.items.find(
      (item) => item._id.toString() === itemId,
    );
    // ==========================
    // RESTORE STOCK
    // ==========================
    await Product.updateOne(
      {
        _id: transactionItem.productId,
      },
      {
        $inc: {
          [`details.${transactionItem.variationIndex}.quantity`]:
            transactionItem.quantity,
        },
      },
      { session },
    );
    // ==========================
    // WALLET REFUND
    // ==========================
    if (
      transactionOrder.paymentMethod === "razorpay" ||
      transactionOrder.paymentMethod === "wallet"
    ) {
      const wallet = await Wallet.findOne({
        userId: transactionOrder.userId,
      }).session(session);
      if (!wallet) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Wallet not found",
        });
      }
      wallet.balance += refundAmount;
      wallet.transactions.push({
        type: "credit",
        amount: refundAmount,
        description: `Refund for cancelled item (${transactionItem.productName}) in Order #${transactionOrder.orderId}`,
      });
      await wallet.save({ session });
      transactionItem.refundDetails.refundedAt = new Date();
    }
    // ==========================
    // UPDATE ITEM
    // ==========================
    transactionItem.status = "Cancelled";
    transactionItem.cancellationReason.push({
      itemId: transactionItem._id,
      reason,
      cancelledAt: new Date(),
    });
    if (
      transactionOrder.paymentMethod === "razorpay" ||
      transactionOrder.paymentMethod === "wallet"
    ) {
      transactionItem.refundDetails.refundRequestedAt = new Date();
      transactionItem.refundDetails.paymentMethod =
        transactionOrder.paymentMethod;
      transactionItem.refundDetails.refundType = "Cancelled";
      transactionItem.refundDetails.refundAmount = refundAmount;
      transactionItem.refundDetails.refundAmountStatus = "Refunded";
      transactionItem.refundDetails.refundReason = reason;
      transactionOrder.totalRefundAmount += refundAmount;
      transactionOrder.totalAmount -= refundAmount;
    } else {
      transactionItem.refundDetails.refundRequestedAt = new Date();
      transactionItem.refundDetails.paymentMethod = "cod";
      transactionItem.refundDetails.refundType = "Cancelled";
      transactionItem.refundDetails.refundAmount = refundAmount;
      transactionItem.refundDetails.refundAmountStatus = "No Refund Required";
      transactionItem.refundDetails.refundReason = reason;
      transactionOrder.totalRefundAmount += refundAmount;
      transactionOrder.totalAmount -= refundAmount;
    }
    // ==========================
    // UPDATE ORDER STATUS
    // ==========================
    const allItemsCancelled = transactionOrder.items.every(
      (item) => item.status === "Cancelled",
    );
    if (allItemsCancelled) {
      transactionOrder.status = "Cancelled";
      if (
        transactionOrder.paymentMethod === "razorpay" ||
        transactionOrder.paymentMethod === "wallet"
      ) {
        transactionOrder.paymentStatus = "Refunded";
      }
    }
    await transactionOrder.save({ session });
    await session.commitTransaction();
    return res.status(200).json({
      success: true,
      message: "Item cancelled successfully",
      refundAmount,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Order Cancel Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  } finally {
    await session.endSession();
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
  const session = await mongoose.startSession();
  try {
    // ==========================
    // START TRANSACTION
    // ==========================
    session.startTransaction();
    // Fetch order inside transaction
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      return {
        status: 404,
        success: false,
        message: "Order not found",
      };
    }
    const item = order.items.find((item) => item._id.toString() === itemId);
    if (!item) {
      await session.abortTransaction();
      return {
        status: 404,
        success: false,
        message: "Item not found in order",
      };
    }
    // ==========================
    // VALIDATIONS
    // ==========================
    if (item.status === "Cancelled") {
      await session.abortTransaction();
      return {
        status: 400,
        success: false,
        message: "Item already cancelled",
      };
    }
    if (item.status !== "Pending") {
      await session.abortTransaction();
      return {
        status: 400,
        success: false,
        message: "Only pending items can be cancelled",
      };
    }
    // ==========================
    // REFUND CALCULATION
    // ==========================
    const refundDetails = await calculateRefund(order, itemId);
    let refundAmount = refundDetails.totalRefundableAmount;
    if (order.totalAmount - refundAmount === -1) {
      refundAmount--;
    } else if (order.totalAmount - refundAmount === 1) {
      refundAmount++;
    }
    // ==========================
    // RESTORE STOCK
    // ==========================
    await Product.updateOne(
      {
        _id: item.productId,
      },
      {
        $inc: {
          [`details.${item.variationIndex}.quantity`]: item.quantity,
        },
      },
      {
        session,
      },
    );
    // ==========================
    // WALLET REFUND
    // ==========================
    if (
      order.paymentMethod === "razorpay" ||
      order.paymentMethod === "wallet"
    ) {
      const wallet = await Wallet.findOne({
        userId: order.userId,
      }).session(session);
      if (!wallet) {
        await session.abortTransaction();
        return {
          status: 404,
          success: false,
          message: "Wallet not found",
        };
      }
      wallet.balance += refundAmount;
      wallet.transactions.push({
        type: "credit",
        amount: refundAmount,
        description: `Refund for cancelled item (${item.productName}) in Order #${order.orderId}`,
      });
      await wallet.save({ session });
      item.refundDetails.refundedAt = new Date();
    }
    // ==========================
    // UPDATE ITEM
    // ==========================
    item.status = "Cancelled";
    item.cancellationReason.push({
      itemId: item._id,
      reason,
      cancelledAt: new Date(),
    });
    // ==========================
    // UPDATE REFUND DETAILS
    // ==========================
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
    } else {
      item.refundDetails.refundRequestedAt = new Date();
      item.refundDetails.paymentMethod = "cod";
      item.refundDetails.refundType = "Cancelled";
      item.refundDetails.refundAmount = refundAmount;
      item.refundDetails.refundAmountStatus = "No Refund Required";
      item.refundDetails.refundReason = reason;
      order.totalRefundAmount += refundAmount;
      order.totalAmount -= refundAmount;
    }
    // ==========================
    // UPDATE ORDER STATUS
    // ==========================
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
    // ==========================
    // SAVE ORDER
    // ==========================
    await order.save({ session });
    // ==========================
    // COMMIT
    // ==========================
    await session.commitTransaction();
    return {
      status: 200,
      success: true,
      message: "Item cancelled successfully",
      refundAmount,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Order Cancel Error:", error);
    return {
      status: 500,
      success: false,
      message:
        error.message || "Something went wrong during cancellation processing",
    };
  } finally {
    await session.endSession();
  }
}
