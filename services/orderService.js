import Order from '../models/orderSchema.js';
import Product from '../models/productSchema.js';
import Wallet from '../models/walletSchema.js';
import mongoose from 'mongoose';


// MESSAGE_CONSTANTS
import ORDER_MESSAGES from '../constants/order.js';
import WALLET_MESSAGES from '../constants/wallet.js';
import STATUS_CODES from '../constants/status-codes.js';

/////////////////////////////////////////////////////////////////////////////////////////////////


// Helper function to calculate refund breakdown per item
async function calculateRefund(order, itemId) {
    if (!order) {
        throw new Error(ORDER_MESSAGES.ORDER_NOT_FOUND);
    }
    const item = order.items.find((item) => item._id.toString() === itemId);
    if (!item) {
        throw new Error(ORDER_MESSAGES.ITEM_NOT_FOUND);
    }

    const itemSubtotal = Number(item.productPrice) * item.quantity;

    const orderSubtotal = order.items.reduce((total, currentItem) => {
        return total + Number(currentItem.productPrice) * currentItem.quantity;
    }, 0);

    const itemSharePercentage = orderSubtotal > 0 ? itemSubtotal / orderSubtotal : 0;

    const itemCouponShare = (order.couponDiscount || 0) * itemSharePercentage;
    const itemOfferShare = (order.offerDiscount || 0) * itemSharePercentage;
    const itemTaxShare = (order.tax || 0) * itemSharePercentage;
    const itemShippingShare = (order.shippingFee || 0) * itemSharePercentage;

    let refundableAmount =
        itemSubtotal -
        itemCouponShare -
        itemOfferShare +
        itemTaxShare +
        itemShippingShare;

    refundableAmount = Math.max(0, Math.round(refundableAmount));

    return {
        itemSubtotal,
        itemCouponShare: Math.round(itemCouponShare),
        itemOfferShare: Math.round(itemOfferShare),
        itemTaxShare: Math.round(itemTaxShare),
        itemShippingShare: Math.round(itemShippingShare),
        totalRefundableAmount: refundableAmount,
    };
}









