const orderService = require("../services/orderService");


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
            errorMessage: "Failed to load orders.",
        });
    }
};


exports.orderDetails = async (req, res) => {
    try {
        const order = await orderService.getOrderById(req.params.orderId);
        return res.render(`admin/orderDetails`, { order, admin: true });
    } catch {
        return res.status(500).render("admin/error", { message: "Failed to load order details" });
    }
};

exports.orderStatusChange = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const { status: newStatus } = req.body;
        const result = await orderService.updateOrderStatus(orderId, itemId, newStatus);
        return res.status(200).json(result);
    } catch (error) {
        const status = error.status || 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Something went wrong",
        });
    }
};

exports.orderCancel = async (req, res) => {
    try {
        const { orderId, itemId, reason } = req.body;
        const result = await orderService.cancelOrder(orderId, itemId, reason);
        return res.status(200).json(result);
    } catch (error) {
        const status = error.status || 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Something went wrong",
        });
    }
};

exports.orderReturn = async (req, res) => {
    try {
        const { orderId, itemId, reason, returnAll } = req.body;
        const result = await orderService.returnOrder(orderId, itemId, reason, returnAll);
        return res.status(200).json(result);
    } catch (error) {
        const status = error.status || 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Something went wrong",
        });
    }
};