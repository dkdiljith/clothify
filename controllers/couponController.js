import couponService from '../services/couponService.js';

//MESSAGE_CONSTANTS
import COUPON_MESSAGES from '../constants/coupon.js';
import STATUS_CODES from '../constants/status-codes.js';


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
            errorMessage: COUPON_MESSAGES.FETCHING_FAILED,
        });
    }
};



exports.couponEditJson = async (req, res) => {
    try {
        const coupon = await couponService.getCouponById(req.params.couponId);
        return res.json(coupon);
    } catch (err) {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: err.message });
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
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            type: "server_error",
            message: COUPON_MESSAGES.CREATE_FAILED,
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
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            type: "server_error",
            message: COUPON_MESSAGES.EDIT_FAILED,
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
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message:COUPON_MESSAGES.FAILED_DELETE,
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
            .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
            .json({ success: false, message:COUPON_MESSAGES.APPLY_ERROR});
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
            .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
            .json({ success: false, message: COUPON_MESSAGES.REMOVE_ERROR });
    }
};