export const getFilteredOrders = async (queryData) => {
    const page = parseInt(queryData.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    const query = queryData.query || "";
    const deliveryStatus = queryData.deliveryStatus || "";
    const returnRequested = queryData.returnRequested === "true";
    const filter = {};

    if (query) {
        filter.$or = [
            { orderId: { $regex: query, $options: "i" } },
            { "deliveryAddress.name": { $regex: query, $options: "i" } },
        ];
    }

    if (deliveryStatus) {
        filter.deliveryStatus = deliveryStatus;
    }

    if (returnRequested) {
        filter["items.status"] = "Return Requested";
    }

    const [totalDocuments, order, pendingReturns] = await Promise.all([
        Order.countDocuments(filter),
        Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Order.countDocuments({ "items.status": "Return Requested" }),
    ]);

    const totalPages = Math.ceil(totalDocuments / limit);

    return {
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
    };
};






export const getOrderById = async (orderId) => {
    return await Order.findById(orderId).lean();
};




export const updateOrderStatus = async (orderId, itemId, newStatus) => {
    if (newStatus === "Cancelled") {
        return await processItemCancellation(orderId, itemId, "item is out of stock");
    }

    if (newStatus !== "Returned") {
        const order = await Order.findById(orderId);
        if (!order) {
            throw { status: STATUS_CODES.NOT_FOUND, message: ORDER_MESSAGES.ORDER_NOT_FOUND };
        }
        const item = order.items.id(itemId);
        if (!item) {
            throw { status: STATUS_CODES.NOT_FOUND, message: ORDER_MESSAGES.ITEM_NOT_FOUND };
        }
        if (["Returned", "Cancelled"].includes(item.status)) {
            throw { status: STATUS_CODES.BAD_REQUEST, message: ORDER_MESSAGES.CANNOT_STATUS_UPDATE(item.status) };
        }

        item.status = newStatus;
        if (newStatus === "Completed") {
            item.completionDate = new Date();
        }

        const allCompleted = order.items.every(
            (singleItem) =>
                singleItem.status === "Completed" ||
                singleItem.status === "Returned" ||
                singleItem.status === "Cancelled"
        );
        if (allCompleted && order.paymentMethod === "cod") {
            order.paymentStatus = "Completed";
        }

        await order.save();
        return { success: true, message: ORDER_MESSAGES.STATUS_UPDATED(newStatus) };
    }

    // Return Process with Transaction
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const order = await Order.findById(orderId).session(session);
        if (!order) {
            await session.abortTransaction();
            throw { status: STATUS_CODES.NOT_FOUND, message: ORDER_MESSAGES.ORDER_NOT_FOUND };
        }
        const item = order.items.id(itemId);
        if (!item) {
            await session.abortTransaction();
            throw { status: STATUS_CODES.NOT_FOUND, message: ORDER_MESSAGES.ITEM_NOT_FOUND };
        }
        if (["Returned", "Cancelled"].includes(item.status)) {
            await session.abortTransaction();
            throw { status: STATUS_CODES.BAD_REQUEST, message: ORDER_MESSAGES.CANNOT_STATUS_UPDATE(item.status) };
        }

        const refundDetails = await calculateRefund(order, itemId);
        let refundAmount = refundDetails.totalRefundableAmount;
        if (order.totalAmount - refundAmount === -1) {
            refundAmount--;
        } else if (order.totalAmount - refundAmount === 1) {
            refundAmount++;
        }

        const wallet = await Wallet.findOne({ userId: order.userId }).session(session);
        if (!wallet) {
            await session.abortTransaction();
            throw { status: STATUS_CODES.NOT_FOUND, message: WALLET_MESSAGES.NOT_FOUND };
        }

        wallet.balance += refundAmount;
        wallet.transactions.push({
            type: "credit",
            amount: refundAmount,
            description: WALLET_MESSAGES.REFUND_WALLET(item.productName, order.orderId),
        });
        await wallet.save({ session });

        await Product.updateOne(
            { _id: item.productId },
            { $inc: { [`details.${item.variationIndex}.quantity`]: item.quantity } },
            { session }
        );

        item.refundDetails.refundedAt = new Date();
        item.refundDetails.paymentMethod = order.paymentMethod;
        item.refundDetails.refundType = "Returned";
        item.refundDetails.refundAmount = refundAmount;
        item.refundDetails.refundAmountStatus = "Refunded";

        order.totalRefundAmount += refundAmount;
        order.totalAmount -= refundAmount;
        item.status = "Returned";

        const allCompleted = order.items.every(
            (singleItem) =>
                singleItem.status === "Completed" ||
                singleItem.status === "Returned" ||
                singleItem.status === "Cancelled"
        );
        if (allCompleted && order.paymentMethod === "cod") {
            order.paymentStatus = "Completed";
        }

        await order.save({ session });
        await session.commitTransaction();
        return { success: true, message: ORDER_MESSAGES.STATUS_UPDATED(newStatus) };
    } catch (error) {
        await session.abortTransaction();
        throw { status: error.status || STATUS_CODES.INTERNAL_SERVER_ERROR, message: error.message || ORDER_MESSAGES.STATUS_UPDATE_FAILED };
    } finally {
        await session.endSession();
    }
};




