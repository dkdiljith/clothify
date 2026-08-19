// controllers/userOrderController.js
const orderService = require("../services/userOrderService");
const mongoose = require("mongoose");
const ORDER_MESSAGES = require("../constants/order");
const AUTH_MESSAGES = require("../constants/auth");
const STATUS_CODES = require("../constants/status-codes");

// Render Payment Page
exports.payment = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        if (!userId) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: AUTH_MESSAGES.USER_NOT_FOUND });
        }

        const { cart, address, wallet } = await orderService.getPaymentPageDetails(userId);
        return res.render('user/paymentPage', { cart, address, wallet });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(ORDER_MESSAGES.SERVER_ERROR);
    }
};

// Place Order
exports.placeOrder = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const userId = res.locals.user._id;
        const isRazorpayVerified = req.razorpayVerified === true;

        session.startTransaction();
        const result = await orderService.placeNewOrder(userId, req.body, isRazorpayVerified, session);
        await session.commitTransaction();

        return res.json({
            success: true,
            paymentStatus: result.paymentStatus,
            message: ORDER_MESSAGES.ORDER_PLACED,
            orderId: result.orderId,
        });
    } catch (error) {
        await session.abortTransaction();
        if (error.isCustomJson) {
            return res.json({
                success: false,
                message: error.message,
            });
        }
        return res.status(error.status || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || ORDER_MESSAGES.ORDER_FAILED,
        });
    } finally {
        await session.endSession();
    }
};

// Place Failed Order / Handle Retry Attempt Checks
exports.placeOrderFailed = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const result = await orderService.placeFailedOrder(userId, req.body);

        if (result.isRetryFailedUpdate) {
            return res.status(STATUS_CODES.OK).json({
                success: true,
                message: ORDER_MESSAGES.PAYMENT_FAILED_ATTEMPT(result.attempts),
                orderId: result.orderId
            });
        }

        return res.status(STATUS_CODES.CREATED).json({
            success: true,
            paymentStatus: "Failed",
            message: ORDER_MESSAGES.FAILED_ORDER_RECORD_GENERATED,
            orderId: result.orderId
        });
    } catch (error) {
        return res.status(error.status || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || ORDER_MESSAGES.ORDER_FAILED
        });
    }
};

// Retry Failed Order
exports.retryFailedOrder = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const { orderId } = req.body;
        session.startTransaction();

        const updatedOrderId = await orderService.retryFailedOrderPayment(orderId, session);

        await session.commitTransaction();
        return res.status(STATUS_CODES.OK).json({
            success: true,
            message: ORDER_MESSAGES.ORDER_STATUS_UPDATED,
            orderId: updatedOrderId,
        });
    } catch (error) {
        await session.abortTransaction();
        return res.status(error.status || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || ORDER_MESSAGES.FAILED_TO_RETRY_PAYMENT,
        });
    } finally {
        await session.endSession();
    }
};

// Order Success Render
exports.orderSuccess = async (req, res) => {
    try {
        const { orderId } = req.query;
        const order = await orderService.fetchOrderForStatusPage(orderId);

        if (!order) {
            return res.render('user/orderSuccess', { plain_body: true });
        }

        return res.render('user/orderSuccess', { plain_body: true, order });
    } catch {
        return res.render('user/orderSuccess', { plain_body: true });
    }
};

// Order Failure Render
exports.orderFailed = async (req, res) => {
    try {
        const { orderId } = req.query;
        const order = await orderService.fetchOrderForStatusPage(orderId);

        if (!order) {
            return res.render('user/orderFailure', { plain_body: true });
        }

        return res.render('user/orderFailure', { plain_body: true, order });
    } catch {
        return res.render('user/orderFailure', { plain_body: true });
    }
};