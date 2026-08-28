import orderService from '../services/orderService.js';

// MESSAGE_CONSTANTS
import ORDER_MESSAGES from '../constants/order.js';
import STATUS_CODES from '../constants/status-codes.js';





////////////////////////////////////////////////////////////////////////////////


exports.ordersRender = async (req, res) => {
    try {
        const result = await orderService.getFilteredOrders(req.query);
        return res.render("admin/orders", {
            admin: true,
            ...result,
        });
    } catch {
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
            errorMessage: ORDER_MESSAGES.FAILED_RENDER ,
        });
    }
};


exports.orderDetails = async (req, res) => {
    try {
        const order = await orderService.getOrderById(req.params.orderId);
        return res.render(`admin/orderDetails`, { order, admin: true });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).render("admin/error", { message:ORDER_MESSAGES.FAILED_RENDER });
    }
};

exports.orderStatusChange = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const { status: newStatus } = req.body;
        const result = await orderService.updateOrderStatus(orderId, itemId, newStatus);
        return res.status(STATUS_CODES.OK).json(result);
    } catch (error) {
        const status = error.status || STATUS_CODES.INTERNAL_SERVER_ERROR;
        return res.status(status).json({
            success: false,
            message: error.message || ORDER_MESSAGES.STATUS_UPDATE_FAILED,
        });
    }
};

exports.orderCancel = async (req, res) => {
    try {
        const { orderId, itemId, reason } = req.body;
        const result = await orderService.cancelOrder(orderId, itemId, reason);
        return res.status(STATUS_CODES.OK).json(result);
    } catch (error) {
        const status = error.status || STATUS_CODES.INTERNAL_SERVER_ERROR;
        return res.status(status).json({
            success: false,
            message: error.message ||ORDER_MESSAGES.FAILED_ORDER_CANCELLATION,
        });
    }
};

exports.orderReturn = async (req, res) => {
    try {
        const { orderId, itemId, reason, returnAll } = req.body;
        const result = await orderService.returnOrder(orderId, itemId, reason, returnAll);
        return res.status(STATUS_CODES.OK).json(result);
    } catch (error) {
        const status = error.status || STATUS_CODES.INTERNAL_SERVER_ERROR;
        return res.status(status).json({
            success: false,
            message: error.message || ORDER_MESSAGES.FAILED_ORDER_RETURN,
        });
    }
};