export const cancelOrder = async (orderId, itemId, reason) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const order = await Order.findById(orderId).session(session);
        if (!order) {
            await session.abortTransaction();
            throw { status: STATUS_CODES.NOT_FOUND, message: ORDER_MESSAGES.ORDER_NOT_FOUND };
        }
        const item = order.items.find((i) => i._id.toString() === itemId);
        if (!item) {
            await session.abortTransaction();
            throw { status: STATUS_CODES.NOT_FOUND, message: ORDER_MESSAGES.ITEM_NOT_FOUND };
        }

        if (item.status === "Cancelled") {
            await session.abortTransaction();
            throw { status: STATUS_CODES.BAD_REQUEST, message: ORDER_MESSAGES.ITEM_ALREADY_CANCELLED };
        }
        if (item.status !== "Pending") {
            await session.abortTransaction();
            throw { status: STATUS_CODES.BAD_REQUEST, message: ORDER_MESSAGES.ONLY_PENDING_CANCEL };
        }

        const refundDetails = await calculateRefund(order, itemId);
        let refundAmount = refundDetails.totalRefundableAmount;
        if (order.totalAmount - refundAmount === -1) {
            refundAmount -= 1;
        } else if (order.totalAmount - refundAmount === 1) {
            refundAmount += 1;
        }

        await Product.updateOne(
            { _id: item.productId },
            { $inc: { [`details.${item.variationIndex}.quantity`]: item.quantity } },
            { session }
        );

        if (["razorpay", "wallet"].includes(order.paymentMethod)) {
            const wallet = await Wallet.findOne({ userId: order.userId }).session(session);
            if (!wallet) {
                await session.abortTransaction();
                throw { status: STATUS_CODES.NOT_FOUND, message: WALLET_MESSAGES.NOT_FOUND };
            }
            wallet.balance += refundAmount;
            wallet.transactions.push({
                type: "credit",
                amount: refundAmount,
                description: WALLET_MESSAGES.REFUND_WALLET(item.productName, order.orderId),
            });
            await wallet.save({ session });
            item.refundDetails.refundedAt = new Date();
        }

        item.status = "Cancelled";
        item.cancellationReason.push({
            itemId: item._id,
            reason,
            cancelledAt: new Date(),
        });

        item.refundDetails.refundRequestedAt = new Date();
        item.refundDetails.paymentMethod = order.paymentMethod;
        item.refundDetails.refundType = "Cancelled";
        item.refundDetails.refundAmount = refundAmount;
        item.refundDetails.refundAmountStatus = ["razorpay", "wallet"].includes(order.paymentMethod) ? "Refunded" : "No Refund Required";
        item.refundDetails.refundReason = reason;

        order.totalRefundAmount += refundAmount;
        order.totalAmount -= refundAmount;

        const allItemsCancelled = order.items.every((i) => i.status === "Cancelled");
        if (allItemsCancelled) {
            order.status = "Cancelled";
            if (["razorpay", "wallet"].includes(order.paymentMethod)) {
                order.paymentStatus = "Refunded";
            }
        }

        await order.save({ session });
        await session.commitTransaction();
        return { success: true, message: ORDER_MESSAGES.CANCELLED_REFUND_SUCCESS, refundAmount };
    } catch (error) {
        await session.abortTransaction();
        throw { status: error.status || STATUS_CODES.INTERNAL_SERVER_ERROR, message: error.message || ORDER_MESSAGES.FAILED_ORDER_CANCELLATION };
    } finally {
        await session.endSession();
    }
};








export const returnOrder = async (orderId, itemId, reason, returnAll) => {
    const order = await Order.findById(orderId);
    if (!order) {
        throw { status: STATUS_CODES.NOT_FOUND, message: ORDER_MESSAGES.ORDER_NOT_FOUND };
    }

    const item = order.items.find((i) => i._id.toString() === itemId);
    if (!item) {
        throw { status: STATUS_CODES.NOT_FOUND, message: ORDER_MESSAGES.ITEM_NOT_FOUND };
    }

    if (item.status === "Returned") {
        throw { status: STATUS_CODES.BAD_REQUEST, message: ORDER_MESSAGES.ITEM_ALREADY_RETURNED };
    }
    if (item.status === "Return Requested") {
        throw { status: STATUS_CODES.BAD_REQUEST, message: ORDER_MESSAGES.ITEM_ALREADY_REQUEST_RETURNED };
    }
    if (item.status !== "Completed") {
        throw { status: STATUS_CODES.BAD_REQUEST, message: ORDER_MESSAGES.ONLY_DELIVERED_RETURN };
    }

    if (returnAll) {
        const nonReturnableItems = order.items.filter((i) => i.status !== "Completed");
        if (nonReturnableItems.length > 0) {
            nonReturnableItems
                .map((i) => {
                    let statusReason = "is not eligible for return";
                    if (i.status === "Returned") statusReason = "has already been returned";
                    if (i.status === "Return Requested") statusReason = "already has a pending return request";
                    return `${i.productName} (${statusReason})`;
                })
                .join(", ");
            throw { status: STATUS_CODES.BAD_REQUEST, message: ORDER_MESSAGES.CANNOT_PROCESS_BULKRETURN };
        }

        for (let i = 0; i < order.items.length; i++) {
            let currentItem = order.items[i];
            currentItem.status = "Return Requested";
            currentItem.refundDetails.refundRequestedAt = new Date();
            currentItem.refundDetails.refundReason = reason;
            currentItem.returnReason.push({
                itemId: currentItem._id,
                reason,
                requestedAt: new Date(),
            });
        }
    } else {
        item.status = "Return Requested";
        item.refundDetails.refundRequestedAt = new Date();
        item.refundDetails.refundReason = reason;
        item.returnReason.push({
            itemId: item._id,
            reason,
            requestedAt: new Date(),
        });
    }

    await order.save();
    return { success: true, message: ORDER_MESSAGES.RETURN_REQUEST_SUCCESS };
};









