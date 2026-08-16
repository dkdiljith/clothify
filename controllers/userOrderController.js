const orderService = require("../services/userOrderService");
const mongoose = require("mongoose");

// Render Payment Page
exports.payment = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        if (!userId) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const { cart, address, wallet } = await orderService.getPaymentPageDetails(userId);
        return res.render('user/paymentPage', { cart, address, wallet });
    } catch {
        return res.status(500).send('Server error');
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
            message: "Order placed successfully",
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
        return res.status(error.status || 500).json({
            success: false,
            message: error.message || "Failed to place order.",
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
            return res.status(200).json({
                success: true,
                message: `Payment failed again. Attempt ${result.attempts}/6 used.`,
                orderId: result.orderId
            });
        }

        return res.status(201).json({
            success: true,
            paymentStatus: "Failed",
            message: "Failed order record generated. You can retry from your dashboard.",
            orderId: result.orderId
        });
    } catch (error) {
        return res.status(error.status || 500).json({
            success: false,
            message: error.message || "Failed to place order."
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
        return res.status(200).json({
            success: true,
            message: "Order status updated and stock reduced successfully.",
            orderId: updatedOrderId,
        });
    } catch (error) {
        await session.abortTransaction();
        return res.status(error.status || 500).json({
            success: false,
            message: error.message || "Failed to retry payment.",
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