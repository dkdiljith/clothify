const couponService = require("../services/couponService");

//MESSAGE_CONSTANTS
// const MESSAGES = require(`../utils/constants`)
/////////////////////////////////////////////////////////////////////////////////////////////////


exports.couponRender = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const query = req.query.query || "";
        const couponStatus = req.query.couponStatus || "";
        const { coupon, totalPages, skip } =
            await couponService.getCouponsWithPagination(
                query,
                couponStatus,
                page,
                limit,
            );
        return res.render("admin/coupon", {
            admin: true,
            coupon,
            query,
            couponStatus,
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
    } catch {
        return res.render("admin/coupon", {
            admin: true,
            coupon: [],
            query: "",
            couponStatus: "",
            pagination: {
                page: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
                nextPage: 2,
                prevPage: 0,
                serialNumberStart: 0,
            },
            errorMessage: "Error fetching coupons.",
        });
    }
};



exports.couponEditJson = async (req, res) => {
    try {
        const coupon = await couponService.getCouponById(req.params.couponId);
        return res.json(coupon);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};



exports.createCoupon = async (req, res) => {
    try {
        const result = await couponService.createNewCoupon(req.body);
        return res.status(result.status).json({
            success: result.success,
            type: result.type,
            message: result.message,
            ...(result.coupon && { coupon: result.coupon }),
        });
    } catch {
        return res.status(500).json({
            success: false,
            type: "server_error",
            message: "Internal server error occurred while creating the coupon.",
        });
    }
};



exports.couponEdit = async (req, res) => {
    try {
        const couponId = req.params.couponId;
        const result = await couponService.updateCoupon(couponId, req.body);
        return res.status(result.status).json({
            success: result.success,
            type: result.type,
            message: result.message,
            ...(result.coupon && { coupon: result.coupon }),
        });
    } catch {
        return res.status(500).json({
            success: false,
            type: "server_error",
            message: "Internal server error occurred while updating the coupon.",
        });
    }
};



exports.couponDelete = async (req, res) => {
    try {
        const { couponId } = req.params;
        const result = await couponService.deleteCoupon(couponId);
        return res.status(result.status).json({
            success: result.success,
            message: result.message,
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};



exports.applyCoupon = async (req, res) => {
    try {
        const { couponId } = req.body;
        const userId = res.locals.user._id;
        const result = await couponService.applyCouponToCart(userId, couponId);
        return res.status(result.status).json({
            success: result.success,
            ...(result.message && { message: result.message }),
        });
    } catch {
        return res
            .status(500)
            .json({ success: false, message: "Error applying coupon" });
    }
};



exports.removeCoupon = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const result = await couponService.removeCouponFromCart(userId);
        return res.status(result.status).json({
            success: result.success,
            ...(result.message && { message: result.message }),
        });
    } catch {
        return res
            .status(500)
            .json({ success: false, message: "Error removing coupon" });
    }
};