export const processItemCancellation = async (orderId, itemId, reason) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const order = await Order.findById(orderId).session(session);
        if (!order) {
            await session.abortTransaction();
            return { status: STATUS_CODES.NOT_FOUND, success: false, message: ORDER_MESSAGES.ORDER_NOT_FOUND };
        }
        const item = order.items.find((i) => i._id.toString() === itemId);
        if (!item) {
            await session.abortTransaction();
            return { status: STATUS_CODES.NOT_FOUND, success: false, message: ORDER_MESSAGES.ITEM_NOT_FOUND };
        }

        if (item.status === "Cancelled") {
            await session.abortTransaction();
            return { status: STATUS_CODES.BAD_REQUEST, success: false, message: ORDER_MESSAGES.ITEM_ALREADY_CANCELLED };
        }
        if (item.status !== "Pending") {
            await session.abortTransaction();
            return { status: STATUS_CODES.BAD_REQUEST, success: false, message: ORDER_MESSAGES.ONLY_PENDING_CANCEL };
        }

        const refundDetails = await calculateRefund(order, itemId);
        let refundAmount = refundDetails.totalRefundableAmount;
        if (order.totalAmount - refundAmount === -1) {
            refundAmount--;
        } else if (order.totalAmount - refundAmount === 1) {
            refundAmount++;
        }

        await Product.updateOne(
            { _id: item.productId },
            { $inc: { [`details.${item.variationIndex}.quantity`]: item.quantity } },
            { session }
        );

        if (["razorpay", "wallet"].includes(order.paymentMethod)) {
            const wallet = await Wallet.findOne({ userId: order.userId }).session(session);
            if (!wallet) {
                await session.abortTransaction();
                return { status: STATUS_CODES.NOT_FOUND, success: false, message: WALLET_MESSAGES.NOT_FOUND };
            }
            wallet.balance += refundAmount;
            wallet.transactions.push({
                type: "credit",
                amount: refundAmount,
                description: ORDER_MESSAGES.REFUND_WALLET(item.productName, order.orderId),
            });
            await wallet.save({ session });
            item.refundDetails.refundedAt = new Date();
        }

        item.status = "Cancelled";
        item.cancellationReason.push({
            itemId: item._id,
            reason,
            cancelledAt: new Date(),
        });

        item.refundDetails.refundRequestedAt = new Date();
        item.refundDetails.paymentMethod = order.paymentMethod;
        item.refundDetails.refundType = "Cancelled";
        item.refundDetails.refundAmount = refundAmount;
        item.refundDetails.refundAmountStatus = ["razorpay", "wallet"].includes(order.paymentMethod) ? "Refunded" : "No Refund Required";
        item.refundDetails.refundReason = reason;

        order.totalRefundAmount += refundAmount;
        order.totalAmount -= refundAmount;

        const allItemsCancelled = order.items.every((i) => i.status === "Cancelled");
        if (allItemsCancelled) {
            order.status = "Cancelled";
            if (["razorpay", "wallet"].includes(order.paymentMethod)) {
                order.paymentStatus = "Refunded";
            }
        }

        await order.save({ session });
        await session.commitTransaction();
        return { status: STATUS_CODES.OK, success: true, message: ORDER_MESSAGES.CANCELLED_REFUND_SUCCESS, refundAmount };
    } catch (error) {
        await session.abortTransaction();
        return { status: STATUS_CODES.INTERNAL_SERVER_ERROR, success: false, message: error.message || ORDER_MESSAGES.FAILED_ORDER_CANCELLATION };
    } finally {
        await session.endSession();
    }
};